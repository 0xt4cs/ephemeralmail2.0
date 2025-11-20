"use client"

import { Mail, Inbox, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  type: 'no-emails' | 'no-messages' | 'select-email' | 'select-message' | 'welcome'
  onAction?: () => void
  actionLabel?: string
}

export function EmptyState({ type, onAction, actionLabel }: EmptyStateProps) {
  const configs = {
    'no-emails': {
      icon: Mail,
      title: 'No Email Addresses Yet',
      description: 'Create your first temporary email address to get started',
      hint: 'Click "I\'m Feeling Lucky" or enter a custom prefix above',
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    'no-messages': {
      icon: Inbox,
      title: 'Inbox Empty',
      description: 'No messages received yet for this address',
      hint: 'Send a test email to see it appear here instantly',
      iconColor: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    'select-email': {
      icon: Mail,
      title: 'Select an Email Address',
      description: 'Choose an email from the list to view received messages',
      hint: 'Your messages will appear here',
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    'select-message': {
      icon: Inbox,
      title: 'Select a Message',
      description: 'Click on any message to view its content',
      hint: 'Email details will be displayed here',
      iconColor: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
    },
    'welcome': {
      icon: Sparkles,
      title: 'Welcome to EphemeralMail',
      description: 'Create temporary email addresses instantly',
      hint: 'Tap the menu button to get started',
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
  }

  const config = configs[type]
  const Icon = config.icon

  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="text-center max-w-md space-y-4 animate-[scaleIn_0.3s_ease-out]">
        {/* Icon */}
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${config.bgColor} mb-2`}>
          <Icon className={`h-8 w-8 ${config.iconColor}`} />
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-foreground">
          {config.title}
        </h3>

        {/* Description */}
        <p className="text-muted-foreground">
          {config.description}
        </p>

        {/* Hint */}
        <p className="text-sm text-muted-foreground/70 italic">
          {config.hint}
        </p>

        {/* Action Button */}
        {onAction && actionLabel && (
          <Button
            onClick={onAction}
            className="mt-4"
            size="lg"
          >
            {actionLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
