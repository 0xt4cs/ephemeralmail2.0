'use client'

import { 
  Mail, 
  Calendar, 
  User, 
  Paperclip
} from 'lucide-react'
import { FilePreview } from '@/components/file-preview'

// Function to sanitize and enhance HTML email content
function sanitizeEmailHtml(html: string): string {
  if (!html) return ''
  
  // Create a temporary div to parse and modify the HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  
  // Add email-specific classes and styles
  tempDiv.className = 'email-content'
  
  // Ensure all images have proper styling
  const images = tempDiv.querySelectorAll('img')
  images.forEach(img => {
    const imgElement = img as HTMLElement
    imgElement.style.maxWidth = '100%'
    imgElement.style.height = 'auto'
    imgElement.style.border = 'none'
    imgElement.style.outline = 'none'
    imgElement.style.textDecoration = 'none'
  })
  
  // Ensure all tables have proper styling
  const tables = tempDiv.querySelectorAll('table')
  tables.forEach(table => {
    const tableElement = table as HTMLElement
    tableElement.style.maxWidth = '100%'
    tableElement.style.borderCollapse = 'collapse'
    // Add MSO-specific styles for Outlook compatibility
    tableElement.setAttribute('cellspacing', '0')
    tableElement.setAttribute('cellpadding', '0')
  })
  
  // Ensure all paragraphs and divs have proper text wrapping
  const textElements = tempDiv.querySelectorAll('p, div, span, td, th')
  textElements.forEach(el => {
    const element = el as HTMLElement
    element.style.wordWrap = 'break-word'
    element.style.overflowWrap = 'break-word'
    element.style.maxWidth = '100%'
  })
  
  return tempDiv.innerHTML
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
            <div 
              className="prose prose-sm max-w-none dark:prose-invert email-content"
              dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(selected.bodyHtml) }}
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
                lineHeight: '1.6',
                wordWrap: 'break-word',
                maxWidth: '100%',
                overflowWrap: 'break-word',
                pointerEvents: 'auto',
                textRendering: 'optimizeLegibility',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale'
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