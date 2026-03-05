/**
 * Core email types used throughout the application.
 */

export interface EmailAddress {
  name?: string;
  address: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  content?: Buffer;
  contentId?: string;
}

export interface EmailHeaders {
  from?: EmailAddress;
  to?: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress[];
  subject?: string;
  date?: Date;
  messageId?: string;
  inReplyTo?: string;
  references?: string[];
}

export interface Email {
  id: string;
  uid?: number;
  folder: string;
  headers: EmailHeaders;
  text?: string;
  html?: string;
  attachments: EmailAttachment[];
  flags: EmailFlag[];
  size?: number;
  internalDate?: Date;
}

export type EmailFlag = '\\Seen' | '\\Answered' | '\\Flagged' | '\\Deleted' | '\\Draft' | string;

export interface EmailFilter {
  read?: boolean;
  flagged?: boolean;
  hasAttachment?: boolean;
  from?: string;
  to?: string;
  subject?: string;
  dateFrom?: Date;
  dateTo?: Date;
  folder?: string;
}

export interface EmailSearchQuery {
  query?: string;
  from?: string;
  to?: string;
  subject?: string;
  body?: string;
  dateRange?: { from?: Date; to?: Date };
  hasAttachment?: boolean;
  flags?: Partial<Record<EmailFlag, boolean>>;
}

export interface EmailSummary {
  id: string;
  uid?: number;
  folder: string;
  from?: EmailAddress;
  to?: EmailAddress[];
  subject?: string;
  date?: Date;
  flags: EmailFlag[];
  hasAttachment: boolean;
  size?: number;
  snippet?: string;
}

export interface FolderInfo {
  name: string;
  path: string;
  delimiter: string;
  flags: string[];
  specialUse?: string;
  exists?: number;
  unseen?: number;
  recent?: number;
}

export interface MailboxStats {
  total: number;
  unseen: number;
  recent: number;
  flagged?: number;
  drafts?: number;
}
