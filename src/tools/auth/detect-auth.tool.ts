import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AuthDetector } from '../../auth/auth-detector.js';
import { logger } from '../../utils/logger.js';

export function registerDetectAuthTool(server: McpServer): void {
  server.tool(
    'detect_auth',
    'Detect recommended authentication method and server settings for an email address',
    {
      email: z.string().email().describe('Email address to detect settings for'),
    },
    async (params) => {
      logger.debug('Detecting auth for email', { email: params.email });

      const detector = new AuthDetector();
      const result = await detector.detectAuthForEmail(params.email);

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
