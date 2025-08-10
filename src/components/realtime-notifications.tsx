'use client'

import { useEffect, useState } from 'react'
import { useSSE, SSEMessage, EmailNotificationData, SystemNotificationData } from '@/hooks/use-sse'
import { Bell, Mail, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RealtimeNotificationsProps {
  fingerprint: string
  onNewEmail?: (emailData: EmailNotificationData) => void
  className?: string
}

interface Notification {
  id: string
  type: 'email_received' | 'system_notification'
  title: string
  message: string
  timestamp: Date
  data?: EmailNotificationData | SystemNotificationData
}

export function RealtimeNotifications({ 
  fingerprint, 
  onNewEmail,
  className 
}: RealtimeNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const { isConnected, error } = useSSE({
    fingerprint,
         onMessage: (message: SSEMessage) => {
       if (message.type === 'email_received' && message.data && 'fromAddress' in message.data) {
         const emailData = message.data as EmailNotificationData
         const notification: Notification = {
           id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
           type: 'email_received',
           title: 'New Email Received',
           message: `New email from ${emailData.fromAddress || 'Unknown sender'}`,
           timestamp: new Date(message.timestamp),
           data: emailData
         }

         setNotifications(prev => [notification, ...prev.slice(0, 4)])
         setUnreadCount(prev => prev + 1)
         
         onNewEmail?.(emailData)
             } else if (message.type === 'system_notification' && message.data && 'message' in message.data) {
         const systemData = message.data as SystemNotificationData
         const notification: Notification = {
           id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
           type: 'system_notification',
           title: 'System Notification',
           message: message.message || systemData.message || 'System update',
           timestamp: new Date(message.timestamp),
           data: systemData
         }

         setNotifications(prev => [notification, ...prev.slice(0, 4)])
         setUnreadCount(prev => prev + 1)
       }
    },
    onConnect: () => {
      console.log('SSE connected for real-time notifications')
    },
    onError: (error) => {
      console.error('SSE connection error:', error)
    }
  })

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const clearAllNotifications = () => {
    setNotifications([])
    setUnreadCount(0)
  }

  const markAllAsRead = () => {
    setUnreadCount(0)
  }

  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        setShowNotifications(false)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [notifications])

  return (
    <div className={cn("relative", className)}>
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {!isConnected && (
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full" />
        )}
      </Button>

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-6 px-2 text-xs"
              >
                Mark Read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllNotifications}
                className="h-6 px-2 text-xs"
              >
                Clear All
              </Button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-3 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {notification.type === 'email_received' ? (
                          <Mail className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Bell className="h-4 w-4 text-orange-500" />
                        )}
                        <h4 className="font-medium text-sm truncate">
                          {notification.title}
                        </h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notification.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeNotification(notification.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border-t border-red-200">
              <p className="text-xs text-red-600">
                Connection error: {error}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
