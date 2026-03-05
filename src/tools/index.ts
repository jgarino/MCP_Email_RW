import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConfigManager } from '../config/config-manager.js';
import { logger } from '../utils/logger.js';
import { registerListAccountsTool } from './auth/list-accounts.tool.js';
import { registerSetupAccountTool } from './auth/setup-account.tool.js';
import { registerTestConnectionTool } from './auth/test-connection.tool.js';
import { registerDetectAuthTool } from './auth/detect-auth.tool.js';
import { registerRemoveAccountTool } from './auth/remove-account.tool.js';
import { registerUpdateAccountTool } from './auth/update-account.tool.js';

export function registerAllTools(server: McpServer, configManager: ConfigManager): void {
  logger.info('Registering MCP tools...');

  // Auth tools
  registerListAccountsTool(server, configManager);
  registerSetupAccountTool(server, configManager);
  registerTestConnectionTool(server, configManager);
  registerDetectAuthTool(server);
  registerRemoveAccountTool(server, configManager);
  registerUpdateAccountTool(server, configManager);

  logger.info('All MCP tools registered');
}
