'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'
import {
  Search,
  Paperclip,
  Calendar,
  User,
  MoreVertical,
  ChevronRight
} from 'lucide-react'
import { MessageSkeletonLoader } from '@/components/skeleton-loader'
import { EmptyState } from '@/components/empty-state'
import { useRealtimeContext } from '@/contexts/realtime-context'
import { motion, AnimatePresence } from 'framer-motion'

const activeNotifications = new Set<HTMLElement>()

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
  selectedMessage?: ReceivedEmail | null
  onSelectMessage: (message: ReceivedEmail) => void
}

export function ReceivedEmails({ fingerprint, selectedEmailAddress, selectedMessage, onSelectMessage }: ReceivedEmailsProps) {
  const [emails, setEmails] = useState<ReceivedEmail[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fetchingRef = useRef(false)

  const fetchEmails = useCallback(async () => {
    if (!selectedEmailAddress) return

    if (fetchingRef.current) return

    fetchingRef.current = true
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/v1/received?email=${encodeURIComponent(selectedEmailAddress)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000)
      })

      if (!response.ok) {
        if (response.status === 404) {
          setEmails([])
          return
        }
        throw new Error(`HTTP ${response.status}: Failed to fetch emails`)
      }

      const data = await response.json()
      if (data.success) {
        setEmails(data.data.items || [])
      } else {
        throw new Error(data.error || 'Failed to fetch emails')
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timeout - please check your connection')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch emails')
      }
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [selectedEmailAddress])

  const { lastMessage, registerRefreshCallback } = useRealtimeContext()

  useEffect(() => {
    const unregister = registerRefreshCallback(fetchEmails)
    return unregister
  }, [registerRefreshCallback, fetchEmails])

  useEffect(() => {
    if (selectedEmailAddress) {
      fetchEmails()
    } else {
      setEmails([])
    }
  }, [selectedEmailAddress, fetchEmails])

  useEffect(() => {
    if (lastMessage?.type === 'email_received' && selectedEmailAddress) {
      fetchEmails()

      const emailData = lastMessage.data as { fromAddress?: string }
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-primary/90 backdrop-blur-xl border border-primary/20 text-white px-5 py-3 rounded-full shadow-2xl z-50 text-sm font-medium flex items-center gap-2 transform transition-all duration-300 translate-y-0 opacity-100'
      notification.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg> <span>New email from <b>${emailData?.fromAddress || 'someone'}</b></span>`
      document.body.appendChild(notification)

      activeNotifications.add(notification)

      const timeoutId = setTimeout(() => {
        notification.classList.add('translate-y-4', 'opacity-0')
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification)
            activeNotifications.delete(notification)
          }
        }, 300)
      }, 3000)

      return () => {
        clearTimeout(timeoutId)
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
          activeNotifications.delete(notification)
        }
      }
    }
  }, [lastMessage, selectedEmailAddress, fetchEmails])

  useEffect(() => {
    return () => {
      activeNotifications.forEach(notification => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      })
      activeNotifications.clear()
    }
  }, [])

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
      } else if (diffInHours < 168) {
        return date.toLocaleDateString([], { weekday: 'short' })
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
      }
    } catch {
      return 'Unknown'
    }
  }

  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (!selectedEmailAddress) {
    return <EmptyState type="select-email" />
  }

  return (
    <div className="h-full flex flex-col bg-background/50 backdrop-blur-sm border-r border-border/50">
      {/* Header & Search */}
      <div className="p-5 border-b border-border/40 shrink-0 bg-background/80 backdrop-blur-xl z-10">
        <h2 className="text-sm font-semibold tracking-wide text-foreground/80 uppercase mb-4 flex items-center justify-between">
          <span>Inbox</span>
          {emails.length > 0 && (
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px]">{emails.length}</span>
          )}
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Search emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-sm bg-card/50 border-border/60 focus:ring-primary/50 transition-all rounded-lg"
          />
        </div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive font-medium">
            {error}
          </motion.div>
        )}
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-auto p-3 space-y-2 scroller">
        {loading ? (
          <MessageSkeletonLoader count={4} />
        ) : filteredEmails.length === 0 ? (
          searchTerm ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground p-4">
              <Search className="h-10 w-10 mb-3 opacity-30 text-primary" />
              <p className="text-sm font-medium text-foreground">No matches found</p>
              <p className="text-xs">Try adjusting your search</p>
            </motion.div>
          ) : (
            <EmptyState type="no-messages" />
          )
        ) : (
          <AnimatePresence initial={false}>
            {filteredEmails.map((email) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                key={email.id}
                className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden flex ${selectedMessage?.id === email.id
                    ? 'border-primary/40 bg-card shadow-[0_4px_20px_rgba(var(--primary),0.05)] ring-1 ring-primary/20'
                    : 'border-border/40 bg-card/40 hover:bg-card hover:border-border/80'
                  }`}
                onClick={() => onSelectMessage(email)}
              >
                {/* Unread dot or active bar conceptually */}
                {selectedMessage?.id === email.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl" />
                )}

                <div className="flex-1 min-w-0 pr-2 space-y-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-foreground/80 truncate pr-2">
                      <span className="truncate">{email.fromAddress}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-medium shrink-0">
                      {formatDate(email.receivedAt)}
                    </div>
                  </div>

                  <h3 className={`font-semibold text-sm line-clamp-1 pr-4 ${selectedMessage?.id === email.id ? 'text-primary' : 'text-foreground'}`}>
                    {email.subject || '(No Subject)'}
                  </h3>

                  <div className="text-[13px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {email.bodyText ?
                      truncateText(email.bodyText, 100) :
                      email.bodyHtml ?
                        truncateText(email.bodyHtml.replace(/<[^>]*>/g, ''), 100) :
                        'No content available'
                    }
                  </div>

                  {email.attachments && email.attachments.length > 0 && (
                    <div className="flex items-center space-x-1 mt-3 bg-muted/30 w-fit px-2 py-1 rounded-md border border-border/50">
                      <Paperclip className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        {email.attachments.length} attachment{email.attachments.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}