import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EmailManagerService } from '../../../src/services/email-manager.service.js';
import type { EmailMessage } from '../../../src/types/email.types.js';

import { registerDeleteEmailsTool } from '../../../src/tools/manage/delete-emails.tool.js';
import { registerDeleteEmailsFilteredTool } from '../../../src/tools/manage/delete-emails-filtered.tool.js';
import { registerPurgeOldEmailsTool } from '../../../src/tools/manage/purge-old-emails.tool.js';
import { registerMoveEmailsTool } from '../../../src/tools/manage/move-emails.tool.js';
import { registerArchiveEmailsTool } from '../../../src/tools/manage/archive-emails.tool.js';
import { registerMarkEmailsTool } from '../../../src/tools/manage/mark-emails.tool.js';
import { registerCreateFolderTool } from '../../../src/tools/manage/create-folder.tool.js';
import { registerDeleteFolderTool } from '../../../src/tools/manage/delete-folder.tool.js';

function makeMockEmail(overrides: Partial<EmailMessage> = {}): EmailMessage {
  return {
    id: '1',
    uid: 1,
    messageId: '<msg-123@example.com>',
    folder: 'INBOX',
    from: [{ address: 'sender@example.com', name: 'Sender' }],
    to: [{ address: 'me@example.com' }],
    subject: 'Test Subject',
    date: new Date('2024-06-01T10:00:00Z'),
    text: 'Hello world',
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
    deleteEmails: vi.fn().mockResolvedValue(undefined),
    moveEmails: vi.fn().mockResolvedValue(undefined),
    setFlags: vi.fn().mockResolvedValue(undefined),
    createFolder: vi.fn().mockResolvedValue(undefined),
    deleteFolder: vi.fn().mockResolvedValue(undefined),
    searchEmails: vi.fn().mockResolvedValue([1, 2, 3]),
    readEmail: vi.fn().mockImplementation((_accountId: string, _folder: string, uid: number) =>
      Promise.resolve(makeMockEmail({ uid, id: String(uid) })),
    ),
    getAccountProvider: vi.fn().mockReturnValue('custom'),
    getAccountEmail: vi.fn().mockReturnValue('me@example.com'),
  } as unknown as EmailManagerService;
}

