import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { logger, setLogLevel } from './utils/logger.js';
import { registerAllTools } from './tools/index.js';
import { registerAllResources } from './resources/index.js';
import { registerAllPrompts } from './prompts/index.js';

async function main(): Promise<void> {
  try {
    const logLevel =
      (process.env.MCP_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info';
    setLogLevel(logLevel);

    logger.info('Starting MCP Email RW server...');

    const { server, configManager } = createServer();

    // Load config
    await configManager.load();

    // Register all MCP tools, resources, and prompts
    registerAllTools(server, configManager);
    registerAllResources(server, configManager);
    registerAllPrompts(server, configManager);

    // Connect via stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info('MCP Email RW server running on stdio');
  } catch (error) {
    logger.error('Failed to start server', { error: (error as Error).message });
    process.exit(1);
  }
}

main();
