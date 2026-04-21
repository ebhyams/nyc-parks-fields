import { csvUrl, CSV_CACHE_TTL_MS } from './constants';
import { parseCsv } from './csv';
import type { RawPermit } from './types';

const csvCache = new Map<string, { at: number; data: RawPermit[] }>();

export async function fetchPermitsCsv(code: string): Promise<RawPermit[]> {
  const cached = csvCache.get(code);
  if (cached && Date.now() - cached.at < CSV_CACHE_TTL_MS) return cached.data;

  const r = await fetch(csvUrl(code), {
    credentials: 'omit',
    headers: { Accept: 'text/csv,*/*' },
  });

  if (!r.ok) {
    if (r.status === 404) {
      csvCache.set(code, { at: Date.now(), data: [] });
      return [];
    }
    throw new Error(`HTTP ${r.status}`);
  }

  const text = await r.text();

  // WAF challenge returns HTML; content-type check is more reliable than startsWith('<')
  // but we keep both as belt-and-suspenders.
  const ct = r.headers.get('content-type') ?? '';
  if (!ct.includes('text/csv') && !ct.includes('text/plain') && text.trim().startsWith('<')) {
    throw new Error('WAF challenge (HTML response)');
  }

  if (!text.includes(',')) {
    csvCache.set(code, { at: Date.now(), data: [] });
    return [];
  }

  const rows = parseCsv(text);
  const header = rows.shift() ?? [];
  const keys = header.map(h => h.trim());
  const data = rows
    .filter(r => !(r.length === 1 && r[0] === ''))
    .map(r => {
      const o: Record<string, string> = {};
      keys.forEach((h, i) => { o[h] = (r[i] ?? '').trim(); });
      return o as unknown as RawPermit;
    });

  csvCache.set(code, { at: Date.now(), data });
  return data;
}
