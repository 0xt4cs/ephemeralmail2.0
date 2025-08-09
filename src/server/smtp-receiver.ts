import { SMTPServer } from 'smtp-server'
import { simpleParser } from 'mailparser'

const API_URL = process.env.API_URL || 'http://127.0.0.1:8989/api/v1/received'
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || process.env.SMTP_WEBHOOK_SECRET || 'change-me'
const SMTP_PORT = Number(process.env.SMTP_PORT || 25)

const server = new SMTPServer({
  banner: 'EphemeralMail SMTP',
  disabledCommands: ['AUTH'],
  onData(stream: NodeJS.ReadableStream, session: Record<string, unknown>, callback: (err?: Error | null) => void) {
    const chunks: Buffer[] = []
    stream.on('data', (d: Buffer) => chunks.push(d))
    stream.on('end', async () => {
      try {
        const buf = Buffer.concat(chunks)
        const mail = await simpleParser(buf)

        const env = (session as { envelope?: { rcptTo?: Array<{ address?: string }> } }).envelope
        const to = (env && env.rcptTo && env.rcptTo[0] && env.rcptTo[0].address) || ''
        const from = mail.from ? mail.from.text : ''
        const subject = mail.subject || '(no subject)'
        const messageId = mail.messageId || ''
        const bodyHtml = (mail.html as string | null) || null
        const bodyText = (mail.text as string | null) || null
        const attachments = (mail.attachments || []).map((a: { filename?: string; content?: Buffer; contentType?: string }) => ({
          name: a.filename || 'attachment',
          size: a.content ? a.content.length : 0,
          type: a.contentType || 'application/octet-stream',
        }))

        const headersObj: Record<string, string> = {}
        for (const [k, v] of (mail.headers as Map<string, unknown>).entries()) {
          headersObj[k] = String(v)
        }

        const payload = {
          emailAddress: to,
          fromAddress: from,
          subject,
          bodyHtml,
          bodyText,
          headers: headersObj,
          messageId,
          attachments,
        }

        const res = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-secret': WEBHOOK_SECRET,
          },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const t = await res.text().catch(() => '')
          // eslint-disable-next-line no-console
          console.error('Webhook failed:', res.status, t)
          return callback(new Error('Webhook failed'))
        }
        return callback()
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('SMTP parse/post error:', e)
        return callback(e as Error)
      }
    })
  },
})

server.on('error', (err: Error) => console.error('SMTP server error', err))
server.listen(SMTP_PORT, () => {
  console.log(`SMTP receiver listening on ${SMTP_PORT}`)
})


