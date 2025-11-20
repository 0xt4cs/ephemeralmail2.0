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
  
  const socketRef = useRef<Socket | null>(null)
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const isConnectingRef = useRef(false)
  const lastPollTimeRef = useRef(0)
  const messageHandlersRef = useRef({ onMessage, onConnect, onDisconnect, onError, onProgress })

  // Update refs when callbacks change
  useEffect(() => {
    messageHandlersRef.current = { onMessage, onConnect, onDisconnect, onError, onProgress }
  }, [onMessage, onConnect, onDisconnect, onError, onProgress])

  // Polling fallback
  const fallbackToPolling = useCallback(() => {
    if (connectionType === 'polling') return
    
    console.log('[Realtime] 🔄 Starting polling fallback')
    
    // CRITICAL: Disconnect Socket.IO completely to prevent race condition
    if (socketRef.current) {
      console.log('[Realtime] ⚠️ Disconnecting Socket.IO before starting polling')
      socketRef.current.removeAllListeners() // Remove all event listeners
      socketRef.current.disconnect() // Disconnect the socket
      socketRef.current = null // Clear the reference
    }
    
    setConnectionType('polling')
    setIsConnected(true)
    setError(null)
    
    const poll = async () => {
      try {
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
              messageHandlersRef.current.onProgress?.(message.data as ProgressData)
            }
            
            messageHandlersRef.current.onMessage?.(message)
            lastPollTimeRef.current = Date.now()
          }
        }
      } catch (err) {
        console.warn('[Realtime] Polling failed:', err)
      }
      
      // Schedule next poll
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current)
      }
      pollingTimeoutRef.current = setTimeout(poll, pollingInterval)
    }
    
    poll()
  }, [fingerprint, pollingInterval, connectionType])

  // Socket.IO Connection
  const connectSocketIO = useCallback(() => {
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
      console.log('[Realtime] Connecting via Socket.IO...')
      const socket = connectSocket(fingerprint)
      socketRef.current = socket

      // Connection established
      socket.on('connect', () => {
        console.log('[Realtime] ✅ Socket.IO connected - Socket ID:', socket.id)
        const transport = getTransportType()
        console.log('[Realtime] 🚀 Transport type:', transport)
        console.log('[Realtime] 📡 Connection details:', {
          connected: socket.connected,
          id: socket.id,
          transport: socket.io.engine?.transport?.name || 'unknown'
        })
        
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
        console.log('[Realtime] Transport upgraded to:', transport.name)
        setConnectionType(transport.name === 'websocket' ? 'websocket' : 'polling')
      })

      // Disconnection
      socket.on('disconnect', (reason) => {
        console.log('[Realtime] 🔌 Socket.IO disconnected:', reason)
        
        // If we're in polling mode, don't try to reconnect via Socket.IO
        if (connectionType === 'polling') {
          console.log('[Realtime] ⚠️ Already in polling mode, ignoring Socket.IO disconnect')
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
            console.log(`[Realtime] 🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`)
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (!isSocketConnected()) {
                socket.connect()
              }
            }, delay)
          } else {
            console.log('[Realtime] ⚠️ Max reconnection attempts reached, falling back to polling')
            socket.io.opts.reconnection = false
            fallbackToPolling()
          }
        }
      })

      // Connection errors
      socket.on('connect_error', (err) => {
        console.error('[Realtime] ❌ Socket.IO connection error:', err.message)
        setError(err.message)
        isConnectingRef.current = false
        messageHandlersRef.current.onError?.(err)

        // Fallback to polling if initial connection fails
        if (reconnectAttemptsRef.current === 0) {
          console.log('[Realtime] ⚠️ Initial connection failed, falling back to polling')
          // Disable Socket.IO auto-reconnect before fallback
          socket.io.opts.reconnection = false
          fallbackToPolling()
        }
      })

      // Reconnection events
      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('[Realtime] Reconnection attempt:', attemptNumber)
      })

      socket.on('reconnect', (attemptNumber) => {
        console.log('[Realtime] Reconnected after', attemptNumber, 'attempts')
        setError(null)
        reconnectAttemptsRef.current = 0
      })

      socket.on('reconnect_failed', () => {
        console.error('[Realtime] ❌ Reconnection failed, falling back to polling')
        // Disable Socket.IO auto-reconnect before fallback
        socket.io.opts.reconnection = false
        fallbackToPolling()
      })

    } catch (err) {
      console.error('[Realtime] ❌ Failed to create Socket.IO connection:', err)
      setError('Failed to create Socket.IO connection')
      isConnectingRef.current = false
      fallbackToPolling()
    }
  }, [fingerprint, autoReconnect, reconnectInterval, maxReconnectAttempts, fallbackToPolling, connectionType])

  // Main connect function
  const connect = useCallback(() => {
    // Try Socket.IO first, with automatic fallback to polling on failure
    connectSocketIO()
  }, [connectSocketIO])

  const disconnect = useCallback(() => {
    console.log('[Realtime] Disconnecting...')

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current)
      pollingTimeoutRef.current = null
    }

    if (socketRef.current) {
      disconnectSocket()
      socketRef.current = null
    }

    setIsConnected(false)
    setConnectionType('disconnected')
    isConnectingRef.current = false
    reconnectAttemptsRef.current = 0
    messageHandlersRef.current.onDisconnect?.()
  }, [])

  const reconnect = useCallback(() => {
    console.log('[Realtime] Manual reconnect triggered')
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
      }).catch(console.warn)
    }
  }, [fingerprint])

  // Auto-connect on mount
  useEffect(() => {
    if (fingerprint) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [fingerprint, connect, disconnect])

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
