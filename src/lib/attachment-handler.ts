import { FileText, Image, FileArchive, FileAudio, FileVideo, FileCode, FileSpreadsheet, FileQuestion, FileCheck } from 'lucide-react'

/**
 * Attachment Handler for EphemeralMail
 * 
 * Handles downloading, processing, and displaying email attachments
 * without corruption or format issues.
 */

export interface Attachment {
  name: string
  size: number
  type?: string
  content?: string | ArrayBuffer
  filename?: string
  contentId?: string
}

/**
 * Download attachment from the server
 */
export async function downloadAttachment(
  emailId: string, 
  attachmentName: string,
  fingerprint: string
): Promise<Blob> {
  try {
    const response = await fetch(`/api/v1/attachments/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailId,
        attachmentName,
        fingerprint
      })
    })

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`)
    }

    return await response.blob()
  } catch (error) {
    console.error('Attachment download error:', error)
    throw new Error('Failed to download attachment')
  }
}

/**
 * Handle attachment download with proper file handling
 */
export async function handleAttachmentDownload(
  emailId: string,
  attachment: Attachment,
  fingerprint: string
): Promise<void> {
  try {
    // Show loading state
    const downloadButton = document.querySelector(`[data-attachment="${attachment.name}"]`) as HTMLButtonElement
    if (downloadButton) {
      downloadButton.disabled = true
      downloadButton.innerHTML = '<span class="animate-spin">⏳</span>'
    }

    // Download the attachment
    const blob = await downloadAttachment(emailId, attachment.name, fingerprint)
    
    // Create download link
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = attachment.name
    a.style.display = 'none'
    
    // Trigger download
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    
    // Clean up
    URL.revokeObjectURL(url)
    
    // Reset button state
    if (downloadButton) {
      downloadButton.disabled = false
      downloadButton.innerHTML = '<svg class="h-4 w-4"><use href="#download-icon"/></svg>'
    }
    
  } catch (error) {
    console.error('Download failed:', error)
    alert(`Failed to download ${attachment.name}. Please try again.`)
    
    // Reset button state on error
    const downloadButton = document.querySelector(`[data-attachment="${attachment.name}"]`) as HTMLButtonElement
    if (downloadButton) {
      downloadButton.disabled = false
      downloadButton.innerHTML = '<svg class="h-4 w-4"><use href="#download-icon"/></svg>'
    }
  }
}

/**
 * Get file icon based on MIME type
 */
export function getFileIcon(filename: string, contentType: string): { icon: React.ComponentType<{ className?: string }>; color: string } {
  const extension = filename.split('.').pop()?.toLowerCase()

  if (contentType.startsWith('image/')) return { icon: Image, color: 'text-blue-500' }
  if (contentType.startsWith('video/')) return { icon: FileVideo, color: 'text-purple-500' }
  if (contentType.startsWith('audio/')) return { icon: FileAudio, color: 'text-yellow-500' }
  if (contentType === 'application/pdf') return { icon: FileText, color: 'text-red-500' }
  if (contentType === 'application/zip' || contentType === 'application/x-rar-compressed' || contentType === 'application/x-7z-compressed') return { icon: FileArchive, color: 'text-orange-500' }
  if (contentType === 'application/msword' || contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return { icon: FileText, color: 'text-blue-600' }
  if (contentType === 'application/vnd.ms-excel' || contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return { icon: FileSpreadsheet, color: 'text-green-600' }
  if (contentType === 'application/vnd.ms-powerpoint' || contentType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return { icon: FileCheck, color: 'text-red-600' }
  if (contentType.startsWith('text/')) return { icon: FileText, color: 'text-gray-500' }

  switch (extension) {
    case 'zip': case 'rar': case '7z': return { icon: FileArchive, color: 'text-orange-500' }
    case 'pdf': return { icon: FileText, color: 'text-red-500' }
    case 'doc': case 'docx': return { icon: FileText, color: 'text-blue-600' }
    case 'xls': case 'xlsx': return { icon: FileSpreadsheet, color: 'text-green-600' }
    case 'ppt': case 'pptx': return { icon: FileCheck, color: 'text-red-600' }
    case 'js': case 'ts': case 'json': case 'xml': case 'html': case 'css': return { icon: FileCode, color: 'text-purple-500' }
    case 'txt': return { icon: FileText, color: 'text-gray-500' }
    case 'mp3': case 'wav': return { icon: FileAudio, color: 'text-yellow-500' }
    case 'mp4': case 'avi': case 'mov': return { icon: FileVideo, color: 'text-purple-500' }
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'bmp': case 'webp': return { icon: Image, color: 'text-blue-500' }
    default: return { icon: FileQuestion, color: 'text-gray-400' }
  }
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Check if file type is supported for preview
 */
export function isPreviewable(type?: string): boolean {
  if (!type) return false
  
  const previewableTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'text/plain', 'text/html', 'text/css', 'text/javascript',
    'application/json', 'application/xml'
  ]
  
  return previewableTypes.includes(type)
}

/**
 * Generate preview URL for supported file types
 */
export function generatePreviewUrl(attachment: Attachment): string | null {
  if (!attachment.content || !isPreviewable(attachment.type)) {
    return null
  }
  
  try {
    if (attachment.type?.startsWith('image/')) {
      return `data:${attachment.type};base64,${attachment.content}`
    }
    
    if (attachment.type?.startsWith('text/')) {
      const blob = new Blob([attachment.content as string], { type: attachment.type })
      return URL.createObjectURL(blob)
    }
    
    return null
  } catch (error) {
    console.error('Preview generation failed:', error)
    return null
  }
}
