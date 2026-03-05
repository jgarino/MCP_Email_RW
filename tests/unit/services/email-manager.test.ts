import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailManagerService } from '../../../src/services/email-manager.service.js';
import type { ConfigManager } from '../../../src/config/config-manager.js';
import type { AuthManager } from '../../../src/auth/auth-manager.js';

const mockImapService = {
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  isConnected: vi.fn().mockReturnValue(true),
  listFolders: vi.fn().mockResolvedValue([
    { name: 'INBOX', path: 'INBOX', delimiter: '/', flags: [] },
  ]),
  listMessages: vi.fn().mockResolvedValue([]),
  getMessage: vi.fn().mockResolvedValue({
    id: '1',
    uid: 1,
    folder: 'INBOX',
    from: [{ address: 'sender@example.com' }],
    to: [{ address: 'recipient@example.com' }],
    subject: 'Test',
    date: new Date(),
    attachments: [],
    flags: { seen: false, flagged: false, answered: false, deleted: false, draft: false },
  }),
  searchMessages: vi.fn().mockResolvedValue([1, 2, 3]),
  moveMessages: vi.fn(),
  deleteMessages: vi.fn(),
  setFlags: vi.fn(),
  createFolder: vi.fn(),
  deleteFolder: vi.fn(),
  getQuota: vi.fn().mockResolvedValue({ usage: 100, limit: 1000, usagePercentage: 10 }),
  getStatus: vi.fn().mockResolvedValue({ messages: 10, unseen: 2, recent: 0 }),
};

const mockSmtpService = {
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  sendEmail: vi.fn().mockResolvedValue({
    messageId: '<msg-1@example.com>',
    accepted: ['recipient@example.com'],
    rejected: [],
  }),
};

vi.mock('../../../src/services/imap.service.js', () => {
  return {
    ImapService: class {
      connect = mockImapService.connect;
      disconnect = mockImapService.disconnect;
      isConnected = mockImapService.isConnected;
      listFolders = mockImapService.listFolders;
      listMessages = mockImapService.listMessages;
      getMessage = mockImapService.getMessage;
      searchMessages = mockImapService.searchMessages;
      moveMessages = mockImapService.moveMessages;
      deleteMessages = mockImapService.deleteMessages;
      setFlags = mockImapService.setFlags;
      createFolder = mockImapService.createFolder;
      deleteFolder = mockImapService.deleteFolder;
      getQuota = mockImapService.getQuota;
      getStatus = mockImapService.getStatus;
    },
  };
});

vi.mock('../../../src/services/smtp.service.js', () => {
  return {
    SmtpService: class {
      connect = mockSmtpService.connect;
      disconnect = mockSmtpService.disconnect;
      sendEmail = mockSmtpService.sendEmail;
    },
  };
});

const TEST_ACCOUNT = {
  id: 'test-account',
  name: 'Test',
  email: 'test@example.com',
  enabled: true,
  provider: 'custom' as const,
  auth: { method: 'password' as const, credentials: { username: 'test', passwordRef: 'pass' } },
  imap: { host: 'imap.example.com', port: 993, secure: true },
  smtp: { host: 'smtp.example.com', port: 587, secure: false },
};

function createMockConfigManager(): ConfigManager {
  return {
    getAccount: vi.fn().mockReturnValue(TEST_ACCOUNT),
    getAccounts: vi.fn().mockReturnValue([TEST_ACCOUNT]),
    getConfig: vi.fn(),
    load: vi.fn(),
    save: vi.fn(),
  } as unknown as ConfigManager;
}

function createMockAuthManager(): AuthManager {
  return {
    getImapAuth: vi.fn().mockResolvedValue({ user: 'test@example.com', pass: 'password' }),
    getSmtpAuth: vi.fn().mockResolvedValue({ user: 'test@example.com', pass: 'password' }),
    authenticate: vi.fn(),
  } as unknown as AuthManager;
}

