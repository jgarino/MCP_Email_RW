import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigManager } from '../../../src/config/config-manager.js';
import { ConfigError } from '../../../src/utils/errors.js';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import type { AccountConfig, AppConfig } from '../../../src/config/types.js';

const TEST_DIR = join(tmpdir(), 'mcp-email-rw-test-' + Date.now());
const TEST_CONFIG_PATH = join(TEST_DIR, 'accounts.json');

function createTestAccount(overrides: Partial<AccountConfig> = {}): AccountConfig {
  return {
    id: 'test-account',
    name: 'Test Account',
    email: 'test@example.com',
    enabled: true,
    provider: 'gmail',
    auth: {
      method: 'app-password',
      credentials: {
        username: 'test@example.com',
        passwordRef: 'env:TEST_PASSWORD',
      },
    },
    ...overrides,
  };
}

function createTestConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    version: '1.0.0',
    accounts: [],
    global: {
      logLevel: 'info',
      timeout: 30000,
      maxConnections: 5,
      retryAttempts: 3,
      retryDelay: 1000,
    },
    ...overrides,
  };
}

describe('ConfigManager', () => {
  beforeEach(async () => {
    if (!existsSync(TEST_DIR)) {
      await mkdir(TEST_DIR, { recursive: true });
    }
  });

  afterEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('load', () => {
    it('should return defaults when no config file exists', async () => {
      const manager = new ConfigManager(join(TEST_DIR, 'nonexistent.json'));
      const config = await manager.load();
      expect(config.version).toBe('1.0.0');
      expect(config.accounts).toEqual([]);
    });

    it('should load and parse a valid config file', async () => {
      const testConfig = createTestConfig({
        accounts: [createTestAccount()],
      });
      await writeFile(TEST_CONFIG_PATH, JSON.stringify(testConfig), 'utf-8');

      const manager = new ConfigManager(TEST_CONFIG_PATH);
      const config = await manager.load();
      expect(config.accounts).toHaveLength(1);
      expect(config.accounts[0].id).toBe('test-account');
    });

    it('should throw ConfigError on invalid JSON', async () => {
      await writeFile(TEST_CONFIG_PATH, '{ invalid json }', 'utf-8');
      const manager = new ConfigManager(TEST_CONFIG_PATH);
      await expect(manager.load()).rejects.toThrow(ConfigError);
    });

    it('should throw ConfigError when version is missing', async () => {
      await writeFile(TEST_CONFIG_PATH, JSON.stringify({ accounts: [] }), 'utf-8');
      const manager = new ConfigManager(TEST_CONFIG_PATH);
      await expect(manager.load()).rejects.toThrow(ConfigError);
    });
  });

  describe('save', () => {
    it('should save config to file', async () => {
      const manager = new ConfigManager(TEST_CONFIG_PATH);
      await manager.load();
      await manager.save();
      expect(existsSync(TEST_CONFIG_PATH)).toBe(true);
    });

    it('should create directories if they do not exist', async () => {
      const deepPath = join(TEST_DIR, 'nested', 'dir', 'config.json');
      const manager = new ConfigManager(deepPath);
      await manager.load();
      await manager.save();
      expect(existsSync(deepPath)).toBe(true);
    });
  });

  describe('validate', () => {
    it('should pass for a valid config', () => {
      const manager = new ConfigManager(TEST_CONFIG_PATH);
      const config = createTestConfig({ accounts: [createTestAccount()] });
      expect(() => manager.validate(config)).not.toThrow();
    });

    it('should throw when version is missing', () => {
      const manager = new ConfigManager(TEST_CONFIG_PATH);
      const config = { accounts: [] } as unknown as AppConfig;
      expect(() => manager.validate(config)).toThrow('Config must have a version field');
    });

    it('should throw when accounts is not an array', () => {
      const manager = new ConfigManager(TEST_CONFIG_PATH);
      const config = { version: '1.0.0', accounts: 'not-array' } as unknown as AppConfig;
      expect(() => manager.validate(config)).toThrow('Config must have an accounts array');
    });
  });

  describe('validateAccount', () => {
    it('should pass for a valid account', () => {
      const manager = new ConfigManager(TEST_CONFIG_PATH);
      expect(() => manager.validateAccount(createTestAccount())).not.toThrow();
    });

    it('should throw when id is missing', () => {
      const manager = new ConfigManager(TEST_CONFIG_PATH);
      const account = createTestAccount({ id: '' });
      expect(() => manager.validateAccount(account)).toThrow('Account must have a string id');
    });

    it('should throw when email is missing', () => {
      const manager = new ConfigManager(TEST_CONFIG_PATH);
      const account = createTestAccount({ email: '' });
      expect(() => manager.validateAccount(account)).toThrow('Account must have a string email');
    });

    it('should throw when auth method is missing', () => {
      const manager = new ConfigManager(TEST_CONFIG_PATH);
      const account = createTestAccount({ auth: {} as AccountConfig['auth'] });
      expect(() => manager.validateAccount(account)).toThrow(
        'Account must have an auth configuration with a method',
      );
    });
  });

  describe('account management', () => {
    it('should add an account', async () => {
      const manager = new ConfigManager(TEST_CONFIG_PATH);
      await manager.load();
      const account = createTestAccount();
      await manager.addAccount(account);
      expect(manager.getAccounts()).toHaveLength(1);
      expect(manager.getAccount('test-account')).toBeDefined();
    });

    it('should throw when adding duplicate account', async () => {
      const manager = new ConfigManager(TEST_CONFIG_PATH);
      await manager.load();
      const account = createTestAccount();
      await manager.addAccount(account);
      await expect(manager.addAccount(account)).rejects.toThrow('already exists');
    });

    it('should remove an account', async () => {
      const manager = new ConfigManager(TEST_CONFIG_PATH);
      await manager.load();
      await manager.addAccount(createTestAccount());
      const removed = await manager.removeAccount('test-account');
      expect(removed).toBe(true);
      expect(manager.getAccounts()).toHaveLength(0);
    });

    it('should return false when removing non-existent account', async () => {
      const manager = new ConfigManager(TEST_CONFIG_PATH);
      await manager.load();
      const removed = await manager.removeAccount('non-existent');
      expect(removed).toBe(false);
    });

    it('should update an account', async () => {
      const manager = new ConfigManager(TEST_CONFIG_PATH);
      await manager.load();
      await manager.addAccount(createTestAccount());
      const updated = await manager.updateAccount('test-account', { name: 'Updated Name' });
      expect(updated.name).toBe('Updated Name');
    });

    it('should throw when updating non-existent account', async () => {
      const manager = new ConfigManager(TEST_CONFIG_PATH);
      await manager.load();
      await expect(
        manager.updateAccount('non-existent', { name: 'Test' }),
      ).rejects.toThrow('not found');
    });

    it('should filter enabled accounts', async () => {
      const manager = new ConfigManager(TEST_CONFIG_PATH);
      await manager.load();
      await manager.addAccount(createTestAccount({ id: 'enabled', enabled: true }));
      await manager.addAccount(
        createTestAccount({ id: 'disabled', email: 'disabled@test.com', enabled: false }),
      );
      const enabled = manager.getEnabledAccounts();
      expect(enabled).toHaveLength(1);
      expect(enabled[0].id).toBe('enabled');
    });
  });

  describe('getConfigPath', () => {
    it('should return the configured path', () => {
      const manager = new ConfigManager(TEST_CONFIG_PATH);
      expect(manager.getConfigPath()).toBe(TEST_CONFIG_PATH);
    });
  });
});
