import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { okJson, errorJson } from '@/lib/server/api-helpers'

export async function POST(request: NextRequest) {
  try {
    const { emailId, attachmentName, fingerprint } = await request.json()
    
    if (!emailId || !attachmentName || !fingerprint) {
      return errorJson(400, 'Missing required parameters')
    }
    
    // Find the email with the attachment
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
    
    // Parse attachments from JSON
    const attachments = email.attachments ? JSON.parse(email.attachments) : []
    const attachment = attachments.find((att: any) => att.name === attachmentName)
    
    if (!attachment) {
      return errorJson(404, 'Attachment not found')
    }
    
    // For now, we'll return a placeholder since we need to implement
    // proper attachment storage. In a real implementation, you'd:
    // 1. Store attachments in a file system or cloud storage
    // 2. Retrieve the actual file content
    // 3. Return it as a proper blob
    
    // Create a placeholder file for demonstration
    const placeholderContent = `This is a placeholder for ${attachment.name}
    
Original attachment details:
- Name: ${attachment.name}
- Size: ${attachment.size} bytes
- Type: ${attachment.type || 'unknown'}

In a production environment, this would contain the actual file content.`

    const blob = new Blob([placeholderContent], { 
      type: attachment.type || 'application/octet-stream' 
    })
    
    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': attachment.type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${attachment.name}"`,
        'Cache-Control': 'no-cache'
      }
    })
    
  } catch (error) {
    console.error('Attachment download error:', error)
    return errorJson(500, 'Internal server error')
  }
}
