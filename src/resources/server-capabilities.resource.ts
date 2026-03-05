import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../utils/logger.js';

export function registerServerCapabilitiesResource(server: McpServer): void {
  server.resource(
    'server-capabilities',
    'email://capabilities',
    async (uri) => {
      logger.debug('Fetching server capabilities resource');

      const data = {
        name: 'mcp-email-rw',
        version: '0.1.0',
        protocols: ['imap', 'smtp'],
        features: [
          'multi-account',
          'folder-management',
          'email-search',
          'email-compose',
          'email-reply',
          'email-forward',
          'draft-management',
          'attachment-support',
          'flag-management',
          'quota-info',
          'statistics',
        ],
        tools: [
          'list_accounts',
          'setup_account',
          'test_connection',
          'detect_auth',
          'remove_account',
          'update_account',
          'list_emails',
          'read_email',
          'search_emails',
          'count_emails',
          'count_new_emails',
          'list_folders',
          'get_attachment',
          'get_email_headers',
          'send_email',
          'reply_email',
          'forward_email',
          'save_draft',
          'send_draft',
          'compose_email',
          'delete_emails',
          'delete_emails_filtered',
          'purge_old_emails',
          'move_emails',
          'archive_emails',
          'mark_emails',
          'create_folder',
          'delete_folder',
          'inbox_summary',
          'email_stats',
          'storage_info',
          'list_important_emails',
          'summarize_unread',
          'list_deletable_emails',
        ],
      };

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    },
  );
}
