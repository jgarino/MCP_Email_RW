import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConfigManager } from '../../config/config-manager.js';
import { detectProviderFromEmail, getProviderDefaults } from '../../config/defaults.js';
import { logger } from '../../utils/logger.js';
import type { AccountConfig, AuthMethod } from '../../config/types.js';

const PROVIDER_DEFAULT_AUTH: Record<string, AuthMethod> = {
  gmail: 'app-password',
  outlook: 'oauth2',
  yahoo: 'app-password',
  icloud: 'app-password',
  ovh: 'password',
  ionos: 'password',
  custom: 'password',
};

export function registerSetupAccountTool(server: McpServer, configManager: ConfigManager): void {
  server.tool(
    'setup_account',
    'Set up a new email account with auto-detected provider settings',
    {
      email: z.string().email().describe('Email address for the account'),
      name: z.string().optional().describe('Display name for the account'),
      provider: z.string().optional().describe('Email provider (auto-detected if omitted)'),
      password: z.string().optional().describe('Password or app-specific password'),
    },
    async (params) => {
      logger.debug('Setting up account', { email: params.email });

      const provider = (params.provider as AccountConfig['provider']) || detectProviderFromEmail(params.email);
      const defaults = getProviderDefaults(provider);
      const authMethod = PROVIDER_DEFAULT_AUTH[provider] || 'password';

      const accountId = params.email
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-');

      const account: AccountConfig = {
        id: accountId,
        name: params.name || params.email,
        email: params.email,
        enabled: true,
        provider,
        auth: {
          method: authMethod,
          credentials: {
            username: params.email,
            passwordRef: params.password || '',
          },
        },
      };

      if (defaults) {
        account.imap = { ...defaults.imap };
        account.smtp = { ...defaults.smtp };
        if (defaults.pop3) {
          account.pop3 = { ...defaults.pop3 };
        }
      }

      await configManager.addAccount(account);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                accountId: account.id,
                provider,
                authMethod,
                message: `Account "${account.name}" configured successfully`,
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
