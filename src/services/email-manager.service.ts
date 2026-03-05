import type { ConfigManager } from '../config/config-manager.js';
import type { AuthManager } from '../auth/auth-manager.js';
import { ImapService } from './imap.service.js';
import { SmtpService } from './smtp.service.js';
import type {
  EmailFolder,
  EmailMessage,
  EmailFilter,
  EmailListOptions,
  EmailSendOptions,
  EmailFlags,
  FolderStatus,
  StorageQuota,
} from '../types/email.types.js';
import type { Provider } from '../config/types.js';
import { ConfigError, ConnectionError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class EmailManagerService {
  private imapServices: Map<string, ImapService> = new Map();
  private smtpServices: Map<string, SmtpService> = new Map();

  constructor(
    private configManager: ConfigManager,
    private authManager: AuthManager,
  ) {}

  async getImapService(accountId: string): Promise<ImapService> {
    const existing = this.imapServices.get(accountId);
    if (existing?.isConnected()) {
      return existing;
    }

    const account = this.configManager.getAccount(accountId);
    if (!account) {
      throw new ConfigError(`Account "${accountId}" not found`);
    }
    if (!account.imap) {
      throw new ConfigError(`Account "${accountId}" has no IMAP configuration`);
    }

    const auth = await this.authManager.getImapAuth(accountId);
    const service = new ImapService(account.imap, auth, account.email);
    await service.connect();

    this.imapServices.set(accountId, service);
    return service;
  }

  async getSmtpService(accountId: string): Promise<SmtpService> {
    const existing = this.smtpServices.get(accountId);
    if (existing) {
      return existing;
    }

    const account = this.configManager.getAccount(accountId);
    if (!account) {
      throw new ConfigError(`Account "${accountId}" not found`);
    }
    if (!account.smtp) {
      throw new ConfigError(`Account "${accountId}" has no SMTP configuration`);
    }

    const auth = await this.authManager.getSmtpAuth(accountId);
    const service = new SmtpService(account.smtp, auth);
    await service.connect();

    this.smtpServices.set(accountId, service);
    return service;
  }

  async disconnectAll(): Promise<void> {
    const disconnectPromises: Promise<void>[] = [];

    for (const [id, service] of this.imapServices) {
      disconnectPromises.push(
        service.disconnect().catch((err) => {
          logger.warn('Error disconnecting IMAP', { accountId: id, error: (err as Error).message });
        }),
      );
    }

    for (const [id, service] of this.smtpServices) {
      disconnectPromises.push(
        service.disconnect().catch((err) => {
          logger.warn('Error disconnecting SMTP', { accountId: id, error: (err as Error).message });
        }),
      );
    }

    await Promise.all(disconnectPromises);
    this.imapServices.clear();
    this.smtpServices.clear();
    logger.info('All connections disconnected');
  }

  async disconnectAccount(accountId: string): Promise<void> {
    const imap = this.imapServices.get(accountId);
    if (imap) {
      await imap.disconnect();
      this.imapServices.delete(accountId);
    }

    const smtp = this.smtpServices.get(accountId);
    if (smtp) {
      await smtp.disconnect();
      this.smtpServices.delete(accountId);
    }

    logger.info('Account disconnected', { accountId });
  }

  async listFolders(accountId: string): Promise<EmailFolder[]> {
    const imap = await this.getImapService(accountId);
    return imap.listFolders();
  }

  async listEmails(accountId: string, options?: EmailListOptions): Promise<EmailMessage[]> {
    const imap = await this.getImapService(accountId);
    return imap.listMessages(options ?? {});
  }

  async readEmail(accountId: string, folder: string, uid: number): Promise<EmailMessage> {
    const imap = await this.getImapService(accountId);
    return imap.getMessage(folder, uid);
  }

  async searchEmails(
    accountId: string,
    folder: string,
    filter: EmailFilter,
  ): Promise<number[]> {
    const imap = await this.getImapService(accountId);
    return imap.searchMessages(folder, filter);
  }

  async sendEmail(
    accountId: string,
    options: EmailSendOptions,
  ): Promise<{ messageId: string }> {
    const smtp = await this.getSmtpService(accountId);
    const result = await smtp.sendEmail(options);
    return { messageId: result.messageId };
  }

  async moveEmails(
    accountId: string,
    uids: number[],
    fromFolder: string,
    toFolder: string,
  ): Promise<void> {
    const imap = await this.getImapService(accountId);
    await imap.moveMessages(uids, fromFolder, toFolder);
  }

  async deleteEmails(
    accountId: string,
    uids: number[],
    folder: string,
    permanent?: boolean,
  ): Promise<void> {
    const imap = await this.getImapService(accountId);
    await imap.deleteMessages(uids, folder, permanent);
  }

  async setFlags(
    accountId: string,
    uids: number[],
    folder: string,
    flags: Partial<EmailFlags>,
    action: 'add' | 'remove' | 'set',
  ): Promise<void> {
    const imap = await this.getImapService(accountId);
    await imap.setFlags(uids, folder, flags, action);
  }

  async createFolder(accountId: string, name: string): Promise<void> {
    const imap = await this.getImapService(accountId);
    await imap.createFolder(name);
  }

  async deleteFolder(accountId: string, name: string): Promise<void> {
    const imap = await this.getImapService(accountId);
    await imap.deleteFolder(name);
  }

  async getQuota(accountId: string): Promise<StorageQuota | null> {
    const imap = await this.getImapService(accountId);
    return imap.getQuota();
  }

  async getFolderStatus(accountId: string, folder: string): Promise<FolderStatus> {
    const imap = await this.getImapService(accountId);
    return imap.getStatus(folder);
  }

  async appendMessage(
    accountId: string,
    folder: string,
    raw: string | Buffer,
    flags?: string[],
  ): Promise<void> {
    const imap = await this.getImapService(accountId);
    await imap.appendMessage(folder, raw, flags);
  }

  getAccountEmail(accountId: string): string {
    const account = this.configManager.getAccount(accountId);
    if (!account) {
      throw new ConfigError(`Account "${accountId}" not found`);
    }
    return account.email;
  }

  getAccountProvider(accountId: string): Provider {
    const account = this.configManager.getAccount(accountId);
    if (!account) {
      throw new ConfigError(`Account "${accountId}" not found`);
    }
    return account.provider;
  }
}
