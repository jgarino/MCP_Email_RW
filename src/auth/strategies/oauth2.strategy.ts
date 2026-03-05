import type { AccountConfig } from '../../config/types.js';
import type { AuthStrategy, AuthResult } from '../types.js';
import { AuthError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export class OAuth2Strategy implements AuthStrategy {
  readonly name = 'oauth2';

  async authenticate(config: AccountConfig): Promise<AuthResult> {
    try {
      const oauth2 = config.auth.oauth2;
      if (!oauth2) {
        return {
          success: false,
          error: 'No OAuth2 configuration found',
          method: this.name,
        };
      }

      if (!oauth2.accessToken) {
        return {
          success: false,
          error: 'No access token available. OAuth2 flow required.',
          method: this.name,
        };
      }

      if (oauth2.tokenExpiry && Date.now() >= oauth2.tokenExpiry) {
        if (!oauth2.refreshToken) {
          return {
            success: false,
            error: 'Access token expired and no refresh token available',
            method: this.name,
          };
        }

        // Placeholder: token refresh will be implemented in a future phase
        logger.warn('Token expired, refresh not yet implemented', { accountId: config.id });
        return {
          success: false,
          error: 'Access token expired. Token refresh not yet implemented.',
          method: this.name,
        };
      }

      return {
        success: true,
        credentials: {
          username: config.auth.credentials?.username || config.email,
          accessToken: oauth2.accessToken,
          refreshToken: oauth2.refreshToken || undefined,
        },
        method: this.name,
      };
    } catch (error) {
      logger.error('OAuth2 authentication failed', {
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
      throw new AuthError(result.error || 'OAuth2 authentication failed', {
        accountId: config.id,
      });
    }
    return {
      user: result.credentials.username,
      accessToken: result.credentials.accessToken,
    };
  }

  async getSmtpAuth(config: AccountConfig): Promise<Record<string, unknown>> {
    const result = await this.authenticate(config);
    if (!result.success || !result.credentials) {
      throw new AuthError(result.error || 'OAuth2 authentication failed', {
        accountId: config.id,
      });
    }
    return {
      user: result.credentials.username,
      type: 'OAuth2',
      accessToken: result.credentials.accessToken,
    };
  }
}
