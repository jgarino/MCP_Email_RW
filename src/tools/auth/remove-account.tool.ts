import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConfigManager } from '../../config/config-manager.js';
import { logger } from '../../utils/logger.js';

export function registerRemoveAccountTool(server: McpServer, configManager: ConfigManager): void {
  server.tool(
    'remove_account',
    'Remove a configured email account',
    {
      accountId: z.string().describe('ID of the account to remove'),
    },
    async (params) => {
      logger.debug('Removing account', { accountId: params.accountId });

      const removed = await configManager.removeAccount(params.accountId);

      if (!removed) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Account "${params.accountId}" not found`,
              }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Account "${params.accountId}" removed successfully`,
            }),
          },
        ],
      };
    },
  );
}
