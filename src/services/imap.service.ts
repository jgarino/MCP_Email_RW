import { ImapFlow } from 'imapflow';
import type { ImapConfig } from '../config/types.js';
import type {
  EmailMessage,
  EmailFolder,
  EmailFilter,
  EmailListOptions,
  EmailFlags,
  FolderStatus,
  StorageQuota,
  EmailAddress,
} from '../types/email.types.js';
import { EmailParserService } from './email-parser.service.js';
import { ConnectionError, ProtocolError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class ImapService {
  private client: ImapFlow;
  private connected: boolean = false;

  constructor(
    config: ImapConfig,
    auth: Record<string, unknown>,
    private email: string,
  ) {
    this.client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: auth as { user: string; pass?: string; accessToken?: string },
      logger: false,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.connected = true;
      logger.info('IMAP connected', { host: this.email });
    } catch (error) {
      this.connected = false;
      throw new ConnectionError(`Failed to connect to IMAP server: ${(error as Error).message}`, {
        email: this.email,
      });
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.connected) {
        await this.client.logout();
        this.connected = false;
        logger.info('IMAP disconnected', { email: this.email });
      }
    } catch (error) {
      logger.warn('Error during IMAP disconnect', { error: (error as Error).message });
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async listFolders(): Promise<EmailFolder[]> {
    this.ensureConnected();
    try {
      const mailboxes = await this.client.list();
      return mailboxes.map((mb) => this.mapMailboxToFolder(mb));
    } catch (error) {
      throw new ProtocolError(`Failed to list folders: ${(error as Error).message}`);
    }
  }

  async selectFolder(folder: string): Promise<FolderStatus> {
    this.ensureConnected();
    const lock = await this.client.getMailboxLock(folder);
    try {
      const mailbox = this.client.mailbox;
      return {
        messages: mailbox?.exists ?? 0,
        unseen: (mailbox as Record<string, unknown>)?.unseen as number ?? 0,
        recent: 0,
        uidNext: mailbox?.uidNext as number | undefined,
        uidValidity: (mailbox as Record<string, unknown>)?.uidValidity as number | undefined,
      };
    } finally {
      lock.release();
    }
  }

  async listMessages(options: EmailListOptions): Promise<EmailMessage[]> {
    this.ensureConnected();
    const folder = options.folder ?? 'INBOX';
    const lock = await this.client.getMailboxLock(folder);
    try {
      const messages: EmailMessage[] = [];
      const limit = options.limit ?? 50;
      const offset = options.offset ?? 0;

      let range = '1:*';
      if (options.filter) {
        const uids = await this.buildAndSearch(options.filter);
        if (uids.length === 0) return [];
        const sliced = uids.slice(offset, offset + limit);
        if (sliced.length === 0) return [];
        range = sliced.join(',');
      }

      let count = 0;
      let skipped = 0;

      for await (const msg of this.client.fetch(
        options.filter ? range : '1:*',
        {
          envelope: true,
          source: true,
          uid: true,
          flags: true,
          bodyStructure: true,
        },
        { uid: !!options.filter },
      )) {
        if (!options.filter) {
          if (skipped < offset) {
            skipped++;
            continue;
          }
          if (count >= limit) break;
        }

        const emailMsg = await this.mapFetchToEmail(msg, folder);
        messages.push(emailMsg);
        count++;

        if (!options.filter && count >= limit) break;
      }

      return messages;
    } catch (error) {
      throw new ProtocolError(`Failed to list messages: ${(error as Error).message}`, {
        folder,
      });
    } finally {
      lock.release();
    }
  }

  async getMessage(folder: string, uid: number): Promise<EmailMessage> {
    this.ensureConnected();
    const lock = await this.client.getMailboxLock(folder);
    try {
      let result: EmailMessage | null = null;

      for await (const msg of this.client.fetch(
        String(uid),
        {
          envelope: true,
          source: true,
          uid: true,
          flags: true,
          bodyStructure: true,
        },
        { uid: true },
      )) {
        result = await this.mapFetchToEmail(msg, folder);
        break;
      }

      if (!result) {
        throw new ProtocolError(`Message with UID ${uid} not found`, { folder, uid });
      }

      return result;
    } catch (error) {
      if (error instanceof ProtocolError) throw error;
      throw new ProtocolError(`Failed to get message: ${(error as Error).message}`, {
        folder,
        uid,
      });
    } finally {
      lock.release();
    }
  }

  async searchMessages(folder: string, filter: EmailFilter): Promise<number[]> {
    this.ensureConnected();
    const lock = await this.client.getMailboxLock(folder);
    try {
      const criteria = this.buildSearchCriteria(filter);
      const results = await this.client.search(criteria, { uid: true });
      return results as number[];
    } catch (error) {
      throw new ProtocolError(`Failed to search messages: ${(error as Error).message}`, {
        folder,
      });
    } finally {
      lock.release();
    }
  }

  async moveMessages(uids: number[], fromFolder: string, toFolder: string): Promise<void> {
    this.ensureConnected();
    const lock = await this.client.getMailboxLock(fromFolder);
    try {
      await this.client.messageMove(uids.join(','), toFolder, { uid: true });
      logger.info('Messages moved', { count: uids.length, from: fromFolder, to: toFolder });
    } catch (error) {
      throw new ProtocolError(`Failed to move messages: ${(error as Error).message}`, {
        fromFolder,
        toFolder,
      });
    } finally {
      lock.release();
    }
  }

  async deleteMessages(uids: number[], folder: string, permanent: boolean = false): Promise<void> {
    this.ensureConnected();
    const lock = await this.client.getMailboxLock(folder);
    try {
      if (permanent) {
        await this.client.messageDelete(uids.join(','), { uid: true });
      } else {
        await this.client.messageFlagsAdd(uids.join(','), ['\\Deleted'], { uid: true });
      }
      logger.info('Messages deleted', { count: uids.length, folder, permanent });
    } catch (error) {
      throw new ProtocolError(`Failed to delete messages: ${(error as Error).message}`, {
        folder,
      });
    } finally {
      lock.release();
    }
  }

  async setFlags(
    uids: number[],
    folder: string,
    flags: Partial<EmailFlags>,
    action: 'add' | 'remove' | 'set',
  ): Promise<void> {
    this.ensureConnected();
    const lock = await this.client.getMailboxLock(folder);
    try {
      const imapFlags = this.mapEmailFlagsToImap(flags);
      if (imapFlags.length === 0) return;

      const range = uids.join(',');
      switch (action) {
        case 'add':
          await this.client.messageFlagsAdd(range, imapFlags, { uid: true });
          break;
        case 'remove':
          await this.client.messageFlagsRemove(range, imapFlags, { uid: true });
          break;
        case 'set':
          await this.client.messageFlagsSet(range, imapFlags, { uid: true });
          break;
      }
      logger.debug('Flags updated', { uids, folder, flags, action });
    } catch (error) {
      throw new ProtocolError(`Failed to set flags: ${(error as Error).message}`, { folder });
    } finally {
      lock.release();
    }
  }

  async appendMessage(folder: string, raw: string | Buffer, flags?: string[]): Promise<void> {
    this.ensureConnected();
    try {
      await this.client.append(folder, raw, flags ?? []);
      logger.info('Message appended', { folder });
    } catch (error) {
      throw new ProtocolError(`Failed to append message: ${(error as Error).message}`, { folder });
    }
  }

  async createFolder(folderName: string): Promise<void> {
    this.ensureConnected();
    try {
      await this.client.mailboxCreate(folderName);
      logger.info('Folder created', { folderName });
    } catch (error) {
      throw new ProtocolError(`Failed to create folder: ${(error as Error).message}`, {
        folderName,
      });
    }
  }

  async deleteFolder(folderName: string): Promise<void> {
    this.ensureConnected();
    try {
      await this.client.mailboxDelete(folderName);
      logger.info('Folder deleted', { folderName });
    } catch (error) {
      throw new ProtocolError(`Failed to delete folder: ${(error as Error).message}`, {
        folderName,
      });
    }
  }

  async getQuota(): Promise<StorageQuota | null> {
    this.ensureConnected();
    try {
      const quota = await this.client.getQuota();
      if (!quota?.storage) return null;
      const usage = quota.storage.usage ?? 0;
      const limit = quota.storage.limit ?? 0;
      return {
        usage,
        limit,
        usagePercentage: limit > 0 ? Math.round((usage / limit) * 100) : 0,
      };
    } catch {
      return null;
    }
  }

  async getStatus(folder: string): Promise<FolderStatus> {
    this.ensureConnected();
    try {
      const status = await this.client.status(folder, {
        messages: true,
        unseen: true,
        recent: true,
        uidNext: true,
        uidValidity: true,
      });
      return {
        messages: status.messages ?? 0,
        unseen: status.unseen ?? 0,
        recent: status.recent ?? 0,
        uidNext: status.uidNext,
        uidValidity: status.uidValidity,
      };
    } catch (error) {
      throw new ProtocolError(`Failed to get folder status: ${(error as Error).message}`, {
        folder,
      });
    }
  }

  private ensureConnected(): void {
    if (!this.connected) {
      throw new ConnectionError('Not connected to IMAP server');
    }
  }

  private mapMailboxToFolder(mb: Record<string, unknown>): EmailFolder {
    return {
      name: mb.name as string ?? '',
      path: mb.path as string ?? '',
      delimiter: mb.delimiter as string ?? '/',
      specialUse: mb.specialUse as string | undefined,
      flags: Array.isArray(mb.flags) ? mb.flags.map(String) : [],
    };
  }

  private async mapFetchToEmail(
    msg: Record<string, unknown>,
    folder: string,
  ): Promise<EmailMessage> {
    const envelope = msg.envelope as Record<string, unknown> | undefined;
    const source = msg.source as Buffer | undefined;

    if (source) {
      try {
        const parsed = await EmailParserService.parseRaw(source);
        parsed.folder = folder;
        parsed.uid = msg.uid as number;
        parsed.flags = this.mapImapFlagsToEmail(msg.flags as Set<string> | undefined);
        return parsed;
      } catch {
        // Fall through to envelope-based parsing
      }
    }

    return {
      id: String(msg.uid ?? msg.seq ?? ''),
      uid: msg.uid as number,
      messageId: envelope?.messageId as string | undefined,
      folder,
      from: this.mapEnvelopeAddresses(envelope?.from),
      to: this.mapEnvelopeAddresses(envelope?.to),
      cc: this.mapEnvelopeAddresses(envelope?.cc),
      bcc: this.mapEnvelopeAddresses(envelope?.bcc),
      subject: (envelope?.subject as string) ?? '(no subject)',
      date: envelope?.date ? new Date(envelope.date as string) : new Date(),
      attachments: [],
      flags: this.mapImapFlagsToEmail(msg.flags as Set<string> | undefined),
    };
  }

  private mapEnvelopeAddresses(addrs: unknown): EmailAddress[] {
    if (!Array.isArray(addrs)) return [];
    return addrs.map((a: Record<string, unknown>) => ({
      name: a.name as string | undefined,
      address: a.address as string ?? '',
    }));
  }

  private mapImapFlagsToEmail(flags: Set<string> | undefined): EmailFlags {
    const flagSet = flags ?? new Set<string>();
    return {
      seen: flagSet.has('\\Seen'),
      flagged: flagSet.has('\\Flagged'),
      answered: flagSet.has('\\Answered'),
      deleted: flagSet.has('\\Deleted'),
      draft: flagSet.has('\\Draft'),
    };
  }

  private mapEmailFlagsToImap(flags: Partial<EmailFlags>): string[] {
    const result: string[] = [];
    if (flags.seen !== undefined) result.push('\\Seen');
    if (flags.flagged !== undefined) result.push('\\Flagged');
    if (flags.answered !== undefined) result.push('\\Answered');
    if (flags.deleted !== undefined) result.push('\\Deleted');
    if (flags.draft !== undefined) result.push('\\Draft');
    return result;
  }

  private buildSearchCriteria(filter: EmailFilter): Record<string, unknown> {
    const criteria: Record<string, unknown> = {};
    if (filter.from) criteria.from = filter.from;
    if (filter.to) criteria.to = filter.to;
    if (filter.subject) criteria.subject = filter.subject;
    if (filter.body) criteria.body = filter.body;
    if (filter.since) criteria.since = filter.since;
    if (filter.before) criteria.before = filter.before;
    if (filter.seen !== undefined) criteria.seen = filter.seen;
    if (filter.flagged !== undefined) criteria.flagged = filter.flagged;
    return criteria;
  }

  private async buildAndSearch(filter: EmailFilter): Promise<number[]> {
    const criteria = this.buildSearchCriteria(filter);
    return (await this.client.search(criteria, { uid: true })) as number[];
  }
}
