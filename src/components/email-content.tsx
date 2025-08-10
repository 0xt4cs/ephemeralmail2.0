'use client'


import { Button } from '@/components/ui/button'
import { 
  Download, 
  Mail, 
  Calendar, 
  User, 
  Paperclip
} from 'lucide-react'
import { handleAttachmentDownload, getFileIcon, formatFileSize } from '@/lib/attachment-handler'

interface EmailContentProps {
  selected: {
    id: string
    fromAddress: string
    subject: string
    receivedAt: string
    bodyHtml?: string | null
    bodyText?: string | null
    headers?: Record<string, string>
    attachments?: Array<{
      name: string
      size: number
      type?: string
    }>
  } | null
}

export function EmailContent({ selected }: EmailContentProps) {

  if (!selected) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select an email to view its content</p>
        </div>
      </div>
    )
  }

  const handleDownload = async (attachment: { name: string; size: number; type?: string }) => {
    // Get fingerprint from localStorage
    const stored = localStorage.getItem('ephemeralmail_fingerprint')
    let fingerprint = 'temp_' + Date.now().toString(36)
    
    if (stored) {
      try {
        const fp = JSON.parse(stored)
        fingerprint = fp.id
      } catch {
        // Use default fingerprint
      }
    }
    
    await handleAttachmentDownload(selected.id, attachment, fingerprint)
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-4 bg-card">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold line-clamp-2">{selected.subject}</h1>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span className="font-medium">{selected.fromAddress}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{new Date(selected.receivedAt).toLocaleString()}</span>
          </div>
          

        </div>

        {/* Attachments */}
        {selected.attachments && selected.attachments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center space-x-2 mb-2">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Attachments ({selected.attachments.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selected.attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 p-2 rounded-md border border-border bg-background hover:bg-accent transition-colors"
                >
                  {(() => {
                    const { icon: Icon, color } = getFileIcon(attachment.name, attachment.type || 'application/octet-stream')
                    return <Icon className={`h-5 w-5 ${color}`} />
                  })()}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attachment.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.size)}
                      {attachment.type && ` • ${attachment.type}`}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={() => handleDownload(attachment)}
                    title={`Download ${attachment.name}`}
                    data-attachment={attachment.name}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>



      {/* Email Body */}
      <div className="flex-1 overflow-auto">
        {selected.bodyHtml ? (
          <div className="p-4">
            <div 
              className="prose prose-sm max-w-none dark:prose-invert email-content"
              dangerouslySetInnerHTML={{ __html: selected.bodyHtml }}
              style={{
                // Ensure email content is properly styled
                fontFamily: 'inherit',
                lineHeight: '1.6',
                wordWrap: 'break-word'
              }}
            />
          </div>
        ) : selected.bodyText ? (
          <div className="p-4">
            <div className="bg-muted/50 p-4 rounded-md overflow-auto">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {selected.bodyText}
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No content available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 