import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

export function registerComposeEmailTool(server: McpServer, emailManager: EmailManagerService): void {
  server.tool(
    'compose_email',
    'Compose an email and preview it without sending',
    {
      accountId: z.string().describe('Account identifier'),
      to: z.union([z.string(), z.array(z.string())]).describe('Recipient email address(es)'),
      subject: z.string().describe('Email subject'),
      body: z.string().describe('Email body content'),
      cc: z.union([z.string(), z.array(z.string())]).optional().describe('CC recipient(s)'),
      bcc: z.union([z.string(), z.array(z.string())]).optional().describe('BCC recipient(s)'),
      html: z.boolean().optional().describe('If true, body is treated as HTML'),
    },
    async ({ accountId, to, subject, body, cc, bcc, html }) => {
      logger.debug('Composing email preview', { accountId, to, subject });

      try {
        const from = emailManager.getAccountEmail(accountId);

        const preview = {
          status: 'composed',
          from,
          to: Array.isArray(to) ? to : [to],
          subject,
          ...(cc && { cc: Array.isArray(cc) ? cc : [cc] }),
          ...(bcc && { bcc: Array.isArray(bcc) ? bcc : [bcc] }),
          contentType: html ? 'text/html' : 'text/plain',
          body,
          note: 'This email has not been sent. Use send_email to send it.',
        };

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(preview, null, 2),
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
