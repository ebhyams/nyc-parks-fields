import { SOCRATA_URL } from './constants';
import type { Park } from './types';

// Relaxed to [A-Z]* (vs the original [A-Z]?) to avoid silently dropping parks
// with multi-character code suffixes.
const PARK_CODE_RE = /^[MQBXR]\d+[A-Z]*$/i;

export async function fetchSocrata(): Promise<Park[]> {
  const r = await fetch(SOCRATA_URL, { credentials: 'omit' });
  if (!r.ok) throw new Error(`Socrata ${r.status}`);
  const rows: Record<string, string>[] = await r.json();

  const seen = new Map<string, Park>();
  for (const row of rows) {
    const parent = (row['cemsparent'] || row['gispropnum'] || '').toUpperCase();
    if (!parent || !PARK_CODE_RE.test(parent)) continue;
    const existing = seen.get(parent);
    const isWhole = row['areatype'] === 'Whole Park';
    if (!existing || isWhole) {
      seen.set(parent, {
        code: parent,
        name: row['name'] || row['propertyname'] || parent,
        borough: (row['borough'] || parent[0]).toUpperCase(),
        isWhole: isWhole || (existing?.isWhole ?? false),
      });
    }
  }

  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}
