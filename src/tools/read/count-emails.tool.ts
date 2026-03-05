import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

export function registerCountEmailsTool(
  server: McpServer,
  emailManager: EmailManagerService,
): void {
  server.tool(
    'count_emails',
    'Count emails in a folder with optional filter',
    {
      accountId: z.string().describe('Account identifier'),
      folder: z.string().optional().describe('Folder name (default: INBOX)'),
      filter: z
        .enum(['all', 'unseen', 'seen', 'flagged'])
        .optional()
        .describe('Filter type (default: all)'),
    },
    async ({ accountId, folder, filter }) => {
      logger.debug('Counting emails', { accountId, folder, filter });

      try {
        const targetFolder = folder ?? 'INBOX';
        const filterType = filter ?? 'all';

        let count: number;

        if (filterType === 'all' || filterType === 'unseen') {
          const status = await emailManager.getFolderStatus(accountId, targetFolder);
          count = filterType === 'all' ? status.messages : status.unseen;
        } else {
          const searchFilter =
            filterType === 'seen' ? { seen: true } : { flagged: true };
          const uids = await emailManager.searchEmails(accountId, targetFolder, searchFilter);
          count = uids.length;
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ folder: targetFolder, filter: filterType, count }, null, 2),
            },
          ],
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
