/**
 * Default server configurations for well-known email providers.
 */

import type { AccountConfig, AccountPreferences } from './types.js';
import type { ImapConfig, SmtpConfig, Pop3Config } from '../types/protocol.types.js';

export interface ProviderDefaults {
  provider: AccountConfig['provider'];
  imap: ImapConfig;
  smtp: SmtpConfig;
  pop3?: Pop3Config;
  authMethods: AccountConfig['auth']['method'][];
  notes?: string;
}

export const PROVIDER_DEFAULTS: Record<string, ProviderDefaults> = {
  gmail: {
    provider: 'gmail',
    imap: { host: 'imap.gmail.com', port: 993, secure: true, starttls: false },
    smtp: { host: 'smtp.gmail.com', port: 465, secure: true, starttls: false },
    pop3: { host: 'pop.gmail.com', port: 995, secure: true },
    authMethods: ['oauth2', 'app-password'],
    notes: 'Requires OAuth2 or an App Password (2FA must be enabled).',
  },
  outlook: {
    provider: 'outlook',
    imap: { host: 'outlook.office365.com', port: 993, secure: true },
    smtp: { host: 'smtp.office365.com', port: 587, secure: false, starttls: true },
    authMethods: ['oauth2', 'app-password'],
    notes: 'Modern Auth (OAuth2) is preferred. Legacy auth may be disabled by admin.',
  },
  yahoo: {
    provider: 'yahoo',
    imap: { host: 'imap.mail.yahoo.com', port: 993, secure: true },
    smtp: { host: 'smtp.mail.yahoo.com', port: 465, secure: true },
    pop3: { host: 'pop.mail.yahoo.com', port: 995, secure: true },
    authMethods: ['app-password', 'oauth2'],
    notes: 'Yahoo requires an App Password or OAuth2.',
  },
  icloud: {
    provider: 'icloud',
    imap: { host: 'imap.mail.me.com', port: 993, secure: true },
    smtp: { host: 'smtp.mail.me.com', port: 587, secure: false, starttls: true },
    authMethods: ['app-password'],
    notes: 'iCloud requires an App-Specific Password.',
  },
  ovh: {
    provider: 'ovh',
    imap: { host: 'ssl0.ovh.net', port: 993, secure: true },
    smtp: { host: 'ssl0.ovh.net', port: 465, secure: true },
    pop3: { host: 'ssl0.ovh.net', port: 995, secure: true },
    authMethods: ['password'],
    notes: 'Standard password authentication over TLS.',
  },
  ionos: {
    provider: 'ionos',
    imap: { host: 'imap.ionos.com', port: 993, secure: true },
    smtp: { host: 'smtp.ionos.com', port: 465, secure: true },
    pop3: { host: 'pop.ionos.com', port: 995, secure: true },
    authMethods: ['password'],
    notes: 'Standard password authentication over TLS.',
  },
  custom: {
    provider: 'custom',
    imap: { host: '', port: 993, secure: true },
    smtp: { host: '', port: 587, secure: false, starttls: true },
    pop3: { host: '', port: 995, secure: true },
    authMethods: ['password', 'oauth2', 'app-password', 'ntlm'],
    notes: 'Manual server configuration required.',
  },
};

export const DEFAULT_ACCOUNT_PREFERENCES: AccountPreferences = {
  defaultProtocol: 'imap',
  maxEmailsPerFetch: 50,
  autoExpunge: false,
};

/** Returns the provider defaults for a given provider key, or the custom defaults if not found */
export function getProviderDefaults(provider: string): ProviderDefaults {
  return PROVIDER_DEFAULTS[provider] ?? PROVIDER_DEFAULTS['custom'];
}
