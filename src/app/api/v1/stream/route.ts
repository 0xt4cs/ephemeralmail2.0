import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { sseManager } from '@/lib/sse-manager'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const fingerprint = url.searchParams.get('fingerprint')
    
    if (!fingerprint || fingerprint.length < 8) {
      return new Response('Invalid fingerprint', { status: 400 })
    }

    const session = await prisma.session.findUnique({
      where: { fingerprint },
      select: { id: true }
    })

    if (!session) {
      return new Response('Session not found', { status: 404 })
    }

    const stream = sseManager.createConnection(fingerprint, request)

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    })

  } catch (error) {
    console.error('SSE connection error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

// sseManager is available for internal use but not exported from API routes
