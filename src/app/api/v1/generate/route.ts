import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { generateRandomEmail } from '@/lib/utils'
import { z } from 'zod'
import { errorJson, okJson, withHeaders } from '@/lib/api-helpers'
import { checkRateLimit } from '@/lib/rate-limit'
import { sseManager } from '@/lib/sse-manager'

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

    // Send progress update - Starting email generation
    sseManager.updateOperationProgress(fingerprint, {
      operation: 'email_generation',
      progress: 10,
      message: 'Starting email generation...',
      timestamp: Date.now()
    })

    const emailAddress = customEmail ? `${customEmail}@whitebooking.com` : generateRandomEmail()

    // Send progress update - Checking for existing email
    sseManager.updateOperationProgress(fingerprint, {
      operation: 'email_generation',
      progress: 30,
      message: 'Checking for existing email...',
      timestamp: Date.now()
    })

    const existingEmail = await prisma.email.findUnique({ where: { emailAddress } })
    if (existingEmail) {
      if (existingEmail.sessionId === session.id) {
        // Send completion update
        sseManager.updateOperationProgress(fingerprint, {
          operation: 'email_generation',
          progress: 100,
          message: 'Email already exists for this session',
          timestamp: Date.now()
        })
        
        return okJson({ 
          id: existingEmail.id, 
          address: existingEmail.emailAddress, 
          createdAt: existingEmail.createdAt, 
          expiresAt: existingEmail.expiresAt, 
          isActive: existingEmail.isActive 
        })
      }
      return errorJson(409, 'Email address already exists')
    }

    // Send progress update - Creating email
    sseManager.updateOperationProgress(fingerprint, {
      operation: 'email_generation',
      progress: 60,
      message: 'Creating email address...',
      timestamp: Date.now()
    })

    const email = await prisma.email.create({
      data: {
        emailAddress,
        sessionId: session.id,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
      select: { id: true, emailAddress: true, createdAt: true, expiresAt: true, isActive: true },
    })

    // Send progress update - Updating session
    sseManager.updateOperationProgress(fingerprint, {
      operation: 'email_generation',
      progress: 90,
      message: 'Updating session...',
      timestamp: Date.now()
    })

    await prisma.session.update({ where: { id: session.id }, data: { emailCount: session.emailCount + 1 } })

    // Send completion update
    sseManager.updateOperationProgress(fingerprint, {
      operation: 'email_generation',
      progress: 100,
      message: 'Email generated successfully!',
      timestamp: Date.now()
    })

    return okJson({
      id: email.id,
      address: email.emailAddress,
      createdAt: email.createdAt,
      expiresAt: email.expiresAt,
      isActive: email.isActive
    })
  } catch (error) {
    console.error('Error generating email:', error)
    return errorJson(500, 'Internal server error')
  }
}

export async function GET() {
  return okJson({ message: 'Email generation API v1', endpoints: { POST: '/api/v1/generate' } })
}
