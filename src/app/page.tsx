"use client"

import { useState, useEffect } from 'react'
import { EmailList } from '@/components/email-list'
import { ReceivedEmails } from '@/components/received-emails'
import { EmailContent } from '@/components/email-content'
import { Header } from '@/components/header'
import { getOrCreateClientFingerprint } from '@/lib/utils'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

export default function Home() {
  const [fingerprint, setFingerprint] = useState<string>('')
  const [selectedEmailAddress, setSelectedEmailAddress] = useState<string>('')
  const [selectedMessage, setSelectedMessage] = useState<ReceivedEmail | null>(null)

  const [mobileView, setMobileView] = useState<'emails' | 'messages' | 'content'>('emails')

  useEffect(() => {
    const fp = getOrCreateClientFingerprint()
    setFingerprint(fp)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setFingerprint(prev => prev)
    }, 15000)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [])

  const handleRefresh = () => {
    const newFingerprint = getOrCreateClientFingerprint()
    setFingerprint(newFingerprint)
    setSelectedEmailAddress('')
    setSelectedMessage(null)
  }

  const handleSelectEmail = (address: string) => {
    setSelectedEmailAddress(address)
    if (window.innerWidth < 1024) {
      setMobileView('messages')
    }
  }

  const handleSelectMessage = (message: ReceivedEmail) => {
    setSelectedMessage(message)
    if (window.innerWidth < 1024) {
      setMobileView('content')
    }
  }

  const handleBackToEmails = () => {
    setSelectedEmailAddress('')
    setSelectedMessage(null)
    setMobileView('emails')
  }

  const handleBackToMessages = () => {
    setSelectedMessage(null)
    setMobileView('messages')
  }



  return (
    <div className="min-h-screen bg-background">
      <Header onRefresh={handleRefresh} />
      
      {/* Mobile Layout */}
      <div className="lg:hidden">
        {/* Mobile Navigation */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            {mobileView === 'messages' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToEmails}
                className="flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Back to Emails</span>
              </Button>
            )}
            {mobileView === 'content' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToMessages}
                className="flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Back to Messages</span>
              </Button>
            )}
            <div className="flex-1 text-center">
              <span className="text-sm font-medium">
                {mobileView === 'emails' && 'Email Addresses'}
                {mobileView === 'messages' && selectedEmailAddress}
                {mobileView === 'content' && selectedMessage?.subject}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="h-[calc(100vh-8rem)]">
          {mobileView === 'emails' && (
            <EmailList
              fingerprint={fingerprint}
              selectedEmailAddress={selectedEmailAddress}
              onSelectEmail={handleSelectEmail}
            />
          )}
          {mobileView === 'messages' && selectedEmailAddress && (
            <ReceivedEmails
              fingerprint={fingerprint}
              selectedEmailAddress={selectedEmailAddress}
              onSelectMessage={handleSelectMessage}
            />
          )}
          {mobileView === 'content' && selectedMessage && (
            <EmailContent selected={selectedMessage} />
          )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div className="flex h-[calc(100vh-4rem)]">
          {/* Left: Email List (smaller) */}
          <div className="w-1/5 border-r border-border">
            <EmailList
              fingerprint={fingerprint}
              selectedEmailAddress={selectedEmailAddress}
              onSelectEmail={handleSelectEmail}
            />
          </div>

          {/* Middle: Received Emails (medium) */}
          <div className="w-2/5 border-r border-border">
            {selectedEmailAddress ? (
              <ReceivedEmails
                fingerprint={fingerprint}
                selectedEmailAddress={selectedEmailAddress}
                onSelectMessage={handleSelectMessage}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <p>Select an email address to view messages</p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Email Content (larger) */}
          <div className="w-2/5">
            {selectedMessage ? (
              <EmailContent selected={selectedMessage} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <p>Select a message to view content</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
