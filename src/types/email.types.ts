export interface EmailAddress {
  name?: string;
  address: string;
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  contentId?: string;
  content?: Buffer;
}

export interface EmailMessage {
  id: string;
  uid?: number;
  messageId?: string;
  folder: string;
  from: EmailAddress[];
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress[];
  subject: string;
  date: Date;
  text?: string;
  html?: string;
  attachments: EmailAttachment[];
  flags: EmailFlags;
  headers?: Record<string, string>;
  size?: number;
  snippet?: string;
}

export interface EmailFlags {
  seen: boolean;
  flagged: boolean;
  answered: boolean;
  deleted: boolean;
  draft: boolean;
}

export interface EmailFolder {
  name: string;
  path: string;
  delimiter: string;
  specialUse?: string;
  flags: string[];
  exists?: number;
  unseen?: number;
  recent?: number;
  children?: EmailFolder[];
}

export interface EmailFilter {
  from?: string;
  to?: string;
  subject?: string;
  body?: string;
  since?: Date;
  before?: Date;
  seen?: boolean;
  flagged?: boolean;
  hasAttachment?: boolean;
  folder?: string;
}

export interface EmailListOptions {
  folder?: string;
  limit?: number;
  offset?: number;
  filter?: EmailFilter;
  sort?: 'date' | 'from' | 'subject' | 'size';
  sortOrder?: 'asc' | 'desc';
}

export interface EmailSendOptions {
  from?: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string;
  attachments?: EmailAttachment[];
}

export interface FolderStatus {
  messages: number;
  unseen: number;
  recent: number;
  uidNext?: number;
  uidValidity?: number;
}

export interface StorageQuota {
  usage: number;
  limit: number;
  usagePercentage: number;
}
