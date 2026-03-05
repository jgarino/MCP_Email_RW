import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../../src/services/email-manager.service.js';
import type { EmailMessage } from '../../../src/types/email.types.js';

import { registerSendEmailTool } from '../../../src/tools/write/send-email.tool.js';
import { registerReplyEmailTool } from '../../../src/tools/write/reply-email.tool.js';
import { registerForwardEmailTool } from '../../../src/tools/write/forward-email.tool.js';
import { registerSaveDraftTool } from '../../../src/tools/write/save-draft.tool.js';
import { registerSendDraftTool } from '../../../src/tools/write/send-draft.tool.js';
import { registerComposeEmailTool } from '../../../src/tools/write/compose-email.tool.js';

function makeMockEmail(overrides: Partial<EmailMessage> = {}): EmailMessage {
  return {
    id: '1',
    uid: 1,
    messageId: '<original-123@example.com>',
    folder: 'INBOX',
    from: [{ address: 'sender@example.com', name: 'Sender' }],
    to: [{ address: 'me@example.com' }],
    cc: [{ address: 'cc@example.com' }],
    subject: 'Test Subject',
    date: new Date('2024-06-01T10:00:00Z'),
    text: 'Hello world',
    html: '<p>Hello world</p>',
    attachments: [],
    flags: { seen: false, flagged: false, answered: false, deleted: false, draft: false },
    headers: { references: '<ref-1@example.com>' },
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
    sendEmail: vi.fn().mockResolvedValue({ messageId: '<sent-456@example.com>' }),
    readEmail: vi.fn<[], Promise<EmailMessage>>().mockResolvedValue(makeMockEmail()),
    deleteEmails: vi.fn().mockResolvedValue(undefined),
    appendMessage: vi.fn().mockResolvedValue(undefined),
    getAccountEmail: vi.fn().mockReturnValue('me@example.com'),
  } as unknown as EmailManagerService;
}

