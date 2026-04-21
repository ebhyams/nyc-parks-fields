import { SOCRATA_BASE_URL } from './constants';
import type { Park } from './types';

const PARK_CODE_RE = /^[MQBXR]\d+[A-Z]*$/i;

export async function fetchSocrata(borough: string): Promise<Park[]> {
  const params = new URLSearchParams({ '$limit': '50000' });
  if (borough !== 'ALL') params.set('$where', `borough='${borough}'`);
  const r = await fetch(`${SOCRATA_BASE_URL}?${params}`, { credentials: 'omit' });
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
