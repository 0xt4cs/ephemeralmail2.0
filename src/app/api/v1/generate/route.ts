import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { generateRandomEmail } from '@/lib/utils'
import { z } from 'zod'
import { errorJson, okJson, withHeaders } from '@/lib/api-helpers'
import { checkRateLimit } from '@/lib/rate-limit'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: withHeaders() })
}

const GenerateSchema = z.object({
  fingerprint: z.string().min(8),
  customEmail: z.string().regex(/^[a-z0-9._-]+$/i).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit({ req: request, route: 'POST:/api/v1/generate' })
    if (!rl.allowed) return errorJson(429, 'Too Many Requests')

    const json = await request.json()
    const parsed = GenerateSchema.safeParse(json)
    if (!parsed.success) {
      return errorJson(400, 'Invalid request body', parsed.error.flatten())
    }
    const { fingerprint, customEmail } = parsed.data

    const rlfp = checkRateLimit({ req: request, route: 'POST:/api/v1/generate:fp', fingerprint })
    if (!rlfp.allowed) return errorJson(429, 'Too Many Requests (fingerprint)')

    let session = await prisma.session.findUnique({ where: { fingerprint }, include: { emails: true } })
    if (!session) {
      session = await prisma.session.create({ data: { fingerprint, emailCount: 0 }, include: { emails: true } })
    }

    if (session.emailCount >= 10) {
      return errorJson(429, 'Email limit reached (10 emails per session)')
    }

    const emailAddress = customEmail ? `${customEmail}@ephmail.whitebooking.com` : generateRandomEmail()

    const existingEmail = await prisma.email.findUnique({ where: { emailAddress } })
    if (existingEmail) {
      // If the existing email belongs to this session, return it to avoid exposing others
      if (existingEmail.sessionId === session.id) {
        return okJson({ 
          success: true,
          data: {
            id: existingEmail.id, 
            address: existingEmail.emailAddress, 
            createdAt: existingEmail.createdAt, 
            expiresAt: existingEmail.expiresAt, 
            isActive: existingEmail.isActive 
          },
          message: 'Email already exists',
          meta: {
            timestamp: new Date().toISOString()
          }
        })
      }
      return errorJson(409, 'Email address already exists')
    }

    const email = await prisma.email.create({
      data: {
        emailAddress,
        sessionId: session.id,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
      select: { id: true, emailAddress: true, createdAt: true, expiresAt: true, isActive: true },
    })

    await prisma.session.update({ where: { id: session.id }, data: { emailCount: session.emailCount + 1 } })

    return okJson({
      success: true,
      data: {
        id: email.id,
        address: email.emailAddress,
        createdAt: email.createdAt,
        expiresAt: email.expiresAt,
        isActive: email.isActive
      },
      message: 'Email generated successfully',
      meta: {
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error generating email:', error)
    return errorJson(500, 'Internal server error')
  }
}

export async function GET() {
  return okJson({ message: 'Email generation API v1', endpoints: { POST: '/api/v1/generate' } })
}
