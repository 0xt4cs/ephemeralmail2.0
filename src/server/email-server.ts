/* eslint-disable @typescript-eslint/no-explicit-any */
import { SMTPServer } from 'smtp-server'
import { simpleParser, ParsedMail } from 'mailparser'
import { createTransport, Transporter, SendMailOptions } from 'nodemailer'
import { EventEmitter } from 'events'
import * as dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

// Email Server Configuration
interface EmailServerConfig {
  // SMTP Server (receiving) configuration
  smtpPort: number
  smtpHost: string
  smtpBanner: string
  
  // SMTP Client (sending) configuration
  smtpSendPort: number
  smtpSendHost: string
  smtpSendUser?: string
  smtpSendPass?: string
  smtpSendSecure: boolean
  
  // API configuration
  apiUrl: string
  webhookSecret: string
  
  // Security
  allowedDomains?: string[]
  maxMessageSize?: number
  rateLimit?: {
    max: number
    windowMs: number
  }
}

// Email event types
interface EmailReceivedEvent {
  from: string
  to: string
  subject: string
  messageId: string
  bodyHtml?: string | null
  bodyText?: string | null
  headers: Record<string, string>
  attachments: Array<{
    name: string
    size: number
    type?: string
  }>
  timestamp: Date
}

interface EmailSentEvent {
  to: string
  subject: string
  messageId: string
  timestamp: Date
  success: boolean
  error?: string
}

// Email Server Class
export class EmailServer extends EventEmitter {
  private config: EmailServerConfig
  private smtpServer: SMTPServer
  private smtpClient: Transporter | null = null
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>()
  private isListening = false

  constructor(config: EmailServerConfig) {
    super()
    this.config = config
    this.smtpServer = this.createSMTPServer()
    // this.initializeSMTPClient() // Disabled for now - focus on receiving emails only
  }

  // Create SMTP server for receiving emails
  private createSMTPServer(): SMTPServer {
    return new SMTPServer({
      banner: this.config.smtpBanner,
      disabledCommands: ['AUTH'],
      authOptional: true,
      size: this.config.maxMessageSize || 10 * 1024 * 1024, // 10MB default
      
      // Handle MAIL FROM command
      onMailFrom: (address: any, session: any, callback: (err?: Error | null) => void) => {
        console.log(`[SMTP] MAIL FROM: ${address.address}`)
        
        // Rate limiting check
        if (this.isRateLimited(session.remoteAddress || 'unknown')) {
          return callback(new Error('Rate limit exceeded'))
        }
        
        callback() // Accept all senders
      },
      
      // Handle RCPT TO command
      onRcptTo: (address: any, session: any, callback: (err?: Error | null) => void) => {
        console.log(`[SMTP] RCPT TO: ${address.address}`)
        
        // Domain filtering
        if (this.config.allowedDomains && this.config.allowedDomains.length > 0) {
          const domain = address.address.split('@')[1]
          if (!this.config.allowedDomains.includes(domain)) {
            return callback(new Error('Domain not allowed'))
          }
        }
        
        callback() // Accept all recipients
      },
      
      // Handle email data (like mailserver.js)
      onData: (stream: NodeJS.ReadableStream, session: any, callback: (err?: Error | null) => void) => {
        const chunks: Buffer[] = []
        stream.on('data', (d: Buffer) => chunks.push(d))
        stream.on('end', async () => {
          try {
            const buf = Buffer.concat(chunks)
            const mail = await simpleParser(buf)
            
            const emailEvent = await this.processReceivedEmail(mail, session)
            this.emit('emailReceived', emailEvent)
            
            console.log(`[SMTP] Email processed: ${emailEvent.from} -> ${emailEvent.to}`)
            callback()
          } catch (e) {
            console.error('[SMTP] Error processing email:', e)
            callback(e as Error)
          }
        })
      },
      
      onClose: () => {
        console.log('[SMTP] Session closed')
      },
      
      onError: (err: Error) => {
        console.error('[SMTP] Server error:', err)
      }
    })
  }

  // Initialize SMTP client for sending emails
  private async initializeSMTPClient(): Promise<void> {
    try {
      this.smtpClient = createTransport({
        host: this.config.smtpSendHost,
        port: this.config.smtpSendPort,
        secure: this.config.smtpSendSecure,
        auth: this.config.smtpSendUser && this.config.smtpSendPass ? {
          user: this.config.smtpSendUser,
          pass: this.config.smtpSendPass
        } : undefined,
        tls: {
          rejectUnauthorized: false
        }
      })
      
      // Verify connection
      await this.smtpClient.verify()
      console.log('[SMTP Client] Connection verified successfully')
    } catch (error) {
      console.error('[SMTP Client] Connection failed:', error)
      this.smtpClient = null
    }
  }

  // Process received email (like mailserver.js)
  private async processReceivedEmail(mail: ParsedMail, session: any): Promise<EmailReceivedEvent> {
    const env = session.envelope
    const to = (env && env.rcptTo && env.rcptTo[0] && env.rcptTo[0].address) || ''
    const from = mail.from ? mail.from.text : ''
    const subject = mail.subject || '(no subject)'
    const messageId = mail.messageId || ''
    const bodyHtml = mail.html || null
    const bodyText = mail.text || null
    
    const attachments = (mail.attachments || []).map((a) => ({
      name: a.filename || 'attachment',
      size: a.content ? a.content.length : 0,
      type: a.contentType || 'application/octet-stream',
    }))

    const headersObj: Record<string, string> = {}
    if (mail.headers) {
      for (const [k, v] of mail.headers.entries()) {
        headersObj[k] = String(v)
      }
    }

    const emailEvent: EmailReceivedEvent = {
      from,
      to,
      subject,
      messageId,
      bodyHtml,
      bodyText,
      headers: headersObj,
      attachments,
      timestamp: new Date()
    }

    // Send to API
    await this.sendToAPI(emailEvent)
    
    return emailEvent
  }

