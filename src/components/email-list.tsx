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
import { motion, AnimatePresence } from 'framer-motion'

// Helper for beautiful global toasts
const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
  const notification = document.createElement('div')

  // Base glassmorphic styling
  let bgClass = 'bg-background/80 backdrop-blur-xl border border-border text-foreground'
  if (type === 'success') bgClass = 'bg-primary/90 backdrop-blur-xl text-primary-foreground border-primary/20'
  if (type === 'error') bgClass = 'bg-destructive/90 backdrop-blur-xl text-destructive-foreground border-destructive/20'

  notification.className = `fixed bottom-6 left-1/2 -translate-x-1/2 md:bottom-auto md:top-6 md:right-6 md:left-auto md:translate-x-0 ${bgClass} px-5 py-3 rounded-full shadow-2xl z-[100] text-sm font-medium flex items-center gap-2 transition-all duration-300 transform scale-95 opacity-0`

  // Icon based on type
  const iconSvg = type === 'success'
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'

  notification.innerHTML = `${iconSvg} <span>${message}</span>`
  document.body.appendChild(notification)

  // Animate in
  requestAnimationFrame(() => {
    notification.classList.remove('scale-95', 'opacity-0')
    notification.classList.add('scale-100', 'opacity-100')
  })

  // Animate out and remove
  setTimeout(() => {
    notification.classList.remove('scale-100', 'opacity-100')
    notification.classList.add('scale-95', 'opacity-0', 'translate-y-4', 'md:-translate-y-4')
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification)
      }
    }, 300)
  }, 3000)
}

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
  const { currentProgress, sendHeartbeat, clearProgress, registerRefreshCallback } = useRealtimeContext()

  const fetchingRef = useRef(false)
  const generatingRef = useRef(false)
  const lastGenerateTimeRef = useRef(0)

  const fetchEmails = useCallback(async (forceRefresh = false) => {
    if (!fingerprint) return

    if (fetchingRef.current && !forceRefresh) return

    fetchingRef.current = true
    setLoading(true)
    setError(null)

    try {
      await retryRequest(async () => {
        const response = await fetch(`/api/v1/emails?fingerprint=${fingerprint}&t=${Date.now()}`, {
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

    const now = Date.now()
    if (now - lastGenerateTimeRef.current < 500) return
    lastGenerateTimeRef.current = now

    if (generatingRef.current) return

    generatingRef.current = true
    setGenerating(true)
    setError(null)

    sendHeartbeat('email_generation', 0)

    try {
      const response = await fetch('/api/v1/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint, customEmail: custom || undefined }),
        signal: AbortSignal.timeout(15000)
      })

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded - please wait a moment')
        }
        if (response.status === 409 && custom) {
          const address = custom.includes('@') ? custom : `${custom}@whitebooking.com`
          clearProgress()

          try {
            const claim = await fetch('/api/v1/emails', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fingerprint, emailAddress: address }),
              signal: AbortSignal.timeout(10000)
            })

            if (claim.ok) {
              const claimData = await claim.json()
              showToast(claimData.data?.message || `Email claimed: ${address}`, 'success')

              setGenerating(false)
              setCustomEmail('')
              generatingRef.current = false

              await fetchEmails(true)
              setTimeout(() => {
                onSelectEmail(address)
              }, 200)
              return
            } else {
              throw new Error('Failed to claim email')
            }
          } catch (claimErr) {
            setGenerating(false)
            generatingRef.current = false
            clearProgress()
            throw claimErr
          }
        }
        throw new Error(`HTTP ${response.status}: Failed to generate email`)
      }

      const data = await response.json()
      if (data.success) {
        showToast(`Email generated: ${data.data.address}`, 'success')
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
      clearProgress()
    } finally {
      setGenerating(false)
      setCustomEmail('')
      generatingRef.current = false
    }
  }, [fingerprint, fetchEmails, onSelectEmail, sendHeartbeat, clearProgress])

  const deleteEmail = useCallback(async (id: string) => {
    if (!fingerprint) return

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
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000)
      })

      if (!response.ok) {
        if (emailToRemove) {
          setEmails(prev => [...prev, emailToRemove].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ))
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded')
        }
        throw new Error(`HTTP ${response.status}: Failed to delete email`)
      }

      const data = await response.json()
      if (!data.success) {
        if (emailToRemove) {
          setEmails(prev => [...prev, emailToRemove].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ))
        }
        throw new Error(data.error || 'Failed to delete email')
      } else {
        showToast('Email deleted successfully')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete email')
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
      showToast('Address copied to clipboard', 'success') // Enhanced UX per reqs
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      showToast('Failed to copy. Please manually select and copy.', 'error')
    }
  }

  const fetchUnreadCounts = useCallback(async () => {
    if (emails.length === 0) return
    const counts: Record<string, number> = {}
    for (const email of emails) {
      try {
        const response = await fetch(
          `/api/v1/received?email=${encodeURIComponent(email.address)}`,
          { signal: AbortSignal.timeout(5000) }
        )
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            counts[email.address] = data.data.items?.length || 0
          }
        }
      } catch {
        // Silently fail for individual counts
      }
    }
    setUnreadCounts(counts)
  }, [emails])

  useEffect(() => {
    if (fingerprint) {
      fetchEmails()
    }
  }, [fingerprint, fetchEmails])

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

  const handleCustomEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/_/g, '')
    setCustomEmail(value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (!generating && fingerprint && customEmail) {
        generateEmail(customEmail)
      }
    }
  }

  return (
    <div className="h-full flex flex-col bg-background/50 backdrop-blur-sm relative border-r border-border/50">
      {/* Generate Controls & Header */}
      <div className="p-5 border-b border-border/40 shrink-0 relative z-10 bg-background/80 backdrop-blur-xl">
        <h2 className="text-sm font-semibold tracking-wide text-foreground/80 uppercase mb-4 flex items-center gap-2">
          Your Inboxes
        </h2>
        <div className="space-y-3">
          <div className="flex space-x-2">
            <Input
              placeholder="Custom prefix (optional)"
              value={customEmail}
              onChange={handleCustomEmailChange}
              onKeyDown={handleKeyDown}
              className="flex-1 text-sm bg-card/50 border-border/60 focus:ring-primary/50 transition-all duration-300 rounded-lg"
              disabled={generating}
            />
            <Button
              size="sm"
              onClick={() => generateEmail(customEmail)}
              disabled={generating || !fingerprint}
              className="shrink-0 rounded-lg shadow-sm hover:shadow-primary/20 transition-all duration-300"
            >
              {generating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Button
            onClick={() => generateEmail()}
            disabled={generating || !fingerprint}
            className="w-full rounded-lg bg-card/50 hover:bg-card border-border/60 hover:border-primary/50 text-foreground transition-all duration-300 shadow-sm"
            variant="outline"
          >
            <Sparkles className="h-4 w-4 mr-2 text-primary" />
            <span className="font-medium">Generate Random</span>
          </Button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive font-medium"
          >
            {error}
          </motion.div>
        )}
      </div>

      <ProgressIndicator
        progress={currentProgress}
        onComplete={() => fetchEmails()}
      />

      {/* Embedded Email List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2 scroller">
        {loading ? (
          <EmailSkeletonLoader count={5} />
        ) : emails.length === 0 ? (
          <EmptyState type="no-emails" />
        ) : (
          <AnimatePresence initial={false}>
            {emails.map((email) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                key={email.id}
                className={`group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden ${selectedEmailAddress === email.address
                    ? 'border-primary/50 bg-primary/10 shadow-[0_0_15px_rgba(var(--primary),0.1)]'
                    : 'border-border/40 bg-card/40 hover:bg-card hover:border-border/80 hover:shadow-sm'
                  }`}
                onClick={() => onSelectEmail(email.address)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Active Indicator Bar */}
                {selectedEmailAddress === email.address && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl"
                  />
                )}

                <div className="flex items-center justify-between mb-1 pl-1">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold text-[15px] truncate transition-colors ${selectedEmailAddress === email.address ? 'text-primary' : 'text-foreground/90'
                        }`}>
                        {email.address}
                      </p>
                      {unreadCounts[email.address] > 0 && (
                        <Badge className="h-5 px-1.5 text-xs font-bold shrink-0 bg-primary/20 text-primary hover:bg-primary/30 border-0">
                          {unreadCounts[email.address]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pl-1">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                    {new Date(email.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation()
                        copyToClipboard(email.address, email.id)
                      }}
                      title="Copy to clipboard"
                    >
                      {copiedId === email.id ? (
                        <Check className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-md text-destructive/70 hover:text-destructive hover:bg-destructive/10"
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
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border/40 bg-muted/20 shrink-0 z-10">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            {emails.length} of 10 slots used
          </p>
          <div className="w-16 h-1.5 bg-border/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(emails.length / 10) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        emailAddress={emailToDelete?.address || ''}
      />
    </div>
  )
}