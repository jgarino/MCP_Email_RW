import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

export function registerGetAttachmentTool(
  server: McpServer,
  emailManager: EmailManagerService,
): void {
  server.tool(
    'get_attachment',
    'Download a specific attachment from an email',
    {
      accountId: z.string().describe('Account identifier'),
      folder: z.string().describe('Folder containing the email'),
      uid: z.number().describe('Unique identifier of the email'),
      attachmentIndex: z.number().describe('Zero-based index of the attachment'),
    },
    async ({ accountId, folder, uid, attachmentIndex }) => {
      logger.debug('Getting attachment', { accountId, folder, uid, attachmentIndex });

      try {
        const email = await emailManager.readEmail(accountId, folder, uid);

        if (!email.attachments || email.attachments.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({ error: 'Email has no attachments' }),
              },
            ],
            isError: true,
          };
        }

        if (attachmentIndex < 0 || attachmentIndex >= email.attachments.length) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: `Invalid attachment index ${attachmentIndex}. Email has ${email.attachments.length} attachment(s) (0-${email.attachments.length - 1}).`,
                }),
              },
            ],
            isError: true,
          };
        }

        const attachment = email.attachments[attachmentIndex];
        const base64Content = attachment.content
          ? Buffer.from(attachment.content).toString('base64')
          : '';

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  filename: attachment.filename,
                  contentType: attachment.contentType,
                  size: attachment.size,
                  base64Content,
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