describe('Write Tools', () => {
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

  describe('send_email', () => {
    beforeEach(() => {
      registerSendEmailTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('send_email')).toBe(true);
    });

    it('should send a plain text email', async () => {
      const handler = handlers.get('send_email')!;
      const result = await handler({
        accountId: 'test',
        to: 'recipient@example.com',
        subject: 'Hello',
        body: 'Hello there',
      });

      expect(emailManager.sendEmail).toHaveBeenCalledWith('test', expect.objectContaining({
        from: 'me@example.com',
        to: 'recipient@example.com',
        subject: 'Hello',
        text: 'Hello there',
      }));

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.messageId).toBe('<sent-456@example.com>');
      expect(parsed.status).toBe('sent');
      expect(result.isError).toBeUndefined();
    });

    it('should send an HTML email', async () => {
      const handler = handlers.get('send_email')!;
      await handler({
        accountId: 'test',
        to: 'recipient@example.com',
        subject: 'Hello',
        body: '<p>Hello</p>',
        html: true,
      });

      expect(emailManager.sendEmail).toHaveBeenCalledWith('test', expect.objectContaining({
        html: '<p>Hello</p>',
      }));
    });

    it('should handle cc and bcc', async () => {
      const handler = handlers.get('send_email')!;
      await handler({
        accountId: 'test',
        to: ['a@example.com', 'b@example.com'],
        subject: 'Hello',
        body: 'Hi',
        cc: 'cc@example.com',
        bcc: ['bcc1@example.com', 'bcc2@example.com'],
      });

      expect(emailManager.sendEmail).toHaveBeenCalledWith('test', expect.objectContaining({
        to: ['a@example.com', 'b@example.com'],
        cc: 'cc@example.com',
        bcc: ['bcc1@example.com', 'bcc2@example.com'],
      }));
    });

    it('should handle errors', async () => {
      (emailManager.sendEmail as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('SMTP error'));
      const handler = handlers.get('send_email')!;
      const result = await handler({
        accountId: 'test',
        to: 'recipient@example.com',
        subject: 'Hello',
        body: 'Hello',
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('SMTP error');
    });
  });

  describe('reply_to_email', () => {
    beforeEach(() => {
      registerReplyEmailTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('reply_to_email')).toBe(true);
    });

    it('should reply to an email', async () => {
      const handler = handlers.get('reply_to_email')!;
      const result = await handler({
        accountId: 'test',
        folder: 'INBOX',
        uid: 1,
        body: 'Thanks!',
      });

      expect(emailManager.readEmail).toHaveBeenCalledWith('test', 'INBOX', 1);
      expect(emailManager.sendEmail).toHaveBeenCalledWith('test', expect.objectContaining({
        to: ['sender@example.com'],
        subject: 'Re: Test Subject',
        text: 'Thanks!',
        inReplyTo: '<original-123@example.com>',
      }));

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('sent');
      expect(parsed.inReplyTo).toBe('<original-123@example.com>');
    });

    it('should not double the Re: prefix', async () => {
      (emailManager.readEmail as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeMockEmail({ subject: 'Re: Already replied' }),
      );

      const handler = handlers.get('reply_to_email')!;
      await handler({ accountId: 'test', folder: 'INBOX', uid: 1, body: 'Reply' });

      expect(emailManager.sendEmail).toHaveBeenCalledWith('test', expect.objectContaining({
        subject: 'Re: Already replied',
      }));
    });

    it('should reply all when replyAll is true', async () => {
      const handler = handlers.get('reply_to_email')!;
      await handler({
        accountId: 'test',
        folder: 'INBOX',
        uid: 1,
        body: 'Reply all',
        replyAll: true,
      });

      expect(emailManager.sendEmail).toHaveBeenCalledWith('test', expect.objectContaining({
        to: ['sender@example.com'],
        cc: ['cc@example.com'],
      }));
    });

    it('should handle errors', async () => {
      (emailManager.readEmail as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Not found'));
      const handler = handlers.get('reply_to_email')!;
      const result = await handler({ accountId: 'test', folder: 'INBOX', uid: 99, body: 'Reply' });

      expect(result.isError).toBe(true);
    });
  });

  describe('forward_email', () => {
    beforeEach(() => {
      registerForwardEmailTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('forward_email')).toBe(true);
    });

    it('should forward an email', async () => {
      const handler = handlers.get('forward_email')!;
      const result = await handler({
        accountId: 'test',
        folder: 'INBOX',
        uid: 1,
        to: 'forward@example.com',
      });

      expect(emailManager.readEmail).toHaveBeenCalledWith('test', 'INBOX', 1);
      expect(emailManager.sendEmail).toHaveBeenCalledWith('test', expect.objectContaining({
        to: 'forward@example.com',
        subject: 'Fwd: Test Subject',
      }));

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('sent');
    });

    it('should include additional body before forwarded content', async () => {
      const handler = handlers.get('forward_email')!;
      await handler({
        accountId: 'test',
        folder: 'INBOX',
        uid: 1,
        to: 'forward@example.com',
        body: 'FYI see below',
      });

      const call = (emailManager.sendEmail as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[1].text).toContain('FYI see below');
      expect(call[1].text).toContain('Forwarded message');
      expect(call[1].text).toContain('Hello world');
    });

    it('should not double the Fwd: prefix', async () => {
      (emailManager.readEmail as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeMockEmail({ subject: 'Fwd: Already forwarded' }),
      );

      const handler = handlers.get('forward_email')!;
      await handler({ accountId: 'test', folder: 'INBOX', uid: 1, to: 'a@b.com' });

      expect(emailManager.sendEmail).toHaveBeenCalledWith('test', expect.objectContaining({
        subject: 'Fwd: Already forwarded',
      }));
    });

    it('should handle errors', async () => {
      (emailManager.readEmail as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Not found'));
      const handler = handlers.get('forward_email')!;
      const result = await handler({ accountId: 'test', folder: 'INBOX', uid: 1, to: 'a@b.com' });

      expect(result.isError).toBe(true);
    });
  });

  describe('save_draft', () => {
    beforeEach(() => {
      registerSaveDraftTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('save_draft')).toBe(true);
    });

    it('should save a draft', async () => {
      const handler = handlers.get('save_draft')!;
      const result = await handler({
        accountId: 'test',
        to: 'recipient@example.com',
        subject: 'Draft Subject',
        body: 'Draft body',
      });

      expect(emailManager.appendMessage).toHaveBeenCalledWith(
        'test',
        'Drafts',
        expect.stringContaining('Draft Subject'),
        ['\\Draft', '\\Seen'],
      );

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('saved');
      expect(parsed.folder).toBe('Drafts');
    });

    it('should build a MIME message with correct headers', async () => {
      const handler = handlers.get('save_draft')!;
      await handler({
        accountId: 'test',
        to: ['a@example.com', 'b@example.com'],
        subject: 'Test Draft',
        body: 'Draft content',
        cc: 'cc@example.com',
      });

      const raw = (emailManager.appendMessage as ReturnType<typeof vi.fn>).mock.calls[0][2] as string;
      expect(raw).toContain('From: me@example.com');
      expect(raw).toContain('To: a@example.com, b@example.com');
      expect(raw).toContain('Cc: cc@example.com');
      expect(raw).toContain('Subject: Test Draft');
      expect(raw).toContain('Content-Type: text/plain');
      expect(raw).toContain('Draft content');
    });

    it('should set HTML content type when html is true', async () => {
      const handler = handlers.get('save_draft')!;
      await handler({
        accountId: 'test',
        to: 'a@example.com',
        subject: 'HTML Draft',
        body: '<p>Hello</p>',
        html: true,
      });

      const raw = (emailManager.appendMessage as ReturnType<typeof vi.fn>).mock.calls[0][2] as string;
      expect(raw).toContain('Content-Type: text/html');
    });

    it('should handle errors', async () => {
      (emailManager.appendMessage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('IMAP error'));
      const handler = handlers.get('save_draft')!;
      const result = await handler({
        accountId: 'test',
        to: 'a@b.com',
        subject: 'Test',
        body: 'Body',
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('send_draft', () => {
    beforeEach(() => {
      registerSendDraftTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('send_draft')).toBe(true);
    });

    it('should send a draft and delete it', async () => {
      (emailManager.readEmail as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeMockEmail({ folder: 'Drafts', flags: { seen: true, flagged: false, answered: false, deleted: false, draft: true } }),
      );

      const handler = handlers.get('send_draft')!;
      const result = await handler({ accountId: 'test', uid: 5 });

      expect(emailManager.readEmail).toHaveBeenCalledWith('test', 'Drafts', 5);
      expect(emailManager.sendEmail).toHaveBeenCalledWith('test', expect.objectContaining({
        to: ['me@example.com'],
        subject: 'Test Subject',
      }));
      expect(emailManager.deleteEmails).toHaveBeenCalledWith('test', [5], 'Drafts', true);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('sent');
      expect(parsed.deletedDraft).toBe(true);
    });

    it('should use custom folder', async () => {
      const handler = handlers.get('send_draft')!;
      await handler({ accountId: 'test', folder: 'My Drafts', uid: 3 });

      expect(emailManager.readEmail).toHaveBeenCalledWith('test', 'My Drafts', 3);
    });

    it('should handle errors', async () => {
      (emailManager.readEmail as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Draft not found'));
      const handler = handlers.get('send_draft')!;
      const result = await handler({ accountId: 'test', uid: 99 });

      expect(result.isError).toBe(true);
    });
  });

  describe('compose_email', () => {
    beforeEach(() => {
      registerComposeEmailTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('compose_email')).toBe(true);
    });

    it('should compose an email preview without sending', async () => {
      const handler = handlers.get('compose_email')!;
      const result = await handler({
        accountId: 'test',
        to: 'recipient@example.com',
        subject: 'Preview Subject',
        body: 'Preview body',
      });

      expect(emailManager.sendEmail).not.toHaveBeenCalled();

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('composed');
      expect(parsed.from).toBe('me@example.com');
      expect(parsed.to).toEqual(['recipient@example.com']);
      expect(parsed.subject).toBe('Preview Subject');
      expect(parsed.body).toBe('Preview body');
      expect(parsed.contentType).toBe('text/plain');
      expect(parsed.note).toContain('not been sent');
    });

    it('should handle array recipients and cc/bcc', async () => {
      const handler = handlers.get('compose_email')!;
      const result = await handler({
        accountId: 'test',
        to: ['a@example.com', 'b@example.com'],
        subject: 'Test',
        body: 'Body',
        cc: 'cc@example.com',
        bcc: ['bcc1@example.com', 'bcc2@example.com'],
        html: true,
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.to).toEqual(['a@example.com', 'b@example.com']);
      expect(parsed.cc).toEqual(['cc@example.com']);
      expect(parsed.bcc).toEqual(['bcc1@example.com', 'bcc2@example.com']);
      expect(parsed.contentType).toBe('text/html');
    });

    it('should handle errors', async () => {
      (emailManager.getAccountEmail as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Account not found');
      });
      const handler = handlers.get('compose_email')!;
      const result = await handler({
        accountId: 'invalid',
        to: 'a@b.com',
        subject: 'Test',
        body: 'Body',
      });

      expect(result.isError).toBe(true);
    });
  });
});
