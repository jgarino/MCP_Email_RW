import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConfigManager } from '../config/config-manager.js';
import { logger } from '../utils/logger.js';

export function registerAllTools(server: McpServer, configManager: ConfigManager): void {
  logger.info('Registering MCP tools...');
  // Tools will be registered in subsequent phases
  logger.info('All MCP tools registered');
}
