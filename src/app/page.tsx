"use client"

import { useState, useEffect } from 'react'
import { EmailList } from '@/components/email-list'
import { ReceivedEmails } from '@/components/received-emails'
import { EmailContent } from '@/components/email-content'
import { Header } from '@/components/header'
import { getOrCreateClientFingerprint } from '@/lib/utils'

export default function Home() {
  const [fingerprint, setFingerprint] = useState<string>('')
  const [selectedEmailAddress, setSelectedEmailAddress] = useState<string>('')
  const [selectedMessage, setSelectedMessage] = useState<any>(null)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const fp = getOrCreateClientFingerprint()
    setFingerprint(fp)
  }, [])

  useEffect(() => {
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      // Trigger refresh by updating fingerprint (this will cause re-renders)
      setFingerprint(prev => prev)
    }, 30000)

    setAutoRefreshInterval(interval)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [])

  const handleRefresh = () => {
    // Force refresh by updating fingerprint
    setFingerprint(prev => prev)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onRefresh={handleRefresh} />
      
      {/* Mobile Layout - Stacked */}
      <div className="block lg:hidden">
        <div className="space-y-4 p-4">
          {/* Email List - Full width on mobile */}
          <div className="w-full">
            <EmailList
              fingerprint={fingerprint}
              selectedEmailAddress={selectedEmailAddress}
              onSelectEmail={setSelectedEmailAddress}
            />
          </div>

          {/* Received Emails - Full width on mobile */}
          {selectedEmailAddress && (
            <div className="w-full">
              <ReceivedEmails
                fingerprint={fingerprint}
                selectedEmailAddress={selectedEmailAddress}
                onSelectMessage={setSelectedMessage}
              />
            </div>
          )}

          {/* Email Content - Full width on mobile */}
          {selectedMessage && (
            <div className="w-full">
              <EmailContent selected={selectedMessage} />
            </div>
          )}
        </div>
      </div>

      {/* Tablet Layout - 2 columns */}
      <div className="hidden lg:block xl:hidden">
        <div className="flex h-[calc(100vh-4rem)]">
          {/* Left: Email List */}
          <div className="w-1/3 border-r border-border">
            <EmailList
              fingerprint={fingerprint}
              selectedEmailAddress={selectedEmailAddress}
              onSelectEmail={setSelectedEmailAddress}
            />
          </div>

          {/* Right: Received Emails + Content */}
          <div className="w-2/3 flex flex-col">
            {selectedEmailAddress ? (
              <>
                {/* Top: Received Emails */}
                <div className="h-1/2 border-b border-border">
                  <ReceivedEmails
                    fingerprint={fingerprint}
                    selectedEmailAddress={selectedEmailAddress}
                    onSelectMessage={setSelectedMessage}
                  />
                </div>
                {/* Bottom: Email Content */}
                <div className="h-1/2">
                  {selectedMessage ? (
                    <EmailContent selected={selectedMessage} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Select an email to view content
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Generate an email address to get started
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout - 3 columns */}
      <div className="hidden xl:block">
        <div className="flex h-[calc(100vh-4rem)]">
          {/* Left: Email List */}
          <div className="w-1/4 border-r border-border">
            <EmailList
              fingerprint={fingerprint}
              selectedEmailAddress={selectedEmailAddress}
              onSelectEmail={setSelectedEmailAddress}
            />
          </div>

          {/* Middle: Received Emails */}
          <div className="w-1/3 border-r border-border">
            {selectedEmailAddress ? (
              <ReceivedEmails
                fingerprint={fingerprint}
                selectedEmailAddress={selectedEmailAddress}
                onSelectMessage={setSelectedMessage}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Generate an email address to get started
              </div>
            )}
          </div>

          {/* Right: Email Content */}
          <div className="w-5/12">
            {selectedMessage ? (
              <EmailContent selected={selectedMessage} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select an email to view content
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
