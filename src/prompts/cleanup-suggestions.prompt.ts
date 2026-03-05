import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../utils/logger.js';

export function registerCleanupSuggestionsPrompt(server: McpServer): void {
  server.prompt(
    'cleanup-suggestions',
    'Suggest email cleanup actions to free up space and organize the inbox',
    {
      accountId: z.string().describe('Account identifier'),
      olderThanDays: z.string().optional().describe('Suggest deleting emails older than this many days (default: 30)'),
    },
    async ({ accountId, olderThanDays }) => {
      const days = olderThanDays ?? '30';
      logger.debug('Generating cleanup-suggestions prompt', { accountId, olderThanDays: days });

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please analyze the inbox for account "${accountId}" and suggest cleanup actions. Use the list_deletable_emails tool with criteria "old" to find read emails older than ${days} days, then with criteria "large" to find large emails, and with criteria "read" to find all read emails. Also use the storage_info tool to check current storage usage. Based on the results, provide prioritized cleanup suggestions including which emails could be safely deleted or archived to free up space.`,
            },
          },
        ],
      };
    },
  );
}
