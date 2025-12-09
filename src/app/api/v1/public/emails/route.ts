import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorJson, okJson, withHeaders } from '@/lib/api-helpers'
import { z } from 'zod'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: withHeaders() })
}

const QuerySchema = z.object({
  // Accept prefix or full address
  email: z.string().min(3),
})

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const parsed = QuerySchema.safeParse({
      email: url.searchParams.get('email') ?? '',
    })
    if (!parsed.success) return errorJson(400, 'Invalid query', parsed.error.flatten())
    const { email } = parsed.data

    const normalizedAddress = email.includes('@') ? email : `${email}@whitebooking.com`

    const found = await prisma.email.findUnique({
      where: { emailAddress: normalizedAddress },
      select: { id: true, emailAddress: true, createdAt: true, isActive: true }
    })

    if (!found) return errorJson(404, 'Email address not found')

    return okJson({
      id: found.id,
      address: found.emailAddress,
      createdAt: found.createdAt,
      isActive: found.isActive
    })
  } catch (e) {
    console.error('Error fetching public email:', e)
    return errorJson(500, 'Internal server error')
  }
}

 
