import { detectProviderFromEmail, getProviderDefaults } from '../config/defaults.js';
import type { DetectionResult } from './types.js';
import type { AuthMethod } from '../config/types.js';
import { logger } from '../utils/logger.js';

const PROVIDER_AUTH_RECOMMENDATIONS: Record<string, AuthMethod> = {
  gmail: 'app-password',
  outlook: 'oauth2',
  yahoo: 'app-password',
  icloud: 'app-password',
  ovh: 'password',
  ionos: 'password',
};

export class AuthDetector {
  async detectAuthForEmail(email: string): Promise<DetectionResult> {
    const provider = detectProviderFromEmail(email);

    logger.debug('Detecting auth for email', { email, provider });

    if (provider !== 'custom') {
      return this.getKnownProviderResult(provider, email);
    }

    return this.getCustomProviderResult(email);
  }

  private getKnownProviderResult(provider: string, email: string): DetectionResult {
    const defaults = getProviderDefaults(provider as Parameters<typeof getProviderDefaults>[0]);
    const authMethod = PROVIDER_AUTH_RECOMMENDATIONS[provider] || 'password';

    const result: DetectionResult = {
      provider,
      authMethod,
      description: `Detected ${provider} provider for ${email}`,
    };

    if (defaults) {
      result.imap = { ...defaults.imap };
      result.smtp = { ...defaults.smtp };
    }

    return result;
  }

  private getCustomProviderResult(email: string): DetectionResult {
    const domain = email.split('@')[1]?.toLowerCase() || 'unknown';

    return {
      provider: 'custom',
      authMethod: 'password',
      imap: { host: `imap.${domain}`, port: 993, secure: true },
      smtp: { host: `smtp.${domain}`, port: 465, secure: true },
      description: `Unknown provider for domain ${domain}. Using standard IMAP/SMTP defaults.`,
    };
  }
}
