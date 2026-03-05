/**
 * Email protocol-related types (IMAP, POP3, SMTP).
 */

export type EmailProtocol = 'imap' | 'pop3' | 'smtp';

export interface ServerConfig {
  host: string;
  port: number;
  secure: boolean;
  starttls?: boolean;
}

export interface ImapConfig extends ServerConfig {
  /** Maximum idle time in milliseconds before reconnecting */
  idleTimeout?: number;
  /** Compression support */
  compression?: boolean;
}

export interface Pop3Config extends ServerConfig {
  /** Whether to keep messages on server after retrieval */
  keepOnServer?: boolean;
}

export interface SmtpConfig extends ServerConfig {
  /** Maximum message size in bytes */
  maxMessageSize?: number;
}

export interface ConnectionStatus {
  protocol: EmailProtocol;
  connected: boolean;
  authenticated: boolean;
  lastError?: string;
  lastConnected?: Date;
}

export interface ProtocolCapabilities {
  protocol: EmailProtocol;
  authMechanisms: string[];
  extensions: string[];
  maxMessageSize?: number;
  starttls?: boolean;
  ssl?: boolean;
}
