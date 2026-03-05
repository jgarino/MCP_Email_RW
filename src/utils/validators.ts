/**
 * Input validation utilities.
 */

import { ValidationError } from './errors.js';

/** Validates that an email address has a basic valid format */
export function validateEmailAddress(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError(`Invalid email address: ${email}`);
  }
}

/** Validates that a string is non-empty */
export function validateNonEmpty(value: string, fieldName: string): void {
  if (!value || value.trim().length === 0) {
    throw new ValidationError(`Field "${fieldName}" must not be empty`);
  }
}

/** Validates that an account ID is valid (alphanumeric, hyphens, underscores) */
export function validateAccountId(accountId: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(accountId)) {
    throw new ValidationError(
      `Invalid account ID: "${accountId}". Must contain only letters, digits, hyphens, and underscores.`,
    );
  }
}

/** Validates a port number is in valid range */
export function validatePort(port: number): void {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ValidationError(`Invalid port number: ${port}. Must be between 1 and 65535.`);
  }
}

/** Validates a hostname is non-empty and does not contain spaces */
export function validateHostname(host: string): void {
  if (!host || host.trim().length === 0 || host.includes(' ')) {
    throw new ValidationError(`Invalid hostname: "${host}"`);
  }
}