describe('Manage Tools', () => {
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

  describe('delete_emails', () => {
    beforeEach(() => {
      registerDeleteEmailsTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('delete_emails')).toBe(true);
    });

    it('should move emails to trash by default', async () => {
      const handler = handlers.get('delete_emails')!;
      const result = await handler({
        accountId: 'test',
        folder: 'INBOX',
        uids: [1, 2, 3],
      });

      expect(emailManager.deleteEmails).toHaveBeenCalledWith('test', [1, 2, 3], 'INBOX', false);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('moved_to_trash');
      expect(parsed.count).toBe(3);
      expect(result.isError).toBeUndefined();
    });

    it('should permanently delete when permanent=true', async () => {
      const handler = handlers.get('delete_emails')!;
      const result = await handler({
        accountId: 'test',
        folder: 'INBOX',
        uids: [5],
        permanent: true,
      });

      expect(emailManager.deleteEmails).toHaveBeenCalledWith('test', [5], 'INBOX', true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('permanently_deleted');
      expect(parsed.count).toBe(1);
    });

    it('should handle errors', async () => {
      (emailManager.deleteEmails as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('IMAP error'));
      const handler = handlers.get('delete_emails')!;
      const result = await handler({ accountId: 'test', folder: 'INBOX', uids: [1] });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('IMAP error');
    });
  });

  describe('delete_emails_filtered', () => {
    beforeEach(() => {
      registerDeleteEmailsFilteredTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('delete_emails_filtered')).toBe(true);
    });

    it('should preview matching emails in dry run mode (default)', async () => {
      const handler = handlers.get('delete_emails_filtered')!;
      const result = await handler({
        accountId: 'test',
        from: 'spam@example.com',
      });

      expect(emailManager.searchEmails).toHaveBeenCalledWith('test', 'INBOX', { from: 'spam@example.com' });
      expect(emailManager.deleteEmails).not.toHaveBeenCalled();

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('dry_run');
      expect(parsed.count).toBe(3);
      expect(parsed.note).toContain('dryRun=false');
    });

    it('should actually delete when dryRun=false', async () => {
      const handler = handlers.get('delete_emails_filtered')!;
      const result = await handler({
        accountId: 'test',
        folder: 'Spam',
        from: 'spam@example.com',
        dryRun: false,
      });

      expect(emailManager.searchEmails).toHaveBeenCalledWith('test', 'Spam', { from: 'spam@example.com' });
      expect(emailManager.deleteEmails).toHaveBeenCalledWith('test', [1, 2, 3], 'Spam', false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('deleted');
      expect(parsed.count).toBe(3);
    });

    it('should support subject and before filters', async () => {
      const handler = handlers.get('delete_emails_filtered')!;
      await handler({
        accountId: 'test',
        subject: 'Newsletter',
        before: '2024-01-01',
        seen: true,
        dryRun: true,
      });

      expect(emailManager.searchEmails).toHaveBeenCalledWith('test', 'INBOX', {
        subject: 'Newsletter',
        before: new Date('2024-01-01'),
        seen: true,
      });
    });

    it('should not call deleteEmails when no matches found with dryRun=false', async () => {
      (emailManager.searchEmails as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      const handler = handlers.get('delete_emails_filtered')!;
      await handler({ accountId: 'test', from: 'nobody@example.com', dryRun: false });

      expect(emailManager.deleteEmails).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      (emailManager.searchEmails as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Search failed'));
      const handler = handlers.get('delete_emails_filtered')!;
      const result = await handler({ accountId: 'test', from: 'a@b.com' });

      expect(result.isError).toBe(true);
    });
  });

  describe('purge_old_emails', () => {
    beforeEach(() => {
      registerPurgeOldEmailsTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('purge_old_emails')).toBe(true);
    });

    it('should preview old emails in dry run mode (default)', async () => {
      const handler = handlers.get('purge_old_emails')!;
      const result = await handler({
        accountId: 'test',
        olderThanDays: 30,
      });

      expect(emailManager.searchEmails).toHaveBeenCalledWith('test', 'INBOX', {
        before: expect.any(Date),
      });
      expect(emailManager.deleteEmails).not.toHaveBeenCalled();

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('dry_run');
      expect(parsed.olderThanDays).toBe(30);
      expect(parsed.note).toContain('dryRun=false');
    });

    it('should actually purge when dryRun=false', async () => {
      const handler = handlers.get('purge_old_emails')!;
      const result = await handler({
        accountId: 'test',
        olderThanDays: 90,
        folder: 'Sent',
        dryRun: false,
      });

      expect(emailManager.searchEmails).toHaveBeenCalledWith('test', 'Sent', {
        before: expect.any(Date),
      });
      expect(emailManager.deleteEmails).toHaveBeenCalledWith('test', [1, 2, 3], 'Sent', false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('purged');
      expect(parsed.count).toBe(3);
    });

    it('should not call deleteEmails when no matches found with dryRun=false', async () => {
      (emailManager.searchEmails as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      const handler = handlers.get('purge_old_emails')!;
      await handler({ accountId: 'test', olderThanDays: 30, dryRun: false });

      expect(emailManager.deleteEmails).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      (emailManager.searchEmails as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Timeout'));
      const handler = handlers.get('purge_old_emails')!;
      const result = await handler({ accountId: 'test', olderThanDays: 30 });

      expect(result.isError).toBe(true);
    });
  });

  describe('move_emails', () => {
    beforeEach(() => {
      registerMoveEmailsTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('move_emails')).toBe(true);
    });

    it('should move emails between folders', async () => {
      const handler = handlers.get('move_emails')!;
      const result = await handler({
        accountId: 'test',
        uids: [1, 2],
        fromFolder: 'INBOX',
        toFolder: 'Archive',
      });

      expect(emailManager.moveEmails).toHaveBeenCalledWith('test', [1, 2], 'INBOX', 'Archive');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('moved');
      expect(parsed.count).toBe(2);
      expect(parsed.fromFolder).toBe('INBOX');
      expect(parsed.toFolder).toBe('Archive');
    });

    it('should handle errors', async () => {
      (emailManager.moveEmails as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Folder not found'));
      const handler = handlers.get('move_emails')!;
      const result = await handler({
        accountId: 'test',
        uids: [1],
        fromFolder: 'INBOX',
        toFolder: 'NonExistent',
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Folder not found');
    });
  });

  describe('archive_emails', () => {
    beforeEach(() => {
      registerArchiveEmailsTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('archive_emails')).toBe(true);
    });

    it('should archive emails to Archive folder for non-Gmail accounts', async () => {
      const handler = handlers.get('archive_emails')!;
      const result = await handler({
        accountId: 'test',
        uids: [1, 2, 3],
      });

      expect(emailManager.getAccountProvider).toHaveBeenCalledWith('test');
      expect(emailManager.moveEmails).toHaveBeenCalledWith('test', [1, 2, 3], 'INBOX', 'Archive');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('archived');
      expect(parsed.count).toBe(3);
      expect(parsed.archiveFolder).toBe('Archive');
    });

    it('should archive emails to [Gmail]/All Mail for Gmail accounts', async () => {
      (emailManager.getAccountProvider as ReturnType<typeof vi.fn>).mockReturnValue('gmail');

      const handler = handlers.get('archive_emails')!;
      const result = await handler({
        accountId: 'test',
        uids: [1],
        folder: 'INBOX',
      });

      expect(emailManager.moveEmails).toHaveBeenCalledWith('test', [1], 'INBOX', '[Gmail]/All Mail');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.archiveFolder).toBe('[Gmail]/All Mail');
    });

    it('should use custom source folder', async () => {
      const handler = handlers.get('archive_emails')!;
      await handler({
        accountId: 'test',
        uids: [5],
        folder: 'Work',
      });

      expect(emailManager.moveEmails).toHaveBeenCalledWith('test', [5], 'Work', 'Archive');
    });

    it('should handle errors', async () => {
      (emailManager.moveEmails as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Move failed'));
      const handler = handlers.get('archive_emails')!;
      const result = await handler({ accountId: 'test', uids: [1] });

      expect(result.isError).toBe(true);
    });
  });

  describe('mark_emails', () => {
    beforeEach(() => {
      registerMarkEmailsTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('mark_emails')).toBe(true);
    });

    it('should mark emails as read', async () => {
      const handler = handlers.get('mark_emails')!;
      const result = await handler({
        accountId: 'test',
        uids: [1, 2],
        folder: 'INBOX',
        read: true,
      });

      expect(emailManager.setFlags).toHaveBeenCalledWith(
        'test',
        [1, 2],
        'INBOX',
        { seen: true },
        'add',
      );

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('updated');
      expect(parsed.count).toBe(2);
      expect(parsed.flags).toContain('seen');
    });

    it('should mark emails as flagged', async () => {
      const handler = handlers.get('mark_emails')!;
      await handler({
        accountId: 'test',
        uids: [3],
        folder: 'INBOX',
        flagged: true,
      });

      expect(emailManager.setFlags).toHaveBeenCalledWith(
        'test',
        [3],
        'INBOX',
        { flagged: true },
        'add',
      );
    });

    it('should remove flags when action is remove', async () => {
      const handler = handlers.get('mark_emails')!;
      const result = await handler({
        accountId: 'test',
        uids: [4],
        folder: 'INBOX',
        read: false,
        action: 'remove',
      });

      expect(emailManager.setFlags).toHaveBeenCalledWith(
        'test',
        [4],
        'INBOX',
        { seen: false },
        'remove',
      );

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.action).toBe('remove');
    });

    it('should handle both read and flagged together', async () => {
      const handler = handlers.get('mark_emails')!;
      await handler({
        accountId: 'test',
        uids: [1],
        folder: 'INBOX',
        read: true,
        flagged: true,
      });

      expect(emailManager.setFlags).toHaveBeenCalledWith(
        'test',
        [1],
        'INBOX',
        { seen: true, flagged: true },
        'add',
      );
    });

    it('should handle errors', async () => {
      (emailManager.setFlags as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Flag error'));
      const handler = handlers.get('mark_emails')!;
      const result = await handler({
        accountId: 'test',
        uids: [1],
        folder: 'INBOX',
        read: true,
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('create_folder', () => {
    beforeEach(() => {
      registerCreateFolderTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('create_folder')).toBe(true);
    });

    it('should create a folder', async () => {
      const handler = handlers.get('create_folder')!;
      const result = await handler({
        accountId: 'test',
        folderName: 'Projects',
      });

      expect(emailManager.createFolder).toHaveBeenCalledWith('test', 'Projects');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('created');
      expect(parsed.folderName).toBe('Projects');
      expect(result.isError).toBeUndefined();
    });

    it('should handle errors', async () => {
      (emailManager.createFolder as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Already exists'));
      const handler = handlers.get('create_folder')!;
      const result = await handler({
        accountId: 'test',
        folderName: 'INBOX',
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Already exists');
    });
  });

  describe('delete_folder', () => {
    beforeEach(() => {
      registerDeleteFolderTool(server, emailManager as unknown as EmailManagerService);
    });

    it('should register the tool', () => {
      expect(handlers.has('delete_folder')).toBe(true);
    });

    it('should delete a folder', async () => {
      const handler = handlers.get('delete_folder')!;
      const result = await handler({
        accountId: 'test',
        folderName: 'OldFolder',
      });

      expect(emailManager.deleteFolder).toHaveBeenCalledWith('test', 'OldFolder');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('deleted');
      expect(parsed.folderName).toBe('OldFolder');
      expect(result.isError).toBeUndefined();
    });

    it('should handle errors', async () => {
      (emailManager.deleteFolder as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Cannot delete'));
      const handler = handlers.get('delete_folder')!;
      const result = await handler({
        accountId: 'test',
        folderName: 'INBOX',
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe('Cannot delete');
    });
  });
});
