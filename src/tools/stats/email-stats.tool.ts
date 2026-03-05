import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../services/email-manager.service.js';
import { logger } from '../../utils/logger.js';

function getPeriodStart(period: string): Date {
  const now = new Date();
  switch (period) {
    case 'day':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'week':
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

export function registerEmailStatsTool(server: McpServer, emailManager: EmailManagerService): void {
  server.tool(
    'email_stats',
    'Get email statistics for a folder over a given time period',
    {
      accountId: z.string().describe('Account identifier'),
      folder: z.string().optional().describe('Folder name (default: INBOX)'),
      period: z.enum(['day', 'week', 'month']).optional().describe('Time period for statistics (default: week)'),
    },
    async ({ accountId, folder, period }) => {
      const targetFolder = folder ?? 'INBOX';
      const targetPeriod = period ?? 'week';
      logger.debug('Getting email stats', { accountId, folder: targetFolder, period: targetPeriod });

      try {
        const since = getPeriodStart(targetPeriod);

        const uids = await emailManager.searchEmails(accountId, targetFolder, { since });

        const emails = await emailManager.listEmails(accountId, {
          folder: targetFolder,
          filter: { since },
          limit: uids.length || 100,
        });

        const senderCounts = new Map<string, number>();
        for (const email of emails) {
          const sender = email.from?.[0]?.address ?? 'unknown';
          senderCounts.set(sender, (senderCounts.get(sender) ?? 0) + 1);
        }

        const topSenders = Array.from(senderCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([address, count]) => ({ address, count }));

        const stats = {
          folder: targetFolder,
          period: targetPeriod,
          since: since.toISOString(),
          totalInPeriod: emails.length,
          topSenders,
        };

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(stats, null, 2) }],
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
