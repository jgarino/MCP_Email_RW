import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConfigManager } from '../../config/config-manager.js';
import { logger } from '../../utils/logger.js';

export function registerUpdateAccountTool(server: McpServer, configManager: ConfigManager): void {
  server.tool(
    'update_account',
    'Update an existing email account configuration',
    {
      accountId: z.string().describe('ID of the account to update'),
      name: z.string().optional().describe('New display name'),
      email: z.string().email().optional().describe('New email address'),
      enabled: z.boolean().optional().describe('Enable or disable the account'),
      password: z.string().optional().describe('New password or app-specific password'),
    },
    async (params) => {
      logger.debug('Updating account', { accountId: params.accountId });

      const account = configManager.getAccount(params.accountId);
      if (!account) {
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

      const updates: Record<string, unknown> = {};
      if (params.name !== undefined) updates.name = params.name;
      if (params.email !== undefined) updates.email = params.email;
      if (params.enabled !== undefined) updates.enabled = params.enabled;

      if (params.password !== undefined && account.auth.credentials) {
        updates.auth = {
          ...account.auth,
          credentials: {
            ...account.auth.credentials,
            passwordRef: params.password,
          },
        };
      }

      const updated = await configManager.updateAccount(params.accountId, updates);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                account: {
                  id: updated.id,
                  name: updated.name,
                  email: updated.email,
                  provider: updated.provider,
                  enabled: updated.enabled,
                  authMethod: updated.auth.method,
                },
                message: `Account "${params.accountId}" updated successfully`,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
