import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

export function registerMoveEmailsTool(server: McpServer, emailManager: EmailManagerService): void {
  server.tool(
    'move_emails',
    'Move emails between folders',
    {
      accountId: z.string().describe('Account identifier'),
      uids: z.array(z.number()).describe('Array of email UIDs to move'),
      fromFolder: z.string().describe('Source folder'),
      toFolder: z.string().describe('Destination folder'),
    },
    async ({ accountId, uids, fromFolder, toFolder }) => {
      logger.debug('Moving emails', { accountId, uids, fromFolder, toFolder });

      try {
        await emailManager.moveEmails(accountId, uids, fromFolder, toFolder);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'moved',
                  count: uids.length,
                  fromFolder,
                  toFolder,
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
