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

export interface SSEMessage {
  type: 'connected' | 'ping' | 'email_received' | 'system_notification' | 'error'
  timestamp: string
  data?: EmailNotificationData | SystemNotificationData
  message?: string
}

class SSEManager {
  private connections = new Map<string, SSEConnection>()
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
        console.log(`Cleaning up inactive connection: ${id}`)
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

        this.sendMessage(connectionId, {
          type: 'connected',
          timestamp: new Date().toISOString(),
          message: 'SSE connection established'
        })

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

        request.signal.addEventListener('abort', () => {
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
    } catch (error) {
      console.error('Failed to send message to connection:', connectionId, error)
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

    console.log(`Broadcasted to ${sentCount} connections for fingerprint: ${fingerprint}`)
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

    console.log(`Broadcasted to ${sentCount} total connections`)
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
      } catch (error) {
        console.error('Error closing connection:', error)
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

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.disconnectAll()
  }
}

export const sseManager = new SSEManager()
