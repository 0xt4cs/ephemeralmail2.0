import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorJson, okJson, withHeaders, verifyWebhookSecret, sanitizeIncomingHtml } from '@/lib/api-helpers'
import { z } from 'zod'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: withHeaders() })
}

const GetQuerySchema = z.object({
  fingerprint: z.string().min(8),
  email: z.string().email().optional(),
  id: z.string().cuid().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  cursor: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const parsed = GetQuerySchema.safeParse({
      fingerprint: url.searchParams.get('fingerprint') ?? '',
      email: url.searchParams.get('email') ?? undefined,
      id: url.searchParams.get('id') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
    })
    if (!parsed.success) return errorJson(400, 'Invalid query', parsed.error.flatten())
    const { fingerprint, email, id, limit = 20, cursor } = parsed.data

    const session = await prisma.session.findUnique({ where: { fingerprint }, select: { id: true } })
    if (!session) return errorJson(404, 'Session not found')

    const owned = await prisma.email.findFirst({
      where: { sessionId: session.id, ...(id ? { id } : {}), ...(email ? { emailAddress: email } : {}) },
      select: { id: true },
    })
    if (!owned) return errorJson(404, 'Email not found in this session')

    const messages = await prisma.receivedEmail.findMany({
      where: { emailId: owned.id },
      orderBy: { receivedAt: 'desc' },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      select: { id: true, fromAddress: true, subject: true, bodyHtml: true, bodyText: true, headers: true, attachments: true, receivedAt: true },
    })
    const nextCursor = messages.length > limit ? messages[limit].id : undefined
    const page = messages.slice(0, limit).map((message: typeof messages[0]) => ({
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
      items: page, 
      nextCursor,
      meta: {
        total: page.length,
        email: email || 'all',
        timestamp: new Date().toISOString()
      }
    }, {
      'Cache-Control': 'private, max-age=5',
    })
  } catch (e) {
    console.error('Error fetching received emails v1:', e)
    return errorJson(500, 'Internal server error')
  }
}

const PostSchema = z.object({
  emailAddress: z.string().email(),
  fromAddress: z.string().min(3),
  subject: z.string().min(1),
  bodyHtml: z.string().optional().nullable(),
  bodyText: z.string().optional().nullable(),
  headers: z.record(z.string(), z.any()).optional(),
  messageId: z.string().min(3),
  attachments: z.array(z.object({ name: z.string(), size: z.number().int().nonnegative(), type: z.string().optional() })).optional(),
})

export async function POST(request: NextRequest) {
  const auth = verifyWebhookSecret(request)
  if (!auth.ok) return errorJson(401, auth.reason ?? 'Unauthorized')

  try {
    const json = await request.json()
    const parsed = PostSchema.safeParse(json)
    if (!parsed.success) return errorJson(400, 'Invalid request body', parsed.error.flatten())

    const { emailAddress, fromAddress, subject, bodyHtml, bodyText, headers, messageId, attachments } = parsed.data

    const email = await prisma.email.findUnique({ where: { emailAddress }, select: { id: true } })
    if (!email) return errorJson(404, 'Email address not found')

    const existing = await prisma.receivedEmail.findUnique({ where: { messageId } })
    if (existing) return errorJson(409, 'Message already exists')

    const sanitizedHtml = sanitizeIncomingHtml(bodyHtml ?? null)

    const receivedEmail = await prisma.receivedEmail.create({
      data: {
        emailId: email.id,
        fromAddress,
        subject,
        bodyHtml: sanitizedHtml ?? undefined,
        bodyText: bodyText ?? undefined,
        headers: JSON.stringify(headers ?? {} as Record<string, unknown>),
        messageId,
        attachments: attachments ? JSON.stringify(attachments) : null,
      },
      select: { id: true, emailId: true, fromAddress: true, subject: true, receivedAt: true },
    })

    return okJson({
      id: receivedEmail.id,
      emailId: receivedEmail.emailId,
      fromAddress: receivedEmail.fromAddress,
      subject: receivedEmail.subject,
      receivedAt: receivedEmail.receivedAt.toISOString(),
      message: 'Email received successfully'
    })
  } catch (e) {
    console.error('Error creating received email v1:', e)
    return errorJson(500, 'Internal server error')
  }
}
