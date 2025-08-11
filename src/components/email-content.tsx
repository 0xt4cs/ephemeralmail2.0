'use client'

import { 
  Mail, 
  Calendar, 
  User, 
  Paperclip
} from 'lucide-react'
import { FilePreview } from '@/components/file-preview'

// Function to sanitize and enhance HTML email content using industry best practices
function sanitizeEmailHtml(html: string): string {
  if (!html) return ''
  
  // Create a temporary div to parse and modify the HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  
  // Add email-specific classes and styles
  tempDiv.className = 'email-content'
  
  // Apply Gmail-style email rendering best practices
  
  // 1. Fix images - ensure proper sizing and alt text
  const images = tempDiv.querySelectorAll('img')
  images.forEach(img => {
    const imgElement = img as HTMLElement
    imgElement.style.maxWidth = '100%'
    imgElement.style.height = 'auto'
    imgElement.style.border = 'none'
    imgElement.style.outline = 'none'
    imgElement.style.textDecoration = 'none'
    imgElement.style.display = 'block'
    imgElement.style.margin = '0 auto'
    
    // Ensure alt text for accessibility
    if (!imgElement.getAttribute('alt')) {
      imgElement.setAttribute('alt', 'Image')
    }
  })
  
  // 2. Fix tables - use table-based layouts for email compatibility
  const tables = tempDiv.querySelectorAll('table')
  tables.forEach(table => {
    const tableElement = table as HTMLElement
    tableElement.style.maxWidth = '100%'
    tableElement.style.borderCollapse = 'collapse'
    tableElement.style.borderSpacing = '0'
    tableElement.style.margin = '0'
    tableElement.style.padding = '0'
    
    // Add MSO-specific styles for Outlook compatibility
    tableElement.setAttribute('cellspacing', '0')
    tableElement.setAttribute('cellpadding', '0')
    tableElement.setAttribute('border', '0')
    tableElement.setAttribute('width', '100%')
  })
  
  // 3. Fix table cells for proper email rendering
  const cells = tempDiv.querySelectorAll('td, th')
  cells.forEach(cell => {
    const cellElement = cell as HTMLElement
    cellElement.style.wordWrap = 'break-word'
    cellElement.style.overflowWrap = 'break-word'
    cellElement.style.maxWidth = '100%'
    cellElement.style.verticalAlign = 'top'
    cellElement.style.padding = '10px'
  })
  
  // 4. Fix paragraphs and divs for proper text wrapping
  const textElements = tempDiv.querySelectorAll('p, div, span')
  textElements.forEach(el => {
    const element = el as HTMLElement
    element.style.wordWrap = 'break-word'
    element.style.overflowWrap = 'break-word'
    element.style.maxWidth = '100%'
    element.style.margin = '0 0 16px 0'
    element.style.lineHeight = '1.6'
  })
  
  // 5. Fix buttons and links for better email rendering
  const buttons = tempDiv.querySelectorAll('a, button, .btn, .button')
  buttons.forEach(button => {
    const buttonElement = button as HTMLElement
    buttonElement.style.textDecoration = 'none'
    buttonElement.style.display = 'inline-block'
    buttonElement.style.padding = '12px 24px'
    buttonElement.style.margin = '8px 0'
    buttonElement.style.borderRadius = '4px'
    buttonElement.style.fontWeight = '500'
    buttonElement.style.textAlign = 'center'
  })
  
  // 6. Fix headings for proper hierarchy
  const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6')
  headings.forEach(heading => {
    const headingElement = heading as HTMLElement
    headingElement.style.margin = '24px 0 16px 0'
    headingElement.style.lineHeight = '1.2'
    headingElement.style.fontWeight = '600'
  })
  
  // 7. Fix lists for proper spacing
  const lists = tempDiv.querySelectorAll('ul, ol')
  lists.forEach(list => {
    const listElement = list as HTMLElement
    listElement.style.margin = '16px 0'
    listElement.style.paddingLeft = '24px'
  })
  
  const listItems = tempDiv.querySelectorAll('li')
  listItems.forEach(item => {
    const itemElement = item as HTMLElement
    itemElement.style.margin = '8px 0'
    itemElement.style.lineHeight = '1.6'
  })
  
  // 8. Fix blockquotes for proper styling
  const blockquotes = tempDiv.querySelectorAll('blockquote')
  blockquotes.forEach(quote => {
    const quoteElement = quote as HTMLElement
    quoteElement.style.margin = '16px 0'
    quoteElement.style.padding = '16px'
    quoteElement.style.borderLeft = '4px solid #e5e7eb'
    quoteElement.style.backgroundColor = '#f9fafb'
    quoteElement.style.fontStyle = 'italic'
  })
  
  // 9. Fix email-specific inline styles that might conflict
  const allElements = tempDiv.querySelectorAll('*')
  allElements.forEach(el => {
    const element = el as HTMLElement
    
    // Remove problematic inline styles that might break layout
    if (element.style.fontFamily && element.style.fontFamily.includes('Arial')) {
      element.style.fontFamily = 'inherit'
    }
    
    // Ensure proper color inheritance
    if (element.style.color && element.style.color !== 'inherit') {
      element.style.color = 'inherit'
    }
    
    // Fix background colors that might be too bright
    if (element.style.backgroundColor && 
        (element.style.backgroundColor.includes('white') || 
         element.style.backgroundColor.includes('#ffffff'))) {
      element.style.backgroundColor = 'transparent'
    }
    
    // Ensure proper text alignment
    if (element.style.textAlign && element.style.textAlign === 'center') {
      element.style.textAlign = 'left'
    }
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
            <div className="email-wrapper" style={{ maxWidth: '800px', margin: '0 auto' }}>
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
                  MozOsxFontSmoothing: 'grayscale',
                  backgroundColor: 'transparent',
                  color: 'inherit'
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