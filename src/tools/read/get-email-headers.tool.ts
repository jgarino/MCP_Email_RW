import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

export function registerGetEmailHeadersTool(
  server: McpServer,
  emailManager: EmailManagerService,
): void {
  server.tool(
    'get_email_headers',
    'Get the headers of a specific email',
    {
      accountId: z.string().describe('Account identifier'),
      folder: z.string().describe('Folder containing the email'),
      uid: z.number().describe('Unique identifier of the email'),
    },
    async ({ accountId, folder, uid }) => {
      logger.debug('Getting email headers', { accountId, folder, uid });

      try {
        const email = await emailManager.readEmail(accountId, folder, uid);

        const headers: Record<string, string> = email.headers ?? {};

        // Include standard fields when raw headers are unavailable
        if (Object.keys(headers).length === 0) {
          headers['From'] = email.from.map((a) => a.name ? `${a.name} <${a.address}>` : a.address).join(', ');
          headers['To'] = email.to.map((a) => a.name ? `${a.name} <${a.address}>` : a.address).join(', ');
          if (email.cc?.length) {
            headers['Cc'] = email.cc.map((a) => a.name ? `${a.name} <${a.address}>` : a.address).join(', ');
          }
          headers['Subject'] = email.subject;
          headers['Date'] = email.date.toISOString();
          if (email.messageId) headers['Message-ID'] = email.messageId;
        }

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(headers, null, 2) }],
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
