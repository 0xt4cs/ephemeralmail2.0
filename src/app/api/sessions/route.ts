import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorJson, okJson, withHeaders } from '@/lib/api-helpers'
import { z } from 'zod'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: withHeaders() })
}

const SessionQuery = z.object({ fingerprint: z.string().min(8) })

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const parsed = SessionQuery.safeParse({ fingerprint: url.searchParams.get('fingerprint') })
    if (!parsed.success) return errorJson(400, 'Invalid query', parsed.error.flatten())
    const { fingerprint } = parsed.data

    const session = await prisma.session.findUnique({
      where: { fingerprint },
      include: {
        emails: {
          orderBy: { createdAt: 'desc' },
          include: { receivedEmails: { orderBy: { receivedAt: 'desc' } } },
        },
      },
    })
    if (!session) return errorJson(404, 'Session not found')

    const totalReceivedEmails = session.emails.reduce((t, e) => t + e.receivedEmails.length, 0)
    const activeEmails = session.emails.filter(e => e.isActive && e.expiresAt > new Date())
    const expiredEmails = session.emails.filter(e => !e.isActive || e.expiresAt <= new Date())

    return okJson({
      session: {
        id: session.id,
        fingerprint: session.fingerprint,
        emailCount: session.emailCount,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
      statistics: {
        totalEmails: session.emails.length,
        activeEmails: activeEmails.length,
        expiredEmails: expiredEmails.length,
        totalReceivedEmails,
        remainingSlots: Math.max(0, 10 - session.emailCount),
      },
      emails: session.emails.map(e => ({
        id: e.id,
        emailAddress: e.emailAddress,
        createdAt: e.createdAt,
        expiresAt: e.expiresAt,
        isActive: e.isActive,
        receivedEmailsCount: e.receivedEmails.length,
      })),
    })
  } catch (e) {
    console.error('Error fetching session:', e)
    return errorJson(500, 'Internal server error')
  }
}

const DeleteQuery = z.object({ fingerprint: z.string().min(8) })

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const parsed = DeleteQuery.safeParse({ fingerprint: url.searchParams.get('fingerprint') })
    if (!parsed.success) return errorJson(400, 'Invalid query', parsed.error.flatten())
    const { fingerprint } = parsed.data

    await prisma.session.delete({ where: { fingerprint } })
    return okJson({ message: 'Session and all associated emails deleted successfully' })
  } catch (e) {
    console.error('Error deleting session:', e)
    return errorJson(500, 'Internal server error')
  }
} 