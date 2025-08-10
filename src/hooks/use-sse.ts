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

export interface SSEMessage {
  type: 'connected' | 'ping' | 'email_received' | 'system_notification' | 'error'
  timestamp: string
  data?: EmailNotificationData | SystemNotificationData
  message?: string
}

interface UseSSEOptions {
  fingerprint: string
  onMessage?: (message: SSEMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
  autoReconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

interface UseSSEReturn {
  isConnected: boolean
  lastMessage: SSEMessage | null
  error: string | null
  connect: () => void
  disconnect: () => void
  reconnect: () => void
}

export function useSSE({
  fingerprint,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  autoReconnect = true,
  reconnectInterval = 5000,
  maxReconnectAttempts = 5
}: UseSSEOptions): UseSSEReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<SSEMessage | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const isConnectingRef = useRef(false)

  const connect = useCallback(() => {
    if (isConnectingRef.current || eventSourceRef.current) {
      return
    }

    if (!fingerprint) {
      setError('Fingerprint is required')
      return
    }

    isConnectingRef.current = true
    setError(null)

    try {
      const url = `/api/v1/stream?fingerprint=${encodeURIComponent(fingerprint)}`
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        setIsConnected(true)
        isConnectingRef.current = false
        reconnectAttemptsRef.current = 0
        onConnect?.()
      }

      eventSource.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data)
          setLastMessage(message)
          onMessage?.(message)
        } catch (parseError) {
          console.error('Failed to parse SSE message:', parseError)
          setError('Failed to parse message')
        }
      }

      eventSource.onerror = (event) => {
        console.error('SSE connection error:', event)
        setIsConnected(false)
        isConnectingRef.current = false
        setError('Connection error')
        onError?.(event)

        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        }
      }

    } catch (error) {
      console.error('Failed to create SSE connection:', error)
      setError('Failed to create connection')
      isConnectingRef.current = false
    }
  }, [fingerprint, onMessage, onConnect, onError, autoReconnect, reconnectInterval, maxReconnectAttempts])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setIsConnected(false)
    isConnectingRef.current = false
    reconnectAttemptsRef.current = 0
    onDisconnect?.()
  }, [onDisconnect])

  const reconnect = useCallback(() => {
    disconnect()
    reconnectAttemptsRef.current = 0
    setTimeout(connect, 1000)
  }, [disconnect, connect])

  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (eventSourceRef.current) {
      disconnect()
      connect()
    }
  }, [fingerprint]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isConnected,
    lastMessage,
    error,
    connect,
    disconnect,
    reconnect
  }
}
