import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import type { EmailFlags } from '../../types/email.types.js';
import { logger } from '../../utils/logger.js';

export function registerMarkEmailsTool(server: McpServer, emailManager: EmailManagerService): void {
  server.tool(
    'mark_emails',
    'Mark emails as read/unread or flagged/unflagged',
    {
      accountId: z.string().describe('Account identifier'),
      uids: z.array(z.number()).describe('Array of email UIDs to mark'),
      folder: z.string().describe('Folder containing the emails'),
      read: z.boolean().optional().describe('Set read (seen) status'),
      flagged: z.boolean().optional().describe('Set flagged (starred) status'),
      action: z.enum(['add', 'remove']).optional().describe('Whether to add or remove flags (default: add)'),
    },
    async ({ accountId, uids, folder, read, flagged, action }) => {
      logger.debug('Marking emails', { accountId, uids, folder, read, flagged, action });

      try {
        const flagAction = action ?? 'add';
        const flags: Partial<EmailFlags> = {};

        if (read !== undefined) flags.seen = read;
        if (flagged !== undefined) flags.flagged = flagged;

        await emailManager.setFlags(accountId, uids, folder, flags, flagAction);

        const appliedFlags: string[] = [];
        if (read !== undefined) appliedFlags.push(read ? 'seen' : 'unseen');
        if (flagged !== undefined) appliedFlags.push(flagged ? 'flagged' : 'unflagged');

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  status: 'updated',
                  count: uids.length,
                  folder,
                  action: flagAction,
                  flags: appliedFlags,
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
