/**
 * Structured logger for the MCP Email server.
 * Writes to stderr to avoid polluting the MCP stdio transport on stdout.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getCurrentLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  if (envLevel && envLevel in LOG_LEVELS) {
    return envLevel;
  }
  return 'info';
}

function formatMessage(level: LogLevel, context: string, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
  if (data !== undefined) {
    return `${base} ${JSON.stringify(data)}`;
  }
  return base;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[getCurrentLevel()];
}

export function createLogger(context: string) {
  return {
    debug(message: string, data?: unknown): void {
      if (shouldLog('debug')) {
        process.stderr.write(formatMessage('debug', context, message, data) + '\n');
      }
    },
    info(message: string, data?: unknown): void {
      if (shouldLog('info')) {
        process.stderr.write(formatMessage('info', context, message, data) + '\n');
      }
    },
    warn(message: string, data?: unknown): void {
      if (shouldLog('warn')) {
        process.stderr.write(formatMessage('warn', context, message, data) + '\n');
      }
    },
    error(message: string, data?: unknown): void {
      if (shouldLog('error')) {
        process.stderr.write(formatMessage('error', context, message, data) + '\n');
      }
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;
