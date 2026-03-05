import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

export function registerDeleteEmailsTool(server: McpServer, emailManager: EmailManagerService): void {
  server.tool(
    'delete_emails',
    'Delete emails by UID. Moves to Trash by default, or permanently deletes if permanent=true',
    {
      accountId: z.string().describe('Account identifier'),
      folder: z.string().describe('Folder containing the emails'),
      uids: z.array(z.number()).describe('Array of email UIDs to delete'),
      permanent: z.boolean().optional().describe('If true, permanently delete instead of moving to Trash (default: false)'),
    },
    async ({ accountId, folder, uids, permanent }) => {
      logger.debug('Deleting emails', { accountId, folder, uids, permanent });

      try {
        await emailManager.deleteEmails(accountId, uids, folder, permanent ?? false);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: permanent ? 'permanently_deleted' : 'moved_to_trash',
                  count: uids.length,
                  folder,
                  uids,
                },
                null,
                2,
              ),
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
