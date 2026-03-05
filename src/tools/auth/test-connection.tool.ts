import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConfigManager } from '../../config/config-manager.js';
import { AuthManager } from '../../auth/auth-manager.js';
import { logger } from '../../utils/logger.js';

export function registerTestConnectionTool(server: McpServer, configManager: ConfigManager): void {
  server.tool(
    'test_connection',
    'Test the connection configuration for an email account',
    {
      accountId: z.string().describe('Account ID to test'),
      protocol: z
        .enum(['imap', 'smtp', 'pop3'])
        .optional()
        .describe('Protocol to test (defaults to testing all configured)'),
    },
    async (params) => {
      logger.debug('Testing connection', { accountId: params.accountId, protocol: params.protocol });

      const account = configManager.getAccount(params.accountId);
      if (!account) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: false, error: `Account "${params.accountId}" not found` }),
            },
          ],
        };
      }

      const authManager = new AuthManager(configManager);
      const results: Record<string, { valid: boolean; message: string }> = {};

      const protocolsToTest = params.protocol ? [params.protocol] : ['imap', 'smtp'] as const;

      for (const protocol of protocolsToTest) {
        try {
          if (protocol === 'imap') {
            if (!account.imap) {
              results.imap = { valid: false, message: 'IMAP not configured' };
              continue;
            }
            await authManager.getImapAuth(params.accountId);
            results.imap = {
              valid: true,
              message: `IMAP config valid: ${account.imap.host}:${account.imap.port}`,
            };
          } else if (protocol === 'smtp') {
            if (!account.smtp) {
              results.smtp = { valid: false, message: 'SMTP not configured' };
              continue;
            }
            await authManager.getSmtpAuth(params.accountId);
            results.smtp = {
              valid: true,
              message: `SMTP config valid: ${account.smtp.host}:${account.smtp.port}`,
            };
          } else if (protocol === 'pop3') {
            if (!account.pop3) {
              results.pop3 = { valid: false, message: 'POP3 not configured' };
              continue;
            }
            // POP3 uses the same auth as IMAP for config validation
            await authManager.getImapAuth(params.accountId);
            results.pop3 = {
              valid: true,
              message: `POP3 config valid: ${account.pop3.host}:${account.pop3.port}`,
            };
          }
        } catch (error) {
          results[protocol] = { valid: false, message: (error as Error).message };
        }
      }

      const allValid = Object.values(results).every((r) => r.valid);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: allValid,
                accountId: params.accountId,
                results,
                note: 'Configuration validation only. Actual connection test will be available in Phase 3.',
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
