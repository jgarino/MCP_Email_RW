export class McpEmailError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'McpEmailError';
  }
}

export class ConfigError extends McpEmailError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigError';
  }
}

export class AuthError extends McpEmailError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUTH_ERROR', details);
    this.name = 'AuthError';
  }
}

export class ConnectionError extends McpEmailError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONNECTION_ERROR', details);
    this.name = 'ConnectionError';
  }
}

export class ProtocolError extends McpEmailError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'PROTOCOL_ERROR', details);
    this.name = 'ProtocolError';
  }
}

export class ValidationError extends McpEmailError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}
