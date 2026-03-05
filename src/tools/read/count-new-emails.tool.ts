import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

export function registerCountNewEmailsTool(
  server: McpServer,
  emailManager: EmailManagerService,
): void {
  server.tool(
    'count_new_emails',
    'Count new (recent) emails received since a given date',
    {
      accountId: z.string().describe('Account identifier'),
      since: z
        .string()
        .optional()
        .describe('ISO date string to check from (default: 24 hours ago)'),
    },
    async ({ accountId, since }) => {
      logger.debug('Counting new emails', { accountId, since });

      try {
        const sinceDate = since
          ? new Date(since)
          : new Date(Date.now() - 24 * 60 * 60 * 1000);

        const uids = await emailManager.searchEmails(accountId, 'INBOX', {
          since: sinceDate,
        });

        const emails = await Promise.all(
          uids.slice(0, 50).map((uid) => emailManager.readEmail(accountId, 'INBOX', uid)),
        );

        const brief = emails.map((email) => ({
          uid: email.uid,
          from: email.from,
          subject: email.subject,
          date: email.date,
        }));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { since: sinceDate.toISOString(), count: uids.length, emails: brief },
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
