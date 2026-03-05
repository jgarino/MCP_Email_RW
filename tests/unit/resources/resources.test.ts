import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConfigManager } from '../../../src/config/config-manager.js';

import { registerAccountListResource } from '../../../src/resources/account-list.resource.js';
import { registerServerCapabilitiesResource } from '../../../src/resources/server-capabilities.resource.js';

type ResourceHandler = (uri: URL) => Promise<{
  contents: { uri: string; mimeType: string; text: string }[];
}>;

function createMockServer() {
  const handlers = new Map<string, ResourceHandler>();
  const server = {
    resource: vi.fn((name: string, _uri: string, handler: ResourceHandler) => {
      handlers.set(name, handler);
    }),
  } as unknown as McpServer;
  return { server, handlers };
}

function createMockConfigManager() {
  return {
    getAccounts: vi.fn().mockReturnValue([
      {
        id: 'gmail-1',
        name: 'My Gmail',
        email: 'user@gmail.com',
        provider: 'gmail',
        enabled: true,
      },
      {
        id: 'outlook-1',
        name: 'My Outlook',
        email: 'user@outlook.com',
        provider: 'outlook',
        enabled: false,
      },
    ]),
  } as unknown as ConfigManager;
}

describe('Resources', () => {
  let server: McpServer;
  let handlers: Map<string, ResourceHandler>;
  let configManager: ReturnType<typeof createMockConfigManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockServer();
    server = mock.server;
    handlers = mock.handlers;
    configManager = createMockConfigManager();
  });

  describe('account-list', () => {
    beforeEach(() => {
      registerAccountListResource(server, configManager as unknown as ConfigManager);
    });

    it('should register the resource', () => {
      expect(handlers.has('account-list')).toBe(true);
    });

    it('should return account list', async () => {
      const handler = handlers.get('account-list')!;
      const result = await handler(new URL('email://accounts'));

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].mimeType).toBe('application/json');

      const data = JSON.parse(result.contents[0].text);
      expect(data).toHaveLength(2);
      expect(data[0].id).toBe('gmail-1');
      expect(data[0].email).toBe('user@gmail.com');
      expect(data[0].provider).toBe('gmail');
      expect(data[0].enabled).toBe(true);
      expect(data[1].id).toBe('outlook-1');
      expect(data[1].enabled).toBe(false);
    });

    it('should not expose sensitive auth data', async () => {
      const handler = handlers.get('account-list')!;
      const result = await handler(new URL('email://accounts'));
      const data = JSON.parse(result.contents[0].text);

      expect(data[0].auth).toBeUndefined();
      expect(data[0].imap).toBeUndefined();
      expect(data[0].smtp).toBeUndefined();
    });
  });

  describe('server-capabilities', () => {
    beforeEach(() => {
      registerServerCapabilitiesResource(server);
    });

    it('should register the resource', () => {
      expect(handlers.has('server-capabilities')).toBe(true);
    });

    it('should return capabilities', async () => {
      const handler = handlers.get('server-capabilities')!;
      const result = await handler(new URL('email://capabilities'));

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].mimeType).toBe('application/json');

      const data = JSON.parse(result.contents[0].text);
      expect(data.name).toBe('mcp-email-rw');
      expect(data.protocols).toContain('imap');
      expect(data.protocols).toContain('smtp');
      expect(data.features).toContain('multi-account');
      expect(data.features).toContain('statistics');
      expect(data.tools).toContain('list_emails');
      expect(data.tools).toContain('inbox_summary');
      expect(data.tools).toContain('email_stats');
    });
  });
});
