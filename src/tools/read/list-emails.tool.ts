import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

export function registerListEmailsTool(server: McpServer, emailManager: EmailManagerService): void {
  server.tool(
    'list_emails',
    'List emails from a folder with pagination support',
    {
      accountId: z.string().describe('Account identifier'),
      folder: z.string().optional().describe('Folder name (default: INBOX)'),
      limit: z.number().optional().describe('Maximum number of emails to return (default: 20)'),
      offset: z.number().optional().describe('Number of emails to skip (default: 0)'),
    },
    async ({ accountId, folder, limit, offset }) => {
      logger.debug('Listing emails', { accountId, folder, limit, offset });

      try {
        const emails = await emailManager.listEmails(accountId, {
          folder: folder ?? 'INBOX',
          limit: limit ?? 20,
          offset: offset ?? 0,
        });

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
