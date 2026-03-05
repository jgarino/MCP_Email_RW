import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

export function registerStorageInfoTool(server: McpServer, emailManager: EmailManagerService): void {
  server.tool(
    'storage_info',
    'Get storage quota information for an email account',
    {
      accountId: z.string().describe('Account identifier'),
    },
    async ({ accountId }) => {
      logger.debug('Getting storage info', { accountId });

      try {
        const quota = await emailManager.getQuota(accountId);

        if (!quota) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({ message: 'Quota information is not available for this account' }),
              },
            ],
          };
        }

        const storageInfo = {
          usage: quota.usage,
          limit: quota.limit,
          usagePercentage: quota.usagePercentage,
          usageFormatted: formatBytes(quota.usage),
          limitFormatted: formatBytes(quota.limit),
        };

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(storageInfo, null, 2) }],
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}
