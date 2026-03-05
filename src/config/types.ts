/**
 * TypeScript types for the account configuration system.
 */

import type { ImapConfig, Pop3Config, SmtpConfig } from '../types/protocol.types.js';

export type AuthMethod = 'password' | 'oauth2' | 'app-password' | 'ntlm';
export type EmailProvider = 'gmail' | 'outlook' | 'yahoo' | 'icloud' | 'ovh' | 'ionos' | 'custom';

export interface BasicCredentials {
  username: string;
  /** Plain password or a keychain reference like "keychain:my-key" */
  password?: string;
  passwordRef?: string;
}

export interface OAuth2Config {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiry?: string | null;
  /** For Microsoft multi-tenant: tenant ID */
  tenantId?: string;
}

export interface AccountAuth {
  method: AuthMethod;
  credentials?: BasicCredentials;
  oauth2?: OAuth2Config;
}

export interface AccountPreferences {
  defaultProtocol: 'imap' | 'pop3';
  maxEmailsPerFetch: number;
  syncFolders?: string[];
  autoExpunge: boolean;
}

export interface AccountConfig {
  id: string;
  name: string;
  email: string;
  enabled: boolean;
  provider: EmailProvider;
  auth: AccountAuth;
  imap?: ImapConfig;
  smtp?: SmtpConfig;
  pop3?: Pop3Config;
  preferences?: Partial<AccountPreferences>;
}

export interface GlobalConfig {
  configDir: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  timeout: number;
  maxConnections: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface AccountsConfig {
  $schema?: string;
  version: string;
  accounts: AccountConfig[];
  global: GlobalConfig;
}

export const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
  configDir: '~/.mcp-email-rw',
  logLevel: 'info',
  timeout: 30000,
  maxConnections: 5,
  retryAttempts: 3,
  retryDelay: 1000,
};

export const DEFAULT_ACCOUNT_PREFERENCES: AccountPreferences = {
  defaultProtocol: 'imap',
  maxEmailsPerFetch: 50,
  autoExpunge: false,
};
