import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

export function registerSummarizeUnreadTool(server: McpServer, emailManager: EmailManagerService): void {
  server.tool(
    'summarize_unread',
    'Get a structured summary of unread emails with subjects, senders, and dates',
    {
      accountId: z.string().describe('Account identifier'),
      folder: z.string().optional().describe('Folder name (default: INBOX)'),
      limit: z.number().optional().describe('Maximum number of unread emails to summarize (default: 10)'),
    },
    async ({ accountId, folder, limit }) => {
      const targetFolder = folder ?? 'INBOX';
      const maxResults = limit ?? 10;
      logger.debug('Summarizing unread emails', { accountId, folder: targetFolder, limit: maxResults });

      try {
        const emails = await emailManager.listEmails(accountId, {
          folder: targetFolder,
          filter: { seen: false },
          limit: maxResults,
        });

        const status = await emailManager.getFolderStatus(accountId, targetFolder);

        const summary = {
          folder: targetFolder,
          totalUnread: status.unseen,
          returned: emails.length,
          emails: emails.map((email) => ({
            uid: email.uid,
            from: email.from,
            subject: email.subject,
            date: email.date,
            snippet: email.snippet,
            hasAttachments: email.attachments.length > 0,
          })),
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
