'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Copy, 
  Trash2, 
  RefreshCw, 
  Mail,
  Sparkles,
  Check
} from 'lucide-react'
import { retryRequest } from '@/lib/connectivity-utils'
import { useRealtime, ProgressData } from '@/hooks/use-realtime'
import { ProgressIndicator } from '@/components/progress-indicator'

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
  const [currentProgress, setCurrentProgress] = useState<ProgressData | null>(null)

  // Real-time connection
  const { isConnected, connectionType, sendHeartbeat } = useRealtime({
    fingerprint,
    onMessage: (message) => {
      if (message.type === 'email_received') {
        // Refresh emails when new email is received
        fetchEmails()
      }
    },
    onProgress: (progress) => {
      setCurrentProgress(progress)
    }
  })

  // Helper function for retrying failed requests
    // Import retryRequest from connectivity-utils

  const fetchEmails = useCallback(async () => {
    if (!fingerprint) return
    
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
    }
  }, [fingerprint])

  const generateEmail = useCallback(async (custom?: string) => {
    if (!fingerprint) return
    
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
        throw new Error(`HTTP ${response.status}: Failed to generate email`)
      }
      
      const data = await response.json()
      if (data.success) {
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
    }
  }, [fingerprint, fetchEmails, onSelectEmail, sendHeartbeat])

  const deleteEmail = useCallback(async (id: string) => {
    if (!fingerprint) return
    
    try {
      const response = await fetch(`/api/v1/emails?id=${id}&fingerprint=${fingerprint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000)
      })
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded - please wait a moment')
        }
        throw new Error(`HTTP ${response.status}: Failed to delete email`)
      }
      
      const data = await response.json()
      if (data.success) {
        await fetchEmails()
        if (selectedEmailAddress === emails.find(e => e.id === id)?.address) {
          onSelectEmail('')
        }
      } else {
        throw new Error(data.error || 'Failed to delete email')
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timeout - please check your connection')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to delete email')
      }
    }
  }, [fingerprint, fetchEmails, selectedEmailAddress, emails, onSelectEmail])

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setError('Failed to copy to clipboard')
    }
  }

  useEffect(() => {
    if (fingerprint) {
      fetchEmails()
    }
  }, [fingerprint, fetchEmails])

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
              onChange={(e) => setCustomEmail(e.target.value)}
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
          setCurrentProgress(null)
          fetchEmails() // Refresh emails after completion
        }}
      />

      {/* Connection Status */}
      {!isConnected && (
        <div className="p-2 mb-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 dark:bg-yellow-950/20 dark:border-yellow-800 dark:text-yellow-200">
          Using {connectionType === 'polling' ? 'polling' : 'fallback'} connection
        </div>
      )}

      {/* Email List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground p-4">
            <Mail className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No email addresses yet</p>
            <p className="text-xs">Generate your first email address to get started</p>
          </div>
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
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${
                      selectedEmailAddress === email.address ? 'text-primary' : ''
                    }`}>
                      {email.address}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(email.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation()
                        copyToClipboard(email.address, email.id)
                      }}
                    >
                      {copiedId === email.id ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation()
                        deleteEmail(email.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
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
    </div>
  )
} 