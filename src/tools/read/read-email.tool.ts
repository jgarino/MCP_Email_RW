import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

export function registerReadEmailTool(server: McpServer, emailManager: EmailManagerService): void {
  server.tool(
    'read_email',
    'Read the full content of a specific email by UID',
    {
      accountId: z.string().describe('Account identifier'),
      folder: z.string().describe('Folder containing the email'),
      uid: z.number().describe('Unique identifier of the email'),
      markAsRead: z.boolean().optional().describe('Mark email as read after fetching (default: true)'),
    },
    async ({ accountId, folder, uid, markAsRead }) => {
      logger.debug('Reading email', { accountId, folder, uid, markAsRead });

      try {
        const email = await emailManager.readEmail(accountId, folder, uid);

        if (markAsRead !== false && !email.flags.seen) {
          await emailManager.setFlags(accountId, [uid], folder, { seen: true }, 'add');
          email.flags.seen = true;
        }

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(email, null, 2) }],
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
