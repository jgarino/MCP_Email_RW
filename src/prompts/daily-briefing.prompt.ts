import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../utils/logger.js';

export function registerDailyBriefingPrompt(server: McpServer): void {
  server.prompt(
    'daily-briefing',
    'Generate a daily email briefing with inbox overview and highlights',
    {
      accountId: z.string().describe('Account identifier'),
    },
    async ({ accountId }) => {
      logger.debug('Generating daily-briefing prompt', { accountId });

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please create a daily email briefing for account "${accountId}". Use the inbox_summary tool to get overall inbox status, the email_stats tool with period "day" to get today's statistics, the summarize_unread tool to get unread emails, and the list_important_emails tool to check for flagged messages. Compile this into a concise daily briefing that includes: inbox overview (total, unread, recent counts), today's email highlights, important/flagged emails requiring attention, and top senders of the day.`,
            },
          },
        ],
      };
    },
  );
}
