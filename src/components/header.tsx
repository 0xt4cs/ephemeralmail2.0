"use client"

import { ThemeToggle } from './theme-toggle'
import { RefreshCw, Mail } from 'lucide-react'

type HeaderProps = {
  onRefresh?: () => void
}

export function Header({ onRefresh }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card h-16 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <Mail className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold">EphemeralMail 2.0</h1>
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