describe('EmailManagerService', () => {
  let manager: EmailManagerService;
  let configManager: ConfigManager;
  let authManager: AuthManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockImapService.isConnected.mockReturnValue(true);
    configManager = createMockConfigManager();
    authManager = createMockAuthManager();
    manager = new EmailManagerService(configManager, authManager);
  });

  describe('getImapService', () => {
    it('should create and cache IMAP service', async () => {
      const service = await manager.getImapService('test-account');
      expect(service).toBeDefined();
      expect(authManager.getImapAuth).toHaveBeenCalledWith('test-account');

      // Second call should return cached service
      await manager.getImapService('test-account');
      expect(authManager.getImapAuth).toHaveBeenCalledTimes(1);
    });

    it('should throw when account not found', async () => {
      (configManager.getAccount as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
      await expect(manager.getImapService('nonexistent')).rejects.toThrow('not found');
    });

    it('should throw when no IMAP config', async () => {
      (configManager.getAccount as ReturnType<typeof vi.fn>).mockReturnValue({
        ...TEST_ACCOUNT,
        imap: undefined,
      });
      await expect(manager.getImapService('test-account')).rejects.toThrow('no IMAP');
    });
  });

  describe('getSmtpService', () => {
    it('should create and cache SMTP service', async () => {
      const service = await manager.getSmtpService('test-account');
      expect(service).toBeDefined();
      expect(authManager.getSmtpAuth).toHaveBeenCalledWith('test-account');

      // Second call should return cached service
      await manager.getSmtpService('test-account');
      expect(authManager.getSmtpAuth).toHaveBeenCalledTimes(1);
    });

    it('should throw when no SMTP config', async () => {
      (configManager.getAccount as ReturnType<typeof vi.fn>).mockReturnValue({
        ...TEST_ACCOUNT,
        smtp: undefined,
      });
      await expect(manager.getSmtpService('test-account')).rejects.toThrow('no SMTP');
    });
  });

  describe('email operations', () => {
    it('should list folders', async () => {
      const folders = await manager.listFolders('test-account');
      expect(folders).toHaveLength(1);
      expect(folders[0].name).toBe('INBOX');
    });

    it('should list emails', async () => {
      const emails = await manager.listEmails('test-account', { folder: 'INBOX', limit: 10 });
      expect(mockImapService.listMessages).toHaveBeenCalled();
      expect(Array.isArray(emails)).toBe(true);
    });

    it('should read a single email', async () => {
      const email = await manager.readEmail('test-account', 'INBOX', 1);
      expect(email.uid).toBe(1);
      expect(mockImapService.getMessage).toHaveBeenCalledWith('INBOX', 1);
    });

    it('should search emails', async () => {
      const uids = await manager.searchEmails('test-account', 'INBOX', { from: 'sender@example.com' });
      expect(uids).toEqual([1, 2, 3]);
    });

    it('should send email', async () => {
      const result = await manager.sendEmail('test-account', {
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Hello',
      });
      expect(result.messageId).toBe('<msg-1@example.com>');
    });

    it('should move emails', async () => {
      await manager.moveEmails('test-account', [1, 2], 'INBOX', 'Archive');
      expect(mockImapService.moveMessages).toHaveBeenCalledWith([1, 2], 'INBOX', 'Archive');
    });

    it('should delete emails', async () => {
      await manager.deleteEmails('test-account', [1], 'INBOX', true);
      expect(mockImapService.deleteMessages).toHaveBeenCalledWith([1], 'INBOX', true);
    });

    it('should set flags', async () => {
      await manager.setFlags('test-account', [1], 'INBOX', { seen: true }, 'add');
      expect(mockImapService.setFlags).toHaveBeenCalledWith([1], 'INBOX', { seen: true }, 'add');
    });

    it('should create folder', async () => {
      await manager.createFolder('test-account', 'NewFolder');
      expect(mockImapService.createFolder).toHaveBeenCalledWith('NewFolder');
    });

    it('should delete folder', async () => {
      await manager.deleteFolder('test-account', 'OldFolder');
      expect(mockImapService.deleteFolder).toHaveBeenCalledWith('OldFolder');
    });

    it('should get quota', async () => {
      const quota = await manager.getQuota('test-account');
      expect(quota?.usagePercentage).toBe(10);
    });

    it('should get folder status', async () => {
      const status = await manager.getFolderStatus('test-account', 'INBOX');
      expect(status.messages).toBe(10);
    });
  });

  describe('disconnect', () => {
    it('should disconnect all services', async () => {
      await manager.getImapService('test-account');
      await manager.getSmtpService('test-account');
      await manager.disconnectAll();
      expect(mockImapService.disconnect).toHaveBeenCalled();
      expect(mockSmtpService.disconnect).toHaveBeenCalled();
    });

    it('should disconnect a single account', async () => {
      await manager.getImapService('test-account');
      await manager.getSmtpService('test-account');
      await manager.disconnectAccount('test-account');
      expect(mockImapService.disconnect).toHaveBeenCalled();
      expect(mockSmtpService.disconnect).toHaveBeenCalled();
    });
  });
});
