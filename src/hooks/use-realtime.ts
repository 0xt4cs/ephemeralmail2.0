'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { connectSocket, disconnectSocket, isSocketConnected, getTransportType, type Socket } from '@/lib/socket'

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
  onError?: (error: Error) => void
  onProgress?: (progress: ProgressData) => void
  autoReconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
  pollingInterval?: number
  sseTimeout?: number
}

interface UseRealtimeReturn {
  isConnected: boolean
  connectionType: 'websocket' | 'polling' | 'disconnected'
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
  reconnectInterval = 5000,
  maxReconnectAttempts = 5,
  pollingInterval = 3000,
}: UseRealtimeOptions): UseRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionType, setConnectionType] = useState<'websocket' | 'polling' | 'disconnected'>('disconnected')
  const [lastMessage, setLastMessage] = useState<SSEMessage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false) // Track if we've already initialized
  
  const socketRef = useRef<Socket | null>(null)
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const isConnectingRef = useRef(false)
  const lastPollTimeRef = useRef(0)
  const messageHandlersRef = useRef({ onMessage, onConnect, onDisconnect, onError, onProgress })
  const isPollingModeRef = useRef(false) // Track if we're in stable polling mode

  // Update refs when callbacks change
  useEffect(() => {
    messageHandlersRef.current = { onMessage, onConnect, onDisconnect, onError, onProgress }
  }, [onMessage, onConnect, onDisconnect, onError, onProgress])

  // Polling fallback
  const fallbackToPolling = useCallback(() => {
    // Prevent multiple fallback attempts
    if (isPollingModeRef.current) {
      return
    }
    
    isPollingModeRef.current = true // Mark that we're now in polling mode
    
    if (socketRef.current) {
      try {
        socketRef.current.io.opts.reconnection = false // Disable auto-reconnect
        socketRef.current.removeAllListeners() // Remove all event listeners
        socketRef.current.disconnect() // Disconnect the socket
      } catch {
        // Silent fail
      }
      socketRef.current = null // Clear the reference
    }
    
    setConnectionType('polling')
    setIsConnected(true)
    setError(null)
    isConnectingRef.current = false
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/v1/stream/poll?fingerprint=${encodeURIComponent(fingerprint)}&lastUpdate=${lastPollTimeRef.current}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(30000) // Increased to 30 seconds
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            const message: SSEMessage = data.data
            setLastMessage(message)
            
            if (message.type === 'progress' && message.data && 'progress' in message.data) {
              messageHandlersRef.current.onProgress?.(message.data as ProgressData)
            }
            
            messageHandlersRef.current.onMessage?.(message)
            lastPollTimeRef.current = Date.now()
          }
        }
      } catch {
        // Silent fail - polling will retry automatically
      }
      
      // Schedule next poll
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current)
      }
      pollingTimeoutRef.current = setTimeout(poll, pollingInterval)
    }
    
    poll()
  }, [fingerprint, pollingInterval])

  // Socket.IO Connection
  const connectSocketIO = useCallback(() => {
    // Prevent reconnection if we're in stable polling mode
    if (isPollingModeRef.current) {
      return
    }
    
    if (isConnectingRef.current || (socketRef.current && isSocketConnected())) {
      return
    }

    if (!fingerprint) {
      setError('Fingerprint is required')
      return
    }

    isConnectingRef.current = true
    setError(null)

    try {
      const socket = connectSocket(fingerprint)
      
      if (!socket) {
        throw new Error('Failed to create socket instance')
      }
      
      socketRef.current = socket

      // Connection established
      socket.on('connect', () => {
        const transport = getTransportType()
        
        setIsConnected(true)
        setConnectionType(transport === 'websocket' ? 'websocket' : 'polling')
        setError(null)
        isConnectingRef.current = false
        reconnectAttemptsRef.current = 0
        
        // Stop polling if we connected via Socket.IO
        if (pollingTimeoutRef.current) {
          clearTimeout(pollingTimeoutRef.current)
          pollingTimeoutRef.current = null
        }
        
        messageHandlersRef.current.onConnect?.()
      })

      // Receive messages
      socket.on('message', (message: SSEMessage) => {
        setLastMessage(message)
        
        // Handle progress updates
        if (message.type === 'progress' && message.data && 'progress' in message.data) {
          messageHandlersRef.current.onProgress?.(message.data as ProgressData)
        }
        
        messageHandlersRef.current.onMessage?.(message)
      })

      // Transport upgrade
      socket.io.engine.on('upgrade', (transport) => {
        setConnectionType(transport.name === 'websocket' ? 'websocket' : 'polling')
      })

      socket.on('disconnect', (reason) => {
        // If we're in stable polling mode, don't try to reconnect via Socket.IO
        if (isPollingModeRef.current) {
          return
        }
        
        setIsConnected(false)
        setConnectionType('disconnected')
        isConnectingRef.current = false
        messageHandlersRef.current.onDisconnect?.()

        // Auto-reconnect logic
        if (autoReconnect && reason !== 'io client disconnect') {
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++
            const delay = Math.min(reconnectInterval * reconnectAttemptsRef.current, 30000)
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (!isSocketConnected() && !isPollingModeRef.current) {
                socket.connect()
              }
            }, delay)
          } else {
            socket.io.opts.reconnection = false
            fallbackToPolling()
          }
        }
      })

      // Connection errors
      socket.on('connect_error', (err) => {
        setError(err.message)
        isConnectingRef.current = false
        messageHandlersRef.current.onError?.(err)

        // Fallback to polling if initial connection fails
        if (reconnectAttemptsRef.current === 0) {
          // Disable Socket.IO auto-reconnect before fallback
          socket.io.opts.reconnection = false
          fallbackToPolling()
        }
      })

      // Reconnection events
      socket.on('reconnect_attempt', () => {
        // Silent
      })

      socket.on('reconnect', () => {
        setError(null)
        reconnectAttemptsRef.current = 0
      })

      socket.on('reconnect_failed', () => {
        // Disable Socket.IO auto-reconnect before fallback
        socket.io.opts.reconnection = false
        fallbackToPolling()
      })

    } catch {
      setError('Failed to create Socket.IO connection')
      isConnectingRef.current = false
      
      // Only fallback to polling if we haven't already
      if (!isPollingModeRef.current) {
        fallbackToPolling()
      }
    }
  }, [fingerprint, autoReconnect, reconnectInterval, maxReconnectAttempts, fallbackToPolling])

  // Main connect function
  const connect = useCallback(() => {
    // Try Socket.IO first, with automatic fallback to polling on failure
    connectSocketIO()
  }, [connectSocketIO])

  const disconnect = useCallback(() => {
    // Clear all timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current)
      pollingTimeoutRef.current = null
    }

    // Disconnect socket
    if (socketRef.current) {
      try {
        socketRef.current.removeAllListeners()
        disconnectSocket()
      } catch {
        // Silent fail
      }
      socketRef.current = null
    }

    // Reset state
    setIsConnected(false)
    setConnectionType('disconnected')
    isConnectingRef.current = false
    reconnectAttemptsRef.current = 0
    isPollingModeRef.current = false
    messageHandlersRef.current.onDisconnect?.()
  }, [])

  const reconnect = useCallback(() => {
    disconnect()
    reconnectAttemptsRef.current = 0
    setTimeout(() => {
      connect()
    }, 1000)
  }, [disconnect, connect])

  const sendHeartbeat = useCallback((operation: string, progress?: number) => {
    if (socketRef.current && isSocketConnected()) {
      // Send via Socket.IO
      socketRef.current.emit('heartbeat', {
        operation,
        progress,
        timestamp: Date.now()
      })
    } else {
      // Fallback to HTTP for polling mode
      fetch('/api/v1/stream/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint,
          operation,
          progress,
          timestamp: Date.now()
        })
      }).catch(() => {
        // Silent fail
      })
    }
  }, [fingerprint])

  // Auto-connect on mount - ONLY ONCE
  useEffect(() => {
    // Only connect if we haven't initialized yet
    if (fingerprint && !hasInitialized) {
      setHasInitialized(true)
      connect()
    }

    // Cleanup on unmount
    return () => {
      if (hasInitialized) {
        disconnect()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]) // Only re-run if fingerprint changes

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
