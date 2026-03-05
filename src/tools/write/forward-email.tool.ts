import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

export function registerForwardEmailTool(server: McpServer, emailManager: EmailManagerService): void {
  server.tool(
    'forward_email',
    'Forward an email to specified recipients',
    {
      accountId: z.string().describe('Account identifier'),
      folder: z.string().describe('Folder containing the email to forward'),
      uid: z.number().describe('UID of the email to forward'),
      to: z.union([z.string(), z.array(z.string())]).describe('Recipient email address(es)'),
      body: z.string().optional().describe('Additional message to include before forwarded content'),
    },
    async ({ accountId, folder, uid, to, body }) => {
      logger.debug('Forwarding email', { accountId, folder, uid, to });

      try {
        const original = await emailManager.readEmail(accountId, folder, uid);
        const from = emailManager.getAccountEmail(accountId);

        const subject = original.subject.startsWith('Fwd: ')
          ? original.subject
          : `Fwd: ${original.subject}`;

        const originalFrom = original.from.map((a) => a.name ? `${a.name} <${a.address}>` : a.address).join(', ');
        const originalTo = original.to.map((a) => a.name ? `${a.name} <${a.address}>` : a.address).join(', ');
        const originalDate = original.date instanceof Date ? original.date.toISOString() : String(original.date);

        const forwardHeader = [
          '---------- Forwarded message ----------',
          `From: ${originalFrom}`,
          `Date: ${originalDate}`,
          `Subject: ${original.subject}`,
          `To: ${originalTo}`,
          '',
        ].join('\n');

        const originalContent = original.text ?? '';
        const forwardedBody = body
          ? `${body}\n\n${forwardHeader}\n${originalContent}`
          : `${forwardHeader}\n${originalContent}`;

        const result = await emailManager.sendEmail(accountId, {
          from,
          to,
          subject,
          text: forwardedBody,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { messageId: result.messageId, status: 'sent', forwardedFrom: original.messageId },
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
