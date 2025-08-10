'use client'

import { useState } from 'react'
import { 
  Image, 
  FileVideo, 
  FileAudio, 
  FileText, 
  FileArchive, 
  FileSpreadsheet, 
  FileQuestion, 
  FileCode,
  Download,
  Eye,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getFilePreviewInfo, generatePreviewUrl } from '@/lib/file-preview-utils'
import NextImage from 'next/image'

interface FilePreviewProps {
  emailId: string
  attachment: {
    name: string
    size: number
    type?: string
  }
  fingerprint: string
  className?: string
}

const iconMap = {
  Image,
  FileVideo,
  FileAudio,
  FileText,
  FileArchive,
  FileSpreadsheet,
  FileQuestion,
  FileCode
}

export function FilePreview({ emailId, attachment, fingerprint, className }: FilePreviewProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  
  const previewInfo = getFilePreviewInfo(attachment.name, attachment.type)
  const fileTypeInfo = getFileTypeInfo(attachment.name, attachment.type)
  
  const IconComponent = iconMap[fileTypeInfo.icon as keyof typeof iconMap] || FileQuestion

  const handlePreview = () => {
    if (!previewInfo.canPreview) return
    
    const url = generatePreviewUrl(emailId, attachment.name, fingerprint, previewInfo.previewType)
    setPreviewUrl(url)
    setShowPreview(true)
  }

  const handleDownload = async () => {
    try {
      const response = await fetch('/api/v1/attachments/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailId,
          attachmentName: attachment.name,
          fingerprint
        })
      })

      if (!response.ok) {
        throw new Error('Download failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={cn("flex items-center justify-between p-3 border rounded-lg bg-card", className)}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <IconComponent className={cn("h-5 w-5 flex-shrink-0", fileTypeInfo.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{attachment.name}</p>
          <p className="text-xs text-muted-foreground">
            {fileTypeInfo.label} • {formatFileSize(attachment.size)}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        {previewInfo.canPreview && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePreview}
            className="h-8 w-8 p-0"
            title="Preview"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          className="h-8 w-8 p-0"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="relative max-w-4xl max-h-[90vh] bg-background rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold truncate">{attachment.name}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-4 max-h-[calc(90vh-120px)] overflow-auto">
               {previewInfo.previewType === 'image' && (
                 <NextImage
                   src={previewUrl}
                   alt={attachment.name}
                   width={800}
                   height={600}
                   className="max-w-full h-auto rounded"
                   style={{ objectFit: 'contain' }}
                 />
               )}
              
              {previewInfo.previewType === 'pdf' && (
                <iframe
                  src={previewUrl}
                  className="w-full h-[70vh] border rounded"
                  title={attachment.name}
                />
              )}
              
              {previewInfo.previewType === 'text' && (
                <pre className="bg-muted p-4 rounded text-sm overflow-auto max-h-[70vh]">
                  <code>{previewUrl}</code>
                </pre>
              )}
              
              {previewInfo.previewType === 'code' && (
                <pre className="bg-muted p-4 rounded text-sm overflow-auto max-h-[70vh]">
                  <code>{previewUrl}</code>
                </pre>
              )}
              
                             {previewInfo.previewType === 'video' && (
                 <video
                   src={previewUrl}
                   controls
                   className="max-w-full h-auto rounded"
                 >
                   Your browser does not support the video tag.
                 </video>
               )}
               
               {previewInfo.previewType === 'audio' && (
                 <div className="flex items-center justify-center p-8">
                   <audio
                     src={previewUrl}
                     controls
                     className="w-full max-w-md"
                   >
                     Your browser does not support the audio tag.
                   </audio>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to get file type info (moved from file-preview-utils to avoid circular dependency)
function getFileTypeInfo(filename: string, mimeType?: string): {
  icon: string
  color: string
  label: string
} {
  const resolvedMimeType = mimeType || 'application/octet-stream'
  
  // Image files
  if (resolvedMimeType.startsWith('image/')) {
    return { icon: 'Image', color: 'text-blue-500', label: 'Image' }
  }
  
  // Video files
  if (resolvedMimeType.startsWith('video/')) {
    return { icon: 'FileVideo', color: 'text-purple-500', label: 'Video' }
  }
  
  // Audio files
  if (resolvedMimeType.startsWith('audio/')) {
    return { icon: 'FileAudio', color: 'text-yellow-500', label: 'Audio' }
  }
  
  // PDF files
  if (resolvedMimeType === 'application/pdf') {
    return { icon: 'FileText', color: 'text-red-500', label: 'PDF' }
  }
  
  // Text files
  if (resolvedMimeType.startsWith('text/')) {
    return { icon: 'FileText', color: 'text-green-500', label: 'Text' }
  }
  
  // Code files
  if (resolvedMimeType.startsWith('application/x-') || resolvedMimeType === 'application/json') {
    return { icon: 'FileCode', color: 'text-indigo-500', label: 'Code' }
  }
  
  // Archives
  if (resolvedMimeType.includes('zip') || resolvedMimeType.includes('rar') || 
      resolvedMimeType.includes('tar') || resolvedMimeType.includes('7z')) {
    return { icon: 'FileArchive', color: 'text-orange-500', label: 'Archive' }
  }
  
  // Office documents
  if (resolvedMimeType.includes('word') || resolvedMimeType.includes('excel') || 
      resolvedMimeType.includes('powerpoint') || resolvedMimeType.includes('document')) {
    return { icon: 'FileSpreadsheet', color: 'text-gray-500', label: 'Document' }
  }
  
  // Default
  return { icon: 'FileQuestion', color: 'text-gray-400', label: 'File' }
}
