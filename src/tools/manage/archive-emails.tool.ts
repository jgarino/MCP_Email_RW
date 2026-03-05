import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

export function registerArchiveEmailsTool(
  server: McpServer,
  emailManager: EmailManagerService,
): void {
  server.tool(
    'archive_emails',
    'Archive emails by moving them to the Archive folder (or [Gmail]/All Mail for Gmail accounts)',
    {
      accountId: z.string().describe('Account identifier'),
      uids: z.array(z.number()).describe('Array of email UIDs to archive'),
      folder: z.string().optional().describe('Source folder (default: INBOX)'),
    },
    async ({ accountId, uids, folder }) => {
      logger.debug('Archiving emails', { accountId, uids, folder });

      try {
        const sourceFolder = folder ?? 'INBOX';
        const provider = emailManager.getAccountProvider(accountId);
        const archiveFolder = provider === 'gmail' ? '[Gmail]/All Mail' : 'Archive';

        await emailManager.moveEmails(accountId, uids, sourceFolder, archiveFolder);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'archived',
                  count: uids.length,
                  fromFolder: sourceFolder,
                  archiveFolder,
                  uids,
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
