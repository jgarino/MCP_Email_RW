import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir, platform } from 'node:os';
import { logger } from '../utils/logger.js';
import { ConfigError } from '../utils/errors.js';
import type { AppConfig, AccountConfig } from './types.js';

function getDefaultConfigDir(): string {
  const home = homedir();
  switch (platform()) {
    case 'win32':
      return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'mcp-email-rw');
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'mcp-email-rw');
    default:
      return join(home, '.config', 'mcp-email-rw');
  }
}

function getConfigPath(): string {
  const envPath = process.env.MCP_EMAIL_CONFIG;
  if (envPath) return envPath;
  return join(getDefaultConfigDir(), 'accounts.json');
}

const DEFAULT_CONFIG: AppConfig = {
  version: '1.0.0',
  accounts: [],
  global: {
    logLevel: 'info',
    timeout: 30000,
    maxConnections: 5,
    retryAttempts: 3,
    retryDelay: 1000,
  },
};

export class ConfigManager {
  private config: AppConfig;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || getConfigPath();
    this.config = structuredClone(DEFAULT_CONFIG);
  }

  async load(): Promise<AppConfig> {
    try {
      if (!existsSync(this.configPath)) {
        logger.info('No config file found, using defaults', { path: this.configPath });
        this.config = structuredClone(DEFAULT_CONFIG);
        return this.config;
      }

      const raw = await readFile(this.configPath, 'utf-8');
      const parsed = JSON.parse(raw) as AppConfig;
      this.validate(parsed);
      this.config = parsed;
      logger.info('Config loaded', { path: this.configPath, accounts: parsed.accounts.length });
      return this.config;
    } catch (error) {
      if (error instanceof ConfigError) throw error;
      throw new ConfigError(`Failed to load config: ${(error as Error).message}`, {
        path: this.configPath,
      });
    }
  }

  async save(): Promise<void> {
    try {
      const dir = dirname(this.configPath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
      await writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
      logger.info('Config saved', { path: this.configPath });
    } catch (error) {
      throw new ConfigError(`Failed to save config: ${(error as Error).message}`, {
        path: this.configPath,
      });
    }
  }

  validate(config: AppConfig): void {
    if (!config.version) {
      throw new ConfigError('Config must have a version field');
    }
    if (!Array.isArray(config.accounts)) {
      throw new ConfigError('Config must have an accounts array');
    }
    for (const account of config.accounts) {
      this.validateAccount(account);
    }
  }

  validateAccount(account: AccountConfig): void {
    if (!account.id || typeof account.id !== 'string') {
      throw new ConfigError('Account must have a string id');
    }
    if (!account.email || typeof account.email !== 'string') {
      throw new ConfigError('Account must have a string email', { accountId: account.id });
    }
    if (!account.auth || !account.auth.method) {
      throw new ConfigError('Account must have an auth configuration with a method', {
        accountId: account.id,
      });
    }
  }

  getConfig(): AppConfig {
    return this.config;
  }

  getAccounts(): AccountConfig[] {
    return this.config.accounts;
  }

  getAccount(accountId: string): AccountConfig | undefined {
    return this.config.accounts.find((a) => a.id === accountId);
  }

  getEnabledAccounts(): AccountConfig[] {
    return this.config.accounts.filter((a) => a.enabled);
  }

  async addAccount(account: AccountConfig): Promise<void> {
    this.validateAccount(account);
    if (this.config.accounts.find((a) => a.id === account.id)) {
      throw new ConfigError(`Account with id "${account.id}" already exists`);
    }
    this.config.accounts.push(account);
    await this.save();
    logger.info('Account added', { accountId: account.id });
  }

  async removeAccount(accountId: string): Promise<boolean> {
    const index = this.config.accounts.findIndex((a) => a.id === accountId);
    if (index === -1) return false;
    this.config.accounts.splice(index, 1);
    await this.save();
    logger.info('Account removed', { accountId });
    return true;
  }

  async updateAccount(accountId: string, updates: Partial<AccountConfig>): Promise<AccountConfig> {
    const account = this.config.accounts.find((a) => a.id === accountId);
    if (!account) {
      throw new ConfigError(`Account "${accountId}" not found`);
    }
    Object.assign(account, updates);
    this.validateAccount(account);
    await this.save();
    logger.info('Account updated', { accountId });
    return account;
  }

  getConfigPath(): string {
    return this.configPath;
  }
}
