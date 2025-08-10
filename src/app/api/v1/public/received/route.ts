import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorJson, okJson, withHeaders } from '@/lib/api-helpers'
import { z } from 'zod'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: withHeaders() })
}

const Query = z.object({
  email: z.string().email(),
  limit: z.coerce.number().min(1).max(100).optional(),
  cursor: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const parsed = Query.safeParse({
      email: url.searchParams.get('email'),
      limit: url.searchParams.get('limit') ?? undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
    })
    if (!parsed.success) return errorJson(400, 'Invalid query', parsed.error.flatten())
    const { email, limit = 20, cursor } = parsed.data

    const emailRow = await prisma.email.findUnique({ where: { emailAddress: email }, select: { id: true } })
    if (!emailRow) return errorJson(404, 'Email address not found')

    const messages = await prisma.receivedEmail.findMany({
      where: { emailId: emailRow.id },
      orderBy: { receivedAt: 'desc' },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      select: {
        id: true,
        fromAddress: true,
        subject: true,
        bodyHtml: true,
        bodyText: true,
        headers: true,
        attachments: true,
        receivedAt: true,
      },
    })
    const nextCursor = messages.length > limit ? messages[limit].id : undefined
    const items = messages.slice(0, limit).map(message => ({
      id: message.id,
      fromAddress: message.fromAddress,
      subject: message.subject,
      bodyHtml: message.bodyHtml,
      bodyText: message.bodyText,
      headers: message.headers ? JSON.parse(message.headers) : {},
      attachments: message.attachments ? JSON.parse(message.attachments) : [],
      receivedAt: message.receivedAt.toISOString()
    }))

    return okJson({ 
      success: true,
      data: { items, nextCursor },
      meta: {
        total: items.length,
        email: email,
        timestamp: new Date().toISOString()
      }
    }, { 'Cache-Control': 'public, max-age=5' })
  } catch (e) {
    console.error('Error public received list:', e)
    return errorJson(500, 'Internal server error')
  }
}


