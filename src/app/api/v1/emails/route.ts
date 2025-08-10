import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorJson, okJson, withHeaders } from '@/lib/api-helpers'
import { z } from 'zod'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: withHeaders() })
}

const QuerySchema = z.object({
  fingerprint: z.string().min(8),
  id: z.string().cuid().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  cursor: z.string().optional(),
  includeDeleted: z.coerce.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const parsed = QuerySchema.safeParse({
      fingerprint: url.searchParams.get('fingerprint'),
      id: url.searchParams.get('id') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
      includeDeleted: url.searchParams.get('includeDeleted') ?? undefined,
    })
    if (!parsed.success) return errorJson(400, 'Invalid query', parsed.error.flatten())
    const { fingerprint, id, limit = 20, cursor, includeDeleted = false } = parsed.data

    let session = await prisma.session.findUnique({ where: { fingerprint }, select: { id: true } })
    if (!session) {
      try {
        session = await prisma.session.create({ 
          data: { fingerprint, emailCount: 0 }, 
          select: { id: true } 
        })
      } catch (error) {
        console.error('Failed to create session:', error)
        return errorJson(500, 'Failed to create session')
      }
    }

    if (id) {
      const email = await prisma.email.findFirst({
        where: { 
          id, 
          sessionId: session.id,
          ...(includeDeleted ? {} : { deletedAt: null })
        },
        select: { 
          id: true, 
          emailAddress: true, 
          createdAt: true, 
          expiresAt: true, 
          isActive: true,
          deletedAt: true,
          isRecovered: true
        },
      })
      if (!email) return errorJson(404, 'Email not found')
      return okJson({
        id: email.id,
        address: email.emailAddress,
        createdAt: email.createdAt,
        expiresAt: email.expiresAt,
        isActive: email.isActive,
        deletedAt: email.deletedAt,
        isRecovered: email.isRecovered
      })
    }

    const emails = await prisma.email.findMany({
      where: { 
        sessionId: session.id,
        ...(includeDeleted ? {} : { deletedAt: null })
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      select: { 
        id: true, 
        emailAddress: true, 
        createdAt: true, 
        expiresAt: true, 
        isActive: true,
        deletedAt: true,
        isRecovered: true
      },
    })
    const nextCursor = emails.length > limit ? emails[limit].id : undefined
    const page = emails.slice(0, limit).map((email: typeof emails[0]) => ({
      id: email.id,
      address: email.emailAddress,
      createdAt: email.createdAt,
      expiresAt: email.expiresAt,
      isActive: email.isActive,
      deletedAt: email.deletedAt,
      isRecovered: email.isRecovered
    }))

    return okJson({ 
      items: page, 
      nextCursor,
      meta: {
        total: page.length,
        fingerprint: fingerprint,
        includeDeleted: includeDeleted,
        timestamp: new Date().toISOString()
      }
    }, {
      'Cache-Control': 'private, max-age=5',
    })
  } catch (e) {
    console.error('Error fetching emails v1:', e)
    return errorJson(500, 'Internal server error')
  }
}

const DeleteSchema = z.object({
  fingerprint: z.string().min(8),
  id: z.string().cuid(),
})

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const parsed = DeleteSchema.safeParse({
      fingerprint: url.searchParams.get('fingerprint'),
      id: url.searchParams.get('id'),
    })
    if (!parsed.success) return errorJson(400, 'Invalid query', parsed.error.flatten())
    const { fingerprint, id } = parsed.data

    const session = await prisma.session.findUnique({ where: { fingerprint }, select: { id: true } })
    if (!session) return errorJson(404, 'Session not found')

    const email = await prisma.email.findFirst({ 
      where: { id, sessionId: session.id, deletedAt: null }, 
      select: { id: true } 
    })
    if (!email) return errorJson(404, 'Email not found or already deleted')

    // Soft delete - set deletedAt timestamp
    await prisma.email.update({ 
      where: { id }, 
      data: { 
        deletedAt: new Date(),
        deletedBy: fingerprint,
        isActive: false
      }
    })
    
    // Don't decrement emailCount for soft delete
    return okJson({ 
      message: 'Email soft deleted successfully. It will be permanently deleted after 14 days.',
      deletedAt: new Date().toISOString()
    })
  } catch (e) {
    console.error('Error soft deleting email v1:', e)
    return errorJson(500, 'Internal server error')
  }
}

// Recovery endpoint
const RecoverSchema = z.object({
  fingerprint: z.string().min(8),
  emailAddress: z.string().email(),
})

export async function PATCH(request: NextRequest) {
  try {
    const json = await request.json()
    const parsed = RecoverSchema.safeParse(json)
    if (!parsed.success) return errorJson(400, 'Invalid request body', parsed.error.flatten())
    const { fingerprint, emailAddress } = parsed.data

    const session = await prisma.session.findUnique({ where: { fingerprint }, select: { id: true } })
    if (!session) return errorJson(404, 'Session not found')

    // Find soft-deleted email
    const email = await prisma.email.findFirst({
      where: { 
        emailAddress,
        deletedAt: { not: null },
        expiresAt: { gt: new Date() } // Only recover if not expired
      },
      select: { id: true, sessionId: true, deletedAt: true }
    })

    if (!email) {
      return errorJson(404, 'Soft-deleted email not found or expired')
    }

    // Check if email belongs to this session or was deleted by this session
    if (email.sessionId !== session.id && email.deletedAt) {
      // Allow recovery if deleted by same fingerprint
      const deletedEmail = await prisma.email.findFirst({
        where: { 
          emailAddress,
          deletedBy: fingerprint,
          deletedAt: { not: null }
        }
      })
      if (!deletedEmail) {
        return errorJson(403, 'Email not owned by this session')
      }
    }

    // Recover the email
    await prisma.email.update({
      where: { emailAddress },
      data: {
        deletedAt: null,
        deletedBy: null,
        isActive: true,
        isRecovered: true,
        sessionId: session.id // Transfer ownership to current session
      }
    })

    return okJson({
      message: 'Email recovered successfully',
      emailAddress,
      recoveredAt: new Date().toISOString()
    })
  } catch (e) {
    console.error('Error recovering email v1:', e)
    return errorJson(500, 'Internal server error')
  }
}
