import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorJson, okJson, withHeaders } from '@/lib/api-helpers'
import { z } from 'zod'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: withHeaders() })
}

const DeleteSchema = z.object({
  emailAddress: z.string().email(),
  clientId: z.string().min(8).optional(), // Optional client identifier
})

export async function DELETE(request: NextRequest) {
  try {
    const json = await request.json()
    const parsed = DeleteSchema.safeParse(json)
    if (!parsed.success) {
      return errorJson(400, 'Invalid request body', parsed.error.flatten())
    }
    const { emailAddress } = parsed.data

    // Find the email (public emails have sessionId starting with 'public-')
    const email = await prisma.email.findFirst({ 
      where: { 
        emailAddress,
        sessionId: { startsWith: 'public-' }, // Only public emails
        deletedAt: null // Not already deleted
      }, 
      select: { id: true } 
    })
    
    if (!email) return errorJson(404, 'Public email not found or already deleted')

    // Soft delete the email
    await prisma.email.update({ 
      where: { id: email.id }, 
      data: { 
        deletedAt: new Date(),
        deletedBy: 'public-api',
        isActive: false
      }
    })
    
    return okJson({
      success: true,
      data: { 
        message: 'Public email soft deleted successfully. It will be permanently deleted after 14 days.',
        emailAddress,
        deletedAt: new Date().toISOString()
      },
      meta: {
        timestamp: new Date().toISOString(),
        credits: 'EphemeralMail by @0xt4cs - https://github.com/0xt4cs'
      }
    })
  } catch (error) {
    console.error('Error soft deleting public email:', error)
    return errorJson(500, 'Internal server error')
  }
}
