import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { okJson, errorJson } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const fingerprint = url.searchParams.get('fingerprint')
    
    if (!fingerprint || fingerprint.length < 8) {
      return errorJson(400, 'Invalid fingerprint')
    }

    const session = await prisma.session.findUnique({
      where: { fingerprint },
      select: { id: true }
    })

    if (!session) {
      return errorJson(404, 'Session not found')
    }

    return okJson({ 
      message: 'Socket.IO connection available',
      fingerprint,
      connectionType: 'socket.io',
      hint: 'Connect using Socket.IO client library',
      endpoint: '/' 
    })

  } catch (error) {
    console.error('[Stream Route] Error:', error)
    return errorJson(500, 'Internal server error')
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Cache-Control, x-fingerprint',
      'Access-Control-Max-Age': '86400'
    }
  })
}
