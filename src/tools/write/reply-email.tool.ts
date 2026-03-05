import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

export function registerReplyEmailTool(server: McpServer, emailManager: EmailManagerService): void {
  server.tool(
    'reply_to_email',
    'Reply to an existing email',
    {
      accountId: z.string().describe('Account identifier'),
      folder: z.string().describe('Folder containing the original email'),
      uid: z.number().describe('UID of the original email'),
      body: z.string().describe('Reply body content'),
      replyAll: z.boolean().optional().describe('Reply to all recipients (default: false)'),
      html: z.boolean().optional().describe('If true, body is treated as HTML'),
    },
    async ({ accountId, folder, uid, body, replyAll, html }) => {
      logger.debug('Replying to email', { accountId, folder, uid, replyAll });

      try {
        const original = await emailManager.readEmail(accountId, folder, uid);
        const from = emailManager.getAccountEmail(accountId);

        const subject = original.subject.startsWith('Re: ')
          ? original.subject
          : `Re: ${original.subject}`;

        const toAddresses = original.from.map((a) => a.address);

        let ccAddresses: string[] | undefined;
        if (replyAll) {
          const allRecipients = [
            ...(original.to ?? []),
            ...(original.cc ?? []),
          ]
            .map((a) => a.address)
            .filter((addr) => addr.toLowerCase() !== from.toLowerCase());
          if (allRecipients.length > 0) {
            ccAddresses = allRecipients;
          }
        }

        const references = [
          ...(original.headers?.references ? [original.headers.references] : []),
          ...(original.messageId ? [original.messageId] : []),
        ].join(' ');

        const result = await emailManager.sendEmail(accountId, {
          from,
          to: toAddresses,
          subject,
          ...(html ? { html: body } : { text: body }),
          ...(ccAddresses && { cc: ccAddresses }),
          ...(original.messageId && { inReplyTo: original.messageId }),
          ...(references && { references }),
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { messageId: result.messageId, status: 'sent', inReplyTo: original.messageId },
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
