import { simpleParser, type ParsedMail } from 'mailparser';
import type {
  EmailMessage,
  EmailAddress,
  EmailAttachment,
} from '../types/email.types.js';

export class EmailParserService {
  static async parseRaw(raw: Buffer | string): Promise<EmailMessage> {
    const parsed = await simpleParser(raw);

    const from = EmailParserService.parseAddress(parsed.from);
    const to = EmailParserService.parseAddress(parsed.to);
    const cc = EmailParserService.parseAddress(parsed.cc);
    const bcc = EmailParserService.parseAddress(parsed.bcc);
    const replyTo = EmailParserService.parseAddress(parsed.replyTo);
    const attachments = EmailParserService.extractAttachments(parsed);
    const snippet = EmailParserService.generateSnippet(parsed.text);

    return {
      id: parsed.messageId ?? '',
      messageId: parsed.messageId,
      folder: '',
      from,
      to,
      cc: cc.length > 0 ? cc : undefined,
      bcc: bcc.length > 0 ? bcc : undefined,
      replyTo: replyTo.length > 0 ? replyTo : undefined,
      subject: parsed.subject ?? '(no subject)',
      date: parsed.date ?? new Date(),
      text: parsed.text,
      html: parsed.html || undefined,
      attachments,
      flags: {
        seen: false,
        flagged: false,
        answered: false,
        deleted: false,
        draft: false,
      },
      snippet,
      size: typeof raw === 'string' ? Buffer.byteLength(raw) : raw.length,
    };
  }

  static parseAddress(addr: unknown): EmailAddress[] {
    if (!addr) return [];

    if (typeof addr === 'object' && addr !== null && 'value' in addr) {
      const addressObj = addr as { value: Array<{ name?: string; address?: string }> };
      return addressObj.value
        .filter((v) => v.address)
        .map((v) => ({
          name: v.name || undefined,
          address: v.address!,
        }));
    }

    if (Array.isArray(addr)) {
      return addr.flatMap((a) => EmailParserService.parseAddress(a));
    }

    return [];
  }

  static extractAttachments(parsed: ParsedMail): EmailAttachment[] {
    if (!parsed.attachments || parsed.attachments.length === 0) return [];

    return parsed.attachments.map((att) => ({
      filename: att.filename ?? 'unknown',
      contentType: att.contentType,
      size: att.size,
      contentId: att.contentId || undefined,
      content: att.content,
    }));
  }

  static generateSnippet(text: string | undefined, maxLength: number = 200): string {
    if (!text) return '';
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.substring(0, maxLength) + '...';
  }
}
