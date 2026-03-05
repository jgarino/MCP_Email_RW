import type { AccountConfig, AuthMethod } from '../config/types.js';

export interface AuthCredentials {
  username: string;
  password?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface AuthResult {
  success: boolean;
  credentials?: AuthCredentials;
  error?: string;
  method: string;
}

export interface AuthStrategy {
  name: string;
  authenticate(config: AccountConfig): Promise<AuthResult>;
  getImapAuth(config: AccountConfig): Promise<Record<string, unknown>>;
  getSmtpAuth(config: AccountConfig): Promise<Record<string, unknown>>;
}

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
}

export interface DetectionResult {
  provider: string;
  authMethod: AuthMethod;
  imap?: { host: string; port: number; secure: boolean };
  smtp?: { host: string; port: number; secure: boolean };
  description: string;
}
