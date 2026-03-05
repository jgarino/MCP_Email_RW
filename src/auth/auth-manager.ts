import type { ConfigManager } from '../config/config-manager.js';
import type { AuthStrategy, AuthResult } from './types.js';
import { BasicStrategy } from './strategies/basic.strategy.js';
import { AppPasswordStrategy } from './strategies/app-password.strategy.js';
import { OAuth2Strategy } from './strategies/oauth2.strategy.js';
import { AuthError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { AuthMethod } from '../config/types.js';

export class AuthManager {
  private strategies: Map<string, AuthStrategy> = new Map();
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.registerStrategy(new BasicStrategy());
    this.registerStrategy(new AppPasswordStrategy());
    this.registerStrategy(new OAuth2Strategy());
  }

  private registerStrategy(strategy: AuthStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  getStrategy(method: AuthMethod): AuthStrategy {
    // Map xoauth2 to the oauth2 strategy
    const strategyName = method === 'xoauth2' ? 'oauth2' : method;

    // Map 'password' to the 'basic' strategy
    const resolvedName = strategyName === 'password' ? 'basic' : strategyName;

    const strategy = this.strategies.get(resolvedName);
    if (!strategy) {
      throw new AuthError(`No authentication strategy found for method: ${method}`, {
        method,
      });
    }
    return strategy;
  }

  async authenticate(accountId: string): Promise<AuthResult> {
    const account = this.configManager.getAccount(accountId);
    if (!account) {
      throw new AuthError(`Account "${accountId}" not found`, { accountId });
    }

    const strategy = this.getStrategy(account.auth.method);
    logger.debug('Authenticating account', {
      accountId,
      method: account.auth.method,
      strategy: strategy.name,
    });

    return strategy.authenticate(account);
  }

  async getImapAuth(accountId: string): Promise<Record<string, unknown>> {
    const account = this.configManager.getAccount(accountId);
    if (!account) {
      throw new AuthError(`Account "${accountId}" not found`, { accountId });
    }

    const strategy = this.getStrategy(account.auth.method);
    return strategy.getImapAuth(account);
  }

  async getSmtpAuth(accountId: string): Promise<Record<string, unknown>> {
    const account = this.configManager.getAccount(accountId);
    if (!account) {
      throw new AuthError(`Account "${accountId}" not found`, { accountId });
    }

    const strategy = this.getStrategy(account.auth.method);
    return strategy.getSmtpAuth(account);
  }
}
