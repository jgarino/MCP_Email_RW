import type { AccountConfig } from '../../config/types.js';
import type { AuthStrategy, AuthResult } from '../types.js';
import { AuthError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { resolvePassword } from './basic.strategy.js';

export class AppPasswordStrategy implements AuthStrategy {
  readonly name = 'app-password';

  async authenticate(config: AccountConfig): Promise<AuthResult> {
    try {
      const credentials = config.auth.credentials;
      if (!credentials) {
        return {
          success: false,
          error: 'No credentials configured for app-password',
          method: this.name,
        };
      }

      const password = resolvePassword(credentials.passwordRef, config.id);

      return {
        success: true,
        credentials: {
          username: credentials.username,
          password,
        },
        method: this.name,
      };
    } catch (error) {
      logger.error('App-password authentication failed', {
        accountId: config.id,
        error: (error as Error).message,
      });
      return {
        success: false,
        error: (error as Error).message,
        method: this.name,
      };
    }
  }

  async getImapAuth(config: AccountConfig): Promise<Record<string, unknown>> {
    const result = await this.authenticate(config);
    if (!result.success || !result.credentials) {
      throw new AuthError(result.error || 'Authentication failed', { accountId: config.id });
    }
    return {
      user: result.credentials.username,
      pass: result.credentials.password,
    };
  }

  async getSmtpAuth(config: AccountConfig): Promise<Record<string, unknown>> {
    const result = await this.authenticate(config);
    if (!result.success || !result.credentials) {
      throw new AuthError(result.error || 'Authentication failed', { accountId: config.id });
    }
    return {
      user: result.credentials.username,
      pass: result.credentials.password,
    };
  }
}
