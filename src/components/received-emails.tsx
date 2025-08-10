'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  RefreshCw, 
  Mail, 
  Paperclip,
  Calendar,
  User
} from 'lucide-react'

interface ReceivedEmail {
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
}

interface ReceivedEmailsProps {
  fingerprint: string
  selectedEmailAddress: string
  onSelectMessage: (message: ReceivedEmail) => void
}

export function ReceivedEmails({ fingerprint, selectedEmailAddress, onSelectMessage }: ReceivedEmailsProps) {
  const [emails, setEmails] = useState<ReceivedEmail[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fetchEmails = useCallback(async () => {
    if (!fingerprint || !selectedEmailAddress) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/v1/received?fingerprint=${fingerprint}&email=${encodeURIComponent(selectedEmailAddress)}`)
      if (!response.ok) throw new Error('Failed to fetch emails')
      
      const data = await response.json()
      if (data.success) {
        setEmails(data.data.items || [])
      } else {
        throw new Error(data.error || 'Failed to fetch emails')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch emails')
    } finally {
      setLoading(false)
    }
  }, [fingerprint, selectedEmailAddress])

  useEffect(() => {
    if (selectedEmailAddress) {
      fetchEmails()
    } else {
      setEmails([])
    }
  }, [selectedEmailAddress, fetchEmails])

  const filteredEmails = emails.filter(email => 
    email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.fromAddress.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
      
      if (diffInHours < 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } else if (diffInHours < 168) { // 7 days
        return date.toLocaleDateString([], { weekday: 'short' })
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
      }
    } catch {
      return 'Unknown'
    }
  }

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (!selectedEmailAddress) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select an email address to view received messages</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Received Messages
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchEmails}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground p-4">
            <Mail className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">
              {searchTerm ? 'No messages match your search' : 'No messages received yet'}
            </p>
            <p className="text-xs">
              {searchTerm ? 'Try a different search term' : 'Messages will appear here when received'}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {filteredEmails.map((email) => (
              <div
                key={email.id}
                className="group p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer"
                onClick={() => onSelectMessage(email)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm line-clamp-1 mb-1">
                      {email.subject || '(No Subject)'}
                    </h3>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span className="truncate">{email.fromAddress}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground shrink-0">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(email.receivedAt)}</span>
                  </div>
                </div>

                {/* Preview */}
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {email.bodyText ? 
                    truncateText(email.bodyText, 100) : 
                    email.bodyHtml ? 
                      truncateText(email.bodyHtml.replace(/<[^>]*>/g, ''), 100) : 
                      'No content'
                  }
                </div>

                {/* Attachments */}
                {email.attachments && email.attachments.length > 0 && (
                  <div className="flex items-center space-x-1 mt-2">
                    <Paperclip className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs">
                      {email.attachments.length} attachment{email.attachments.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          {filteredEmails.length} of {emails.length} messages
          {searchTerm && ' (filtered)'}
        </p>
      </div>
    </div>
  )
} 