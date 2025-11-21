'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Copy, 
  Trash2, 
  RefreshCw, 
  Sparkles,
  Check
} from 'lucide-react'
import { retryRequest } from '@/lib/connectivity-utils'
import { ProgressIndicator } from '@/components/progress-indicator'
import { EmailSkeletonLoader } from '@/components/skeleton-loader'
import { EmptyState } from '@/components/empty-state'
import { useRealtimeContext } from '@/contexts/realtime-context'
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog'

// Track DOM notifications for cleanup (prevent memory leaks)
const activeNotifications = new Set<HTMLElement>()

interface Email {
  id: string
  address: string
  createdAt: string
}

interface EmailListProps {
  fingerprint: string
  selectedEmailAddress: string
  onSelectEmail: (address: string) => void
}

export function EmailList({ fingerprint, selectedEmailAddress, onSelectEmail }: EmailListProps) {
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [customEmail, setCustomEmail] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [emailToDelete, setEmailToDelete] = useState<{ id: string; address: string } | null>(null)
  const { currentProgress, sendHeartbeat, registerRefreshCallback } = useRealtimeContext()
  
  // Prevent race conditions with ref to track ongoing operations
  const fetchingRef = useRef(false)
  const generatingRef = useRef(false)
  const lastGenerateTimeRef = useRef(0) // Debounce timestamp 

  const fetchEmails = useCallback(async () => {
    if (!fingerprint) return
    
    // Prevent concurrent fetches (race condition fix)
    if (fetchingRef.current) {
      return
    }
    
    fetchingRef.current = true
    setLoading(true)
    setError(null)
    
    try {
      await retryRequest(async () => {
        const response = await fetch(`/api/v1/emails?fingerprint=${fingerprint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
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
          const emailList = data.data.items || []
          setEmails(emailList)
        } else {
          throw new Error(data.error || 'Failed to fetch emails')
        }
      })
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
  }, [fingerprint])

  const generateEmail = useCallback(async (custom?: string) => {
    if (!fingerprint) return
    
    // Debounce: Prevent rapid clicks (500ms minimum between requests)
    const now = Date.now()
    if (now - lastGenerateTimeRef.current < 500) {
      return
    }
    lastGenerateTimeRef.current = now
    
    // Prevent concurrent generation (race condition fix)
    if (generatingRef.current) {
      return
    }
    
    generatingRef.current = true
    setGenerating(true)
    setError(null)
    
    // Send initial heartbeat for email generation
    sendHeartbeat('email_generation', 0)
    
    try {
      const response = await fetch('/api/v1/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint,
          customEmail: custom || undefined
        }),
        signal: AbortSignal.timeout(15000)
      })
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded - please wait a moment')
        }
        if (response.status === 409 && custom) {
          const address = custom.includes('@') ? custom : `${custom}@whitebooking.com`
          const claim = await fetch('/api/v1/emails', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fingerprint, emailAddress: custom })
          })
          if (claim.ok) {
            await fetchEmails()
            onSelectEmail(address)
            return
          }
        }
        throw new Error(`HTTP ${response.status}: Failed to generate email`)
      }
      
      const data = await response.json()
      if (data.success) {
        // Show success notification
        const notification = document.createElement('div')
        notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm'
        notification.textContent = `Email generated: ${data.data.address}`
        document.body.appendChild(notification)
        
        // Track notification for cleanup (memory leak fix)
        activeNotifications.add(notification)
        
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification)
            activeNotifications.delete(notification)
          }
        }, 3000)
        
        await fetchEmails()
        if (data.data.address) {
          onSelectEmail(data.data.address)
        }
      } else {
        throw new Error(data.error || 'Failed to generate email')
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timeout - please check your connection')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to generate email')
      }
    } finally {
      setGenerating(false)
      setCustomEmail('')
      generatingRef.current = false
    }
  }, [fingerprint, fetchEmails, onSelectEmail, sendHeartbeat])

  const deleteEmail = useCallback(async (id: string) => {
    if (!fingerprint) return
    
    // Optimistically remove from UI immediately
    const emailToRemove = emails.find(e => e.id === id)
    if (emailToRemove) {
      setEmails(prev => prev.filter(e => e.id !== id))
      if (selectedEmailAddress === emailToRemove.address) {
        onSelectEmail('')
      }
    }
    
    try {
      const response = await fetch(`/api/v1/emails?id=${id}&fingerprint=${fingerprint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000)
      })
      
      if (!response.ok) {
        // Restore email if deletion failed
        if (emailToRemove) {
          setEmails(prev => [...prev, emailToRemove].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ))
        }
        
        if (response.status === 429) {
          throw new Error('Rate limit exceeded - please wait a moment')
        }
        throw new Error(`HTTP ${response.status}: Failed to delete email`)
      }
      
      const data = await response.json()
      if (!data.success) {
        // Restore email if deletion failed
        if (emailToRemove) {
          setEmails(prev => [...prev, emailToRemove].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ))
        }
        throw new Error(data.error || 'Failed to delete email')
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timeout - please check your connection')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to delete email')
      }
    }
  }, [fingerprint, emails, selectedEmailAddress, onSelectEmail])

  const handleDeleteClick = (email: { id: string; address: string }) => {
    setEmailToDelete(email)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (emailToDelete) {
      deleteEmail(emailToDelete.id)
      setDeleteDialogOpen(false)
      setEmailToDelete(null)
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setError('Failed to copy to clipboard')
    }
  }

  // Fetch unread counts for all emails
  const fetchUnreadCounts = useCallback(async () => {
    if (!fingerprint || emails.length === 0) return
    
    const counts: Record<string, number> = {}
    
    for (const email of emails) {
      try {
        const response = await fetch(
          `/api/v1/received?fingerprint=${fingerprint}&email=${encodeURIComponent(email.address)}`,
          { signal: AbortSignal.timeout(5000) }
        )
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            counts[email.address] = data.data.items?.length || 0
          }
        }
      } catch {
        // Silently fail for individual email counts
      }
    }
    
    setUnreadCounts(counts)
  }, [fingerprint, emails])

  useEffect(() => {
    if (fingerprint) {
      fetchEmails()
    }
  }, [fingerprint, fetchEmails])

  // Register for realtime refresh callbacks (so email list updates after generation)
  useEffect(() => {
    if (!fingerprint) return
    
    const unregister = registerRefreshCallback(() => {
      fetchEmails()
    })
    
    return unregister
  }, [fingerprint, registerRefreshCallback, fetchEmails])

  useEffect(() => {
    if (emails.length > 0) {
      fetchUnreadCounts()
    }
  }, [emails.length, fetchUnreadCounts])

  // Cleanup all notifications on unmount (memory leak fix)
  useEffect(() => {
    return () => {
      activeNotifications.forEach((notification: HTMLElement) => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      })
      activeNotifications.clear()
    }
  }, [])

  const handleCustomEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove underscores as they're uncommon in email addresses
    const value = e.target.value.replace(/_/g, '')
    setCustomEmail(value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault() // Prevent form submission
      if (!generating && fingerprint && customEmail) {
        generateEmail(customEmail)
      }
    }
  }


  return (
    <div className="h-full flex flex-col bg-card">
      {/* Generate Controls */}
      <div className="p-4 border-b border-border">
        <div className="space-y-3">
          {/* Custom Email Input */}
          <div className="flex space-x-2">
            <Input
              placeholder="Custom prefix (optional)"
              value={customEmail}
              onChange={handleCustomEmailChange}
              onKeyDown={handleKeyDown}
              className="flex-1 text-sm"
              disabled={generating}
            />
            <Button
              size="sm"
              onClick={() => generateEmail(customEmail)}
              disabled={generating || !fingerprint}
              className="shrink-0"
            >
              {generating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Random Generate Button */}
          <Button
            onClick={() => generateEmail()}
            disabled={generating || !fingerprint}
            className="w-full"
            variant="outline"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            I&apos;m Feeling Lucky
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      <ProgressIndicator 
        progress={currentProgress} 
        onComplete={() => {
          fetchEmails() // Refresh emails after completion
        }}
      />


      {/* Email List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <EmailSkeletonLoader count={5} />
        ) : emails.length === 0 ? (
          <EmptyState type="no-emails" />
        ) : (
          <div className="p-2 space-y-2">
            {emails.map((email) => (
              <div
                key={email.id}
                className={`group relative p-3 rounded-lg border transition-all cursor-pointer hover:bg-accent/50 ${
                  selectedEmailAddress === email.address
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => onSelectEmail(email.address)}
              >
                {/* Email Address */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium text-sm truncate ${
                        selectedEmailAddress === email.address ? 'text-primary' : ''
                      }`}>
                        {email.address}
                      </p>
                      {unreadCounts[email.address] > 0 && (
                        <Badge variant="default" className="h-5 px-1.5 text-xs shrink-0">
                          {unreadCounts[email.address]}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(email.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  {/* Action Buttons - Always visible on mobile, hover on desktop */}
                  <div className="flex items-center space-x-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation()
                        copyToClipboard(email.address, email.id)
                      }}
                      title="Copy to clipboard"
                    >
                      {copiedId === email.id ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation()
                        handleDeleteClick({ id: email.id, address: email.address })
                      }}
                      title="Delete email"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          {emails.length} of 10 addresses used
        </p>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        emailAddress={emailToDelete?.address || ''}
      />
    </div>
  )
} 