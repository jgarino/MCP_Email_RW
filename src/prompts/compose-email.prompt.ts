import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../utils/logger.js';

export function registerComposeEmailPrompt(server: McpServer): void {
  server.prompt(
    'compose-email',
    'Help compose a new email on a given topic',
    {
      accountId: z.string().describe('Account identifier'),
      topic: z.string().describe('Topic or subject of the email to compose'),
      recipient: z.string().optional().describe('Email address of the recipient'),
      tone: z.string().optional().describe('Tone of the email (e.g., formal, casual, friendly)'),
    },
    async ({ accountId, topic, recipient, tone }) => {
      const emailTone = tone ?? 'formal';
      logger.debug('Generating compose-email prompt', { accountId, topic, recipient, tone: emailTone });

      const recipientInstruction = recipient
        ? `The email should be addressed to ${recipient}.`
        : 'Ask me who the email should be addressed to.';

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please help me compose a ${emailTone} email about the following topic: "${topic}". ${recipientInstruction} Draft the email with an appropriate subject line and body. Once I approve the draft, use the send_email tool to send it from account "${accountId}".`,
            },
          },
        ],
      };
    },
  );
}
