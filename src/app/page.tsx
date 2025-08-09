"use client"

import { useState, useEffect } from 'react'
import { EmailList } from '@/components/email-list'
import { ReceivedEmails } from '@/components/received-emails'
import { EmailContent } from '@/components/email-content'
import { Header } from '@/components/header'
import { getOrCreateClientFingerprint } from '@/lib/utils'

export default function Home() {
  const [fingerprint, setFingerprint] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [refreshTick, setRefreshTick] = useState(0)
  const [selectedEmailAddress, setSelectedEmailAddress] = useState<string | null>(null)
  const [selectedMessage, setSelectedMessage] = useState<{
    id: string
    fromAddress: string
    subject: string
    receivedAt: Date
    bodyHtml?: string | null
    bodyText?: string | null
    headers?: Record<string, string>
    attachments?: Array<{ name: string; size: number; type?: string }>
  } | null>(null)

  useEffect(() => {
    const fp = getOrCreateClientFingerprint()
    setFingerprint(fp)
    setLoading(false)
  }, [])

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(() => setRefreshTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading EphemeralMail 2.0...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onRefresh={() => setRefreshTick(t => t + 1)} />
      <main className="flex h-[calc(100vh-4rem)]">
        <div className="w-80 border-r border-border bg-card">
          <EmailList
            fingerprint={fingerprint}
            key={`emails-${refreshTick}`}
            selectedEmailAddress={selectedEmailAddress}
            onSelectEmail={addr => {
              setSelectedEmailAddress(addr)
              setSelectedMessage(null)
            }}
          />
        </div>
        <div className="w-96 border-r border-border bg-card">
          <ReceivedEmails
            fingerprint={fingerprint}
            selectedEmailAddress={selectedEmailAddress}
            key={`received-${refreshTick}-${selectedEmailAddress ?? 'none'}`}
            onSelectMessage={(msg) => setSelectedMessage(msg)}
          />
        </div>
        <div className="flex-1 bg-background">
          <EmailContent selected={selectedMessage} />
        </div>
      </main>
    </div>
  )
}
