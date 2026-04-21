import { describe, it, expect } from 'vitest';
import { parseCsv } from '../csv';

describe('parseCsv', () => {
  it('parses simple values', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });

  it('handles a single row with no newline', () => {
    expect(parseCsv('a,b,c')).toEqual([['a', 'b', 'c']]);
  });

  it('handles empty fields', () => {
    expect(parseCsv('a,,c')).toEqual([['a', '', 'c']]);
  });

  it('handles a trailing newline without producing an extra empty row', () => {
    expect(parseCsv('a,b\n1,2\n')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('handles CRLF line endings', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('handles quoted fields with embedded commas', () => {
    expect(parseCsv('"hello, world",b')).toEqual([['hello, world', 'b']]);
  });

  it('handles doubled quotes inside a quoted field', () => {
    expect(parseCsv('"say ""hi""",b')).toEqual([['say "hi"', 'b']]);
  });

  it('handles quoted fields with embedded newlines', () => {
    expect(parseCsv('"line1\nline2",b')).toEqual([['line1\nline2', 'b']]);
  });

  it('handles a realistic CSV header + data row', () => {
    const text =
      'Start,End,Field,Sport or Event Type,Event Name,Organization,Event Status\n' +
      '04/28/2025 09:00 AM,04/28/2025 11:00 AM,Field 1,Baseball - Adult,Spring League,Team A,Approved';
    const rows = parseCsv(text);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual([
      'Start', 'End', 'Field', 'Sport or Event Type',
      'Event Name', 'Organization', 'Event Status',
    ]);
    expect(rows[1][0]).toBe('04/28/2025 09:00 AM');
    expect(rows[1][2]).toBe('Field 1');
  });
});
