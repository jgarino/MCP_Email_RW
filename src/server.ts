import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ConfigManager } from './config/config-manager.js';
import { logger } from './utils/logger.js';

export function createServer(): { server: McpServer; configManager: ConfigManager } {
  const server = new McpServer({
    name: 'mcp-email-rw',
    version: '0.1.0',
  });

  const configManager = new ConfigManager();

  logger.info('MCP Email RW server created');

  return { server, configManager };
}
