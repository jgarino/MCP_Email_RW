import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../../src/services/email-manager.service.js';
import type { EmailMessage, EmailFolder } from '../../../src/types/email.types.js';

import { registerListEmailsTool } from '../../../src/tools/read/list-emails.tool.js';
import { registerReadEmailTool } from '../../../src/tools/read/read-email.tool.js';
import { registerSearchEmailsTool } from '../../../src/tools/read/search-emails.tool.js';
import { registerCountEmailsTool } from '../../../src/tools/read/count-emails.tool.js';
import { registerCountNewEmailsTool } from '../../../src/tools/read/count-new-emails.tool.js';
import { registerListFoldersTool } from '../../../src/tools/read/list-folders.tool.js';
import { registerGetAttachmentTool } from '../../../src/tools/read/get-attachment.tool.js';
import { registerGetEmailHeadersTool } from '../../../src/tools/read/get-email-headers.tool.js';

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
    listEmails: vi.fn<[], Promise<EmailMessage[]>>().mockResolvedValue([makeMockEmail()]),
    readEmail: vi.fn<[], Promise<EmailMessage>>().mockResolvedValue(makeMockEmail()),
    searchEmails: vi.fn<[], Promise<number[]>>().mockResolvedValue([1, 2, 3]),
    setFlags: vi.fn().mockResolvedValue(undefined),
    getFolderStatus: vi.fn().mockResolvedValue({ messages: 42, unseen: 5, recent: 1 }),
    listFolders: vi.fn<[], Promise<EmailFolder[]>>().mockResolvedValue([
      { name: 'INBOX', path: 'INBOX', delimiter: '/', flags: [], specialUse: '\\Inbox' },
      { name: 'Sent', path: 'Sent', delimiter: '/', flags: [], specialUse: '\\Sent' },
    ]),
  } as unknown as EmailManagerService;
}

