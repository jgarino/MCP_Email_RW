import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConfigManager } from '../config/config-manager.js';
import { logger } from '../utils/logger.js';
import { registerAccountListResource } from './account-list.resource.js';
import { registerServerCapabilitiesResource } from './server-capabilities.resource.js';

export function registerAllResources(server: McpServer, configManager: ConfigManager): void {
  logger.info('Registering MCP resources...');

  registerAccountListResource(server, configManager);
  registerServerCapabilitiesResource(server);

  logger.info('All MCP resources registered');
}
