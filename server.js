import { createServer } from 'http'
import next from 'next'
import { Server } from 'socket.io'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '8989', 10)

// Initialize Next.js app
const app = next({ dev, hostname, port })
const handler = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(handler)

  // Initialize Socket.IO server with proper configuration
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    // Transport priority: WebSocket first, then polling fallback
    transports: ['websocket', 'polling'],
    // Performance optimizations
    pingTimeout: 60000,
    pingInterval: 25000,
    // Allow upgrades from polling to WebSocket
    allowUpgrades: true,
    // Cookie configuration for sticky sessions if needed
    cookie: false,
    // Compression
    perMessageDeflate: {
      threshold: 1024,
      zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      }
    },
    // Connection state recovery
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
    // Max buffer size
    maxHttpBufferSize: 1e6
  })

  // Make io instance globally available for API routes
  global.io = io

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`)
    
    const fingerprint = socket.handshake.auth.fingerprint || socket.handshake.query.fingerprint

    if (fingerprint) {
      // Join room based on fingerprint for targeted messages
      socket.join(`fingerprint:${fingerprint}`)
      console.log(`[Socket.IO] Client ${socket.id} joined room: fingerprint:${fingerprint}`)
      
      // Send connection confirmation
      socket.emit('message', {
        type: 'connected',
        timestamp: new Date().toISOString(),
        message: 'Socket.IO connection established',
        connectionId: socket.id
      })
    }

    // Handle heartbeat from client
    socket.on('heartbeat', (data) => {
      socket.emit('heartbeat-ack', {
        timestamp: new Date().toISOString(),
        receivedAt: data?.timestamp || null
      })
    })

    // Handle progress updates from client
    socket.on('progress-update', (data) => {
      // Acknowledge receipt
      socket.emit('progress-ack', {
        operation: data.operation,
        timestamp: new Date().toISOString()
      })
    })

    // Handle custom events
    socket.on('subscribe', (room) => {
      socket.join(room)
      console.log(`[Socket.IO] Client ${socket.id} subscribed to: ${room}`)
    })

    socket.on('unsubscribe', (room) => {
      socket.leave(room)
      console.log(`[Socket.IO] Client ${socket.id} unsubscribed from: ${room}`)
    })

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}, reason: ${reason}`)
    })

    // Handle errors
    socket.on('error', (error) => {
      console.error(`[Socket.IO] Socket error for ${socket.id}:`, error)
    })

    // Track transport upgrade
    socket.conn.on('upgrade', (transport) => {
      console.log(`[Socket.IO] Connection ${socket.id} upgraded to ${transport.name}`)
    })
  })

  // Error handling for Socket.IO
  io.engine.on('connection_error', (err) => {
    console.error('[Socket.IO] Connection error:', {
      code: err.code,
      message: err.message,
      context: err.context
    })
  })

  // Start server
  httpServer
    .once('error', (err) => {
      console.error('[Server] Fatal error:', err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
      console.log(`> Socket.IO server initialized`)
      console.log(`> Environment: ${dev ? 'development' : 'production'}`)
    })

  // Graceful shutdown
  const gracefulShutdown = () => {
    console.log('\n[Server] Shutting down gracefully...')
    
    // Close Socket.IO connections
    io.close(() => {
      console.log('[Socket.IO] All connections closed')
    })

    // Close HTTP server
    httpServer.close(() => {
      console.log('[Server] HTTP server closed')
      process.exit(0)
    })

    // Force exit after timeout
    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout')
      process.exit(1)
    }, 10000)
  }

  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)
})