describe('Read Tools', () => {
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

  describe('list_emails', () => {
    beforeEach(() => {
      registerListEmailsTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('list_emails')).toBe(true);
    });

    it('should list emails with default parameters', async () => {
      const handler = handlers.get('list_emails')!;
      const result = await handler({ accountId: 'test' });
      const parsed = JSON.parse(result.content[0].text);

      expect(emailManager.listEmails).toHaveBeenCalledWith('test', {
        folder: 'INBOX',
        limit: 20,
        offset: 0,
      });
      expect(parsed).toHaveLength(1);
      expect(parsed[0].subject).toBe('Test Subject');
      expect(parsed[0].hasAttachments).toBe(false);
    });

    it('should use custom folder and pagination', async () => {
      const handler = handlers.get('list_emails')!;
      await handler({ accountId: 'test', folder: 'Sent', limit: 10, offset: 5 });

      expect(emailManager.listEmails).toHaveBeenCalledWith('test', {
        folder: 'Sent',
        limit: 10,
        offset: 5,
      });
    });

    it('should return error on failure', async () => {
      (emailManager.listEmails as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Connection failed'));
      const handler = handlers.get('list_emails')!;
      const result = await handler({ accountId: 'bad' });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toBe('Connection failed');
    });
  });

  describe('read_email', () => {
    beforeEach(() => {
      registerReadEmailTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('read_email')).toBe(true);
    });

    it('should read email and mark as read by default', async () => {
      const handler = handlers.get('read_email')!;
      const result = await handler({ accountId: 'test', folder: 'INBOX', uid: 1 });
      const parsed = JSON.parse(result.content[0].text);

      expect(emailManager.readEmail).toHaveBeenCalledWith('test', 'INBOX', 1);
      expect(emailManager.setFlags).toHaveBeenCalledWith('test', [1], 'INBOX', { seen: true }, 'add');
      expect(parsed.subject).toBe('Test Subject');
    });

    it('should not mark as read when markAsRead is false', async () => {
      const handler = handlers.get('read_email')!;
      await handler({ accountId: 'test', folder: 'INBOX', uid: 1, markAsRead: false });

      expect(emailManager.setFlags).not.toHaveBeenCalled();
    });

    it('should not set flags if already seen', async () => {
      (emailManager.readEmail as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeMockEmail({ flags: { seen: true, flagged: false, answered: false, deleted: false, draft: false } }),
      );
      const handler = handlers.get('read_email')!;
      await handler({ accountId: 'test', folder: 'INBOX', uid: 1 });

      expect(emailManager.setFlags).not.toHaveBeenCalled();
    });

    it('should return error on failure', async () => {
      (emailManager.readEmail as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Not found'));
      const handler = handlers.get('read_email')!;
      const result = await handler({ accountId: 'test', folder: 'INBOX', uid: 999 });

      expect(result.isError).toBe(true);
    });
  });

  describe('search_emails', () => {
    beforeEach(() => {
      registerSearchEmailsTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('search_emails')).toBe(true);
    });

    it('should search with basic criteria', async () => {
      const handler = handlers.get('search_emails')!;
      const result = await handler({ accountId: 'test', from: 'sender@example.com' });
      const parsed = JSON.parse(result.content[0].text);

      expect(emailManager.searchEmails).toHaveBeenCalledWith('test', 'INBOX', expect.objectContaining({ from: 'sender@example.com' }));
      expect(parsed.totalFound).toBe(3);
      expect(parsed.returned).toBe(3);
    });

    it('should apply date filters', async () => {
      const handler = handlers.get('search_emails')!;
      await handler({ accountId: 'test', since: '2024-01-01', before: '2024-12-31' });

      expect(emailManager.searchEmails).toHaveBeenCalledWith(
        'test',
        'INBOX',
        expect.objectContaining({
          since: expect.any(Date),
          before: expect.any(Date),
        }),
      );
    });

    it('should respect limit', async () => {
      (emailManager.searchEmails as ReturnType<typeof vi.fn>).mockResolvedValue([1, 2, 3, 4, 5]);
      const handler = handlers.get('search_emails')!;
      const result = await handler({ accountId: 'test', limit: 2 });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.totalFound).toBe(5);
      expect(parsed.returned).toBe(2);
    });

    it('should handle body query', async () => {
      const handler = handlers.get('search_emails')!;
      await handler({ accountId: 'test', query: 'meeting notes' });

      expect(emailManager.searchEmails).toHaveBeenCalledWith(
        'test',
        'INBOX',
        expect.objectContaining({ body: 'meeting notes' }),
      );
    });

    it('should return error on failure', async () => {
      (emailManager.searchEmails as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Search failed'));
      const handler = handlers.get('search_emails')!;
      const result = await handler({ accountId: 'test' });

      expect(result.isError).toBe(true);
    });
  });

  describe('count_emails', () => {
    beforeEach(() => {
      registerCountEmailsTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('count_emails')).toBe(true);
    });

    it('should count all emails using folder status', async () => {
      const handler = handlers.get('count_emails')!;
      const result = await handler({ accountId: 'test' });
      const parsed = JSON.parse(result.content[0].text);

      expect(emailManager.getFolderStatus).toHaveBeenCalledWith('test', 'INBOX');
      expect(parsed.count).toBe(42);
      expect(parsed.filter).toBe('all');
    });

    it('should count unseen emails', async () => {
      const handler = handlers.get('count_emails')!;
      const result = await handler({ accountId: 'test', filter: 'unseen' });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.count).toBe(5);
    });

    it('should count seen emails via search', async () => {
      const handler = handlers.get('count_emails')!;
      const result = await handler({ accountId: 'test', filter: 'seen' });
      const parsed = JSON.parse(result.content[0].text);

      expect(emailManager.searchEmails).toHaveBeenCalledWith('test', 'INBOX', { seen: true });
      expect(parsed.count).toBe(3);
    });

    it('should count flagged emails via search', async () => {
      const handler = handlers.get('count_emails')!;
      const result = await handler({ accountId: 'test', filter: 'flagged' });
      const parsed = JSON.parse(result.content[0].text);

      expect(emailManager.searchEmails).toHaveBeenCalledWith('test', 'INBOX', { flagged: true });
      expect(parsed.count).toBe(3);
    });

    it('should return error on failure', async () => {
      (emailManager.getFolderStatus as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Folder error'));
      const handler = handlers.get('count_emails')!;
      const result = await handler({ accountId: 'test' });

      expect(result.isError).toBe(true);
    });
  });

  describe('count_new_emails', () => {
    beforeEach(() => {
      registerCountNewEmailsTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('count_new_emails')).toBe(true);
    });

    it('should count new emails since default 24h ago', async () => {
      const handler = handlers.get('count_new_emails')!;
      const result = await handler({ accountId: 'test' });
      const parsed = JSON.parse(result.content[0].text);

      expect(emailManager.searchEmails).toHaveBeenCalledWith('test', 'INBOX', {
        since: expect.any(Date),
      });
      expect(parsed.count).toBe(3);
      expect(parsed.emails).toHaveLength(3);
    });

    it('should accept custom since date', async () => {
      const handler = handlers.get('count_new_emails')!;
      await handler({ accountId: 'test', since: '2024-06-01' });

      const callArgs = (emailManager.searchEmails as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[2].since.toISOString()).toContain('2024-06-01');
    });

    it('should return error on failure', async () => {
      (emailManager.searchEmails as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Fail'));
      const handler = handlers.get('count_new_emails')!;
      const result = await handler({ accountId: 'test' });

      expect(result.isError).toBe(true);
    });
  });

  describe('list_folders', () => {
    beforeEach(() => {
      registerListFoldersTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('list_folders')).toBe(true);
    });

    it('should list folders', async () => {
      const handler = handlers.get('list_folders')!;
      const result = await handler({ accountId: 'test' });
      const parsed = JSON.parse(result.content[0].text);

      expect(emailManager.listFolders).toHaveBeenCalledWith('test');
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe('INBOX');
      expect(parsed[1].name).toBe('Sent');
    });

    it('should return error on failure', async () => {
      (emailManager.listFolders as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('No access'));
      const handler = handlers.get('list_folders')!;
      const result = await handler({ accountId: 'test' });

      expect(result.isError).toBe(true);
    });
  });

  describe('get_attachment', () => {
    beforeEach(() => {
      registerGetAttachmentTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('get_attachment')).toBe(true);
    });

    it('should return attachment data', async () => {
      (emailManager.readEmail as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeMockEmail({
          attachments: [
            {
              filename: 'doc.pdf',
              contentType: 'application/pdf',
              size: 1024,
              content: Buffer.from('pdf-content'),
            },
          ],
        }),
      );

      const handler = handlers.get('get_attachment')!;
      const result = await handler({ accountId: 'test', folder: 'INBOX', uid: 1, attachmentIndex: 0 });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.filename).toBe('doc.pdf');
      expect(parsed.contentType).toBe('application/pdf');
      expect(parsed.size).toBe(1024);
      expect(parsed.base64Content).toBe(Buffer.from('pdf-content').toString('base64'));
    });

    it('should error when email has no attachments', async () => {
      const handler = handlers.get('get_attachment')!;
      const result = await handler({ accountId: 'test', folder: 'INBOX', uid: 1, attachmentIndex: 0 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toContain('no attachments');
    });

    it('should error for invalid attachment index', async () => {
      (emailManager.readEmail as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeMockEmail({
          attachments: [{ filename: 'a.txt', contentType: 'text/plain', size: 10 }],
        }),
      );

      const handler = handlers.get('get_attachment')!;
      const result = await handler({ accountId: 'test', folder: 'INBOX', uid: 1, attachmentIndex: 5 });

      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text).error).toContain('Invalid attachment index');
    });

    it('should return error on failure', async () => {
      (emailManager.readEmail as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Read failed'));
      const handler = handlers.get('get_attachment')!;
      const result = await handler({ accountId: 'test', folder: 'INBOX', uid: 1, attachmentIndex: 0 });

      expect(result.isError).toBe(true);
    });
  });

  describe('get_email_headers', () => {
    beforeEach(() => {
      registerGetEmailHeadersTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('get_email_headers')).toBe(true);
    });

    it('should return raw headers when available', async () => {
      (emailManager.readEmail as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeMockEmail({
          headers: {
            'X-Custom': 'value',
            'Message-ID': '<abc@example.com>',
          },
        }),
      );

      const handler = handlers.get('get_email_headers')!;
      const result = await handler({ accountId: 'test', folder: 'INBOX', uid: 1 });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed['X-Custom']).toBe('value');
      expect(parsed['Message-ID']).toBe('<abc@example.com>');
    });

    it('should synthesize headers from email fields when raw headers are empty', async () => {
      (emailManager.readEmail as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeMockEmail({ messageId: '<msg1@example.com>' }),
      );

      const handler = handlers.get('get_email_headers')!;
      const result = await handler({ accountId: 'test', folder: 'INBOX', uid: 1 });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed['From']).toContain('sender@example.com');
      expect(parsed['To']).toContain('me@example.com');
      expect(parsed['Subject']).toBe('Test Subject');
      expect(parsed['Message-ID']).toBe('<msg1@example.com>');
    });

    it('should return error on failure', async () => {
      (emailManager.readEmail as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Read failed'));
      const handler = handlers.get('get_email_headers')!;
      const result = await handler({ accountId: 'test', folder: 'INBOX', uid: 1 });

      expect(result.isError).toBe(true);
    });
  });
});
