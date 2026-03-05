import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

export function registerCreateFolderTool(server: McpServer, emailManager: EmailManagerService): void {
  server.tool(
    'create_folder',
    'Create a new IMAP folder',
    {
      accountId: z.string().describe('Account identifier'),
      folderName: z.string().describe('Name of the folder to create'),
    },
    async ({ accountId, folderName }) => {
      logger.debug('Creating folder', { accountId, folderName });

      try {
        await emailManager.createFolder(accountId, folderName);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'created',
                  folderName,
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
