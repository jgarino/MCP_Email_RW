import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../../src/services/email-manager.service.js';
import type { EmailMessage } from '../../../src/types/email.types.js';

import { registerInboxSummaryTool } from '../../../src/tools/stats/inbox-summary.tool.js';
import { registerEmailStatsTool } from '../../../src/tools/stats/email-stats.tool.js';
import { registerStorageInfoTool } from '../../../src/tools/stats/storage-info.tool.js';
import { registerListImportantEmailsTool } from '../../../src/tools/stats/list-important-emails.tool.js';
import { registerSummarizeUnreadTool } from '../../../src/tools/stats/summarize-unread.tool.js';
import { registerListDeletableEmailsTool } from '../../../src/tools/stats/list-deletable-emails.tool.js';

function makeMockEmail(overrides: Partial<EmailMessage> = {}): EmailMessage {
  return {
    id: '1',
    uid: 1,
    folder: 'INBOX',
    from: [{ address: 'sender@example.com', name: 'Sender' }],
    to: [{ address: 'me@example.com' }],
    subject: 'Test Subject',
    date: new Date('2024-06-01T10:00:00Z'),
    text: 'Hello world',
    html: '<p>Hello world</p>',
    attachments: [],
    flags: { seen: false, flagged: false, answered: false, deleted: false, draft: false },
    size: 1024,
    snippet: 'Hello world...',
    ...overrides,
  };
}

