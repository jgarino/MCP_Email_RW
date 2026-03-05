import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConfigManager } from '../config/config-manager.js';
import { logger } from '../utils/logger.js';

export function registerAllResources(server: McpServer, configManager: ConfigManager): void {
  logger.info('Registering MCP resources...');
  // Resources will be registered in Phase 7
  logger.info('All MCP resources registered');
}
