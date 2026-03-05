import { describe, it, expect } from 'vitest';
import { EmailParserService } from '../../../src/services/email-parser.service.js';

const RAW_EMAIL_SIMPLE = [
  'From: sender@example.com',
  'To: recipient@example.com',
  'Subject: Test Email',
  'Date: Mon, 01 Jan 2024 12:00:00 +0000',
  'Message-ID: <test-123@example.com>',
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset="utf-8"',
  '',
  'Hello, this is a test email body.',
].join('\r\n');

const RAW_EMAIL_HTML = [
  'From: "John Doe" <john@example.com>',
  'To: "Jane Smith" <jane@example.com>',
  'Cc: "Bob" <bob@example.com>',
  'Subject: HTML Email',
  'Date: Tue, 02 Jan 2024 15:30:00 +0000',
  'Message-ID: <html-456@example.com>',
  'MIME-Version: 1.0',
  'Content-Type: multipart/alternative; boundary="boundary123"',
  '',
  '--boundary123',
  'Content-Type: text/plain; charset="utf-8"',
  '',
  'Plain text version',
  '--boundary123',
  'Content-Type: text/html; charset="utf-8"',
  '',
  '<p>HTML version</p>',
  '--boundary123--',
].join('\r\n');

const RAW_EMAIL_NO_SUBJECT = [
  'From: sender@example.com',
  'To: recipient@example.com',
  'Date: Wed, 03 Jan 2024 10:00:00 +0000',
  'Message-ID: <nosub-789@example.com>',
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset="utf-8"',
  '',
  'Email without subject.',
].join('\r\n');

describe('EmailParserService', () => {
  describe('parseRaw', () => {
    it('should parse a simple plain text email', async () => {
      const msg = await EmailParserService.parseRaw(RAW_EMAIL_SIMPLE);

      expect(msg.subject).toBe('Test Email');
      expect(msg.messageId).toBe('<test-123@example.com>');
      expect(msg.from).toHaveLength(1);
      expect(msg.from[0].address).toBe('sender@example.com');
      expect(msg.to).toHaveLength(1);
      expect(msg.to[0].address).toBe('recipient@example.com');
      expect(msg.text).toContain('Hello, this is a test email body.');
      expect(msg.attachments).toHaveLength(0);
      expect(msg.flags.seen).toBe(false);
      expect(msg.folder).toBe('');
    });

    it('should parse an HTML email with cc', async () => {
      const msg = await EmailParserService.parseRaw(RAW_EMAIL_HTML);

      expect(msg.subject).toBe('HTML Email');
      expect(msg.from[0].name).toBe('John Doe');
      expect(msg.from[0].address).toBe('john@example.com');
      expect(msg.to[0].name).toBe('Jane Smith');
      expect(msg.cc).toBeDefined();
      expect(msg.cc!).toHaveLength(1);
      expect(msg.cc![0].address).toBe('bob@example.com');
      expect(msg.html).toContain('<p>HTML version</p>');
      expect(msg.text).toContain('Plain text version');
    });

    it('should handle email without subject', async () => {
      const msg = await EmailParserService.parseRaw(RAW_EMAIL_NO_SUBJECT);
      expect(msg.subject).toBe('(no subject)');
    });

    it('should parse raw email from Buffer', async () => {
      const buffer = Buffer.from(RAW_EMAIL_SIMPLE);
      const msg = await EmailParserService.parseRaw(buffer);

      expect(msg.subject).toBe('Test Email');
      expect(msg.size).toBe(buffer.length);
    });
  });

  describe('parseAddress', () => {
    it('should return empty array for null/undefined', () => {
      expect(EmailParserService.parseAddress(null)).toEqual([]);
      expect(EmailParserService.parseAddress(undefined)).toEqual([]);
    });

    it('should parse address object with value array', () => {
      const addr = {
        value: [
          { name: 'John', address: 'john@example.com' },
          { name: '', address: 'jane@example.com' },
        ],
      };
      const result = EmailParserService.parseAddress(addr);
      expect(result).toHaveLength(2);
      expect(result[0].address).toBe('john@example.com');
      expect(result[1].address).toBe('jane@example.com');
    });

    it('should filter out entries without address', () => {
      const addr = {
        value: [
          { name: 'John', address: 'john@example.com' },
          { name: 'NoAddr' },
        ],
      };
      const result = EmailParserService.parseAddress(addr);
      expect(result).toHaveLength(1);
    });
  });

  describe('extractAttachments', () => {
    it('should return empty array when no attachments', () => {
      const parsed = { attachments: [] } as any;
      expect(EmailParserService.extractAttachments(parsed)).toEqual([]);
    });

    it('should extract attachment details', () => {
      const parsed = {
        attachments: [
          {
            filename: 'test.pdf',
            contentType: 'application/pdf',
            size: 1024,
            contentId: 'cid-1',
            content: Buffer.from('pdf-data'),
          },
        ],
      } as any;
      const result = EmailParserService.extractAttachments(parsed);
      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('test.pdf');
      expect(result[0].contentType).toBe('application/pdf');
      expect(result[0].size).toBe(1024);
      expect(result[0].contentId).toBe('cid-1');
    });
  });

  describe('generateSnippet', () => {
    it('should return empty string for undefined text', () => {
      expect(EmailParserService.generateSnippet(undefined)).toBe('');
    });

    it('should collapse whitespace', () => {
      const text = 'Hello  \n  world\t\tthere';
      const snippet = EmailParserService.generateSnippet(text);
      expect(snippet).toBe('Hello world there');
    });

    it('should truncate long text', () => {
      const text = 'A'.repeat(300);
      const snippet = EmailParserService.generateSnippet(text, 100);
      expect(snippet.length).toBe(103); // 100 + '...'
      expect(snippet.endsWith('...')).toBe(true);
    });

    it('should not truncate short text', () => {
      const text = 'Short text';
      const snippet = EmailParserService.generateSnippet(text);
      expect(snippet).toBe('Short text');
    });
  });
});
