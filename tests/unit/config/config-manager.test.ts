/**
 * Unit tests for ConfigManager.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ConfigManager, getDefaultConfigDir, getDefaultConfigPath } from '../../../src/config/config-manager.js';
import type { AccountConfig, AccountsConfig } from '../../../src/config/types.js';

const TEST_ACCOUNT: AccountConfig = {
  id: 'test-account',
  name: 'Test Account',
  email: 'test@example.com',
  enabled: true,
  provider: 'custom',
  auth: {
    method: 'password',
    credentials: {
      username: 'test@example.com',
      password: 'secret',
    },
  },
  imap: { host: 'imap.example.com', port: 993, secure: true },
  smtp: { host: 'smtp.example.com', port: 465, secure: true },
};

const VALID_CONFIG: AccountsConfig = {
  version: '1.0.0',
  accounts: [TEST_ACCOUNT],
  global: {
    configDir: '~/.mcp-email-rw',
    logLevel: 'info',
    timeout: 30000,
    maxConnections: 5,
    retryAttempts: 3,
    retryDelay: 1000,
  },
};

describe('getDefaultConfigDir', () => {
  it('returns a non-empty string', () => {
    const dir = getDefaultConfigDir();
    expect(dir).toBeTruthy();
    expect(typeof dir).toBe('string');
  });
});

describe('getDefaultConfigPath', () => {
  it('returns a path ending in accounts.json when MCP_EMAIL_CONFIG is not set', () => {
    const savedEnv = process.env.MCP_EMAIL_CONFIG;
    delete process.env.MCP_EMAIL_CONFIG;
    const p = getDefaultConfigPath();
    expect(p.endsWith('accounts.json')).toBe(true);
    if (savedEnv !== undefined) process.env.MCP_EMAIL_CONFIG = savedEnv;
  });

  it('returns the MCP_EMAIL_CONFIG value when set', () => {
    process.env.MCP_EMAIL_CONFIG = '/tmp/custom-config.json';
    const p = getDefaultConfigPath();
    expect(p).toBe('/tmp/custom-config.json');
    delete process.env.MCP_EMAIL_CONFIG;
  });
});

describe('ConfigManager', () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-email-test-'));
    configPath = path.join(tmpDir, 'accounts.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('load()', () => {
    it('returns an empty config when the file does not exist', () => {
      const manager = new ConfigManager(configPath);
      const config = manager.load();
      expect(config.accounts).toEqual([]);
      expect(config.version).toBe('1.0.0');
    });

    it('loads a valid config file', () => {
      fs.writeFileSync(configPath, JSON.stringify(VALID_CONFIG), 'utf-8');
      const manager = new ConfigManager(configPath);
      const config = manager.load();
      expect(config.accounts).toHaveLength(1);
      expect(config.accounts[0].id).toBe('test-account');
    });

    it('throws ConfigError on invalid JSON', () => {
      fs.writeFileSync(configPath, '{ not valid json }', 'utf-8');
      const manager = new ConfigManager(configPath);
      expect(() => manager.load()).toThrow('Config file is not valid JSON');
    });

    it('throws ConfigError on schema validation failure', () => {
      const invalid = { version: '1.0.0', accounts: [{ id: 'bad account id' }] };
      fs.writeFileSync(configPath, JSON.stringify(invalid), 'utf-8');
      const manager = new ConfigManager(configPath);
      expect(() => manager.load()).toThrow('Config file failed schema validation');
    });
  });

  describe('save()', () => {
    it('writes the config to disk', () => {
      const manager = new ConfigManager(configPath);
      manager.load();
      manager.addAccount(TEST_ACCOUNT);
      manager.save();

      const written = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(written.accounts).toHaveLength(1);
      expect(written.accounts[0].id).toBe('test-account');
    });

    it('creates the directory if it does not exist', () => {
      const nestedPath = path.join(tmpDir, 'nested', 'dir', 'accounts.json');
      const manager = new ConfigManager(nestedPath);
      manager.load();
      manager.save();
      expect(fs.existsSync(nestedPath)).toBe(true);
    });
  });

  describe('getAccounts() / getAccount()', () => {
    it('returns an empty array when no accounts are configured', () => {
      const manager = new ConfigManager(configPath);
      manager.load();
      expect(manager.getAccounts()).toEqual([]);
    });

    it('returns the loaded accounts', () => {
      fs.writeFileSync(configPath, JSON.stringify(VALID_CONFIG), 'utf-8');
      const manager = new ConfigManager(configPath);
      manager.load();
      expect(manager.getAccounts()).toHaveLength(1);
    });

    it('returns undefined for unknown account ID', () => {
      const manager = new ConfigManager(configPath);
      manager.load();
      expect(manager.getAccount('nonexistent')).toBeUndefined();
    });

    it('returns the correct account by ID', () => {
      fs.writeFileSync(configPath, JSON.stringify(VALID_CONFIG), 'utf-8');
      const manager = new ConfigManager(configPath);
      manager.load();
      const account = manager.getAccount('test-account');
      expect(account?.email).toBe('test@example.com');
    });
  });

  describe('getEnabledAccounts()', () => {
    it('returns only enabled accounts', () => {
      const config: AccountsConfig = {
        ...VALID_CONFIG,
        accounts: [
          { ...TEST_ACCOUNT, id: 'enabled-1', enabled: true },
          { ...TEST_ACCOUNT, id: 'disabled-1', enabled: false },
        ],
      };
      fs.writeFileSync(configPath, JSON.stringify(config), 'utf-8');
      const manager = new ConfigManager(configPath);
      manager.load();
      const enabled = manager.getEnabledAccounts();
      expect(enabled).toHaveLength(1);
      expect(enabled[0].id).toBe('enabled-1');
    });
  });

  describe('addAccount()', () => {
    it('adds a new account', () => {
      const manager = new ConfigManager(configPath);
      manager.load();
      manager.addAccount(TEST_ACCOUNT);
      expect(manager.getAccounts()).toHaveLength(1);
    });

    it('throws when adding an account with duplicate ID', () => {
      const manager = new ConfigManager(configPath);
      manager.load();
      manager.addAccount(TEST_ACCOUNT);
      expect(() => manager.addAccount(TEST_ACCOUNT)).toThrow('already exists');
    });
  });

  describe('updateAccount()', () => {
    it('updates an existing account', () => {
      const manager = new ConfigManager(configPath);
      manager.load();
      manager.addAccount(TEST_ACCOUNT);
      manager.updateAccount('test-account', { name: 'Updated Name' });
      expect(manager.getAccount('test-account')?.name).toBe('Updated Name');
    });

    it('throws when updating a non-existent account', () => {
      const manager = new ConfigManager(configPath);
      manager.load();
      expect(() => manager.updateAccount('ghost', { name: 'Ghost' })).toThrow('Account not found');
    });

    it('preserves the account ID after update', () => {
      const manager = new ConfigManager(configPath);
      manager.load();
      manager.addAccount(TEST_ACCOUNT);
      manager.updateAccount('test-account', { id: 'should-be-ignored' } as Partial<AccountConfig>);
      expect(manager.getAccount('test-account')).toBeDefined();
    });
  });

  describe('removeAccount()', () => {
    it('removes an existing account', () => {
      const manager = new ConfigManager(configPath);
      manager.load();
      manager.addAccount(TEST_ACCOUNT);
      manager.removeAccount('test-account');
      expect(manager.getAccounts()).toHaveLength(0);
    });

    it('throws when removing a non-existent account', () => {
      const manager = new ConfigManager(configPath);
      manager.load();
      expect(() => manager.removeAccount('ghost')).toThrow('Account not found');
    });
  });

  describe('getGlobalConfig() / updateGlobalConfig()', () => {
    it('returns the default global config for a new manager', () => {
      const manager = new ConfigManager(configPath);
      manager.load();
      const global = manager.getGlobalConfig();
      expect(global.logLevel).toBe('info');
      expect(global.timeout).toBe(30000);
    });

    it('updates the global config', () => {
      const manager = new ConfigManager(configPath);
      manager.load();
      manager.updateGlobalConfig({ logLevel: 'debug', timeout: 60000 });
      const global = manager.getGlobalConfig();
      expect(global.logLevel).toBe('debug');
      expect(global.timeout).toBe(60000);
    });
  });
});
