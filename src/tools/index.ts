import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConfigManager } from '../config/config-manager.js';
import type { AuthManager } from '../auth/auth-manager.js';
import type { EmailManagerService } from '../services/email-manager.service.js';
import { logger } from '../utils/logger.js';
import { registerListAccountsTool } from './auth/list-accounts.tool.js';
import { registerSetupAccountTool } from './auth/setup-account.tool.js';
import { registerTestConnectionTool } from './auth/test-connection.tool.js';
import { registerDetectAuthTool } from './auth/detect-auth.tool.js';
import { registerRemoveAccountTool } from './auth/remove-account.tool.js';
import { registerUpdateAccountTool } from './auth/update-account.tool.js';
import { registerListEmailsTool } from './read/list-emails.tool.js';
import { registerReadEmailTool } from './read/read-email.tool.js';
import { registerSearchEmailsTool } from './read/search-emails.tool.js';
import { registerCountEmailsTool } from './read/count-emails.tool.js';
import { registerCountNewEmailsTool } from './read/count-new-emails.tool.js';
import { registerListFoldersTool } from './read/list-folders.tool.js';
import { registerGetAttachmentTool } from './read/get-attachment.tool.js';
import { registerGetEmailHeadersTool } from './read/get-email-headers.tool.js';
import { registerSendEmailTool } from './write/send-email.tool.js';
import { registerReplyEmailTool } from './write/reply-email.tool.js';
import { registerForwardEmailTool } from './write/forward-email.tool.js';
import { registerSaveDraftTool } from './write/save-draft.tool.js';
import { registerSendDraftTool } from './write/send-draft.tool.js';
import { registerComposeEmailTool } from './write/compose-email.tool.js';
import { registerDeleteEmailsTool } from './manage/delete-emails.tool.js';
import { registerDeleteEmailsFilteredTool } from './manage/delete-emails-filtered.tool.js';
import { registerPurgeOldEmailsTool } from './manage/purge-old-emails.tool.js';
import { registerMoveEmailsTool } from './manage/move-emails.tool.js';
import { registerArchiveEmailsTool } from './manage/archive-emails.tool.js';
import { registerMarkEmailsTool } from './manage/mark-emails.tool.js';
import { registerCreateFolderTool } from './manage/create-folder.tool.js';
import { registerDeleteFolderTool } from './manage/delete-folder.tool.js';
import { registerInboxSummaryTool } from './stats/inbox-summary.tool.js';
import { registerEmailStatsTool } from './stats/email-stats.tool.js';
import { registerStorageInfoTool } from './stats/storage-info.tool.js';
import { registerListImportantEmailsTool } from './stats/list-important-emails.tool.js';
import { registerSummarizeUnreadTool } from './stats/summarize-unread.tool.js';
import { registerListDeletableEmailsTool } from './stats/list-deletable-emails.tool.js';

export function registerAllTools(
  server: McpServer,
  configManager: ConfigManager,
  _authManager: AuthManager,
  emailManager: EmailManagerService,
): void {
  logger.info('Registering MCP tools...');

  // Auth tools
  registerListAccountsTool(server, configManager);
  registerSetupAccountTool(server, configManager);
  registerTestConnectionTool(server, configManager);
  registerDetectAuthTool(server);
  registerRemoveAccountTool(server, configManager);
  registerUpdateAccountTool(server, configManager);

  // Read tools
  registerListEmailsTool(server, emailManager);
  registerReadEmailTool(server, emailManager);
  registerSearchEmailsTool(server, emailManager);
  registerCountEmailsTool(server, emailManager);
  registerCountNewEmailsTool(server, emailManager);
  registerListFoldersTool(server, emailManager);
  registerGetAttachmentTool(server, emailManager);
  registerGetEmailHeadersTool(server, emailManager);

  // Write tools
  registerSendEmailTool(server, emailManager);
  registerReplyEmailTool(server, emailManager);
  registerForwardEmailTool(server, emailManager);
  registerSaveDraftTool(server, emailManager);
  registerSendDraftTool(server, emailManager);
  registerComposeEmailTool(server, emailManager);

  // Manage tools
  registerDeleteEmailsTool(server, emailManager);
  registerDeleteEmailsFilteredTool(server, emailManager);
  registerPurgeOldEmailsTool(server, emailManager);
  registerMoveEmailsTool(server, emailManager);
  registerArchiveEmailsTool(server, emailManager);
  registerMarkEmailsTool(server, emailManager);
  registerCreateFolderTool(server, emailManager);
  registerDeleteFolderTool(server, emailManager);

  // Stats tools
  registerInboxSummaryTool(server, emailManager);
  registerEmailStatsTool(server, emailManager);
  registerStorageInfoTool(server, emailManager);
  registerListImportantEmailsTool(server, emailManager);
  registerSummarizeUnreadTool(server, emailManager);
  registerListDeletableEmailsTool(server, emailManager);

  logger.info('All MCP tools registered');
}
