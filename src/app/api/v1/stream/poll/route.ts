import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { sseManager } from '@/lib/sse-manager'
import { okJson, errorJson } from '@/lib/server/api-helpers'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const fingerprint = url.searchParams.get('fingerprint')
    const lastUpdate = url.searchParams.get('lastUpdate')
    
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

    // Check for new emails since last update
    const lastUpdateTime = lastUpdate ? new Date(parseInt(lastUpdate)) : new Date(0)
    
    const newEmails = await prisma.receivedEmail.findMany({
      where: {
        email: {
          sessionId: session.id
        },
        receivedAt: {
          gt: lastUpdateTime
        }
      },
      orderBy: {
        receivedAt: 'desc'
      },
      take: 10,
      include: {
        email: {
          select: {
            id: true,
            emailAddress: true
          }
        }
      }
    })

    // If there are new emails, return them as SSE messages
    if (newEmails.length > 0) {
      const emailData = newEmails[0] // Return the most recent email
      const message = {
        type: 'email_received' as const,
        timestamp: new Date().toISOString(),
        data: {
          emailId: emailData.email.id,
          fromAddress: emailData.fromAddress,
          subject: emailData.subject,
          receivedAt: emailData.receivedAt.toISOString(),
          attachmentCount: emailData.attachments ? JSON.parse(emailData.attachments).length : 0
        }
      }

      return okJson({
        success: true,
        data: message,
        hasUpdates: true
      })
    }

    // Check if there are any active operations that need progress updates
    const activeOperations = sseManager.getActiveOperations(fingerprint)
    if (activeOperations.length > 0) {
      const latestOperation = activeOperations[0]
      const message = {
        type: 'progress' as const,
        timestamp: new Date().toISOString(),
        data: {
          operation: latestOperation.operation,
          progress: latestOperation.progress,
          message: latestOperation.message,
          estimatedTime: latestOperation.estimatedTime
        }
      }

      return okJson({
        success: true,
        data: message,
        hasUpdates: true
      })
    }

    // No updates
    return okJson({
      success: true,
      data: null,
      hasUpdates: false
    })

  } catch (error) {
    console.error('Polling error:', error)
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
