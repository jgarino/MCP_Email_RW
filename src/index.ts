#!/usr/bin/env node
/**
 * MCP Email RW — Entry point.
 * Starts the MCP server with stdio transport.
 */

import { startServer } from './server.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('index');

startServer().catch((err) => {
  logger.error('Fatal error starting MCP Email RW server', err);
  process.exit(1);
});
