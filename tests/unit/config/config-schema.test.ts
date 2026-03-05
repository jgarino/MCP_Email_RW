/**
 * Unit tests for the config schema validation.
 */

import { describe, it, expect } from 'vitest';
import { validateAccountsConfig, isValidAccountsConfig } from '../../../src/config/config-schema.js';
import type { AccountsConfig } from '../../../src/config/types.js';

const VALID_CONFIG: AccountsConfig = {
  version: '1.0.0',
  accounts: [
    {
      id: 'test-account',
      name: 'Test',
      email: 'test@example.com',
      enabled: true,
      provider: 'custom',
      auth: {
        method: 'password',
        credentials: { username: 'test@example.com' },
      },
      imap: { host: 'imap.example.com', port: 993, secure: true },
      smtp: { host: 'smtp.example.com', port: 465, secure: true },
    },
  ],
  global: {
    configDir: '~/.mcp-email-rw',
    logLevel: 'info',
    timeout: 30000,
    maxConnections: 5,
    retryAttempts: 3,
    retryDelay: 1000,
  },
};

describe('validateAccountsConfig', () => {
  it('validates a correct config', () => {
    const result = validateAccountsConfig(VALID_CONFIG);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('rejects a config without required fields', () => {
    const result = validateAccountsConfig({ version: '1.0.0' });
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('rejects an account with an invalid ID (spaces)', () => {
    const config = {
      ...VALID_CONFIG,
      accounts: [{ ...VALID_CONFIG.accounts[0], id: 'invalid id' }],
    };
    const result = validateAccountsConfig(config);
    expect(result.valid).toBe(false);
  });

  it('rejects an account with an invalid email address', () => {
    const config = {
      ...VALID_CONFIG,
      accounts: [{ ...VALID_CONFIG.accounts[0], email: 'not-an-email' }],
    };
    const result = validateAccountsConfig(config);
    expect(result.valid).toBe(false);
  });

  it('rejects an account with an unknown provider', () => {
    const config = {
      ...VALID_CONFIG,
      accounts: [{ ...VALID_CONFIG.accounts[0], provider: 'unknown-provider' }],
    };
    const result = validateAccountsConfig(config);
    expect(result.valid).toBe(false);
  });

  it('rejects an account with an invalid port number', () => {
    const config = {
      ...VALID_CONFIG,
      accounts: [
        { ...VALID_CONFIG.accounts[0], imap: { host: 'imap.example.com', port: 99999, secure: true } },
      ],
    };
    const result = validateAccountsConfig(config);
    expect(result.valid).toBe(false);
  });

  it('accepts an OAuth2 account', () => {
    const config: AccountsConfig = {
      ...VALID_CONFIG,
      accounts: [
        {
          id: 'my-gmail',
          name: 'Gmail',
          email: 'user@gmail.com',
          enabled: true,
          provider: 'gmail',
          auth: {
            method: 'oauth2',
            oauth2: {
              clientId: 'client-id.apps.googleusercontent.com',
              clientSecret: 'GOCSPX-secret',
              redirectUri: 'http://localhost:3000/oauth/callback',
              scopes: ['https://mail.google.com/'],
              accessToken: null,
              refreshToken: null,
              tokenExpiry: null,
            },
          },
          imap: { host: 'imap.gmail.com', port: 993, secure: true },
          smtp: { host: 'smtp.gmail.com', port: 465, secure: true },
        },
      ],
    };
    const result = validateAccountsConfig(config);
    expect(result.valid).toBe(true);
  });

  it('accepts a config with no accounts', () => {
    const config = { ...VALID_CONFIG, accounts: [] };
    const result = validateAccountsConfig(config);
    expect(result.valid).toBe(true);
  });

  it('rejects a config with an invalid version format', () => {
    const config = { ...VALID_CONFIG, version: 'not-semver' };
    const result = validateAccountsConfig(config);
    expect(result.valid).toBe(false);
  });
});

describe('isValidAccountsConfig', () => {
  it('returns true for a valid config', () => {
    expect(isValidAccountsConfig(VALID_CONFIG)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isValidAccountsConfig(null)).toBe(false);
  });

  it('returns false for an invalid config', () => {
    expect(isValidAccountsConfig({ foo: 'bar' })).toBe(false);
  });
});
