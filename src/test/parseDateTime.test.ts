import { describe, it, expect } from 'vitest';
import { parseDateTime } from '../datetime';

describe('parseDateTime', () => {
  it('returns null for empty string', () => {
    expect(parseDateTime('')).toBeNull();
  });

  it('returns null for a garbage string', () => {
    expect(parseDateTime('not-a-date')).toBeNull();
  });

  it('parses MM/DD/YYYY HH:MM AM', () => {
    const d = parseDateTime('04/28/2025 09:00 AM');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2025);
    expect(d!.getMonth()).toBe(3); // April (0-indexed)
    expect(d!.getDate()).toBe(28);
    expect(d!.getHours()).toBe(9);
    expect(d!.getMinutes()).toBe(0);
  });

  it('parses MM/DD/YYYY HH:MM PM', () => {
    const d = parseDateTime('04/28/2025 02:30 PM');
    expect(d!.getHours()).toBe(14);
    expect(d!.getMinutes()).toBe(30);
  });

  it('handles 12 PM correctly (noon = 12:00)', () => {
    expect(parseDateTime('06/01/2025 12:00 PM')!.getHours()).toBe(12);
  });

  it('handles 12 AM correctly (midnight = 0:00)', () => {
    expect(parseDateTime('06/01/2025 12:00 AM')!.getHours()).toBe(0);
  });

  it('parses MM/DD/YYYY HH:MM:SS without AM/PM (24h)', () => {
    const d = parseDateTime('03/10/2025 14:30:00');
    expect(d!.getHours()).toBe(14);
    expect(d!.getMinutes()).toBe(30);
  });

  it('parses YYYY-MM-DD HH:MM', () => {
    const d = parseDateTime('2025-04-28 09:00');
    expect(d!.getFullYear()).toBe(2025);
    expect(d!.getMonth()).toBe(3);
    expect(d!.getDate()).toBe(28);
    expect(d!.getHours()).toBe(9);
  });

  it('parses YYYY-MM-DDTHH:MM', () => {
    const d = parseDateTime('2025-04-28T14:00');
    expect(d!.getHours()).toBe(14);
  });

  it('parses YYYY-MM-DD HH:MM:SS', () => {
    const d = parseDateTime('2025-04-28 09:00:00');
    expect(d!.getHours()).toBe(9);
    expect(d!.getMinutes()).toBe(0);
  });

  it('single-digit month and day', () => {
    const d = parseDateTime('1/5/2025 8:00 AM');
    expect(d!.getMonth()).toBe(0); // January
    expect(d!.getDate()).toBe(5);
    expect(d!.getHours()).toBe(8);
  });

  it('returns the same date regardless of AM/PM casing', () => {
    const d1 = parseDateTime('04/28/2025 02:00 pm');
    const d2 = parseDateTime('04/28/2025 02:00 PM');
    expect(d1!.getTime()).toBe(d2!.getTime());
  });

  // Real NYC Parks CSV format uses dotted lowercase: "3/17/2026 3:00 p.m."
  it('parses dotted lowercase p.m.', () => {
    const d = parseDateTime('3/17/2026 3:00 p.m.');
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(2); // March
    expect(d!.getDate()).toBe(17);
    expect(d!.getHours()).toBe(15);
    expect(d!.getMinutes()).toBe(0);
  });

  it('parses dotted lowercase a.m.', () => {
    const d = parseDateTime('3/17/2026 9:00 a.m.');
    expect(d!.getHours()).toBe(9);
  });

  it('parses 12:00 p.m. as noon', () => {
    expect(parseDateTime('4/25/2026 12:00 p.m.')!.getHours()).toBe(12);
  });

  it('parses 12:00 a.m. as midnight', () => {
    expect(parseDateTime('4/25/2026 12:00 a.m.')!.getHours()).toBe(0);
  });
});
