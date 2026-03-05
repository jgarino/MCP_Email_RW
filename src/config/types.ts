export type AuthMethod = 'password' | 'oauth2' | 'app-password' | 'xoauth2' | 'ntlm';
export type Provider = 'gmail' | 'outlook' | 'yahoo' | 'icloud' | 'ovh' | 'ionos' | 'custom';
export type Protocol = 'imap' | 'pop3' | 'smtp';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface OAuth2Config {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiry?: number | null;
  tenantId?: string;
}

export interface CredentialsConfig {
  username: string;
  passwordRef: string;
}

export interface AuthConfig {
  method: AuthMethod;
  oauth2?: OAuth2Config;
  credentials?: CredentialsConfig;
}

export interface ImapConfig {
  host: string;
  port: number;
  secure: boolean;
  starttls?: boolean;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  starttls?: boolean;
}

export interface Pop3Config {
  host: string;
  port: number;
  secure: boolean;
  enabled?: boolean;
}

export interface AccountPreferences {
  defaultProtocol: Protocol;
  maxEmailsPerFetch: number;
  syncFolders?: string[];
  autoExpunge?: boolean;
}

export interface AccountConfig {
  id: string;
  name: string;
  email: string;
  enabled: boolean;
  provider: Provider;
  auth: AuthConfig;
  imap?: ImapConfig;
  smtp?: SmtpConfig;
  pop3?: Pop3Config;
  preferences?: AccountPreferences;
}

export interface GlobalConfig {
  configDir?: string;
  logLevel?: LogLevel;
  timeout?: number;
  maxConnections?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface AppConfig {
  version: string;
  accounts: AccountConfig[];
  global?: GlobalConfig;
}
