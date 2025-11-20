'use client'

import { io, Socket } from 'socket.io-client'

// Socket.IO client configuration
const SOCKET_URL = typeof window !== 'undefined' 
  ? `${window.location.protocol}//${window.location.host}` 
  : 'http://localhost:8989'

// Create socket instance with best practices configuration
export function createSocket(fingerprint: string): Socket {
  const socket = io(SOCKET_URL, {
    // Authentication
    auth: {
      fingerprint
    },
    
    // Transport options - prefer WebSocket, fallback to polling
    transports: ['websocket', 'polling'],
    
    // Upgrade from polling to WebSocket when possible
    upgrade: true,
    
    // Reconnection settings
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
    
    // Connection timeout
    timeout: 20000,
    
    // Auto-connect
    autoConnect: false,
    
    // Query parameters (backup for auth)
    query: {
      fingerprint
    },
    
    // Additional options
    withCredentials: false,
    forceNew: false,
    
    // Multiplex - reuse existing connection for multiple namespaces
    multiplex: true,
  })

  // Connection event logging
  socket.on('connect', () => {
    console.log('[Socket.IO Client] Connected:', socket.id)
    console.log('[Socket.IO Client] Transport:', socket.io.engine.transport.name)
  })

  socket.on('disconnect', (reason) => {
    console.log('[Socket.IO Client] Disconnected:', reason)
    
    // Auto-reconnect logic based on reason
    if (reason === 'io server disconnect') {
      // Server initiated disconnect, manually reconnect
      socket.connect()
    }
  })

  socket.on('connect_error', (error) => {
    console.error('[Socket.IO Client] Connection error:', error.message)
  })

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('[Socket.IO Client] Reconnection attempt:', attemptNumber)
  })

  socket.on('reconnect', (attemptNumber) => {
    console.log('[Socket.IO Client] Reconnected after', attemptNumber, 'attempts')
  })

  socket.on('reconnect_failed', () => {
    console.error('[Socket.IO Client] Reconnection failed')
  })

  // Monitor transport upgrades
  if (socket.io?.engine) {
    socket.io.engine.on('upgrade', (transport) => {
      console.log('[Socket.IO Client] Transport upgraded to:', transport.name)
    })
  }

  return socket
}

// Singleton pattern for socket instance
let socketInstance: Socket | null = null

export function getSocket(fingerprint?: string): Socket | null {
  if (typeof window === 'undefined') {
    return null
  }

  if (socketInstance && socketInstance.connected) {
    return socketInstance
  }

  if (fingerprint && !socketInstance) {
    socketInstance = createSocket(fingerprint)
  }

  return socketInstance
}

export function connectSocket(fingerprint: string): Socket {
  if (typeof window === 'undefined') {
    throw new Error('Socket.IO can only be used in browser environment')
  }

  // Disconnect existing socket if any
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }

  // Create and connect new socket
  socketInstance = createSocket(fingerprint)
  socketInstance.connect()

  return socketInstance
}

export function disconnectSocket(): void {
  if (socketInstance) {
    console.log('[Socket.IO Client] Disconnecting...')
    socketInstance.disconnect()
    socketInstance = null
  }
}

export function isSocketConnected(): boolean {
  return socketInstance?.connected ?? false
}

export function getSocketId(): string | undefined {
  return socketInstance?.id
}

export function getTransportType(): string {
  if (!socketInstance?.io?.engine?.transport) {
    return 'disconnected'
  }
  return socketInstance.io.engine.transport.name
}

// Export socket types
export type { Socket } from 'socket.io-client'
