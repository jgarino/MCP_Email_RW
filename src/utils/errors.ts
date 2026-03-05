/**
 * Custom error classes for the MCP Email server.
 */

export class McpEmailError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'McpEmailError';
    this.code = code;
    this.details = details;
  }
}

export class ConfigError extends McpEmailError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigError';
  }
}

export class AuthError extends McpEmailError {
  constructor(message: string, details?: unknown) {
    super(message, 'AUTH_ERROR', details);
    this.name = 'AuthError';
  }
}

export class ConnectionError extends McpEmailError {
  public readonly protocol?: string;
  public readonly host?: string;

  constructor(message: string, protocol?: string, host?: string, details?: unknown) {
    super(message, 'CONNECTION_ERROR', details);
    this.name = 'ConnectionError';
    this.protocol = protocol;
    this.host = host;
  }
}

export class EmailNotFoundError extends McpEmailError {
  constructor(emailId: string) {
    super(`Email not found: ${emailId}`, 'EMAIL_NOT_FOUND');
    this.name = 'EmailNotFoundError';
  }
}

export class AccountNotFoundError extends McpEmailError {
  constructor(accountId: string) {
    super(`Account not found: ${accountId}`, 'ACCOUNT_NOT_FOUND');
    this.name = 'AccountNotFoundError';
  }
}

export class ValidationError extends McpEmailError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class SendEmailError extends McpEmailError {
  constructor(message: string, details?: unknown) {
    super(message, 'SEND_EMAIL_ERROR', details);
    this.name = 'SendEmailError';
  }
}

export class TimeoutError extends McpEmailError {
  constructor(operation: string, timeoutMs: number) {
    super(`Operation timed out after ${timeoutMs}ms: ${operation}`, 'TIMEOUT_ERROR');
    this.name = 'TimeoutError';
  }
}
