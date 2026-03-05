/**
 * AJV-based JSON Schema validator for the accounts configuration.
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { AccountsConfig } from './types.js';

const ajv = new Ajv({ allErrors: true, coerceTypes: false });
addFormats(ajv);

export const ACCOUNTS_JSON_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'MCP Email RW — Accounts Configuration',
  type: 'object',
  required: ['version', 'accounts'],
  additionalProperties: false,
  properties: {
    $schema: { type: 'string' },
    version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
    accounts: {
      type: 'array',
      items: { $ref: '#/definitions/AccountConfig' },
    },
    global: { $ref: '#/definitions/GlobalConfig' },
  },
  definitions: {
    AccountConfig: {
      type: 'object',
      required: ['id', 'name', 'email', 'enabled', 'provider', 'auth'],
      additionalProperties: false,
      properties: {
        id: {
          type: 'string',
          pattern: '^[a-zA-Z0-9_-]+$',
          description: 'Unique account identifier',
        },
        name: { type: 'string', minLength: 1, description: 'Display name for the account' },
        email: { type: 'string', format: 'email', description: 'Email address' },
        enabled: { type: 'boolean' },
        provider: {
          type: 'string',
          enum: ['gmail', 'outlook', 'yahoo', 'icloud', 'ovh', 'ionos', 'custom'],
        },
        auth: { $ref: '#/definitions/AccountAuth' },
        imap: { $ref: '#/definitions/ImapConfig' },
        smtp: { $ref: '#/definitions/SmtpConfig' },
        pop3: { $ref: '#/definitions/Pop3Config' },
        preferences: { $ref: '#/definitions/AccountPreferences' },
      },
    },
    AccountAuth: {
      type: 'object',
      required: ['method'],
      additionalProperties: false,
      properties: {
        method: {
          type: 'string',
          enum: ['password', 'oauth2', 'app-password', 'ntlm'],
        },
        credentials: { $ref: '#/definitions/BasicCredentials' },
        oauth2: { $ref: '#/definitions/OAuth2Config' },
      },
    },
    BasicCredentials: {
      type: 'object',
      required: ['username'],
      additionalProperties: false,
      properties: {
        username: { type: 'string', minLength: 1 },
        password: { type: 'string' },
        passwordRef: { type: 'string', pattern: '^keychain:.+$' },
      },
    },
    OAuth2Config: {
      type: 'object',
      required: ['clientId', 'redirectUri', 'scopes'],
      additionalProperties: false,
      properties: {
        clientId: { type: 'string', minLength: 1 },
        clientSecret: { type: 'string' },
        redirectUri: { type: 'string', format: 'uri' },
        scopes: { type: 'array', items: { type: 'string' }, minItems: 1 },
        accessToken: { type: ['string', 'null'] },
        refreshToken: { type: ['string', 'null'] },
        tokenExpiry: { type: ['string', 'null'] },
        tenantId: { type: 'string' },
      },
    },
    ServerConfig: {
      type: 'object',
      required: ['host', 'port', 'secure'],
      properties: {
        host: { type: 'string', minLength: 1 },
        port: { type: 'integer', minimum: 1, maximum: 65535 },
        secure: { type: 'boolean' },
        starttls: { type: 'boolean' },
      },
    },
    ImapConfig: {
      type: 'object',
      required: ['host', 'port', 'secure'],
      additionalProperties: false,
      properties: {
        host: { type: 'string', minLength: 1 },
        port: { type: 'integer', minimum: 1, maximum: 65535 },
        secure: { type: 'boolean' },
        starttls: { type: 'boolean' },
        idleTimeout: { type: 'integer', minimum: 0 },
        compression: { type: 'boolean' },
      },
    },
    SmtpConfig: {
      type: 'object',
      required: ['host', 'port', 'secure'],
      additionalProperties: false,
      properties: {
        host: { type: 'string', minLength: 1 },
        port: { type: 'integer', minimum: 1, maximum: 65535 },
        secure: { type: 'boolean' },
        starttls: { type: 'boolean' },
        maxMessageSize: { type: 'integer', minimum: 0 },
      },
    },
    Pop3Config: {
      type: 'object',
      required: ['host', 'port', 'secure'],
      additionalProperties: false,
      properties: {
        host: { type: 'string', minLength: 1 },
        port: { type: 'integer', minimum: 1, maximum: 65535 },
        secure: { type: 'boolean' },
        starttls: { type: 'boolean' },
        enabled: { type: 'boolean' },
        keepOnServer: { type: 'boolean' },
      },
    },
    AccountPreferences: {
      type: 'object',
      additionalProperties: false,
      properties: {
        defaultProtocol: { type: 'string', enum: ['imap', 'pop3'] },
        maxEmailsPerFetch: { type: 'integer', minimum: 1, maximum: 1000 },
        syncFolders: { type: 'array', items: { type: 'string' } },
        autoExpunge: { type: 'boolean' },
      },
    },
    GlobalConfig: {
      type: 'object',
      additionalProperties: false,
      properties: {
        configDir: { type: 'string', minLength: 1 },
        logLevel: { type: 'string', enum: ['debug', 'info', 'warn', 'error'] },
        timeout: { type: 'integer', minimum: 1000 },
        maxConnections: { type: 'integer', minimum: 1, maximum: 100 },
        retryAttempts: { type: 'integer', minimum: 0, maximum: 10 },
        retryDelay: { type: 'integer', minimum: 0 },
      },
    },
  },
} as const;

const validate = ajv.compile(ACCOUNTS_JSON_SCHEMA);

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/** Validates an accounts config object against the JSON schema */
export function validateAccountsConfig(config: unknown): ValidationResult {
  const valid = validate(config) as boolean;
  if (!valid) {
    const errors = (validate.errors ?? []).map(
      (e) => `${e.instancePath || '(root)'}: ${e.message}`,
    );
    return { valid: false, errors };
  }
  return { valid: true };
}

/** Type guard: returns true if config is a valid AccountsConfig */
export function isValidAccountsConfig(config: unknown): config is AccountsConfig {
  return validateAccountsConfig(config).valid;
}
