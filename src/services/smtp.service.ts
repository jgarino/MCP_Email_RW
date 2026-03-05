import { createTransport, type Transporter } from 'nodemailer';
import type { SmtpConfig } from '../config/types.js';
import type { EmailSendOptions } from '../types/email.types.js';
import { ConnectionError, ProtocolError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class SmtpService {
  private transporter: Transporter | null = null;
  private connected: boolean = false;

  constructor(
    private config: SmtpConfig,
    private auth: Record<string, unknown>,
  ) {}

  async connect(): Promise<void> {
    try {
      const transportConfig: Record<string, unknown> = {
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
      };

      if (this.auth.accessToken) {
        transportConfig.auth = {
          user: this.auth.user,
          type: 'OAuth2',
          accessToken: this.auth.accessToken,
        };
      } else {
        transportConfig.auth = {
          user: this.auth.user,
          pass: this.auth.pass,
        };
      }

      this.transporter = createTransport(transportConfig);
      await this.transporter.verify();
      this.connected = true;
      logger.info('SMTP connected', { host: this.config.host });
    } catch (error) {
      this.connected = false;
      throw new ConnectionError(`Failed to connect to SMTP server: ${(error as Error).message}`, {
        host: this.config.host,
      });
    }
  }

  async disconnect(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
      this.connected = false;
      logger.info('SMTP disconnected');
    }
  }

  async sendEmail(
    options: EmailSendOptions,
  ): Promise<{ messageId: string; accepted: string[]; rejected: string[] }> {
    if (!this.transporter || !this.connected) {
      throw new ConnectionError('Not connected to SMTP server');
    }

    try {
      const mailOptions: Record<string, unknown> = {
        from: options.from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
      };

      if (options.cc) {
        mailOptions.cc = Array.isArray(options.cc) ? options.cc.join(', ') : options.cc;
      }
      if (options.bcc) {
        mailOptions.bcc = Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc;
      }
      if (options.text) mailOptions.text = options.text;
      if (options.html) mailOptions.html = options.html;
      if (options.replyTo) mailOptions.replyTo = options.replyTo;
      if (options.inReplyTo) mailOptions.inReplyTo = options.inReplyTo;
      if (options.references) mailOptions.references = options.references;
      if (options.attachments) {
        mailOptions.attachments = options.attachments.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
          cid: att.contentId,
        }));
      }

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent', { messageId: result.messageId });

      return {
        messageId: result.messageId,
        accepted: Array.isArray(result.accepted)
          ? result.accepted.map(String)
          : [],
        rejected: Array.isArray(result.rejected)
          ? result.rejected.map(String)
          : [],
      };
    } catch (error) {
      throw new ProtocolError(`Failed to send email: ${(error as Error).message}`);
    }
  }
}
