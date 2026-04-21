import { describe, it, expect } from 'vitest';
import { computeAvailability, enumerateDays } from '../availability';
import type { ParkPermits, RawPermit } from '../types';

const PARK = { code: 'M001', name: 'Central Park', borough: 'M', isWhole: true };

// April 28, 2025 local midnight
const APR28 = new Date(2025, 3, 28);
const APR29 = new Date(2025, 3, 29);

function permit(overrides: Partial<RawPermit>): RawPermit {
  return {
    Field: 'Field 1',
    Start: '04/28/2025 10:00 AM',
    End: '04/28/2025 11:00 AM',
    'Sport or Event Type': 'Baseball - Adult',
    'Event Name': '',
    Organization: '',
    'Event Status': 'Approved',
    ...overrides,
  };
}

describe('enumerateDays', () => {
  it('produces one entry for a single day', () => {
    const days = enumerateDays(APR28, APR28);
    expect(days).toHaveLength(1);
    expect(days[0].key).toBe('2025-04-28');
  });

  it('produces correct count for a multi-day range', () => {
    const days = enumerateDays(APR28, APR29);
    expect(days).toHaveLength(2);
    expect(days[0].key).toBe('2025-04-28');
    expect(days[1].key).toBe('2025-04-29');
  });
});

describe('computeAvailability', () => {
  it('produces no rows when a park has no permits (no fields to track)', () => {
    const result = computeAvailability(
      [{ park: PARK, permits: [] }],
      APR28, APR28,
      'All fields and courts',
    );
    expect(result[0].rows).toHaveLength(0);
  });

  it('marks a field busy during its permitted slot', () => {
    const parkResults: ParkPermits[] = [{
      park: PARK,
      permits: [permit({ Start: '04/28/2025 10:00 AM', End: '04/28/2025 11:00 AM' })],
    }];
    const result = computeAvailability(parkResults, APR28, APR28, 'All fields and courts');
    const rows = result[0].rows;
    // Hour 10 should have freeCount=0 → not in results
    expect(rows.find(r => r.hour === 10)).toBeUndefined();
    // Hour 9 should be free (1 of 1)
    const slot9 = rows.find(r => r.hour === 9);
    expect(slot9?.freeCount).toBe(1);
    expect(slot9?.totalOfType).toBe(1);
  });

  it('treats a cancelled permit as non-blocking', () => {
    const parkResults: ParkPermits[] = [{
      park: PARK,
      permits: [permit({ 'Event Status': 'Cancelled' })],
    }];
    const result = computeAvailability(parkResults, APR28, APR28, 'All fields and courts');
    // Hour 10 should be free since permit is cancelled
    const slot10 = result[0].rows.find(r => r.hour === 10);
    expect(slot10?.freeCount).toBe(1);
  });

  it('treats a denied permit as non-blocking', () => {
    const parkResults: ParkPermits[] = [{
      park: PARK,
      permits: [permit({ 'Event Status': 'Denied' })],
    }];
    const slot10 = computeAvailability(parkResults, APR28, APR28, 'All fields and courts')[0]
      .rows.find(r => r.hour === 10);
    expect(slot10?.freeCount).toBe(1);
  });

  it('counts partial overlap as busy', () => {
    // Permit is 10:30–11:30, so it overlaps both slot 10 and slot 11
    const parkResults: ParkPermits[] = [{
      park: PARK,
      permits: [permit({ Start: '04/28/2025 10:30 AM', End: '04/28/2025 11:30 AM' })],
    }];
    const rows = computeAvailability(parkResults, APR28, APR28, 'All fields and courts')[0].rows;
    expect(rows.find(r => r.hour === 10)).toBeUndefined(); // busy
    expect(rows.find(r => r.hour === 11)).toBeUndefined(); // busy
    expect(rows.find(r => r.hour === 9)?.freeCount).toBe(1); // free
  });

  it('correctly splits free/busy counts across two fields', () => {
    // Field A: busy 10–11. Field B: free all day. Total fields = 2.
    const parkResults: ParkPermits[] = [{
      park: PARK,
      permits: [
        permit({ Field: 'Field A', Start: '04/28/2025 10:00 AM', End: '04/28/2025 11:00 AM' }),
        permit({ Field: 'Field B', Start: '04/28/2025 08:00 AM', End: '04/28/2025 09:00 AM' }),
      ],
    }];
    const rows = computeAvailability(parkResults, APR28, APR28, 'All fields and courts')[0].rows;
    const slot10 = rows.find(r => r.hour === 10);
    expect(slot10?.freeCount).toBe(1);   // Field B is free
    expect(slot10?.totalOfType).toBe(2);
  });

  it('filters to a specific field type', () => {
    // Baseball + Basketball permits; filtering to Basketball should ignore the baseball field
    const parkResults: ParkPermits[] = [{
      park: PARK,
      permits: [
        permit({ Field: 'Baseball Field', 'Sport or Event Type': 'Baseball - Adult',
          Start: '04/28/2025 10:00 AM', End: '04/28/2025 11:00 AM' }),
        permit({ Field: 'Basketball Court', 'Sport or Event Type': 'Basketball',
          Start: '04/28/2025 10:00 AM', End: '04/28/2025 11:00 AM' }),
      ],
    }];
    const rows = computeAvailability(parkResults, APR28, APR28, 'Basketball')[0].rows;
    // totalOfType should be 1 (only Basketball Court tracked)
    const slot9 = rows.find(r => r.hour === 9);
    expect(slot9?.totalOfType).toBe(1);
    // Hour 10: basketball court busy → no row
    expect(rows.find(r => r.hour === 10)).toBeUndefined();
  });

  it('returns no rows for a field type with no permit history', () => {
    const parkResults: ParkPermits[] = [{
      park: PARK,
      permits: [permit({ 'Sport or Event Type': 'Baseball - Adult' })],
    }];
    const rows = computeAvailability(parkResults, APR28, APR28, 'Basketball')[0].rows;
    expect(rows).toHaveLength(0);
  });

  it('sorts rows by hour then park name within a day', () => {
    const PARK2 = { code: 'M002', name: 'Aaardvark Park', borough: 'M', isWhole: true };
    const parkResults: ParkPermits[] = [
      { park: PARK, permits: [permit({})] },
      { park: PARK2, permits: [permit({})] },
    ];
    const rows = computeAvailability(parkResults, APR28, APR28, 'All fields and courts')[0].rows;
    // Within the same hour, Aaardvark Park should come before Central Park
    const hour9Rows = rows.filter(r => r.hour === 9);
    expect(hour9Rows[0].park).toBe('Aaardvark Park');
    expect(hour9Rows[1].park).toBe('Central Park');
  });
});
