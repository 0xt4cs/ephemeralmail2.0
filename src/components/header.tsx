"use client"

import { ThemeToggle } from './theme-toggle'
import { ConnectionStatus } from './connection-status'
import { Mail, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

type HeaderProps = {
  onMenuToggle?: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card h-16 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button - Only visible on mobile, positioned to the left */}
        <div className="lg:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuToggle}
            className="h-8 w-8 p-0 mr-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        
        <Mail className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold">
          EphemeralMail
        </h1>
      </div>
      
      <div className="flex items-center gap-3">
        <ConnectionStatus />
        {/* Refresh button removed - real-time updates via Socket.IO make manual refresh unnecessary */}
        <ThemeToggle />
      </div>
    </header>
  )
}