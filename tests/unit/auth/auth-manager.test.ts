import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthManager } from '../../../src/auth/auth-manager.js';
import { ConfigManager } from '../../../src/config/config-manager.js';
import { AuthError } from '../../../src/utils/errors.js';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import type { AccountConfig, AppConfig } from '../../../src/config/types.js';

const TEST_DIR = join(tmpdir(), 'mcp-email-rw-auth-test-' + Date.now());
const TEST_CONFIG_PATH = join(TEST_DIR, 'accounts.json');

function createPasswordAccount(overrides: Partial<AccountConfig> = {}): AccountConfig {
  return {
    id: 'test-password',
    name: 'Test Password Account',
    email: 'test@example.com',
    enabled: true,
    provider: 'custom',
    auth: {
      method: 'password',
      credentials: {
        username: 'test@example.com',
        passwordRef: 'literal-test-password',
      },
    },
    imap: { host: 'imap.example.com', port: 993, secure: true },
    smtp: { host: 'smtp.example.com', port: 465, secure: true },
    ...overrides,
  };
}

function createAppPasswordAccount(overrides: Partial<AccountConfig> = {}): AccountConfig {
  return {
    id: 'test-app-password',
    name: 'Test App Password Account',
    email: 'test@gmail.com',
    enabled: true,
    provider: 'gmail',
    auth: {
      method: 'app-password',
      credentials: {
        username: 'test@gmail.com',
        passwordRef: 'my-app-password',
      },
    },
    imap: { host: 'imap.gmail.com', port: 993, secure: true },
    smtp: { host: 'smtp.gmail.com', port: 465, secure: true },
    ...overrides,
  };
}

function createOAuth2Account(overrides: Partial<AccountConfig> = {}): AccountConfig {
  return {
    id: 'test-oauth2',
    name: 'Test OAuth2 Account',
    email: 'test@outlook.com',
    enabled: true,
    provider: 'outlook',
    auth: {
      method: 'oauth2',
      credentials: {
        username: 'test@outlook.com',
        passwordRef: '',
      },
      oauth2: {
        clientId: 'test-client-id',
        redirectUri: 'http://localhost:3000/callback',
        scopes: ['https://outlook.office365.com/.default'],
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        tokenExpiry: Date.now() + 3600000,
      },
    },
    imap: { host: 'outlook.office365.com', port: 993, secure: true },
    smtp: { host: 'smtp.office365.com', port: 587, secure: false },
    ...overrides,
  };
}

