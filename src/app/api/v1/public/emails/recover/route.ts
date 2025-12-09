import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorJson, okJson, withHeaders } from '@/lib/api-helpers'
import { z } from 'zod'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: withHeaders() })
}

const RecoverSchema = z.object({
  emailAddress: z.string().email(),
  clientId: z.string().min(8).optional(),
})

export async function PATCH(request: NextRequest) {
  try {
    const json = await request.json()
    const parsed = RecoverSchema.safeParse(json)
    if (!parsed.success) {
      return errorJson(400, 'Invalid request body', parsed.error.flatten())
    }
    const { emailAddress } = parsed.data

    const email = await prisma.email.findFirst({
      where: { 
        emailAddress,
        deletedAt: { not: null }
      },
      select: { id: true, deletedAt: true, deletedBy: true }
    })

    if (!email) {
      return errorJson(404, 'Soft-deleted email not found')
    }

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
      message: 'Email recovered successfully',
      address: emailAddress,
      recoveredAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error recovering public email:', error)
    return errorJson(500, 'Internal server error')
  }
}
