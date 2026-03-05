import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../utils/logger.js';

export function registerSummarizeInboxPrompt(server: McpServer): void {
  server.prompt(
    'summarize-inbox',
    'Summarize unread emails in the inbox',
    {
      accountId: z.string().describe('Account identifier'),
      maxEmails: z.string().optional().describe('Maximum number of emails to summarize (default: 10)'),
    },
    async ({ accountId, maxEmails }) => {
      const limit = maxEmails ?? '10';
      logger.debug('Generating summarize-inbox prompt', { accountId, maxEmails: limit });

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please use the summarize_unread tool to get up to ${limit} unread emails for account "${accountId}" in the INBOX folder. Then provide a concise summary of each email including the sender, subject, and a brief description of the content. Group related emails together if possible and highlight any urgent or important messages.`,
            },
          },
        ],
      };
    },
  );
}
