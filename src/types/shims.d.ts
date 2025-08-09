// Minimal type shims for runtime-only libs

declare module 'smtp-server' {
  export interface SMTPServerOptions {
    banner?: string
    disabledCommands?: string[]
    onData?: (
      stream: NodeJS.ReadableStream,
      session: Record<string, unknown>,
      callback: (err?: Error | null) => void
    ) => void
  }

  export class SMTPServer {
    constructor(options?: SMTPServerOptions)
    listen(port: number, cb?: () => void): void
    on(event: 'error', cb: (err: Error) => void): void
  }
}

declare module 'mailparser' {
  export interface AttachmentLike {
    filename?: string
    content?: Buffer
    contentType?: string
  }

  export interface ParsedMail {
    from?: { text: string }
    subject?: string
    messageId?: string
    html?: string | null
    text?: string | null
    attachments?: AttachmentLike[]
    headers?: Map<string, unknown>
  }

  export function simpleParser(src: Buffer | string): Promise<ParsedMail>
}


