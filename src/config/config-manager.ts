/**
 * ConfigManager — reads, writes, and validates the accounts.json configuration file.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createLogger } from '../utils/logger.js';
import { ConfigError } from '../utils/errors.js';
import { validateAccountsConfig } from './config-schema.js';
import type { AccountsConfig, AccountConfig, GlobalConfig } from './types.js';
import { DEFAULT_GLOBAL_CONFIG } from './types.js';

const logger = createLogger('ConfigManager');

/** Returns the OS-specific default config directory */
export function getDefaultConfigDir(): string {
  switch (process.platform) {
    case 'win32':
      return path.join(process.env.APPDATA ?? os.homedir(), 'mcp-email-rw');
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', 'mcp-email-rw');
    default:
      return path.join(os.homedir(), '.config', 'mcp-email-rw');
  }
}

/** Returns the default path to accounts.json */
export function getDefaultConfigPath(): string {
  const envPath = process.env.MCP_EMAIL_CONFIG;
  if (envPath) {
    return envPath;
  }
  return path.join(getDefaultConfigDir(), 'accounts.json');
}

export class ConfigManager {
  private readonly configPath: string;
  private config: AccountsConfig | null = null;

  constructor(configPath?: string) {
    this.configPath = configPath ?? getDefaultConfigPath();
    logger.debug(`Config path: ${this.configPath}`);
  }

  /** Returns the path to the config file */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Loads and validates the configuration file.
   * Returns the parsed config or throws a ConfigError on failure.
   */
  load(): AccountsConfig {
    if (!fs.existsSync(this.configPath)) {
      logger.info(`Config file not found at ${this.configPath}. Using empty config.`);
      this.config = this.createEmptyConfig();
      return this.config;
    }

    let raw: string;
    try {
      raw = fs.readFileSync(this.configPath, 'utf-8');
    } catch (err) {
      throw new ConfigError(`Failed to read config file: ${this.configPath}`, err);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new ConfigError(`Config file is not valid JSON: ${this.configPath}`, err);
    }

    const result = validateAccountsConfig(parsed);
    if (!result.valid) {
      throw new ConfigError(
        `Config file failed schema validation: ${this.configPath}`,
        result.errors,
      );
    }

    this.config = parsed as AccountsConfig;
    logger.info(`Config loaded: ${this.config.accounts.length} account(s)`);
    return this.config;
  }

  /**
   * Saves the current in-memory config to disk.
   * Creates the directory if it does not exist.
   */
  save(): void {
    if (!this.config) {
      throw new ConfigError('No config loaded. Call load() first or add accounts before saving.');
    }

    const dir = path.dirname(this.configPath);
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      throw new ConfigError(`Failed to create config directory: ${dir}`, err);
    }

    const result = validateAccountsConfig(this.config);
    if (!result.valid) {
      throw new ConfigError('Config failed schema validation before saving.', result.errors);
    }

    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
      logger.info(`Config saved to ${this.configPath}`);
    } catch (err) {
      throw new ConfigError(`Failed to write config file: ${this.configPath}`, err);
    }
  }

  /** Returns all configured accounts */
  getAccounts(): AccountConfig[] {
    return this.getConfig().accounts;
  }

  /** Returns an account by ID, or undefined if not found */
  getAccount(accountId: string): AccountConfig | undefined {
    return this.getConfig().accounts.find((a) => a.id === accountId);
  }

  /** Returns only enabled accounts */
  getEnabledAccounts(): AccountConfig[] {
    return this.getConfig().accounts.filter((a) => a.enabled);
  }

  /**
   * Adds a new account to the config.
   * Throws if an account with the same ID already exists.
   */
  addAccount(account: AccountConfig): void {
    const config = this.getConfig();
    if (config.accounts.some((a) => a.id === account.id)) {
      throw new ConfigError(`Account with ID "${account.id}" already exists.`);
    }
    config.accounts.push(account);
    logger.info(`Account added: ${account.id}`);
  }

  /**
   * Updates an existing account by ID.
   * Throws if the account does not exist.
   */
  updateAccount(accountId: string, updates: Partial<AccountConfig>): void {
    const config = this.getConfig();
    const idx = config.accounts.findIndex((a) => a.id === accountId);
    if (idx === -1) {
      throw new ConfigError(`Account not found: ${accountId}`);
    }
    config.accounts[idx] = { ...config.accounts[idx], ...updates, id: accountId };
    logger.info(`Account updated: ${accountId}`);
  }

  /**
   * Removes an account by ID.
   * Throws if the account does not exist.
   */
  removeAccount(accountId: string): void {
    const config = this.getConfig();
    const idx = config.accounts.findIndex((a) => a.id === accountId);
    if (idx === -1) {
      throw new ConfigError(`Account not found: ${accountId}`);
    }
    config.accounts.splice(idx, 1);
    logger.info(`Account removed: ${accountId}`);
  }

  /** Returns the global configuration */
  getGlobalConfig(): GlobalConfig {
    return this.getConfig().global;
  }

  /** Updates the global configuration */
  updateGlobalConfig(updates: Partial<GlobalConfig>): void {
    const config = this.getConfig();
    config.global = { ...config.global, ...updates };
  }

  /** Returns the currently loaded config, or initializes an empty one */
  private getConfig(): AccountsConfig {
    if (!this.config) {
      this.config = this.createEmptyConfig();
    }
    return this.config;
  }

  /** Creates a minimal empty valid config */
  private createEmptyConfig(): AccountsConfig {
    return {
      version: '1.0.0',
      accounts: [],
      global: { ...DEFAULT_GLOBAL_CONFIG },
    };
  }
}
