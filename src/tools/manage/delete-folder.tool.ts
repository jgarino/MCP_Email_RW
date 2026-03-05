import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

export function registerDeleteFolderTool(server: McpServer, emailManager: EmailManagerService): void {
  server.tool(
    'delete_folder',
    'Delete an IMAP folder',
    {
      accountId: z.string().describe('Account identifier'),
      folderName: z.string().describe('Name of the folder to delete'),
    },
    async ({ accountId, folderName }) => {
      logger.debug('Deleting folder', { accountId, folderName });

      try {
        await emailManager.deleteFolder(accountId, folderName);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'deleted',
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
