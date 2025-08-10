'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Download, 
  Mail, 
  Calendar, 
  User, 
  Eye,
  EyeOff,
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
  const [showHeaders, setShowHeaders] = useState(false)

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
          
          {/* Headers Toggle Button - Now under the date */}
          {selected.headers && (
            <div className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHeaders(!showHeaders)}
                className="text-muted-foreground hover:text-foreground"
              >
                {showHeaders ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Headers
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Show Headers
                  </>
                )}
              </Button>
            </div>
          )}
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
                  <span className={`text-lg ${getFileIcon(attachment.type).color}`}>
                    {getFileIcon(attachment.type).icon}
                  </span>
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

      {/* Headers (Collapsible) */}
      {showHeaders && selected.headers && (
        <div className="border-b border-border bg-muted/50">
          <Card className="border-0 rounded-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Email Headers</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 text-xs">
                {Object.entries(selected.headers).map(([key, value]) => (
                  <div key={key} className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                    <span className="font-mono font-medium text-muted-foreground min-w-[120px]">
                      {key}:
                    </span>
                    <span className="font-mono break-all">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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