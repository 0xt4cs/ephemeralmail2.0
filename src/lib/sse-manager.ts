import { NextRequest } from 'next/server'

export interface SSEConnection {
  id: string
  fingerprint: string
  controller: ReadableStreamDefaultController
  lastPing: number
  createdAt: number
}

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

export interface SSEMessage {
  type: 'connected' | 'ping' | 'email_received' | 'system_notification' | 'progress' | 'operation_complete' | 'error'
  timestamp: string
  data?: EmailNotificationData | SystemNotificationData | ProgressData
  message?: string
}

class SSEManager {
  private connections = new Map<string, SSEConnection>()
  private activeOperations = new Map<string, ProgressData>()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    this.startCleanup()
  }

  private startCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveConnections()
    }, 30000)
  }

  private cleanupInactiveConnections() {
    const now = Date.now()
    const timeout = 60000

    for (const [id, connection] of this.connections.entries()) {
      if (now - connection.lastPing > timeout) {
        this.connections.delete(id)
      }
    }
  }

  public createConnection(fingerprint: string, request: NextRequest): ReadableStream {
    const connectionId = `${fingerprint}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const stream = new ReadableStream({
      start: (controller) => {
        const connection: SSEConnection = {
          id: connectionId,
          fingerprint,
          controller,
          lastPing: Date.now(),
          createdAt: Date.now()
        }

        this.connections.set(connectionId, connection)

        // Send initial connection message
        this.sendMessage(connectionId, {
          type: 'connected',
          timestamp: new Date().toISOString(),
          message: 'SSE connection established'
        })

        // Send ping every 30 seconds to keep connection alive
        const pingInterval = setInterval(() => {
          this.sendMessage(connectionId, {
            type: 'ping',
            timestamp: new Date().toISOString()
          })
          
          const conn = this.connections.get(connectionId)
          if (conn) {
            conn.lastPing = Date.now()
          }
        }, 30000)

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(pingInterval)
          this.connections.delete(connectionId)
          controller.close()
        })

        // Handle stream close
        request.signal.addEventListener('close', () => {
          clearInterval(pingInterval)
          this.connections.delete(connectionId)
          controller.close()
        })
      }
    })

    return stream
  }

  public sendMessage(connectionId: string, message: SSEMessage): boolean {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      return false
    }

    try {
      const encoder = new TextEncoder()
      const messageData = encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
      connection.controller.enqueue(messageData)
      return true
    } catch {
      // Connection is broken, remove it
      this.connections.delete(connectionId)
      return false
    }
  }

  public broadcastToFingerprint(fingerprint: string, data: EmailNotificationData): number {
    const message: SSEMessage = {
      type: 'email_received',
      timestamp: new Date().toISOString(),
      data
    }

    let sentCount = 0
    for (const [id, connection] of this.connections.entries()) {
      if (connection.fingerprint === fingerprint) {
        if (this.sendMessage(id, message)) {
          sentCount++
        }
      }
    }

    return sentCount
  }

  public broadcastToAll(data: SystemNotificationData): number {
    const message: SSEMessage = {
      type: 'system_notification',
      timestamp: new Date().toISOString(),
      data
    }

    let sentCount = 0
    for (const [id] of this.connections.entries()) {
      if (this.sendMessage(id, message)) {
        sentCount++
      }
    }

    return sentCount
  }

  public broadcastProgressToFingerprint(fingerprint: string, data: ProgressData): number {
    const message: SSEMessage = {
      type: 'progress',
      timestamp: new Date().toISOString(),
      data
    }

    let sentCount = 0
    for (const [id, connection] of this.connections.entries()) {
      if (connection.fingerprint === fingerprint) {
        if (this.sendMessage(id, message)) {
          sentCount++
        }
      }
    }

    return sentCount
  }

  public getConnectionCount(): number {
    return this.connections.size
  }

  public getConnectionsByFingerprint(fingerprint: string): SSEConnection[] {
    return Array.from(this.connections.values()).filter(
      conn => conn.fingerprint === fingerprint
    )
  }

  public disconnectConnection(connectionId: string): boolean {
    const connection = this.connections.get(connectionId)
    if (connection) {
      try {
        connection.controller.close()
      } catch {
        // Connection already closed
      }
      this.connections.delete(connectionId)
      return true
    }
    return false
  }

  public disconnectAll(): void {
    for (const [id] of this.connections.entries()) {
      this.disconnectConnection(id)
    }
  }

  // Operation progress tracking
  public updateOperationProgress(fingerprint: string, progress: ProgressData): void {
    const key = `${fingerprint}-${progress.operation}`
    this.activeOperations.set(key, progress)
    
    // Clean up completed operations
    if (progress.progress >= 100) {
      setTimeout(() => {
        this.activeOperations.delete(key)
      }, 5000) // Keep for 5 seconds after completion
    }
  }

  public getActiveOperations(fingerprint: string): ProgressData[] {
    const operations: ProgressData[] = []
    for (const [key, operation] of this.activeOperations.entries()) {
      if (key.startsWith(fingerprint)) {
        operations.push(operation)
      }
    }
    return operations.sort((a, b) => b.timestamp - a.timestamp)
  }

  public clearOperations(fingerprint: string): void {
    for (const [key] of this.activeOperations.entries()) {
      if (key.startsWith(fingerprint)) {
        this.activeOperations.delete(key)
      }
    }
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.disconnectAll()
    this.activeOperations.clear()
  }
}

export const sseManager = new SSEManager()
