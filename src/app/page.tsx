"use client"

import { useState, useEffect } from 'react'
import { EmailList } from '@/components/email-list'
import { ReceivedEmails } from '@/components/received-emails'
import { EmailContent } from '@/components/email-content'
import { Header } from '@/components/header'
import { EmptyState } from '@/components/empty-state'
import { getOrCreateClientFingerprint } from '@/lib/utils'
import { X, ArrowLeft, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RealtimeProvider } from '@/contexts/realtime-context'

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidePanelView, setSidePanelView] = useState<'emails' | 'messages'>('emails')
  const [refreshKey, setRefreshKey] = useState<number>(0)

  useEffect(() => {
    const fp = getOrCreateClientFingerprint()
    setFingerprint(fp)
    
    // Add a small delay to ensure fingerprint is set before any API calls
    const timer = setTimeout(() => {
      // This ensures components have the fingerprint before making requests
    }, 100)
    
    return () => clearTimeout(timer)
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
    setRefreshKey(prev => prev + 1)
  }



  const handleSelectEmail = (address: string) => {
    setSelectedEmailAddress(address)
    setSelectedMessage(null) // Clear selected message when switching emails
    setSidePanelView('messages')
  }

  const handleSelectMessage = (message: ReceivedEmail) => {
    setSelectedMessage(message)
    setMobileMenuOpen(false)
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
    if (!mobileMenuOpen) {
      setSidePanelView('emails')
    }
  }

  const handleBackToEmails = () => {
    setSidePanelView('emails')
    setSelectedEmailAddress('')
    setSelectedMessage(null) // Also clear message when going back
  }

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.classList.add('menu-open')
    } else {
      document.body.classList.remove('menu-open')
    }

    return () => {
      document.body.classList.remove('menu-open')
    }
  }, [mobileMenuOpen])



  return (
    <RealtimeProvider fingerprint={fingerprint}>
      <div className="min-h-screen bg-background">
        <Header 
          onRefresh={handleRefresh} 
          onMenuToggle={toggleMobileMenu} 
        />
      

      
      {/* Mobile Layout - Only for small screens */}
      <div className="md:hidden">
        {/* Mobile Side Menu with Breadcrumb Navigation */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop with blur */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => setMobileMenuOpen(false)}
              style={{ animation: 'fadeIn 0.3s ease-out' }}
            />
            
            {/* Side Menu with slide animation */}
            <div 
              className="fixed left-0 top-0 h-full w-80 bg-background border-r border-border shadow-2xl transition-transform duration-300 ease-out"
              style={{ animation: 'slideInLeft 0.3s ease-out' }}
            >
              <div className="flex flex-col h-full">
                {/* Menu Header with Breadcrumb */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold flex items-center">
                      <Mail className="h-5 w-5 mr-2" />
                      {sidePanelView === 'emails' ? 'Generated Emails' : 'Received Emails'}
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMobileMenuOpen(false)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                
                </div>

                {/* Menu Content - Full Screen Views */}
                <div className="flex-1 overflow-hidden">
                  {sidePanelView === 'emails' && (
                    <div className="h-full">
                      <EmailList
                        key={`mobile-email-list-${refreshKey}`}
                        fingerprint={fingerprint}
                        selectedEmailAddress={selectedEmailAddress}
                        onSelectEmail={handleSelectEmail}
                      />
                    </div>
                  )}
                  
                  {sidePanelView === 'messages' && (
                    <div className="h-full">
                      {/* Back Button */}
                      <div className="p-3 border-b border-border">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleBackToEmails}
                          className="flex items-center space-x-2"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          <span>Back to Generated Emails</span>
                        </Button>
                      </div>
                      
                      {/* Emails Received Content */}
                      <div className="h-[calc(100%-4rem)]">
                        {selectedEmailAddress ? (
                          <ReceivedEmails
                            key={`mobile-received-emails-${refreshKey}`}
                            fingerprint={fingerprint}
                            selectedEmailAddress={selectedEmailAddress}
                            selectedMessage={selectedMessage}
                            onSelectMessage={handleSelectMessage}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground p-4">
                            <div className="text-center">
                              <p className="text-sm">Select an email to view messages</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Main Content - ONLY Email Content or Welcome Screen */}
        <div className="h-[calc(100vh-4rem)]">
          {selectedMessage ? (
            <EmailContent selected={selectedMessage} />
          ) : (
            <EmptyState type="welcome" />
          )}
        </div>
      </div>

      {/* Desktop Layout - 3 columns for large screens */}
      <div className="hidden lg:flex">
        <div className="flex h-[calc(100vh-4rem)] w-full">
          {/* Left: Generated Emails (20%) */}
          <div className="w-[20%] border-r border-border">
            <EmailList
              key={`email-list-${refreshKey}`}
              fingerprint={fingerprint}
              selectedEmailAddress={selectedEmailAddress}
              onSelectEmail={handleSelectEmail}
            />
          </div>

          {/* Middle: Emails Received (25%) */}
          <div className="w-[25%] border-r border-border">
            {selectedEmailAddress ? (
              <ReceivedEmails
                key={`received-emails-${refreshKey}`}
                fingerprint={fingerprint}
                selectedEmailAddress={selectedEmailAddress}
                selectedMessage={selectedMessage}
                onSelectMessage={handleSelectMessage}
              />
            ) : (
              <EmptyState type="select-email" />
            )}
          </div>

          {/* Right: Email Content (55%) */}
          <div className="w-[55%]">
            {selectedMessage ? (
              <EmailContent selected={selectedMessage} />
            ) : (
              <EmptyState type="select-message" />
            )}
          </div>
        </div>
      </div>

      {/* Medium Layout (Tablet) - 2 columns for medium screens */}
      <div className="hidden md:flex lg:hidden">
        <div className="flex h-[calc(100vh-4rem)] w-full">
          {/* Left: Email List or Messages (40%) */}
          <div className="w-[40%] border-r border-border">
            {selectedEmailAddress ? (
              <div className="h-full flex flex-col">
                {/* Back button */}
                <div className="p-3 border-b border-border bg-card">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedEmailAddress('')
                      setSelectedMessage(null)
                    }}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Emails</span>
                  </Button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ReceivedEmails
                    key={`received-emails-md-${refreshKey}`}
                    fingerprint={fingerprint}
                    selectedEmailAddress={selectedEmailAddress}
                    selectedMessage={selectedMessage}
                    onSelectMessage={handleSelectMessage}
                  />
                </div>
              </div>
            ) : (
              <EmailList
                key={`email-list-md-${refreshKey}`}
                fingerprint={fingerprint}
                selectedEmailAddress={selectedEmailAddress}
                onSelectEmail={handleSelectEmail}
              />
            )}
          </div>

          {/* Right: Email Content (60%) */}
          <div className="w-[60%]">
            {selectedMessage ? (
              <EmailContent selected={selectedMessage} />
            ) : selectedEmailAddress ? (
              <EmptyState type="select-message" />
            ) : (
              <EmptyState type="welcome" />
            )}
          </div>
        </div>
      </div>
      </div>
    </RealtimeProvider>
  )
}
