import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

export function registerListDeletableEmailsTool(server: McpServer, emailManager: EmailManagerService): void {
  server.tool(
    'list_deletable_emails',
    'Suggest emails that could be deleted based on criteria (old, read, or large)',
    {
      accountId: z.string().describe('Account identifier'),
      folder: z.string().optional().describe('Folder name (default: INBOX)'),
      criteria: z.enum(['old', 'read', 'large']).optional().describe('Deletion criteria: "old" (read emails older than 30 days), "read" (all read emails), "large" (largest emails) (default: read)'),
    },
    async ({ accountId, folder, criteria }) => {
      const targetFolder = folder ?? 'INBOX';
      const targetCriteria = criteria ?? 'read';
      logger.debug('Listing deletable emails', { accountId, folder: targetFolder, criteria: targetCriteria });

      try {
        let emails;

        switch (targetCriteria) {
          case 'old': {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            emails = await emailManager.listEmails(accountId, {
              folder: targetFolder,
              filter: { seen: true, before: thirtyDaysAgo },
              limit: 50,
            });
            break;
          }
          case 'read': {
            emails = await emailManager.listEmails(accountId, {
              folder: targetFolder,
              filter: { seen: true },
              limit: 50,
            });
            break;
          }
          case 'large': {
            emails = await emailManager.listEmails(accountId, {
              folder: targetFolder,
              limit: 50,
              sort: 'size',
              sortOrder: 'desc',
            });
            break;
          }
        }

        const result = {
          folder: targetFolder,
          criteria: targetCriteria,
          count: emails.length,
          emails: emails.map((email) => ({
            uid: email.uid,
            from: email.from,
            subject: email.subject,
            date: email.date,
            size: email.size,
            flags: email.flags,
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
