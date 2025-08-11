'use client'

import { 
  Mail, 
  Calendar, 
  User, 
  Paperclip
} from 'lucide-react'
import { FilePreview } from '@/components/file-preview'

// Function to preserve original email content without modifications
function preserveOriginalEmail(html: string): string {
  if (!html) return ''
  
  // Simply return the original HTML without any modifications
  // This ensures emails display exactly as the sender intended
  return html
}

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

  const getFingerprint = (): string => {
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
    
    return fingerprint
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


      </div>



      {/* Email Body */}
      <div className="flex-1 overflow-auto">
        {selected.bodyHtml ? (
          <div className="p-4">
            <div className="email-wrapper" style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div 
                className="email-original-content"
                dangerouslySetInnerHTML={{ __html: preserveOriginalEmail(selected.bodyHtml) }}
                style={{
                  maxWidth: '100%',
                  overflowWrap: 'break-word',
                  pointerEvents: 'auto'
                }}
              />
            </div>
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

        {/* Attachments - Moved to bottom */}
        {selected.attachments && selected.attachments.length > 0 && (
          <div className="border-t border-border p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Attachments ({selected.attachments.length})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {selected.attachments.map((attachment, index) => (
                <FilePreview
                  key={index}
                  emailId={selected.id}
                  attachment={attachment}
                  fingerprint={getFingerprint()}
                  className="p-2"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 