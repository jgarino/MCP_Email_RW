import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConfigManager } from '../config/config-manager.js';
import { logger } from '../utils/logger.js';
import { registerSummarizeInboxPrompt } from './summarize-inbox.prompt.js';
import { registerDraftReplyPrompt } from './draft-reply.prompt.js';
import { registerCleanupSuggestionsPrompt } from './cleanup-suggestions.prompt.js';
import { registerImportantEmailsPrompt } from './important-emails.prompt.js';
import { registerDailyBriefingPrompt } from './daily-briefing.prompt.js';
import { registerComposeEmailPrompt } from './compose-email.prompt.js';

export function registerAllPrompts(server: McpServer, _configManager: ConfigManager): void {
  logger.info('Registering MCP prompts...');

  registerSummarizeInboxPrompt(server);
  registerDraftReplyPrompt(server);
  registerCleanupSuggestionsPrompt(server);
  registerImportantEmailsPrompt(server);
  registerDailyBriefingPrompt(server);
  registerComposeEmailPrompt(server);

  logger.info('All MCP prompts registered');
}
