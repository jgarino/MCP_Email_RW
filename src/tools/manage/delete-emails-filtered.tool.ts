import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import type { EmailFilter } from '../../types/email.types.js';
import { logger } from '../../utils/logger.js';

export function registerDeleteEmailsFilteredTool(
  server: McpServer,
  emailManager: EmailManagerService,
): void {
  server.tool(
    'delete_emails_filtered',
    'Delete emails matching filter criteria. Use dryRun=true (default) to preview what would be deleted',
    {
      accountId: z.string().describe('Account identifier'),
      folder: z.string().optional().describe('Folder to search in (default: INBOX)'),
      from: z.string().optional().describe('Filter by sender address'),
      subject: z.string().optional().describe('Filter by subject'),
      before: z.string().optional().describe('Delete emails before this ISO date (e.g. 2024-01-01)'),
      seen: z.boolean().optional().describe('Filter by read/unread status'),
      dryRun: z.boolean().optional().describe('If true (default), only preview what would be deleted without actually deleting'),
    },
    async ({ accountId, folder, from, subject, before, seen, dryRun }) => {
      logger.debug('Deleting emails by filter', { accountId, folder, from, subject, before, seen, dryRun });

      try {
        const searchFolder = folder ?? 'INBOX';
        const isDryRun = dryRun ?? true;

        const filter: EmailFilter = {};
        if (from) filter.from = from;
        if (subject) filter.subject = subject;
        if (before) filter.before = new Date(before);
        if (seen !== undefined) filter.seen = seen;

        const uids = await emailManager.searchEmails(accountId, searchFolder, filter);

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
                  status: isDryRun ? 'dry_run' : 'deleted',
                  count: uids.length,
                  folder: searchFolder,
                  emails: emailSummaries,
                  ...(isDryRun && { note: 'Set dryRun=false to actually delete these emails' }),
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
