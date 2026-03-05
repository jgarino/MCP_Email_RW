import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import type { EmailFilter } from '../../types/email.types.js';
import { logger } from '../../utils/logger.js';

export function registerSearchEmailsTool(
  server: McpServer,
  emailManager: EmailManagerService,
): void {
  server.tool(
    'search_emails',
    'Search emails with flexible filtering criteria',
    {
      accountId: z.string().describe('Account identifier'),
      query: z.string().optional().describe('General search query (searches body text)'),
      folder: z.string().optional().describe('Folder to search in (default: INBOX)'),
      from: z.string().optional().describe('Filter by sender address'),
      to: z.string().optional().describe('Filter by recipient address'),
      subject: z.string().optional().describe('Filter by subject'),
      since: z.string().optional().describe('Emails since this ISO date (e.g. 2024-01-01)'),
      before: z.string().optional().describe('Emails before this ISO date'),
      hasAttachment: z.boolean().optional().describe('Filter emails with attachments'),
      seen: z.boolean().optional().describe('Filter by read/unread status'),
      flagged: z.boolean().optional().describe('Filter by flagged status'),
      limit: z.number().optional().describe('Maximum results to return (default: 20)'),
    },
    async ({ accountId, query, folder, from, to, subject, since, before, hasAttachment, seen, flagged, limit }) => {
      logger.debug('Searching emails', { accountId, folder, query });

      try {
        const searchFolder = folder ?? 'INBOX';
        const maxResults = limit ?? 20;

        const filter: EmailFilter = {};
        if (from) filter.from = from;
        if (to) filter.to = to;
        if (subject) filter.subject = subject;
        if (query) filter.body = query;
        if (since) filter.since = new Date(since);
        if (before) filter.before = new Date(before);
        if (hasAttachment !== undefined) filter.hasAttachment = hasAttachment;
        if (seen !== undefined) filter.seen = seen;
        if (flagged !== undefined) filter.flagged = flagged;

        const uids = await emailManager.searchEmails(accountId, searchFolder, filter);
        const limitedUids = uids.slice(0, maxResults);

        const emails = await Promise.all(
          limitedUids.map((uid) => emailManager.readEmail(accountId, searchFolder, uid)),
        );

        const result = emails.map((email) => ({
          id: email.id,
          uid: email.uid,
          from: email.from,
          to: email.to,
          subject: email.subject,
          date: email.date,
          flags: email.flags,
          snippet: email.snippet,
          hasAttachments: email.attachments.length > 0,
        }));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ totalFound: uids.length, returned: result.length, emails: result }, null, 2),
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
