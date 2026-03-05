import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerSummarizeInboxPrompt } from '../../../src/prompts/summarize-inbox.prompt.js';
import { registerDraftReplyPrompt } from '../../../src/prompts/draft-reply.prompt.js';
import { registerCleanupSuggestionsPrompt } from '../../../src/prompts/cleanup-suggestions.prompt.js';
import { registerImportantEmailsPrompt } from '../../../src/prompts/important-emails.prompt.js';
import { registerDailyBriefingPrompt } from '../../../src/prompts/daily-briefing.prompt.js';
import { registerComposeEmailPrompt } from '../../../src/prompts/compose-email.prompt.js';

type PromptHandler = (params: Record<string, string>) => Promise<{
  messages: { role: string; content: { type: string; text: string } }[];
}>;

function createMockServer() {
  const handlers = new Map<string, PromptHandler>();
  const server = {
    prompt: vi.fn((name: string, _desc: string, _schema: unknown, handler: PromptHandler) => {
      handlers.set(name, handler);
    }),
  } as unknown as McpServer;
  return { server, handlers };
}

describe('Prompts', () => {
  let server: McpServer;
  let handlers: Map<string, PromptHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockServer();
    server = mock.server;
    handlers = mock.handlers;
  });

  describe('summarize-inbox', () => {
    beforeEach(() => {
      registerSummarizeInboxPrompt(server);
    });

    it('should register the prompt', () => {
      expect(handlers.has('summarize-inbox')).toBe(true);
    });

    it('should return messages with default maxEmails', async () => {
      const handler = handlers.get('summarize-inbox')!;
      const result = await handler({ accountId: 'test' });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content.type).toBe('text');
      expect(result.messages[0].content.text).toContain('test');
      expect(result.messages[0].content.text).toContain('10');
    });

    it('should use custom maxEmails', async () => {
      const handler = handlers.get('summarize-inbox')!;
      const result = await handler({ accountId: 'test', maxEmails: '25' });

      expect(result.messages[0].content.text).toContain('25');
    });
  });

  describe('draft-reply', () => {
    beforeEach(() => {
      registerDraftReplyPrompt(server);
    });

    it('should register the prompt', () => {
      expect(handlers.has('draft-reply')).toBe(true);
    });

    it('should return messages with defaults', async () => {
      const handler = handlers.get('draft-reply')!;
      const result = await handler({ accountId: 'test', emailId: '42' });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content.text).toContain('test');
      expect(result.messages[0].content.text).toContain('42');
      expect(result.messages[0].content.text).toContain('formal');
      expect(result.messages[0].content.text).toContain('english');
    });

    it('should use custom tone and language', async () => {
      const handler = handlers.get('draft-reply')!;
      const result = await handler({ accountId: 'test', emailId: '42', tone: 'casual', language: 'french' });

      expect(result.messages[0].content.text).toContain('casual');
      expect(result.messages[0].content.text).toContain('french');
    });
  });

  describe('cleanup-suggestions', () => {
    beforeEach(() => {
      registerCleanupSuggestionsPrompt(server);
    });

    it('should register the prompt', () => {
      expect(handlers.has('cleanup-suggestions')).toBe(true);
    });

    it('should return messages with default days', async () => {
      const handler = handlers.get('cleanup-suggestions')!;
      const result = await handler({ accountId: 'test' });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content.text).toContain('test');
      expect(result.messages[0].content.text).toContain('30');
    });

    it('should use custom olderThanDays', async () => {
      const handler = handlers.get('cleanup-suggestions')!;
      const result = await handler({ accountId: 'test', olderThanDays: '60' });

      expect(result.messages[0].content.text).toContain('60');
    });
  });

  describe('important-emails', () => {
    beforeEach(() => {
      registerImportantEmailsPrompt(server);
    });

    it('should register the prompt', () => {
      expect(handlers.has('important-emails')).toBe(true);
    });

    it('should return messages', async () => {
      const handler = handlers.get('important-emails')!;
      const result = await handler({ accountId: 'test' });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content.text).toContain('test');
      expect(result.messages[0].content.text).toContain('important');
    });
  });

  describe('daily-briefing', () => {
    beforeEach(() => {
      registerDailyBriefingPrompt(server);
    });

    it('should register the prompt', () => {
      expect(handlers.has('daily-briefing')).toBe(true);
    });

    it('should return messages', async () => {
      const handler = handlers.get('daily-briefing')!;
      const result = await handler({ accountId: 'test' });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content.text).toContain('test');
      expect(result.messages[0].content.text).toContain('briefing');
    });
  });

  describe('compose-email', () => {
    beforeEach(() => {
      registerComposeEmailPrompt(server);
    });

    it('should register the prompt', () => {
      expect(handlers.has('compose-email')).toBe(true);
    });

    it('should return messages with topic', async () => {
      const handler = handlers.get('compose-email')!;
      const result = await handler({ accountId: 'test', topic: 'Project update' });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content.text).toContain('test');
      expect(result.messages[0].content.text).toContain('Project update');
    });

    it('should include recipient when provided', async () => {
      const handler = handlers.get('compose-email')!;
      const result = await handler({ accountId: 'test', topic: 'Hello', recipient: 'bob@example.com' });

      expect(result.messages[0].content.text).toContain('bob@example.com');
    });

    it('should use custom tone', async () => {
      const handler = handlers.get('compose-email')!;
      const result = await handler({ accountId: 'test', topic: 'Hello', tone: 'casual' });

      expect(result.messages[0].content.text).toContain('casual');
    });
  });
});
