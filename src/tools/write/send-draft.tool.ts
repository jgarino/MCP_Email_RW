import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

export function registerSendDraftTool(server: McpServer, emailManager: EmailManagerService): void {
  server.tool(
    'send_draft',
    'Send an existing draft email and remove it from drafts',
    {
      accountId: z.string().describe('Account identifier'),
      folder: z.string().optional().describe('Drafts folder name (default: Drafts)'),
      uid: z.number().describe('UID of the draft email'),
    },
    async ({ accountId, folder, uid }) => {
      const draftsFolder = folder ?? 'Drafts';
      logger.debug('Sending draft', { accountId, folder: draftsFolder, uid });

      try {
        const draft = await emailManager.readEmail(accountId, draftsFolder, uid);

        const toAddresses = draft.to.map((a) => a.address);
        const ccAddresses = draft.cc?.map((a) => a.address);
        const bccAddresses = draft.bcc?.map((a) => a.address);
        const from = emailManager.getAccountEmail(accountId);

        const result = await emailManager.sendEmail(accountId, {
          from,
          to: toAddresses,
          subject: draft.subject,
          ...(draft.html && { html: draft.html }),
          ...(draft.text && { text: draft.text }),
          ...(ccAddresses && ccAddresses.length > 0 && { cc: ccAddresses }),
          ...(bccAddresses && bccAddresses.length > 0 && { bcc: bccAddresses }),
          ...(draft.messageId && { inReplyTo: draft.headers?.['in-reply-to'] }),
          ...(draft.headers?.references && { references: draft.headers.references }),
        });

        await emailManager.deleteEmails(accountId, [uid], draftsFolder, true);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { messageId: result.messageId, status: 'sent', deletedDraft: true },
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
