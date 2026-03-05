import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

export function registerInboxSummaryTool(server: McpServer, emailManager: EmailManagerService): void {
  server.tool(
    'inbox_summary',
    'Get a summary of the inbox including total, unread, and recent email counts',
    {
      accountId: z.string().describe('Account identifier'),
    },
    async ({ accountId }) => {
      logger.debug('Getting inbox summary', { accountId });

      try {
        const status = await emailManager.getFolderStatus(accountId, 'INBOX');

        const summary = {
          folder: 'INBOX',
          total: status.messages,
          unread: status.unseen,
          recent: status.recent,
        };

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(summary, null, 2) }],
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
