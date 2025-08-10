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
export function getFileIcon(type?: string): { icon: string; color: string } {
  if (!type) return { icon: '📄', color: 'text-gray-500' }
  
  if (type.startsWith('image/')) return { icon: '🖼️', color: 'text-green-500' }
  if (type.startsWith('video/')) return { icon: '🎥', color: 'text-purple-500' }
  if (type.startsWith('audio/')) return { icon: '🎵', color: 'text-blue-500' }
  if (type.includes('pdf')) return { icon: '📕', color: 'text-red-500' }
  if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return { icon: '📦', color: 'text-orange-500' }
  if (type.includes('doc') || type.includes('word')) return { icon: '📘', color: 'text-blue-600' }
  if (type.includes('xls') || type.includes('excel')) return { icon: '📗', color: 'text-green-600' }
  if (type.includes('ppt') || type.includes('powerpoint')) return { icon: '📙', color: 'text-orange-600' }
  if (type.includes('txt')) return { icon: '📄', color: 'text-gray-500' }
  if (type.includes('json') || type.includes('xml')) return { icon: '📋', color: 'text-yellow-500' }
  
  return { icon: '📄', color: 'text-gray-500' }
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
