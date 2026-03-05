import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

export function registerSendEmailTool(server: McpServer, emailManager: EmailManagerService): void {
  server.tool(
    'send_email',
    'Send an email from the specified account',
    {
      accountId: z.string().describe('Account identifier'),
      to: z.union([z.string(), z.array(z.string())]).describe('Recipient email address(es)'),
      subject: z.string().describe('Email subject'),
      body: z.string().describe('Email body content'),
      cc: z.union([z.string(), z.array(z.string())]).optional().describe('CC recipient(s)'),
      bcc: z.union([z.string(), z.array(z.string())]).optional().describe('BCC recipient(s)'),
      html: z.boolean().optional().describe('If true, body is treated as HTML'),
      replyTo: z.string().optional().describe('Reply-To address'),
    },
    async ({ accountId, to, subject, body, cc, bcc, html, replyTo }) => {
      logger.debug('Sending email', { accountId, to, subject });

      try {
        const from = emailManager.getAccountEmail(accountId);
        const result = await emailManager.sendEmail(accountId, {
          from,
          to,
          subject,
          ...(html ? { html: body } : { text: body }),
          ...(cc && { cc }),
          ...(bcc && { bcc }),
          ...(replyTo && { replyTo }),
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { messageId: result.messageId, status: 'sent' },
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
