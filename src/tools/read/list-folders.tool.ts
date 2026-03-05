import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

export function registerListFoldersTool(
  server: McpServer,
  emailManager: EmailManagerService,
): void {
  server.tool(
    'list_folders',
    'List all email folders/mailboxes for an account',
    {
      accountId: z.string().describe('Account identifier'),
    },
    async ({ accountId }) => {
      logger.debug('Listing folders', { accountId });

      try {
        const folders = await emailManager.listFolders(accountId);

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(folders, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: (error as Error).message }),
            },
          ],
          isError: true,
        };
      }
    },
  );
}
