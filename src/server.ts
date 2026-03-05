/**
 * MCP server configuration and startup for MCP_Email_RW.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createLogger } from './utils/logger.js';
import { ConfigManager } from './config/config-manager.js';

const logger = createLogger('Server');

export interface ServerOptions {
  configPath?: string;
}

/**
 * Creates and returns a configured MCP server instance.
 */
export function createServer(_options: ServerOptions = {}): McpServer {
  const server = new McpServer({
    name: 'mcp-email-rw',
    version: '0.1.0',
  });

  return server;
}

/**
 * Starts the MCP server using the stdio transport.
 */
export async function startServer(options: ServerOptions = {}): Promise<void> {
  logger.info('Starting MCP Email RW server...');

  const configManager = new ConfigManager(options.configPath);

  try {
    configManager.load();
    logger.info(`Loaded ${configManager.getAccounts().length} account(s)`);
  } catch (err) {
    logger.warn('Could not load config file, starting with empty config.', err);
  }

  const server = createServer(options);
  const transport = new StdioServerTransport();

  await server.connect(transport);
  logger.info('MCP Email RW server running on stdio transport.');
}
