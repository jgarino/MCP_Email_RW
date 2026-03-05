import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

export function registerPurgeOldEmailsTool(
  server: McpServer,
  emailManager: EmailManagerService,
): void {
  server.tool(
    'purge_old_emails',
    'Purge emails older than a specified number of days. Use dryRun=true (default) to preview',
    {
      accountId: z.string().describe('Account identifier'),
      olderThanDays: z.number().describe('Delete emails older than this many days'),
      folder: z.string().optional().describe('Folder to purge from (default: INBOX)'),
      dryRun: z.boolean().optional().describe('If true (default), only preview what would be purged without actually deleting'),
    },
    async ({ accountId, olderThanDays, folder, dryRun }) => {
      logger.debug('Purging old emails', { accountId, olderThanDays, folder, dryRun });

      try {
        const searchFolder = folder ?? 'INBOX';
        const isDryRun = dryRun ?? true;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const uids = await emailManager.searchEmails(accountId, searchFolder, {
          before: cutoffDate,
        });

        const emails = await Promise.all(
          uids.map((uid) => emailManager.readEmail(accountId, searchFolder, uid)),
        );

        const emailSummaries = emails.map((email) => ({
          uid: email.uid,
          from: email.from,
          subject: email.subject,
          date: email.date,
        }));

        if (!isDryRun && uids.length > 0) {
          await emailManager.deleteEmails(accountId, uids, searchFolder, false);
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: isDryRun ? 'dry_run' : 'purged',
                  count: uids.length,
                  folder: searchFolder,
                  olderThanDays,
                  cutoffDate: cutoffDate.toISOString(),
                  emails: emailSummaries,
                  ...(isDryRun && { note: 'Set dryRun=false to actually purge these emails' }),
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