  // Send email data to API
  private async sendToAPI(emailEvent: EmailReceivedEvent): Promise<void> {
    try {
      const payload = {
        emailAddress: emailEvent.to,
        fromAddress: emailEvent.from,
        subject: emailEvent.subject,
        bodyHtml: emailEvent.bodyHtml,
        bodyText: emailEvent.bodyText,
        headers: emailEvent.headers,
        messageId: emailEvent.messageId,
        attachments: emailEvent.attachments,
      }

      const res = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': this.config.webhookSecret,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorText = await res.text().catch(() => '')
        throw new Error(`API request failed: ${res.status} ${errorText}`)
      }
      
      console.log(`[API] Email data sent successfully: ${emailEvent.to}`)
    } catch (error) {
      console.error('[API] Failed to send email data:', error)
      throw error
    }
  }

  // Send email
  async sendEmail(options: SendMailOptions): Promise<EmailSentEvent> {
    if (!this.smtpClient) {
      throw new Error('SMTP client not initialized')
    }

    try {
      const result = await this.smtpClient.sendMail(options)
      
      const emailEvent: EmailSentEvent = {
        to: options.to as string,
        subject: options.subject || '',
        messageId: result.messageId || '',
        timestamp: new Date(),
        success: true
      }
      
      this.emit('emailSent', emailEvent)
      console.log(`[SMTP Client] Email sent successfully: ${emailEvent.to}`)
      
      return emailEvent
    } catch (error) {
      const emailEvent: EmailSentEvent = {
        to: options.to as string,
        subject: options.subject || '',
        messageId: '',
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      
      this.emit('emailSent', emailEvent)
      console.error('[SMTP Client] Failed to send email:', error)
      
      throw error
    }
  }

  // Rate limiting
  private isRateLimited(ip: string): boolean {
    if (!this.config.rateLimit) return false
    
    const now = Date.now()
    const limit = this.config.rateLimit
    const key = ip
    
    const current = this.rateLimitMap.get(key)
    
    if (!current || now > current.resetTime) {
      this.rateLimitMap.set(key, { count: 1, resetTime: now + limit.windowMs })
      return false
    }
    
    if (current.count >= limit.max) {
      return true
    }
    
    current.count++
    return false
  }

  // Start the email server
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.smtpServer.listen(this.config.smtpPort, () => {
        this.isListening = true
        console.log(`[Email Server] SMTP server listening on port ${this.config.smtpPort}`)
        console.log(`[Email Server] API endpoint: ${this.config.apiUrl}`)
        resolve()
      })
      
      this.smtpServer.on('error', (err) => {
        console.error('[Email Server] Failed to start:', err)
        reject(err)
      })
    })
  }

  // Stop the email server
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isListening) {
        // Use the server's close method if available, otherwise just resolve
        if (typeof (this.smtpServer as any).close === 'function') {
          (this.smtpServer as any).close(() => {
            this.isListening = false
            console.log('[Email Server] SMTP server stopped')
            resolve()
          })
        } else {
          this.isListening = false
          console.log('[Email Server] SMTP server stopped')
          resolve()
        }
      } else {
        resolve()
      }
    })
  }

  // Get server status
  getStatus(): {
    smtpServer: boolean
    smtpClient: boolean
    uptime: number
  } {
    return {
      smtpServer: this.isListening,
      smtpClient: this.smtpClient !== null,
      uptime: process.uptime()
    }
  }
}

// Default configuration
const defaultConfig: EmailServerConfig = {
  smtpPort: Number(process.env.SMTP_PORT || 25),
  smtpHost: process.env.SMTP_HOST || 'localhost',
  smtpBanner: 'EphemeralMail Email Server',
  
  smtpSendPort: Number(process.env.SMTP_SEND_PORT || 587),
  smtpSendHost: process.env.SMTP_SEND_HOST || 'localhost',
  smtpSendUser: process.env.SMTP_SEND_USER,
  smtpSendPass: process.env.SMTP_SEND_PASS,
  smtpSendSecure: process.env.SMTP_SEND_SECURE === 'true',
  
  apiUrl: process.env.API_URL || 'http://127.0.0.1:8989/api/v1/received',
  webhookSecret: process.env.WEBHOOK_SECRET || 'change-me',
  
  allowedDomains: process.env.ALLOWED_DOMAINS ? process.env.ALLOWED_DOMAINS.split(',') : undefined,
  maxMessageSize: Number(process.env.MAX_MESSAGE_SIZE || 10 * 1024 * 1024), // 10MB
  rateLimit: {
    max: Number(process.env.RATE_LIMIT_MAX || 100),
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000)
  }
}

// Create and start email server
const emailServer = new EmailServer(defaultConfig)

// Event handlers
emailServer.on('emailReceived', (event: EmailReceivedEvent) => {
  console.log(`[Event] Email received: ${event.from} -> ${event.to} (${event.subject})`)
})

emailServer.on('emailSent', (event: EmailSentEvent) => {
  if (event.success) {
    console.log(`[Event] Email sent: ${event.to} (${event.subject})`)
  } else {
    console.error(`[Event] Email failed: ${event.to} - ${event.error}`)
  }
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Email Server] Shutting down gracefully...')
  await emailServer.stop()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n[Email Server] Shutting down gracefully...')
  await emailServer.stop()
  process.exit(0)
})

// Start the server
emailServer.start().catch((error) => {
  console.error('[Email Server] Failed to start:', error)
  process.exit(1)
})
