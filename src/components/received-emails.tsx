"use client"

import { useState, useEffect } from 'react'
import { Mail, Clock, User } from 'lucide-react'
import { truncateText, formatDate } from '@/lib/utils'

interface ReceivedEmail {
  id: string
  fromAddress: string
  subject: string
  receivedAt: Date
  hasAttachments: boolean
}

interface ReceivedEmailsProps {
  fingerprint: string
  selectedEmailAddress: string | null
  onSelectMessage?: (message: {
    id: string
    fromAddress: string
    subject: string
    receivedAt: Date
    bodyHtml?: string | null
    bodyText?: string | null
    headers?: Record<string, string>
    attachments?: Array<{ name: string; size: number; type?: string }>
  }) => void
}

export function ReceivedEmails({ fingerprint, selectedEmailAddress, onSelectMessage }: ReceivedEmailsProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [emails, setEmails] = useState<ReceivedEmail[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch received emails when fingerprint or selected address changes
  useEffect(() => {
    if (fingerprint) {
      void fetchReceivedEmails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint, selectedEmailAddress])

  const fetchReceivedEmails = async (): Promise<void> => {
    try {
      setLoading(true)
      const base = `/api/v1/received?fingerprint=${fingerprint}`
      const response = await fetch(selectedEmailAddress ? `${base}&email=${encodeURIComponent(selectedEmailAddress)}` : base)
      if (response.status === 404) {
        setEmails([])
        setError(null)
        return
      }
      const data = await response.json().catch(() => ({}))
      
      if (response.ok && data?.success) {
        const allReceivedEmails: ReceivedEmail[] = []
        if (Array.isArray(data.data?.items)) {
          // If API returned flattened items for a selected address
          data.data.items.forEach((received: {
            id: string;
            fromAddress: string;
            subject: string;
            receivedAt: string | Date;
            attachments?: string | null;
          }) => {
            allReceivedEmails.push({
              id: received.id,
              fromAddress: received.fromAddress,
              subject: received.subject,
              receivedAt: new Date(received.receivedAt),
              hasAttachments: !!received.attachments && JSON.parse(received.attachments).length > 0,
            })
          })
        } else if (Array.isArray(data.data?.emails)) {
          // Older shape safeguard
          data.data.emails.forEach((email: { receivedEmails: Array<{ id: string; fromAddress: string; subject: string; receivedAt: string | Date; attachments?: string | null }>; }) => {
            email.receivedEmails.forEach((received) => {
              allReceivedEmails.push({
                id: received.id,
                fromAddress: received.fromAddress,
                subject: received.subject,
                receivedAt: new Date(received.receivedAt),
                hasAttachments: received.attachments ? JSON.parse(received.attachments).length > 0 : false,
              })
            })
          })
        }
        setEmails(allReceivedEmails)
      } else {
        const message = typeof data?.error?.message === 'string' ? data.error.message : 'Failed to fetch received emails'
        setError(message)
      }
    } catch (error) {
      setError('Failed to fetch received emails')
      console.error('Error fetching received emails:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEmailClick = (emailId: string) => {
    const msg = emails.find(e => e.id === emailId)
    if (!msg) return
    onSelectMessage?.({
      id: msg.id,
      fromAddress: msg.fromAddress,
      subject: msg.subject,
      receivedAt: msg.receivedAt,
    })
  }

  if (!fingerprint) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Loading fingerprint...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-2">Received Emails</h2>
        {error && (
          <div className="mb-3 p-2 bg-destructive/10 text-destructive text-sm rounded">
            {error}
          </div>
        )}
        {selectedEmail ? (
          <p className="text-sm text-muted-foreground truncate">
            {selectedEmail}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{selectedEmailAddress ? selectedEmailAddress : 'Select an email address to view received emails'}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && emails.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-50 animate-spin" />
            <p>Loading received emails...</p>
          </div>
        ) : emails.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No emails received yet</p>
            <p className="text-sm">Emails will appear here when received</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {emails.map((email) => (
              <div
                key={email.id}
                className="p-3 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => handleEmailClick(email.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">
                        {email.fromAddress}
                      </p>
                      {email.hasAttachments && (
                        <span className="text-xs bg-primary/10 text-primary px-1 py-0.5 rounded">
                          📎
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground mb-1">
                      {truncateText(email.subject, 50)}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDate(email.receivedAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 