import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../utils/logger.js';

export function registerImportantEmailsPrompt(server: McpServer): void {
  server.prompt(
    'important-emails',
    'Identify and summarize important/flagged emails',
    {
      accountId: z.string().describe('Account identifier'),
    },
    async ({ accountId }) => {
      logger.debug('Generating important-emails prompt', { accountId });

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please use the list_important_emails tool to retrieve flagged/important emails for account "${accountId}". Then provide a summary of each important email, highlighting any that may require immediate attention or action. Group them by urgency or topic if possible.`,
            },
          },
        ],
      };
    },
  );
}
