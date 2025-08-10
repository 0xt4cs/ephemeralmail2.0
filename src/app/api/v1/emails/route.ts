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
})

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const parsed = QuerySchema.safeParse({
      fingerprint: url.searchParams.get('fingerprint'),
      id: url.searchParams.get('id') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
    })
    if (!parsed.success) return errorJson(400, 'Invalid query', parsed.error.flatten())
    const { fingerprint, id, limit = 20, cursor } = parsed.data

    const session = await prisma.session.findUnique({ where: { fingerprint }, select: { id: true } })
    if (!session) return errorJson(404, 'Session not found')

    if (id) {
      const email = await prisma.email.findFirst({
        where: { id, sessionId: session.id },
        select: { id: true, emailAddress: true, createdAt: true, expiresAt: true, isActive: true },
      })
      if (!email) return errorJson(404, 'Email not found')
      return okJson({
        id: email.id,
        address: email.emailAddress,
        createdAt: email.createdAt,
        expiresAt: email.expiresAt,
        isActive: email.isActive
      })
    }

    const emails = await prisma.email.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      select: { id: true, emailAddress: true, createdAt: true, expiresAt: true, isActive: true },
    })
    const nextCursor = emails.length > limit ? emails[limit].id : undefined
    const page = emails.slice(0, limit).map(email => ({
      id: email.id,
      address: email.emailAddress,
      createdAt: email.createdAt,
      expiresAt: email.expiresAt,
      isActive: email.isActive
    }))

    return okJson({ items: page, nextCursor }, {
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

    const email = await prisma.email.findFirst({ where: { id, sessionId: session.id }, select: { id: true } })
    if (!email) return errorJson(404, 'Email not found or not owned by this session')

    await prisma.email.delete({ where: { id } })
    await prisma.session.update({ where: { id: session.id }, data: { emailCount: { decrement: 1 } } })
    return okJson({ message: 'Email deleted successfully' })
  } catch (e) {
    console.error('Error deleting email v1:', e)
    return errorJson(500, 'Internal server error')
  }
}
