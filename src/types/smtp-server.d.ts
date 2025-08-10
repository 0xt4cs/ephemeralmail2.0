declare module 'smtp-server' {
  import { EventEmitter } from 'events';
  import { Server } from 'net';

  export interface SMTPAddress {
    address: string;
    name?: string;
  }

  export interface SMTPSession {
    id?: string;
    remoteAddress?: string;
    remotePort?: number;
    hostName?: string;
    envelope?: {
      from?: string;
      to?: string[];
      rcptTo?: Array<{ address?: string }>;
    };
    [key: string]: unknown;
  }

  export interface SMTPAuth {
    user: string;
    pass: string;
    method: string;
  }

  export interface SMTPServerOptions {
    banner?: string;
    disabledCommands?: string[];
    logger?: boolean | ((level: string, message: string) => void);
    authOptional?: boolean;
    size?: number; // Maximum message size in bytes
    onAuth?: (auth: SMTPAuth, session: SMTPSession, callback: (err?: Error | null, response?: { user?: string }) => void) => void;
    onMailFrom?: (address: SMTPAddress, session: SMTPSession, callback: (err?: Error | null) => void) => void;
    onRcptTo?: (address: SMTPAddress, session: SMTPSession, callback: (err?: Error | null) => void) => void;
    onData?: (stream: NodeJS.ReadableStream, session: Record<string, unknown>, callback: (err?: Error | null) => void) => void;
    onClose?: (session: SMTPSession) => void;
    onError?: (err: Error) => void;
  }

  export class SMTPServer extends EventEmitter {
    constructor(options: SMTPServerOptions);
    listen(port: number, host?: string, callback?: () => void): Server;
    listen(port: number, callback?: () => void): Server;
    close(callback?: () => void): void;
    listening: boolean; // Whether the server is listening
  }
}
