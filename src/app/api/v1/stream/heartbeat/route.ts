import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { sseManager } from '@/lib/sse-manager'
import { okJson, errorJson } from '@/lib/server/api-helpers'
import { z } from 'zod'

const HeartbeatSchema = z.object({
  fingerprint: z.string().min(8),
  operation: z.string(),
  progress: z.number().min(0).max(100).optional(),
  message: z.string().optional(),
  estimatedTime: z.number().optional()
})

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const parsed = HeartbeatSchema.safeParse(json)
    
    if (!parsed.success) {
      return errorJson(400, 'Invalid request body', parsed.error.flatten())
    }

    const { fingerprint, operation, progress, message, estimatedTime } = parsed.data

    const session = await prisma.session.findUnique({
      where: { fingerprint },
      select: { id: true }
    })

    if (!session) {
      return errorJson(404, 'Session not found')
    }

    // Update operation progress in SSE manager
    sseManager.updateOperationProgress(fingerprint, {
      operation: operation as 'email_generation' | 'email_processing' | 'attachment_processing',
      progress: progress || 0,
      message: message || 'Operation in progress...',
      estimatedTime,
      timestamp: Date.now()
    })

    // Send progress update to all connected clients for this fingerprint
    const progressData = {
      operation: operation as 'email_generation' | 'email_processing' | 'attachment_processing',
      progress: progress || 0,
      message: message || 'Operation in progress...',
      estimatedTime,
      timestamp: Date.now()
    }

    const sentCount = sseManager.broadcastProgressToFingerprint(fingerprint, progressData)

    return okJson({
      success: true,
      data: {
        acknowledged: true,
        sentToClients: sentCount,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Heartbeat error:', error)
    return errorJson(500, 'Internal server error')
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, x-fingerprint',
      'Access-Control-Max-Age': '86400'
    }
  })
}
