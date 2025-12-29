import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorJson, okJson, withHeaders } from '@/lib/api-helpers'
import { z } from 'zod'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: withHeaders() })
}

const ListQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  cursor: z.string().optional(),
  includeDeleted: z.coerce.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const parsed = ListQuerySchema.safeParse({
      limit: url.searchParams.get('limit') ?? undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
      includeDeleted: url.searchParams.get('includeDeleted') ?? undefined,
    })
    if (!parsed.success) {
      return errorJson(400, 'Invalid query', parsed.error.flatten())
    }
    const { limit = 50, cursor, includeDeleted = false } = parsed.data

    // Fetch all emails regardless of session
    const emails = await prisma.email.findMany({
      where: includeDeleted ? {} : { deletedAt: null, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      select: { 
        id: true, 
        emailAddress: true, 
        createdAt: true, 
        isActive: true,
      },
    })

    const nextCursor = emails.length > limit ? emails[limit].id : undefined
    const page = emails.slice(0, limit).map((email) => ({
      id: email.id,
      address: email.emailAddress,
      createdAt: email.createdAt.toISOString(),
      isActive: email.isActive,
    }))

    return okJson({
      items: page,
      nextCursor
    }, {
      'Cache-Control': 'public, max-age=10',
    })
  } catch (e) {
    console.error('Error fetching public email list:', e)
    return errorJson(500, 'Internal server error')
  }
}
