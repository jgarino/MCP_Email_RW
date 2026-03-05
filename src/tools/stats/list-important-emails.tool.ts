import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

export function registerListImportantEmailsTool(server: McpServer, emailManager: EmailManagerService): void {
  server.tool(
    'list_important_emails',
    'List flagged/important emails in a folder',
    {
      accountId: z.string().describe('Account identifier'),
      folder: z.string().optional().describe('Folder name (default: INBOX)'),
      limit: z.number().optional().describe('Maximum number of emails to return (default: 10)'),
    },
    async ({ accountId, folder, limit }) => {
      const targetFolder = folder ?? 'INBOX';
      const maxResults = limit ?? 10;
      logger.debug('Listing important emails', { accountId, folder: targetFolder, limit: maxResults });

      try {
        const uids = await emailManager.searchEmails(accountId, targetFolder, { flagged: true });

        const limitedUids = uids.slice(0, maxResults);

        const emails = await emailManager.listEmails(accountId, {
          folder: targetFolder,
          filter: { flagged: true },
          limit: maxResults,
        });

        const result = {
          folder: targetFolder,
          totalImportant: uids.length,
          returned: emails.length,
          emails: emails.map((email) => ({
            uid: email.uid,
            from: email.from,
            subject: email.subject,
            date: email.date,
            flags: email.flags,
            snippet: email.snippet,
          })),
        };

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
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
