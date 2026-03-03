"use client"

import { ThemeToggle } from './theme-toggle'
import { Mail, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

type HeaderProps = {
  onMenuToggle?: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false)

  // Track scroll for a nice reactive header effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${scrolled
          ? 'glass-panel border-b border-border/40 shadow-sm py-2'
          : 'bg-transparent border-b border-transparent py-3'
        }`}
    >
      <div className="flex items-center justify-between px-4 sm:px-6 h-14 w-full max-w-[2000px] mx-auto">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Button  */}
          <div className="lg:hidden mr-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuToggle}
              className="h-9 w-9 hover:bg-muted/50 transition-colors rounded-full"
              aria-label="Toggle Menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex items-center justify-center bg-primary/10 p-2 rounded-xl"
          >
            <Mail className="h-6 w-6 text-primary" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground mr-1"
          >
            Ephemeral<span className="text-primary">Mail</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="hidden sm:flex items-center ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium tracking-wide"
          >
            2.0
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex items-center gap-3 sm:gap-4"
        >
          {/* Removed ConnectionStatus to clean up navbar and meet user instructions */}
          <div className="flex items-center justify-center p-1 rounded-full hover:bg-muted/50 transition-colors">
            <ThemeToggle />
          </div>
        </motion.div>
      </div>
    </header>
  )
}