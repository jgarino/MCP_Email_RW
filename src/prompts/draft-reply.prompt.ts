import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../utils/logger.js';

export function registerDraftReplyPrompt(server: McpServer): void {
  server.prompt(
    'draft-reply',
    'Draft a reply to a specific email',
    {
      accountId: z.string().describe('Account identifier'),
      emailId: z.string().describe('UID of the email to reply to'),
      tone: z.enum(['formal', 'casual', 'friendly']).optional().describe('Tone of the reply (default: formal)'),
      language: z.string().optional().describe('Language for the reply (default: English)'),
    },
    async ({ accountId, emailId, tone, language }) => {
      const replyTone = tone ?? 'formal';
      const replyLanguage = language ?? 'english';
      logger.debug('Generating draft-reply prompt', { accountId, emailId, tone: replyTone, language: replyLanguage });

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please use the read_email tool to read the email with UID ${emailId} from the INBOX folder for account "${accountId}". Then draft a ${replyTone} reply in ${replyLanguage}. The reply should address the key points of the original email and be appropriate in tone. Present the draft reply so I can review and edit it before sending.`,
            },
          },
        ],
      };
    },
  );
}