type ToolHandler = (params: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

function createMockServer() {
  const handlers = new Map<string, ToolHandler>();
  const server = {
    tool: vi.fn((name: string, _desc: string, _schema: unknown, handler: ToolHandler) => {
      handlers.set(name, handler);
    }),
  } as unknown as McpServer;
  return { server, handlers };
}

function createMockEmailManager() {
  return {
    getFolderStatus: vi.fn().mockResolvedValue({ messages: 42, unseen: 5, recent: 1 }),
    searchEmails: vi.fn().mockResolvedValue([1, 2, 3]),
    listEmails: vi.fn().mockResolvedValue([
      makeMockEmail(),
      makeMockEmail({ id: '2', uid: 2, from: [{ address: 'other@example.com', name: 'Other' }] }),
    ]),
    getQuota: vi.fn().mockResolvedValue({ usage: 524288000, limit: 1073741824, usagePercentage: 48.83 }),
  } as unknown as EmailManagerService;
}

describe('Stats Tools', () => {
  let server: McpServer;
  let handlers: Map<string, ToolHandler>;
  let emailManager: ReturnType<typeof createMockEmailManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockServer();
    server = mock.server;
    handlers = mock.handlers;
    emailManager = createMockEmailManager();
  });

  describe('inbox_summary', () => {
    beforeEach(() => {
      registerInboxSummaryTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('inbox_summary')).toBe(true);
    });

    it('should return inbox summary', async () => {
      const handler = handlers.get('inbox_summary')!;
      const result = await handler({ accountId: 'test' });
      const parsed = JSON.parse(result.content[0].text);

      expect(emailManager.getFolderStatus).toHaveBeenCalledWith('test', 'INBOX');
      expect(parsed.total).toBe(42);
      expect(parsed.unread).toBe(5);
      expect(parsed.recent).toBe(1);
      expect(parsed.folder).toBe('INBOX');
    });

    it('should return error on failure', async () => {
      (emailManager.getFolderStatus as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Connection failed'));
      const handler = handlers.get('inbox_summary')!;
      const result = await handler({ accountId: 'bad' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('Connection failed');
    });
  });

  describe('email_stats', () => {
    beforeEach(() => {
      registerEmailStatsTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('email_stats')).toBe(true);
    });

    it('should return stats with default parameters', async () => {
      const handler = handlers.get('email_stats')!;
      const result = await handler({ accountId: 'test' });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.folder).toBe('INBOX');
      expect(parsed.period).toBe('week');
      expect(parsed.totalInPeriod).toBe(2);
      expect(parsed.topSenders).toHaveLength(2);
    });

    it('should accept custom folder and period', async () => {
      const handler = handlers.get('email_stats')!;
      const result = await handler({ accountId: 'test', folder: 'Sent', period: 'day' });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.folder).toBe('Sent');
      expect(parsed.period).toBe('day');
    });

    it('should return error on failure', async () => {
      (emailManager.searchEmails as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Search failed'));
      const handler = handlers.get('email_stats')!;
      const result = await handler({ accountId: 'test' });

      expect(result.isError).toBe(true);
    });
  });

  describe('storage_info', () => {
    beforeEach(() => {
      registerStorageInfoTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('storage_info')).toBe(true);
    });

    it('should return storage info', async () => {
      const handler = handlers.get('storage_info')!;
      const result = await handler({ accountId: 'test' });
      const parsed = JSON.parse(result.content[0].text);

      expect(emailManager.getQuota).toHaveBeenCalledWith('test');
      expect(parsed.usage).toBe(524288000);
      expect(parsed.limit).toBe(1073741824);
      expect(parsed.usagePercentage).toBe(48.83);
      expect(parsed.usageFormatted).toBeDefined();
      expect(parsed.limitFormatted).toBeDefined();
    });

    it('should handle null quota', async () => {
      (emailManager.getQuota as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const handler = handlers.get('storage_info')!;
      const result = await handler({ accountId: 'test' });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.message).toContain('not available');
    });

    it('should return error on failure', async () => {
      (emailManager.getQuota as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Quota error'));
      const handler = handlers.get('storage_info')!;
      const result = await handler({ accountId: 'test' });

      expect(result.isError).toBe(true);
    });
  });

  describe('list_important_emails', () => {
    beforeEach(() => {
      registerListImportantEmailsTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('list_important_emails')).toBe(true);
    });

    it('should list important emails with defaults', async () => {
      const handler = handlers.get('list_important_emails')!;
      const result = await handler({ accountId: 'test' });
      const parsed = JSON.parse(result.content[0].text);

      expect(emailManager.searchEmails).toHaveBeenCalledWith('test', 'INBOX', { flagged: true });
      expect(parsed.folder).toBe('INBOX');
      expect(parsed.totalImportant).toBe(3);
      expect(parsed.emails).toHaveLength(2);
    });

    it('should accept custom folder and limit', async () => {
      const handler = handlers.get('list_important_emails')!;
      const result = await handler({ accountId: 'test', folder: 'Sent', limit: 5 });
      const parsed = JSON.parse(result.content[0].text);

      expect(emailManager.searchEmails).toHaveBeenCalledWith('test', 'Sent', { flagged: true });
      expect(parsed.folder).toBe('Sent');
    });

    it('should return error on failure', async () => {
      (emailManager.searchEmails as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Fail'));
      const handler = handlers.get('list_important_emails')!;
      const result = await handler({ accountId: 'test' });

      expect(result.isError).toBe(true);
    });
  });

  describe('summarize_unread', () => {
    beforeEach(() => {
      registerSummarizeUnreadTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('summarize_unread')).toBe(true);
    });

    it('should summarize unread emails', async () => {
      const handler = handlers.get('summarize_unread')!;
      const result = await handler({ accountId: 'test' });
      const parsed = JSON.parse(result.content[0].text);

      expect(emailManager.listEmails).toHaveBeenCalledWith('test', expect.objectContaining({
        folder: 'INBOX',
        filter: { seen: false },
        limit: 10,
      }));
      expect(emailManager.getFolderStatus).toHaveBeenCalledWith('test', 'INBOX');
      expect(parsed.folder).toBe('INBOX');
      expect(parsed.totalUnread).toBe(5);
      expect(parsed.emails).toHaveLength(2);
      expect(parsed.emails[0].subject).toBe('Test Subject');
    });

    it('should accept custom folder and limit', async () => {
      const handler = handlers.get('summarize_unread')!;
      await handler({ accountId: 'test', folder: 'Sent', limit: 5 });

      expect(emailManager.listEmails).toHaveBeenCalledWith('test', expect.objectContaining({
        folder: 'Sent',
        limit: 5,
      }));
    });

    it('should return error on failure', async () => {
      (emailManager.listEmails as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Fail'));
      const handler = handlers.get('summarize_unread')!;
      const result = await handler({ accountId: 'test' });

      expect(result.isError).toBe(true);
    });
  });

  describe('list_deletable_emails', () => {
    beforeEach(() => {
      registerListDeletableEmailsTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('list_deletable_emails')).toBe(true);
    });

    it('should list read emails by default', async () => {
      const handler = handlers.get('list_deletable_emails')!;
      const result = await handler({ accountId: 'test' });
      const parsed = JSON.parse(result.content[0].text);

      expect(emailManager.listEmails).toHaveBeenCalledWith('test', expect.objectContaining({
        folder: 'INBOX',
        filter: { seen: true },
      }));
      expect(parsed.criteria).toBe('read');
      expect(parsed.count).toBe(2);
    });

    it('should list old read emails', async () => {
      const handler = handlers.get('list_deletable_emails')!;
      await handler({ accountId: 'test', criteria: 'old' });

      expect(emailManager.listEmails).toHaveBeenCalledWith('test', expect.objectContaining({
        filter: expect.objectContaining({ seen: true, before: expect.any(Date) }),
      }));
    });

    it('should list large emails', async () => {
      const handler = handlers.get('list_deletable_emails')!;
      await handler({ accountId: 'test', criteria: 'large' });

      expect(emailManager.listEmails).toHaveBeenCalledWith('test', expect.objectContaining({
        sort: 'size',
        sortOrder: 'desc',
      }));
    });

    it('should accept custom folder', async () => {
      const handler = handlers.get('list_deletable_emails')!;
      const result = await handler({ accountId: 'test', folder: 'Archive' });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.folder).toBe('Archive');
    });

    it('should return error on failure', async () => {
      (emailManager.listEmails as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Fail'));
      const handler = handlers.get('list_deletable_emails')!;
      const result = await handler({ accountId: 'test' });

      expect(result.isError).toBe(true);
    });
  });
});