describe('AuthManager', () => {
  let configManager: ConfigManager;

  beforeEach(async () => {
    if (!existsSync(TEST_DIR)) {
      await mkdir(TEST_DIR, { recursive: true });
    }
    configManager = new ConfigManager(TEST_CONFIG_PATH);
    await configManager.load();
  });

  afterEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('getStrategy', () => {
    it('should return basic strategy for password method', () => {
      const authManager = new AuthManager(configManager);
      const strategy = authManager.getStrategy('password');
      expect(strategy.name).toBe('basic');
    });

    it('should return app-password strategy', () => {
      const authManager = new AuthManager(configManager);
      const strategy = authManager.getStrategy('app-password');
      expect(strategy.name).toBe('app-password');
    });

    it('should return oauth2 strategy for oauth2 method', () => {
      const authManager = new AuthManager(configManager);
      const strategy = authManager.getStrategy('oauth2');
      expect(strategy.name).toBe('oauth2');
    });

    it('should return oauth2 strategy for xoauth2 method', () => {
      const authManager = new AuthManager(configManager);
      const strategy = authManager.getStrategy('xoauth2');
      expect(strategy.name).toBe('oauth2');
    });

    it('should throw for unsupported auth method', () => {
      const authManager = new AuthManager(configManager);
      expect(() => authManager.getStrategy('ntlm')).toThrow(AuthError);
    });
  });

  describe('authenticate', () => {
    it('should authenticate with password strategy (literal)', async () => {
      await configManager.addAccount(createPasswordAccount());
      const authManager = new AuthManager(configManager);
      const result = await authManager.authenticate('test-password');
      expect(result.success).toBe(true);
      expect(result.method).toBe('basic');
      expect(result.credentials?.username).toBe('test@example.com');
      expect(result.credentials?.password).toBe('literal-test-password');
    });

    it('should authenticate with env var password', async () => {
      process.env.TEST_EMAIL_PWD = 'env-password-value';
      try {
        await configManager.addAccount(
          createPasswordAccount({
            id: 'test-env-password',
            auth: {
              method: 'password',
              credentials: { username: 'test@example.com', passwordRef: 'env:TEST_EMAIL_PWD' },
            },
          }),
        );
        const authManager = new AuthManager(configManager);
        const result = await authManager.authenticate('test-env-password');
        expect(result.success).toBe(true);
        expect(result.credentials?.password).toBe('env-password-value');
      } finally {
        delete process.env.TEST_EMAIL_PWD;
      }
    });

    it('should fail when env var is not set', async () => {
      delete process.env.NONEXISTENT_VAR;
      await configManager.addAccount(
        createPasswordAccount({
          id: 'test-missing-env',
          auth: {
            method: 'password',
            credentials: { username: 'test@example.com', passwordRef: 'env:NONEXISTENT_VAR' },
          },
        }),
      );
      const authManager = new AuthManager(configManager);
      const result = await authManager.authenticate('test-missing-env');
      expect(result.success).toBe(false);
      expect(result.error).toContain('NONEXISTENT_VAR');
    });

    it('should authenticate with app-password strategy', async () => {
      await configManager.addAccount(createAppPasswordAccount());
      const authManager = new AuthManager(configManager);
      const result = await authManager.authenticate('test-app-password');
      expect(result.success).toBe(true);
      expect(result.method).toBe('app-password');
      expect(result.credentials?.password).toBe('my-app-password');
    });

    it('should authenticate with OAuth2 strategy', async () => {
      await configManager.addAccount(createOAuth2Account());
      const authManager = new AuthManager(configManager);
      const result = await authManager.authenticate('test-oauth2');
      expect(result.success).toBe(true);
      expect(result.method).toBe('oauth2');
      expect(result.credentials?.accessToken).toBe('test-access-token');
    });

    it('should fail OAuth2 when token is expired', async () => {
      await configManager.addAccount(
        createOAuth2Account({
          id: 'test-expired-oauth2',
          auth: {
            method: 'oauth2',
            oauth2: {
              clientId: 'test-client-id',
              redirectUri: 'http://localhost:3000/callback',
              scopes: [],
              accessToken: 'expired-token',
              refreshToken: 'refresh-token',
              tokenExpiry: Date.now() - 1000,
            },
          },
        }),
      );
      const authManager = new AuthManager(configManager);
      const result = await authManager.authenticate('test-expired-oauth2');
      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should fail OAuth2 when no access token', async () => {
      await configManager.addAccount(
        createOAuth2Account({
          id: 'test-no-token',
          auth: {
            method: 'oauth2',
            oauth2: {
              clientId: 'test-client-id',
              redirectUri: 'http://localhost:3000/callback',
              scopes: [],
              accessToken: null,
            },
          },
        }),
      );
      const authManager = new AuthManager(configManager);
      const result = await authManager.authenticate('test-no-token');
      expect(result.success).toBe(false);
      expect(result.error).toContain('access token');
    });

    it('should throw when account not found', async () => {
      const authManager = new AuthManager(configManager);
      await expect(authManager.authenticate('nonexistent')).rejects.toThrow(AuthError);
    });
  });

  describe('getImapAuth', () => {
    it('should return IMAP auth for password account', async () => {
      await configManager.addAccount(createPasswordAccount());
      const authManager = new AuthManager(configManager);
      const auth = await authManager.getImapAuth('test-password');
      expect(auth.user).toBe('test@example.com');
      expect(auth.pass).toBe('literal-test-password');
    });

    it('should return IMAP auth for OAuth2 account', async () => {
      await configManager.addAccount(createOAuth2Account());
      const authManager = new AuthManager(configManager);
      const auth = await authManager.getImapAuth('test-oauth2');
      expect(auth.user).toBe('test@outlook.com');
      expect(auth.accessToken).toBe('test-access-token');
    });

    it('should throw when account not found', async () => {
      const authManager = new AuthManager(configManager);
      await expect(authManager.getImapAuth('nonexistent')).rejects.toThrow(AuthError);
    });
  });

  describe('getSmtpAuth', () => {
    it('should return SMTP auth for password account', async () => {
      await configManager.addAccount(createPasswordAccount());
      const authManager = new AuthManager(configManager);
      const auth = await authManager.getSmtpAuth('test-password');
      expect(auth.user).toBe('test@example.com');
      expect(auth.pass).toBe('literal-test-password');
    });

    it('should return SMTP auth for OAuth2 account', async () => {
      await configManager.addAccount(createOAuth2Account());
      const authManager = new AuthManager(configManager);
      const auth = await authManager.getSmtpAuth('test-oauth2');
      expect(auth.user).toBe('test@outlook.com');
      expect(auth.type).toBe('OAuth2');
      expect(auth.accessToken).toBe('test-access-token');
    });

    it('should throw when account not found', async () => {
      const authManager = new AuthManager(configManager);
      await expect(authManager.getSmtpAuth('nonexistent')).rejects.toThrow(AuthError);
    });
  });

  describe('strategy with missing credentials', () => {
    it('should fail basic auth without credentials', async () => {
      await configManager.addAccount(
        createPasswordAccount({
          id: 'test-no-creds',
          auth: { method: 'password' },
        }),
      );
      const authManager = new AuthManager(configManager);
      const result = await authManager.authenticate('test-no-creds');
      expect(result.success).toBe(false);
      expect(result.error).toContain('No credentials configured');
    });

    it('should fail OAuth2 without oauth2 config', async () => {
      await configManager.addAccount(
        createOAuth2Account({
          id: 'test-no-oauth2',
          auth: { method: 'oauth2' },
        }),
      );
      const authManager = new AuthManager(configManager);
      const result = await authManager.authenticate('test-no-oauth2');
      expect(result.success).toBe(false);
      expect(result.error).toContain('No OAuth2 configuration');
    });
  });
});
