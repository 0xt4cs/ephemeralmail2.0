"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, ArrowLeft, Calendar, User, FileText } from 'lucide-react'

interface EmailContent {
  id: string
  fromAddress: string
  subject: string
  receivedAt: Date
  bodyHtml?: string | null
  bodyText?: string | null
  headers?: Record<string, string>
  attachments?: Array<{
    name: string
    size: number
    type?: string
  }>
}

type EmailContentProps = {
  selected: EmailContent | null
}

export function EmailContent({ selected }: EmailContentProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedEmail, setSelectedEmail] = useState<EmailContent | null>(selected)

  const [formattedDate, setFormattedDate] = useState<string>('')

  useEffect(() => {
    setSelectedEmail(selected)
  }, [selected])

  useEffect(() => {
    if (selectedEmail) setFormattedDate(selectedEmail.receivedAt.toLocaleString())
  }, [selectedEmail])

  const exportToPdf = () => {
    // This would implement PDF export functionality
    console.log('Exporting to PDF...')
  }

  if (!selectedEmail) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No email selected</p>
          <p className="text-sm">Select an email from the list to view its content</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Email Header */}
      <div className="p-6 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-semibold">{selectedEmail.subject}</h1>
          </div>
          <Button onClick={exportToPdf} size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>

        {/* Email Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">From:</span>
            <span>{selectedEmail.fromAddress}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Received:</span>
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* HTML Content */}
          {selectedEmail.bodyHtml ? (
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml || '' }}
            />
          ) : null}
          
          {/* Text Content (fallback) */}
          {!selectedEmail.bodyHtml && selectedEmail.bodyText && (
            <div className="whitespace-pre-wrap text-sm">
              {selectedEmail.bodyText}
            </div>
          )}
        </div>
      </div>

      {/* Attachments */}
      {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
        <div className="p-6 border-t border-border bg-card">
          <h3 className="text-sm font-medium mb-3">Attachments</h3>
          <div className="space-y-2">
            {selectedEmail.attachments.map((attachment, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{attachment.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {attachment.type} • {(attachment.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button size="sm" variant="outline">
                  <Download className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 