import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorJson, withHeaders } from '@/lib/api-helpers'
import { getFilePreviewInfo, canPreviewFile } from '@/lib/file-preview-utils'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: withHeaders() })
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const emailId = url.searchParams.get('emailId')
    const attachmentName = url.searchParams.get('attachmentName')
    const fingerprint = url.searchParams.get('fingerprint')
    const previewType = url.searchParams.get('preview')

    if (!emailId || !attachmentName || !fingerprint) {
      return errorJson(400, 'Missing required parameters')
    }

    const session = await prisma.session.findUnique({
      where: { fingerprint },
      select: { id: true }
    })

    if (!session) {
      return errorJson(404, 'Session not found')
    }

    const email = await prisma.email.findFirst({
      where: {
        id: emailId,
        OR: [
          { sessionId: session.id },
          { sessionId: { startsWith: 'public-' } }
        ]
      },
      select: { id: true }
    })

    if (!email) {
      return errorJson(404, 'Email not found')
    }

    const receivedEmail = await prisma.receivedEmail.findFirst({
      where: { emailId: email.id },
      select: { attachments: true }
    })

    if (!receivedEmail || !receivedEmail.attachments) {
      return errorJson(404, 'Attachment not found')
    }

    let attachments: Array<{
      name: string
      size: number
      type?: string
      content?: string
    }> = []

    try {
      attachments = JSON.parse(receivedEmail.attachments)
    } catch {
      return errorJson(500, 'Invalid attachment data')
    }

    const attachment = attachments.find(a => a.name === attachmentName)
    if (!attachment) {
      return errorJson(404, 'Attachment not found')
    }

    if (!attachment.content) {
      console.log('Attachment content missing for:', {
        emailId,
        attachmentName,
        attachment: {
          name: attachment.name,
          size: attachment.size,
          type: attachment.type
        }
      })
      return errorJson(404, 'Attachment content not available for preview. Please download the file instead.')
    }

    if (!canPreviewFile(attachment.name, attachment.type || '', attachment.size)) {
      return errorJson(400, 'File type not supported for preview')
    }

    const previewInfo = getFilePreviewInfo(attachment.name, attachment.type)

    switch (previewType) {
      case 'image':
        if (previewInfo.previewType !== 'image') {
          return errorJson(400, 'File is not an image')
        }
        return handleImagePreview(attachment)
      
      case 'pdf':
        if (previewInfo.previewType !== 'pdf') {
          return errorJson(400, 'File is not a PDF')
        }
        return handlePdfPreview(attachment)
      
      case 'text':
        if (previewInfo.previewType !== 'text' && previewInfo.previewType !== 'code') {
          return errorJson(400, 'File is not a text file')
        }
        return handleTextPreview(attachment)
      
      case 'video':
        if (previewInfo.previewType !== 'video') {
          return errorJson(400, 'File is not a video')
        }
        return handleVideoPreview(attachment)
      
      case 'audio':
        if (previewInfo.previewType !== 'audio') {
          return errorJson(400, 'File is not an audio file')
        }
        return handleAudioPreview(attachment)
      
      default:
        return errorJson(400, 'Invalid preview type')
    }
  } catch (error) {
    console.error('Error in preview endpoint:', error)
    return errorJson(500, 'Internal server error')
  }
}

function handleImagePreview(attachment: { name: string; content?: string; type?: string }) {
  if (!attachment.content) {
    return errorJson(404, 'Image content not found')
  }

  try {
    const buffer = Buffer.from(attachment.content, 'base64')
    const mimeType = attachment.type || 'image/jpeg'
    
    return new Response(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  } catch {
    return errorJson(500, 'Failed to decode image')
  }
}

function handlePdfPreview(attachment: { name: string; content?: string }) {
  if (!attachment.content) {
    return errorJson(404, 'PDF content not found')
  }

  try {
    const buffer = Buffer.from(attachment.content, 'base64')
    
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  } catch {
    return errorJson(500, 'Failed to decode PDF')
  }
}

function handleTextPreview(attachment: { name: string; content?: string; type?: string }) {
  if (!attachment.content) {
    return errorJson(404, 'Text content not found')
  }

  try {
    const buffer = Buffer.from(attachment.content, 'base64')
    const text = buffer.toString('utf-8')
    const mimeType = attachment.type || 'text/plain'
    
    return new Response(text, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  } catch {
    return errorJson(500, 'Failed to decode text')
  }
}

// Handle video preview
function handleVideoPreview(attachment: { name: string; content?: string; type?: string }) {
  if (!attachment.content) {
    return errorJson(404, 'Video content not found')
  }

  try {
    const buffer = Buffer.from(attachment.content, 'base64')
    const mimeType = attachment.type || 'video/mp4'
    
    return new Response(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  } catch {
    return errorJson(500, 'Failed to decode video')
  }
}

function handleAudioPreview(attachment: { name: string; content?: string; type?: string }) {
  if (!attachment.content) {
    return errorJson(404, 'Audio content not found')
  }

  try {
    const buffer = Buffer.from(attachment.content, 'base64')
    const mimeType = attachment.type || 'audio/mpeg'
    
    return new Response(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  } catch {
    return errorJson(500, 'Failed to decode audio')
  }
}