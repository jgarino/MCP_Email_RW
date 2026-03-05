import type { Provider, ImapConfig, SmtpConfig, Pop3Config } from './types.js';

interface ProviderDefaults {
  imap: ImapConfig;
  smtp: SmtpConfig;
  pop3?: Pop3Config;
}

export const PROVIDER_DEFAULTS: Record<Provider, ProviderDefaults | undefined> = {
  gmail: {
    imap: { host: 'imap.gmail.com', port: 993, secure: true },
    smtp: { host: 'smtp.gmail.com', port: 465, secure: true },
    pop3: { host: 'pop.gmail.com', port: 995, secure: true },
  },
  outlook: {
    imap: { host: 'outlook.office365.com', port: 993, secure: true },
    smtp: { host: 'smtp.office365.com', port: 587, secure: false, starttls: true },
    pop3: { host: 'outlook.office365.com', port: 995, secure: true },
  },
  yahoo: {
    imap: { host: 'imap.mail.yahoo.com', port: 993, secure: true },
    smtp: { host: 'smtp.mail.yahoo.com', port: 465, secure: true },
    pop3: { host: 'pop.mail.yahoo.com', port: 995, secure: true },
  },
  icloud: {
    imap: { host: 'imap.mail.me.com', port: 993, secure: true },
    smtp: { host: 'smtp.mail.me.com', port: 587, secure: false, starttls: true },
  },
  ovh: {
    imap: { host: 'ssl0.ovh.net', port: 993, secure: true },
    smtp: { host: 'ssl0.ovh.net', port: 465, secure: true },
    pop3: { host: 'ssl0.ovh.net', port: 995, secure: true },
  },
  ionos: {
    imap: { host: 'imap.ionos.com', port: 993, secure: true },
    smtp: { host: 'smtp.ionos.com', port: 465, secure: true },
    pop3: { host: 'pop.ionos.com', port: 995, secure: true },
  },
  custom: undefined,
};

export function getProviderDefaults(provider: Provider): ProviderDefaults | undefined {
  return PROVIDER_DEFAULTS[provider];
}

export function detectProviderFromEmail(email: string): Provider {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return 'custom';

  if (domain === 'gmail.com' || domain === 'googlemail.com') return 'gmail';
  if (['outlook.com', 'hotmail.com', 'live.com', 'msn.com'].includes(domain)) return 'outlook';
  if (['yahoo.com', 'ymail.com', 'yahoo.fr', 'yahoo.co.uk'].includes(domain)) return 'yahoo';
  if (['icloud.com', 'me.com', 'mac.com'].includes(domain)) return 'icloud';
  if (domain.endsWith('.ovh.net') || domain.endsWith('.ovh.com')) return 'ovh';
  if (domain.endsWith('.ionos.com') || domain.endsWith('.ionos.fr')) return 'ionos';

  return 'custom';
}
