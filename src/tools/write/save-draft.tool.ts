import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

function buildMimeMessage(options: {
  from: string;
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  html?: boolean;
}): string {
  const lines: string[] = [];
  const messageId = `<draft-${Date.now()}@local>`;
  const date = new Date().toUTCString();

  lines.push(`From: ${options.from}`);
  lines.push(`To: ${options.to}`);
  if (options.cc) lines.push(`Cc: ${options.cc}`);
  if (options.bcc) lines.push(`Bcc: ${options.bcc}`);
  lines.push(`Subject: ${options.subject}`);
  lines.push(`Date: ${date}`);
  lines.push(`Message-ID: ${messageId}`);
  lines.push(`MIME-Version: 1.0`);

  if (options.html) {
    lines.push(`Content-Type: text/html; charset=utf-8`);
  } else {
    lines.push(`Content-Type: text/plain; charset=utf-8`);
  }

  lines.push('');
  lines.push(options.body);

  return lines.join('\r\n');
}

export function registerSaveDraftTool(server: McpServer, emailManager: EmailManagerService): void {
  server.tool(
    'save_draft',
    'Save an email as a draft without sending',
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
      logger.debug('Saving draft', { accountId, to, subject });

      try {
        const from = emailManager.getAccountEmail(accountId);
        const toStr = Array.isArray(to) ? to.join(', ') : to;
        const ccStr = cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined;
        const bccStr = bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined;

        const raw = buildMimeMessage({
          from,
          to: toStr,
          subject,
          body,
          cc: ccStr,
          bcc: bccStr,
          html: html ?? false,
        });

        await emailManager.appendMessage(accountId, 'Drafts', raw, ['\\Draft', '\\Seen']);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'saved',
                  folder: 'Drafts',
                  to: toStr,
                  subject,
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
