import { OPEN_HOUR, CLOSE_HOUR, BOROUGH_NAMES } from './constants';
import { parseDateTime } from './datetime';
import type { ParkPermits, DayAvailability, SlotRow } from './types';

// Normalize sport strings for comparison: lowercase, collapse spaces, unify dashes.
// Handles "Soccer -Regulation", em dashes, etc.
const normSport = (s: string) =>
  s.toLowerCase().replace(/[–—]/g, '-').replace(/\s*-\s*/g, ' - ').replace(/\s+/g, ' ').trim();

interface DayMeta {
  key: string;   // "YYYY-MM-DD" in local time
  label: string;
  date: Date;
}

export function enumerateDays(start: Date, end: Date): DayMeta[] {
  const days: DayMeta[] = [];
  const d = new Date(start);
  while (d <= end) {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    days.push({
      key: `${y}-${mo}-${dd}`,
      label: d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
      date: new Date(d),
    });
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export function computeAvailability(
  parkResults: ParkPermits[],
  start: Date,
  end: Date,
  fieldTypeFilter: string,
): DayAvailability[] {
  const days = enumerateDays(start, end);
  const byDay = new Map<string, SlotRow[]>(days.map(d => [d.key, []]));
  const allSports = fieldTypeFilter === 'All fields and courts';

  for (const { park, permits } of parkResults) {
    const fieldsBySport = new Map<string, Set<string>>();
    const allFields = new Set<string>();
    const permitIntervals: { field: string; start: Date; end: Date }[] = [];

    for (const p of permits) {
      const field = p['Field'] ?? '';
      const sport = p['Sport or Event Type'] ?? '';
      const status = p['Event Status'] ?? '';
      const s = parseDateTime(p['Start']);
      const e = parseDateTime(p['End']);
      if (!field || !s || !e) continue;
      // Track the field/sport regardless of status so it appears in the pool.
      allFields.add(field);
      const ns = normSport(sport);
      if (!fieldsBySport.has(ns)) fieldsBySport.set(ns, new Set());
      fieldsBySport.get(ns)!.add(field);
      // Only cancelled/denied/withdrawn permits don't block the slot.
      if (/cancel|denied|withdraw/i.test(status)) continue;
      permitIntervals.push({ field, start: s, end: e });
    }

    const fieldsOfType = allSports
      ? allFields
      : (fieldsBySport.get(normSport(fieldTypeFilter)) ?? new Set<string>());
    if (fieldsOfType.size === 0) continue;

    for (const day of days) {
      for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
        const slotStart = new Date(day.date);
        slotStart.setHours(h, 0, 0, 0);
        const slotEnd = new Date(day.date);
        slotEnd.setHours(h + 1, 0, 0, 0);

        const busy = new Set<string>();
        for (const iv of permitIntervals) {
          if (iv.start < slotEnd && iv.end > slotStart) busy.add(iv.field);
        }

        let free = 0;
        for (const f of fieldsOfType) if (!busy.has(f)) free++;

        if (free > 0) {
          byDay.get(day.key)!.push({
            hour: h,
            park: park.name,
            borough: BOROUGH_NAMES[park.borough] ?? park.borough,
            freeCount: free,
            totalOfType: fieldsOfType.size,
          });
        }
      }
    }
  }

  return days.map(d => {
    const rows = byDay.get(d.key)!;
    rows.sort((a, b) => a.hour - b.hour || a.park.localeCompare(b.park));
    return { label: d.label, rows };
  });
}
