"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Copy, Trash2, Sparkles } from 'lucide-react'

interface Email {
  id: string
  emailAddress: string
  createdAt: Date
  expiresAt: Date
  isActive: boolean
}

interface EmailListProps {
  fingerprint: string
  selectedEmailAddress?: string | null
  onSelectEmail?: (emailAddress: string) => void
}

export function EmailList({ fingerprint, selectedEmailAddress, onSelectEmail }: EmailListProps) {
  const [emails, setEmails] = useState<Email[]>([])
  const [customEmail, setCustomEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function extractErrorMessage(data: unknown): string {
    if (!data) return 'Request failed'
    if (typeof data === 'string') return data
    if (typeof (data as { error?: unknown }).error === 'string') return (data as { error: string }).error
    const maybeMessage = (data as { error?: { message?: unknown } })?.error?.message
    if (typeof maybeMessage === 'string') return maybeMessage
    return 'Request failed'
  }

  const fetchEmails = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/emails?fingerprint=${fingerprint}`)
      if (response.status === 404) {
        // No session yet → treat as empty state without showing an error
        setEmails([])
        setError(null)
        return
      }
      const data = await response.json().catch(() => ({}))
      if (response.ok && data?.success) {
        setEmails(data.data.items ?? data.data.emails ?? [])
        setError(null)
      } else {
        setError(extractErrorMessage(data))
      }
    } catch (err) {
      setError('Failed to fetch emails')
      console.error('Error fetching emails:', err)
    } finally {
      setLoading(false)
    }
  }, [fingerprint])

  useEffect(() => {
    if (fingerprint) fetchEmails()
  }, [fingerprint, fetchEmails])

  const generateRandom = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok && data?.success) {
        await fetchEmails()
      } else {
        setError(extractErrorMessage(data))
      }
    } catch (err) {
      setError('Failed to generate email')
      console.error('Error generating email:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateCustom = async () => {
    if (!customEmail.trim()) return
    try {
      setLoading(true)
      const response = await fetch('/api/v1/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint, customEmail: customEmail.trim() }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok && data?.success) {
        setCustomEmail('')
        await fetchEmails()
      } else {
        setError(extractErrorMessage(data))
      }
    } catch (err) {
      setError('Failed to generate custom email')
      console.error('Error generating custom email:', err)
    } finally {
      setLoading(false)
    }
  }

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email)
  }

  const deleteEmail = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/emails?fingerprint=${fingerprint}&id=${id}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (response.ok && data?.success) {
        await fetchEmails()
      } else {
        setError(extractErrorMessage(data))
      }
    } catch (err) {
      setError('Failed to delete email')
      console.error('Error deleting email:', err)
    }
  }

  if (!fingerprint) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Loading fingerprint...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-4">Generated Emails</h2>
        {error && (
          <div className="mb-3 p-2 bg-destructive/10 text-destructive text-sm rounded">{error}</div>
        )}
        <div className="space-y-3">
          <Button onClick={generateRandom} className="w-full" disabled={loading || emails.length >= 10}>
            <Sparkles className="w-4 h-4 mr-2" />
            {loading ? 'Generating...' : 'I\'m Feeling Lucky'}
          </Button>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Custom email"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
              onKeyPress={(e) => e.key === 'Enter' && generateCustom()}
              disabled={loading}
            />
            <Button onClick={generateCustom} size="sm" disabled={loading || !customEmail.trim() || emails.length >= 10}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {loading && emails.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50 animate-spin" />
            <p>Loading emails...</p>
          </div>
        ) : emails.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No emails generated yet</p>
            <p className="text-sm">Click &quot;I&apos;m Feeling Lucky&quot; to generate one</p>
          </div>
        ) : (
          <div className="space-y-3">
            {emails.map((email) => (
              <div
                key={email.id}
                className={`p-3 border border-border rounded-lg transition-colors cursor-pointer ${
                  selectedEmailAddress === email.emailAddress ? 'bg-accent/70' : 'bg-card hover:bg-accent/50'
                }`}
                onClick={() => onSelectEmail?.(email.emailAddress)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{email.emailAddress}</p>
                    <p className="text-xs text-muted-foreground">Created {new Date(email.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => copyEmail(email.emailAddress)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteEmail(email.id)} disabled={loading}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
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