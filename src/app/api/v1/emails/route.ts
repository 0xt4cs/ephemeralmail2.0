import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorJson, okJson, withHeaders } from '@/lib/api-helpers'
import { z } from 'zod'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: withHeaders() })
}

const QuerySchema = z.object({
  fingerprint: z.string().min(8).optional(), // Optional - for backwards compat
  email: z.string().min(3).optional(), // Query by email address
  id: z.string().cuid().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  cursor: z.string().optional(),
  includeDeleted: z.coerce.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const parsed = QuerySchema.safeParse({
      fingerprint: url.searchParams.get('fingerprint') ?? undefined,
      email: url.searchParams.get('email') ?? undefined,
      id: url.searchParams.get('id') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
      includeDeleted: url.searchParams.get('includeDeleted') ?? undefined,
    })
    if (!parsed.success) return errorJson(400, 'Invalid query', parsed.error.flatten())
    const { fingerprint, email, id, limit = 20, cursor, includeDeleted = false } = parsed.data

    // If fingerprint provided, ensure session exists (for backwards compat)
    if (fingerprint) {
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
    }

    // Lookup by email address (no session restriction)
    if (email) {
      const normalizedAddress = email.includes('@') ? email : `${email}@whitebooking.com`
      const found = await prisma.email.findUnique({
        where: { emailAddress: normalizedAddress },
        select: { 
          id: true, 
          emailAddress: true, 
          createdAt: true, 
          isActive: true,
          deletedAt: true,
          isRecovered: true
        },
      })
      if (!found) return errorJson(404, 'Email not found')
      if (!includeDeleted && found.deletedAt) return errorJson(404, 'Email not found')
      return okJson({
        id: found.id,
        address: found.emailAddress,
        createdAt: found.createdAt,
        isActive: found.isActive,
        deletedAt: found.deletedAt,
        isRecovered: found.isRecovered
      })
    }

    // Lookup by ID (no session restriction)
    if (id) {
      const found = await prisma.email.findFirst({
        where: { 
          id,
          ...(includeDeleted ? {} : { deletedAt: null })
        },
        select: { 
          id: true, 
          emailAddress: true, 
          createdAt: true, 
          isActive: true,
          deletedAt: true,
          isRecovered: true
        },
      })
      if (!found) return errorJson(404, 'Email not found')
      return okJson({
        id: found.id,
        address: found.emailAddress,
        createdAt: found.createdAt,
        isActive: found.isActive,
        deletedAt: found.deletedAt,
        isRecovered: found.isRecovered
      })
    }

    // List all emails (no session restriction)
    const emails = await prisma.email.findMany({
      where: includeDeleted ? {} : { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      select: { 
        id: true, 
        emailAddress: true, 
        createdAt: true, 
        isActive: true,
        deletedAt: true,
        isRecovered: true
      },
    })
    const nextCursor = emails.length > limit ? emails[limit].id : undefined
    const page = emails.slice(0, limit).map((emailItem: typeof emails[0]) => ({
      id: emailItem.id,
      address: emailItem.emailAddress,
      createdAt: emailItem.createdAt,
      isActive: emailItem.isActive,
      deletedAt: emailItem.deletedAt,
      isRecovered: emailItem.isRecovered
    }))

    return okJson({ 
      items: page, 
      nextCursor,
      meta: {
        total: page.length,
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
  fingerprint: z.string().min(8).optional(),
  id: z.string().cuid(),
})

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const parsed = DeleteSchema.safeParse({
      fingerprint: url.searchParams.get('fingerprint') ?? undefined,
      id: url.searchParams.get('id'),
    })
    if (!parsed.success) return errorJson(400, 'Invalid query', parsed.error.flatten())
    const { fingerprint, id } = parsed.data

    const email = await prisma.email.findFirst({ 
      where: { id, deletedAt: null }, 
      select: { id: true } 
    })
    if (!email) return errorJson(404, 'Email not found or already deleted')

    // Soft delete - set deletedAt timestamp
    await prisma.email.update({ 
      where: { id }, 
      data: { 
        deletedAt: new Date(),
        deletedBy: fingerprint || 'anonymous',
        isActive: false
      }
    })
    
    return okJson({ 
      message: 'Email deleted successfully.',
      deletedAt: new Date().toISOString()
    })
  } catch (e) {
    console.error('Error deleting email v1:', e)
    return errorJson(500, 'Internal server error')
  }
}

// Recovery endpoint
const RecoverSchema = z.object({
  fingerprint: z.string().min(8).optional(),
  emailAddress: z.string().min(3),
})

export async function PATCH(request: NextRequest) {
  try {
    const json = await request.json()
    const parsed = RecoverSchema.safeParse(json)
    if (!parsed.success) return errorJson(400, 'Invalid request body', parsed.error.flatten())
    const { emailAddress } = parsed.data
    const normalizedAddress = emailAddress.includes('@') ? emailAddress : `${emailAddress}@whitebooking.com`

    // Find the email (no session restriction)
    const email = await prisma.email.findUnique({
      where: { emailAddress: normalizedAddress },
      select: { id: true, sessionId: true, deletedAt: true }
    })

    if (!email) {
      return errorJson(404, 'Email address not found')
    }

    // If already active, return success
    if (!email.deletedAt) {
      return okJson({
        message: 'Email is already active',
        emailAddress: normalizedAddress
      })
    }

    // Recover the email (no session restriction)
    await prisma.email.update({
      where: { emailAddress: normalizedAddress },
      data: {
        deletedAt: null,
        deletedBy: null,
        isActive: true,
        isRecovered: true
      }
    })

    return okJson({
      message: 'Email recovered successfully',
      emailAddress: normalizedAddress,
      recoveredAt: new Date().toISOString()
    })
  } catch (e) {
    console.error('Error recovering email v1:', e)
    return errorJson(500, 'Internal server error')
  }
}
