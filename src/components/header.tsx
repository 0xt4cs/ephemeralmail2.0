"use client"

import { ThemeToggle } from './theme-toggle'
import { RefreshCw, Mail, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

type HeaderProps = {
  onRefresh?: () => void
  onMenuToggle?: () => void
  currentTitle?: string
}

export function Header({ onRefresh, onMenuToggle, currentTitle }: HeaderProps) {
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
          {currentTitle || 'EphemeralMail'}
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
        <ThemeToggle />
      </div>
    </header>
  )
}