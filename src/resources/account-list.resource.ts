import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConfigManager } from '../config/config-manager.js';
import { logger } from '../utils/logger.js';

export function registerAccountListResource(server: McpServer, configManager: ConfigManager): void {
  server.resource(
    'account-list',
    'email://accounts',
    async (uri) => {
      logger.debug('Fetching account list resource');

      const accounts = configManager.getAccounts();
      const data = accounts.map((account) => ({
        id: account.id,
        name: account.name,
        email: account.email,
        provider: account.provider,
        enabled: account.enabled,
      }));

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    },
  );
}
