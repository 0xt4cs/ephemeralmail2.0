import { Server as SocketIOServer } from 'socket.io'

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
  timestamp: number
}

export interface SocketMessage {
  type: 'connected' | 'ping' | 'email_received' | 'system_notification' | 'progress' | 'operation_complete' | 'error'
  timestamp: string
  data?: EmailNotificationData | SystemNotificationData | ProgressData
  message?: string
}

class SocketManager {
  private io: SocketIOServer | null = null
  private activeOperations = new Map<string, ProgressData>()

  // Initialize the Socket.IO instance
  public initialize(io: SocketIOServer): void {
    this.io = io
    console.log('[SocketManager] Socket.IO manager initialized')
  }

  // Get the Socket.IO instance
  public getIO(): SocketIOServer | null {
    return this.io
  }

  // Check if Socket.IO is initialized
  public isInitialized(): boolean {
    return this.io !== null
  }

  // Broadcast email notification to a specific fingerprint
  public broadcastToFingerprint(fingerprint: string, data: EmailNotificationData): number {
    if (!this.io) {
      console.warn('[SocketManager] Socket.IO not initialized')
      return 0
    }

    const message: SocketMessage = {
      type: 'email_received',
      timestamp: new Date().toISOString(),
      data
    }

    const room = `fingerprint:${fingerprint}`
    
    // Emit to all sockets in the fingerprint room
    this.io.to(room).emit('message', message)
    
    // Get count of clients in the room
    const sockets = this.io.sockets.adapter.rooms.get(room)
    const count = sockets ? sockets.size : 0

    console.log(`[SocketManager] Broadcast email to ${count} client(s) in room: ${room}`)
    return count
  }

  // Broadcast system notification to a specific fingerprint
  public notifyFingerprint(fingerprint: string, data: SystemNotificationData): number {
    if (!this.io) {
      console.warn('[SocketManager] Socket.IO not initialized')
      return 0
    }

    const message: SocketMessage = {
      type: 'system_notification',
      timestamp: new Date().toISOString(),
      data
    }

    const room = `fingerprint:${fingerprint}`
    this.io.to(room).emit('message', message)

    const sockets = this.io.sockets.adapter.rooms.get(room)
    const count = sockets ? sockets.size : 0

    console.log(`[SocketManager] Notification sent to ${count} client(s) in room: ${room}`)
    return count
  }

  // Send progress update to a specific fingerprint
  public sendProgress(fingerprint: string, data: ProgressData): number {
    if (!this.io) {
      console.warn('[SocketManager] Socket.IO not initialized')
      return 0
    }

    const operationKey = `${fingerprint}-${data.operation}`
    this.activeOperations.set(operationKey, data)

    const message: SocketMessage = {
      type: 'progress',
      timestamp: new Date().toISOString(),
      data
    }

    const room = `fingerprint:${fingerprint}`
    this.io.to(room).emit('message', message)

    const sockets = this.io.sockets.adapter.rooms.get(room)
    const count = sockets ? sockets.size : 0

    console.log(`[SocketManager] Progress update (${data.progress}%) sent to ${count} client(s)`)
    return count
  }

  // Mark operation as complete
  public completeOperation(fingerprint: string, operation: string): number {
    if (!this.io) {
      console.warn('[SocketManager] Socket.IO not initialized')
      return 0
    }

    const operationKey = `${fingerprint}-${operation}`
    this.activeOperations.delete(operationKey)

    const message: SocketMessage = {
      type: 'operation_complete',
      timestamp: new Date().toISOString(),
      message: `Operation ${operation} completed`
    }

    const room = `fingerprint:${fingerprint}`
    this.io.to(room).emit('message', message)

    const sockets = this.io.sockets.adapter.rooms.get(room)
    const count = sockets ? sockets.size : 0

    console.log(`[SocketManager] Operation complete sent to ${count} client(s)`)
    return count
  }

  // Send error message
  public sendError(fingerprint: string, error: string, details?: Record<string, unknown>): number {
    if (!this.io) {
      console.warn('[SocketManager] Socket.IO not initialized')
      return 0
    }

    const message: SocketMessage = {
      type: 'error',
      timestamp: new Date().toISOString(),
      message: error,
      data: details ? { message: error, type: 'error' as const, details } : undefined
    }

    const room = `fingerprint:${fingerprint}`
    this.io.to(room).emit('message', message)

    const sockets = this.io.sockets.adapter.rooms.get(room)
    const count = sockets ? sockets.size : 0

    return count
  }

  // Broadcast to all connected clients
  public broadcast(message: SocketMessage): number {
    if (!this.io) {
      console.warn('[SocketManager] Socket.IO not initialized')
      return 0
    }

    this.io.emit('message', message)
    
    // Get total connected sockets
    const count = this.io.sockets.sockets.size

    console.log(`[SocketManager] Broadcast to ${count} client(s)`)
    return count
  }

  // Get active operations for a fingerprint
  public getActiveOperations(fingerprint: string): ProgressData[] {
    const operations: ProgressData[] = []
    
    for (const [key, data] of this.activeOperations.entries()) {
      if (key.startsWith(`${fingerprint}-`)) {
        operations.push(data)
      }
    }

    return operations
  }

  // Get connected clients count for a fingerprint
  public getConnectedCount(fingerprint: string): number {
    if (!this.io) {
      return 0
    }

    const room = `fingerprint:${fingerprint}`
    const sockets = this.io.sockets.adapter.rooms.get(room)
    return sockets ? sockets.size : 0
  }

  // Get total connected clients
  public getTotalConnectedCount(): number {
    if (!this.io) {
      return 0
    }

    return this.io.sockets.sockets.size
  }

  // Clean up old operations
  public cleanupOldOperations(maxAge: number = 3600000): void {
    const now = Date.now()
    const toDelete: string[] = []

    for (const [key, data] of this.activeOperations.entries()) {
      if (now - data.timestamp > maxAge) {
        toDelete.push(key)
      }
    }

    toDelete.forEach(key => this.activeOperations.delete(key))

    if (toDelete.length > 0) {
      console.log(`[SocketManager] Cleaned up ${toDelete.length} old operations`)
    }
  }
}

// Create singleton instance
export const socketManager = new SocketManager()

// Helper function to get Socket.IO instance from global
export function getSocketIO(): SocketIOServer | null {
  if (typeof global !== 'undefined' && global.io) {
    return global.io
  }
  return null
}

// Initialize Socket.IO manager from global instance
export function initializeSocketManager(): void {
  const io = getSocketIO()
  if (io && !socketManager.isInitialized()) {
    socketManager.initialize(io)
  }
}
