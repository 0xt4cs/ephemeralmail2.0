import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorJson } from '@/lib/server/api-helpers'

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-fingerprint'
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const { emailId, attachmentName, fingerprint } = await request.json()
    
    if (!emailId || !attachmentName || !fingerprint) {
      return errorJson(400, 'Missing required parameters')
    }
    
    const email = await prisma.receivedEmail.findFirst({
      where: {
        id: emailId,
        email: {
          session: {
            fingerprint: fingerprint
          }
        }
      },
      select: {
        id: true,
        attachments: true,
        headers: true
      }
    })
    
    if (!email) {
      return errorJson(404, 'Email not found')
    }
    
    const attachments = email.attachments ? JSON.parse(email.attachments) : []
    const attachment = attachments.find((att: Record<string, unknown>) => att.name === attachmentName)
    
    if (!attachment) {
      return errorJson(404, 'Attachment not found')
    }
    
    if (!attachment.content) {
      return errorJson(404, 'Attachment content not found')
    }
    
    let binaryContent: Buffer
    try {
      binaryContent = Buffer.from(attachment.content, 'base64')
    } catch (error) {
      console.error('Failed to decode base64 content:', error)
      return errorJson(500, 'Failed to decode attachment content')
    }
    
    const blob = new Blob([new Uint8Array(binaryContent)], { 
      type: attachment.type || 'application/octet-stream' 
    })
    
    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': attachment.type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${attachment.name}"`,
        'Content-Length': binaryContent.length.toString(),
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-fingerprint'
      }
    })
    
  } catch (error) {
    console.error('Attachment download error:', error)
    return errorJson(500, 'Internal server error')
  }
}
