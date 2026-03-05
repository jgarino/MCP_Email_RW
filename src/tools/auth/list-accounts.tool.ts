import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConfigManager } from '../../config/config-manager.js';
import { logger } from '../../utils/logger.js';

export function registerListAccountsTool(server: McpServer, configManager: ConfigManager): void {
  server.tool('list_accounts', 'List all configured email accounts', {}, async () => {
    logger.debug('Listing accounts');

    const accounts = configManager.getAccounts();
    const result = accounts.map((account) => ({
      id: account.id,
      name: account.name,
      email: account.email,
      provider: account.provider,
      enabled: account.enabled,
      authMethod: account.auth.method,
    }));

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  });
}
