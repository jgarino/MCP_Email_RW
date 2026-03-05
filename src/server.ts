import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ConfigManager } from './config/config-manager.js';
import { AuthManager } from './auth/auth-manager.js';
import { EmailManagerService } from './services/email-manager.service.js';
import { logger } from './utils/logger.js';

export function createServer(): {
  server: McpServer;
  configManager: ConfigManager;
  authManager: AuthManager;
  emailManager: EmailManagerService;
} {
  const server = new McpServer({
    name: 'mcp-email-rw',
    version: '0.1.0',
  });

  const configManager = new ConfigManager();
  const authManager = new AuthManager(configManager);
  const emailManager = new EmailManagerService(configManager, authManager);

  logger.info('MCP Email RW server created');

  return { server, configManager, authManager, emailManager };
}
