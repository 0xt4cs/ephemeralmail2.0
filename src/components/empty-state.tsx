"use client"

import { Mail, Inbox, Sparkles, ArrowRight, LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, Variants } from 'framer-motion'

interface EmptyStateProps {
  type: 'no-emails' | 'no-messages' | 'select-email' | 'select-message' | 'welcome'
  onAction?: () => void
  actionLabel?: string
}

export function EmptyState({ type, onAction, actionLabel }: EmptyStateProps) {
  const configs: Record<string, {
    icon: LucideIcon,
    title: string,
    description: string,
    hint: string,
    iconColor: string,
    bgColor: string,
    pulseColor: string
  }> = {
    'no-emails': {
      icon: Mail,
      title: 'No Email Addresses Yet',
      description: 'Create your first temporary email address to get started',
      hint: 'Click "I\'m Feeling Lucky" or enter a custom prefix',
      iconColor: 'text-primary',
      bgColor: 'bg-primary/10',
      pulseColor: 'rgba(var(--primary), 0.2)'
    },
    'no-messages': {
      icon: Inbox,
      title: 'Inbox is Empty',
      description: 'You haven\'t received any messages for this address yet',
      hint: 'Awaiting incoming mail...',
      iconColor: 'text-success',
      bgColor: 'bg-success/10',
      pulseColor: 'rgba(34, 197, 94, 0.2)'
    },
    'select-email': {
      icon: Mail,
      title: 'Select an Email Address',
      description: 'Choose an email from the sidebar to view its received messages',
      hint: 'Your messages will appear here',
      iconColor: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
      pulseColor: 'rgba(99, 102, 241, 0.2)'
    },
    'select-message': {
      icon: Inbox,
      title: 'Select a Message',
      description: 'Click on any message in the list to read it',
      hint: 'Email details will be displayed here',
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      pulseColor: 'rgba(168, 85, 247, 0.2)'
    },
    'welcome': {
      icon: Sparkles,
      title: 'Welcome to EphemeralMail',
      description: 'Secure, disposable, and fast temporary email service',
      hint: 'Create a temporary inbox to protect your real email from spam',
      iconColor: 'text-primary',
      bgColor: 'bg-primary/10',
      pulseColor: 'rgba(var(--primary), 0.2)'
    },
  }

  const config = configs[type] || configs['welcome']
  const Icon = config.icon

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  }

  return (
    <div className="flex items-center justify-center h-full p-6 bg-background/50">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="text-center max-w-sm space-y-6"
      >
        {/* Animated Icon Wrapper with Ping Effect */}
        <motion.div variants={itemVariants} className="relative inline-flex items-center justify-center w-24 h-24 mb-4">
          <div className={`absolute inset-0 rounded-full ${config.bgColor} animate-ping opacity-20`} style={{ animationDuration: '3s' }} />
          <div className="absolute inset-2 rounded-full border border-border/50 animate-spin-slow" style={{ animationDuration: '10s' }} />

          <motion.div
            className={`relative flex items-center justify-center w-20 h-20 rounded-2xl ${config.bgColor} backdrop-blur-sm border border-border shadow-lg shadow-${config.iconColor.split('-')[1]}/50`}
            whileHover={{ scale: 1.05, rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.3 }}
          >
            <Icon className={`h-10 w-10 ${config.iconColor}`} />
          </motion.div>
        </motion.div>

        <div>
          <motion.h3 variants={itemVariants} className="text-2xl font-bold text-foreground tracking-tight mb-2">
            {config.title}
          </motion.h3>

          <motion.p variants={itemVariants} className="text-muted-foreground leading-relaxed text-[15px]">
            {config.description}
          </motion.p>
        </div>

        <motion.div variants={itemVariants} className="pt-2">
          <p className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-muted/50 text-[13px] text-muted-foreground/80 font-medium border border-border/50">
            {config.hint}
          </p>
        </motion.div>

        {onAction && actionLabel && (
          <motion.div variants={itemVariants} className="pt-4">
            <Button
              onClick={onAction}
              size="lg"
              className="rounded-full px-8 shadow-lg hover:shadow-primary/25 transition-all duration-300"
            >
              <span className="font-semibold">{actionLabel}</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
