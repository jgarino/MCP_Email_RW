import { describe, it, expect } from 'vitest';
import { AuthDetector } from '../../../src/auth/auth-detector.js';

describe('AuthDetector', () => {
  const detector = new AuthDetector();

  describe('detectAuthForEmail', () => {
    it('should detect Gmail provider', async () => {
      const result = await detector.detectAuthForEmail('user@gmail.com');
      expect(result.provider).toBe('gmail');
      expect(result.authMethod).toBe('app-password');
      expect(result.imap?.host).toBe('imap.gmail.com');
      expect(result.smtp?.host).toBe('smtp.gmail.com');
    });

    it('should detect Outlook provider', async () => {
      const result = await detector.detectAuthForEmail('user@outlook.com');
      expect(result.provider).toBe('outlook');
      expect(result.authMethod).toBe('oauth2');
      expect(result.imap?.host).toBe('outlook.office365.com');
    });

    it('should detect Yahoo provider', async () => {
      const result = await detector.detectAuthForEmail('user@yahoo.com');
      expect(result.provider).toBe('yahoo');
      expect(result.authMethod).toBe('app-password');
      expect(result.imap?.host).toBe('imap.mail.yahoo.com');
    });

    it('should detect iCloud provider', async () => {
      const result = await detector.detectAuthForEmail('user@icloud.com');
      expect(result.provider).toBe('icloud');
      expect(result.authMethod).toBe('app-password');
      expect(result.imap?.host).toBe('imap.mail.me.com');
    });

    it('should detect OVH provider', async () => {
      const result = await detector.detectAuthForEmail('user@mail.ovh.net');
      expect(result.provider).toBe('ovh');
      expect(result.authMethod).toBe('password');
    });

    it('should detect Ionos provider', async () => {
      const result = await detector.detectAuthForEmail('user@mail.ionos.com');
      expect(result.provider).toBe('ionos');
      expect(result.authMethod).toBe('password');
    });

    it('should return custom provider for unknown domains', async () => {
      const result = await detector.detectAuthForEmail('user@company.org');
      expect(result.provider).toBe('custom');
      expect(result.authMethod).toBe('password');
      expect(result.imap?.host).toBe('imap.company.org');
      expect(result.smtp?.host).toBe('smtp.company.org');
    });

    it('should detect Googlemail as Gmail', async () => {
      const result = await detector.detectAuthForEmail('user@googlemail.com');
      expect(result.provider).toBe('gmail');
    });

    it('should detect Hotmail as Outlook', async () => {
      const result = await detector.detectAuthForEmail('user@hotmail.com');
      expect(result.provider).toBe('outlook');
    });

    it('should include description in result', async () => {
      const result = await detector.detectAuthForEmail('user@gmail.com');
      expect(result.description).toBeDefined();
      expect(result.description.length).toBeGreaterThan(0);
    });

    it('should handle iCloud me.com domain', async () => {
      const result = await detector.detectAuthForEmail('user@me.com');
      expect(result.provider).toBe('icloud');
    });

    it('should set correct port defaults for custom domains', async () => {
      const result = await detector.detectAuthForEmail('user@mycompany.io');
      expect(result.imap?.port).toBe(993);
      expect(result.imap?.secure).toBe(true);
      expect(result.smtp?.port).toBe(465);
      expect(result.smtp?.secure).toBe(true);
    });
  });
});
