'use client'

import { useState, useEffect } from 'react'
import { ProgressData } from '@/hooks/use-realtime'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, Clock } from 'lucide-react'

interface ProgressIndicatorProps {
  progress: ProgressData | null
  onComplete?: () => void
}

export function ProgressIndicator({ progress, onComplete }: ProgressIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    if (progress) {
      setIsVisible(true)
      if (progress.progress >= 100) {
        setCompleted(true)
        setTimeout(() => {
          setIsVisible(false)
          setCompleted(false)
          onComplete?.()
        }, 3000) // Hide after 3 seconds
      }
    } else {
      setIsVisible(false)
      setCompleted(false)
    }
  }, [progress, onComplete])

  if (!isVisible || !progress) {
    return null
  }

  const getOperationIcon = () => {
    switch (progress.operation) {
      case 'email_generation':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'email_processing':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'attachment_processing':
        return <Loader2 className="h-4 w-4 animate-spin" />
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />
    }
  }

  const getOperationLabel = () => {
    switch (progress.operation) {
      case 'email_generation':
        return 'Generating Email'
      case 'email_processing':
        return 'Processing Email'
      case 'attachment_processing':
        return 'Processing Attachments'
      default:
        return 'Processing'
    }
  }

  const getStatusColor = () => {
    if (completed) return 'bg-green-500'
    if (progress.progress >= 50) return 'bg-blue-500'
    return 'bg-yellow-500'
  }

  return (
    <Card className="p-4 mb-4 border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {completed ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            getOperationIcon()
          )}
          <span className="font-medium text-sm">
            {getOperationLabel()}
          </span>
          {progress.estimatedTime && !completed && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              ~{progress.estimatedTime}s
            </div>
          )}
        </div>
        <Badge variant={completed ? "default" : "secondary"} className="text-xs">
          {completed ? 'Complete' : `${progress.progress}%`}
        </Badge>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ease-out ${getStatusColor()}`}
          style={{ width: `${progress.progress}%` }}
        />
      </div>
      
      <p className="text-sm text-muted-foreground mt-2">
        {progress.message}
      </p>
    </Card>
  )
}
