'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export interface EmailNotificationData {
  emailId: string
  fromAddress: string
  subject: string
  receivedAt: string
  attachmentCount: number
}

export interface SystemNotificationData {
  message: string
  type: 'info' | 'warning' | 'error'
  details?: Record<string, unknown>
}

export interface ProgressData {
  operation: 'email_generation' | 'email_processing' | 'attachment_processing'
  progress: number // 0-100
  message: string
  estimatedTime?: number // seconds
}

export interface SSEMessage {
  type: 'connected' | 'ping' | 'email_received' | 'system_notification' | 'progress' | 'operation_complete' | 'error'
  timestamp: string
  data?: EmailNotificationData | SystemNotificationData | ProgressData
  message?: string
}

interface UseRealtimeOptions {
  fingerprint: string
  onMessage?: (message: SSEMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
  onProgress?: (progress: ProgressData) => void
  autoReconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
  pollingInterval?: number
  sseTimeout?: number
}

interface UseRealtimeReturn {
  isConnected: boolean
  connectionType: 'sse' | 'polling' | 'disconnected'
  lastMessage: SSEMessage | null
  error: string | null
  connect: () => void
  disconnect: () => void
  reconnect: () => void
  sendHeartbeat: (operation: string, progress?: number) => void
}

export function useRealtime({
  fingerprint,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  onProgress,
  autoReconnect = true,
  reconnectInterval = 5000, // eslint-disable-line @typescript-eslint/no-unused-vars
  maxReconnectAttempts = 5,
  pollingInterval = 3000,
  sseTimeout = 30000
}: UseRealtimeOptions): UseRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionType, setConnectionType] = useState<'sse' | 'polling' | 'disconnected'>('disconnected')
  const [lastMessage, setLastMessage] = useState<SSEMessage | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const isConnectingRef = useRef(false)
  const lastPollTimeRef = useRef(0)
  const sseTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Polling fallback
  const fallbackToPolling = useCallback(() => {
    if (connectionType === 'polling') return
    
    console.log('Starting polling fallback')
    setConnectionType('polling')
    setIsConnected(true)
    setError(null)
    
    const poll = async () => {
      try {
        console.log('Polling for updates...')
        const response = await fetch(`/api/v1/stream/poll?fingerprint=${encodeURIComponent(fingerprint)}&lastUpdate=${lastPollTimeRef.current}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000)
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            const message: SSEMessage = data.data
            setLastMessage(message)
            
            if (message.type === 'progress' && message.data && 'progress' in message.data) {
              onProgress?.(message.data as ProgressData)
            }
            
            onMessage?.(message)
            lastPollTimeRef.current = Date.now()
            console.log('Polling received update:', message.type)
          }
        }
      } catch (err) {
        console.warn('Polling failed:', err)
      }
      
      // Schedule next poll
      pollingTimeoutRef.current = setTimeout(poll, pollingInterval)
    }
    
    poll()
  }, [fingerprint, onMessage, onProgress, pollingInterval, connectionType])

  // SSE Connection
  const connectSSE = useCallback(() => {
    if (isConnectingRef.current || eventSourceRef.current) {
      return
    }

    if (!fingerprint) {
      setError('Fingerprint is required')
      return
    }

    if (typeof EventSource === 'undefined') {
      console.log('EventSource not supported, using polling')
      fallbackToPolling()
      return
    }

    isConnectingRef.current = true
    setError(null)

    try {
      const url = `/api/v1/stream?fingerprint=${encodeURIComponent(fingerprint)}`
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      // Set SSE timeout
      sseTimeoutRef.current = setTimeout(() => {
        if (eventSource.readyState === EventSource.CONNECTING) {
          eventSource.close()
          console.log('SSE connection timeout, falling back to polling')
          fallbackToPolling()
        }
      }, sseTimeout)

      eventSource.onopen = () => {
        if (sseTimeoutRef.current) {
          clearTimeout(sseTimeoutRef.current)
          sseTimeoutRef.current = null
        }
        
        console.log('SSE connection established')
        setIsConnected(true)
        setConnectionType('sse')
        isConnectingRef.current = false
        reconnectAttemptsRef.current = 0
        onConnect?.()
      }

      eventSource.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data)
          setLastMessage(message)
          
          // Handle progress updates
          if (message.type === 'progress' && message.data && 'progress' in message.data) {
            onProgress?.(message.data as ProgressData)
          }
          
          onMessage?.(message)
        } catch {
          console.error('Failed to parse SSE message')
          setError('Failed to parse message')
        }
      }

      eventSource.onerror = (event) => {
        if (sseTimeoutRef.current) {
          clearTimeout(sseTimeoutRef.current)
          sseTimeoutRef.current = null
        }
        
        console.log('SSE connection error, falling back to polling')
        setIsConnected(false)
        setConnectionType('disconnected')
        isConnectingRef.current = false
        setError('SSE connection error')
        onError?.(event)

        // Fallback to polling
        fallbackToPolling()
      }

    } catch {
      console.log('Failed to create SSE connection, using polling')
      setError('Failed to create SSE connection')
      isConnectingRef.current = false
      fallbackToPolling()
    }
  }, [fingerprint, onMessage, onConnect, onError, onProgress, sseTimeout, fallbackToPolling])

  // Main connect function
  const connect = useCallback(() => {
    // Try SSE first, fallback to polling
    connectSSE()
  }, [connectSSE])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current)
      pollingTimeoutRef.current = null
    }

    if (sseTimeoutRef.current) {
      clearTimeout(sseTimeoutRef.current)
      sseTimeoutRef.current = null
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setIsConnected(false)
    setConnectionType('disconnected')
    isConnectingRef.current = false
    reconnectAttemptsRef.current = 0
    onDisconnect?.()
  }, [onDisconnect])

  const reconnect = useCallback(() => {
    disconnect()
    reconnectAttemptsRef.current = 0
    setTimeout(() => {
      if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++
        connect()
      }
    }, 1000)
  }, [disconnect, connect, autoReconnect, maxReconnectAttempts])

  const sendHeartbeat = useCallback((operation: string, progress?: number) => {
    // Send heartbeat to server for heavy operations
    fetch('/api/v1/stream/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fingerprint,
        operation,
        progress,
        timestamp: Date.now()
      })
    }).catch(console.warn)
  }, [fingerprint])

  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (eventSourceRef.current || connectionType === 'polling') {
      disconnect()
      connect()
    }
  }, [fingerprint]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isConnected,
    connectionType,
    lastMessage,
    error,
    connect,
    disconnect,
    reconnect,
    sendHeartbeat
  }
}
