"use client"

import { useState, useEffect } from 'react'
import { EmailList } from '@/components/email-list'
import { ReceivedEmails } from '@/components/received-emails'
import { EmailContent } from '@/components/email-content'
import { Header } from '@/components/header'
import { RealtimeNotifications } from '@/components/realtime-notifications'
import { getOrCreateClientFingerprint } from '@/lib/utils'
import { X, Menu, ArrowLeft, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmailNotificationData } from '@/hooks/use-sse'

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

  const handleNewEmail = (emailData: EmailNotificationData) => {
    setRefreshKey(prev => prev + 1)
    
    if (emailData?.emailId) {
      console.log('New email received:', emailData)
    }
  }

  const handleSelectEmail = (address: string) => {
    setSelectedEmailAddress(address)
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
    <div className="min-h-screen bg-background">
      <Header 
        onRefresh={handleRefresh} 
        onMenuToggle={toggleMobileMenu} 
      />
      
      {/* Real-time Notifications */}
      {fingerprint && (
        <RealtimeNotifications
          fingerprint={fingerprint}
          onNewEmail={handleNewEmail}
          className="fixed top-20 right-4 z-40"
        />
      )}
      
      {/* Mobile Layout */}
      <div className="lg:hidden">
        {/* Mobile Side Menu with Breadcrumb Navigation */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            
            {/* Side Menu */}
            <div className="fixed left-0 top-0 h-full w-80 bg-background border-r border-border shadow-lg">
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
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Menu className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Welcome to EphemeralMail</p>
                <p className="text-sm">Tap the menu button to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout - Hidden on Mobile */}
      <div className="hidden lg:flex">
        <div className="flex h-[calc(100vh-4rem)] w-full">
          {/* Left: Generated Emails (15%) */}
          <div className="w-[15%] border-r border-border">
            <EmailList
              key={`email-list-${refreshKey}`}
              fingerprint={fingerprint}
              selectedEmailAddress={selectedEmailAddress}
              onSelectEmail={handleSelectEmail}
            />
          </div>

          {/* Middle: Emails Received (20%) */}
          <div className="w-[20%] border-r border-border">
            {selectedEmailAddress ? (
              <ReceivedEmails
                key={`received-emails-${refreshKey}`}
                fingerprint={fingerprint}
                selectedEmailAddress={selectedEmailAddress}
                selectedMessage={selectedMessage}
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

          {/* Right: Email Content (65%) */}
          <div className="w-[65%]">
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
