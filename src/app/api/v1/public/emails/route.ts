import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorJson, okJson, withHeaders } from '@/lib/api-helpers'
import { z } from 'zod'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: withHeaders() })
}

const Query = z.object({
  email: z.string().email(),
})

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const parsed = Query.safeParse({ email: url.searchParams.get('email') })
    if (!parsed.success) return errorJson(400, 'Invalid query', parsed.error.flatten())

    const row = await prisma.email.findUnique({
      where: { emailAddress: parsed.data.email },
      select: { id: true, emailAddress: true, createdAt: true, expiresAt: true, isActive: true },
    })
    if (!row) return errorJson(404, 'Email not found')
    
    return okJson({
      success: true,
      data: {
        id: row.id,
        emailAddress: row.emailAddress,
        createdAt: row.createdAt.toISOString(),
        expiresAt: row.expiresAt.toISOString(),
        isActive: row.isActive
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    }, { 'Cache-Control': 'public, max-age=15' })
  } catch (e) {
    console.error('Error public email get:', e)
    return errorJson(500, 'Internal server error')
  }
}


