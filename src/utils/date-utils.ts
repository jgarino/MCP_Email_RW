/**
 * Date utility functions.
 */

/** Returns a Date object from X days ago */
export function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/** Returns a Date object from X months ago */
export function monthsAgo(months: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
}

/** Formats a date as ISO 8601 string */
export function toIsoString(date: Date): string {
  return date.toISOString();
}

/** Parses a date string and returns a Date object, or undefined if invalid */
export function parseDate(dateStr: string): Date | undefined {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return undefined;
  }
  return date;
}

/** Returns a human-readable relative time string (e.g., "2 hours ago") */
export function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  return `${diffSec} second${diffSec !== 1 ? 's' : ''} ago`;
}
