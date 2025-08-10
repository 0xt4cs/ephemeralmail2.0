import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorJson, okJson, withHeaders } from '@/lib/api-helpers'
import { z } from 'zod'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: withHeaders() })
}

const RecoverSchema = z.object({
  emailAddress: z.string().email(),
  clientId: z.string().min(8).optional(), // Optional client identifier
})

export async function PATCH(request: NextRequest) {
  try {
    const json = await request.json()
    const parsed = RecoverSchema.safeParse(json)
    if (!parsed.success) {
      return errorJson(400, 'Invalid request body', parsed.error.flatten())
    }
    const { emailAddress } = parsed.data

    // Find soft-deleted public email
    const email = await prisma.email.findFirst({
      where: { 
        emailAddress,
        sessionId: { startsWith: 'public-' }, // Public email
        deletedAt: { not: null },
        expiresAt: { gt: new Date() } // Only recover if not expired
      },
      select: { id: true, deletedAt: true, deletedBy: true }
    })

    if (!email) {
      return errorJson(404, 'Soft-deleted public email not found or expired')
    }

    // Check if this email was deleted by public API (for security)
    if (email.deletedBy && email.deletedBy !== 'public-api') {
      return errorJson(403, 'Email was deleted by a different client')
    }

    // Recover the email
    await prisma.email.update({
      where: { emailAddress },
      data: {
        deletedAt: null,
        deletedBy: null,
        isActive: true,
        isRecovered: true
      }
    })

    return okJson({
      success: true,
      data: {
        message: 'Public email recovered successfully',
        emailAddress,
        recoveredAt: new Date().toISOString()
      },
      meta: {
        timestamp: new Date().toISOString(),
        credits: 'EphemeralMail by @0xt4cs - https://github.com/0xt4cs'
      }
    })
  } catch (error) {
    console.error('Error recovering public email:', error)
    return errorJson(500, 'Internal server error')
  }
}
