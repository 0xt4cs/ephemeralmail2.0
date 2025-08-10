"use client"

import { useState, useEffect } from 'react'
import { EmailList } from '@/components/email-list'
import { ReceivedEmails } from '@/components/received-emails'
import { EmailContent } from '@/components/email-content'
import { Header } from '@/components/header'
import { getOrCreateClientFingerprint } from '@/lib/utils'
import { Menu, X } from 'lucide-react'
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const fp = getOrCreateClientFingerprint()
    setFingerprint(fp)
  }, [])

  useEffect(() => {
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      setFingerprint(prev => prev)
    }, 30000)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [])

  const handleRefresh = () => {
    setFingerprint(prev => prev)
  }

  const handleSelectEmail = (address: string) => {
    setSelectedEmailAddress(address)
    // Close sidebar on mobile after selection
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }

  const handleSelectMessage = (message: ReceivedEmail) => {
    setSelectedMessage(message)
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onRefresh={handleRefresh} />
      
      {/* Mobile Layout */}
      <div className="lg:hidden">
        {/* Mobile Sidebar Toggle */}
        <div className="p-4 border-b border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="flex items-center space-x-2"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span>{sidebarOpen ? 'Close' : 'Menu'}</span>
          </Button>
        </div>

        {/* Mobile Sidebar */}
        <div className={`
          sidebar-container
          ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}
        `}>
          <div className="flex flex-col h-full">
            {/* Email List */}
            <div className="flex-1 border-b border-border">
              <EmailList
                fingerprint={fingerprint}
                selectedEmailAddress={selectedEmailAddress}
                onSelectEmail={handleSelectEmail}
              />
            </div>

            {/* Received Emails */}
            {selectedEmailAddress && (
              <div className="flex-1">
                <ReceivedEmails
                  fingerprint={fingerprint}
                  selectedEmailAddress={selectedEmailAddress}
                  onSelectMessage={handleSelectMessage}
                />
              </div>
            )}
          </div>
        </div>

        {/* Mobile Main Content */}
        <div className="h-[calc(100vh-8rem)]">
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

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div className="flex h-[calc(100vh-4rem)]">
          {/* Left: Email List */}
          <div className="w-1/4 border-r border-border">
            <EmailList
              fingerprint={fingerprint}
              selectedEmailAddress={selectedEmailAddress}
              onSelectEmail={handleSelectEmail}
            />
          </div>

          {/* Middle: Received Emails */}
          <div className="w-1/3 border-r border-border">
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

          {/* Right: Email Content */}
          <div className="w-5/12">
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
