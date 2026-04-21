// Run regex arms before new Date() to avoid browser-inconsistent UTC interpretation
// of non-ISO strings like "MM/DD/YYYY HH:MM".
export function parseDateTime(s: string): Date | null {
  if (!s) return null;

  // "MM/DD/YYYY HH:MM[:SS] [AM|PM]"
  let m = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i,
  );
  if (m) {
    const [, mo, dd, yy, , mi, ap] = m;
    let h = +m[4];
    if (ap) {
      const up = ap.toUpperCase();
      if (up === 'PM' && h < 12) h += 12;
      if (up === 'AM' && h === 12) h = 0;
    }
    return new Date(+yy, +mo - 1, +dd, h, +mi);
  }

  // "YYYY-MM-DD[T ]HH:MM[:SS]"
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2})?$/);
  if (m) {
    const [, yy, mo, dd, h, mi] = m;
    return new Date(+yy, +mo - 1, +dd, +h, +mi);
  }

  // Last resort: native parse (RFC2822 etc.) — timezone-sensitive
  const d = new Date(s);
  return isNaN(d.valueOf()) ? null : d;
}

export function stripTime(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function formatHour(h: number): string {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
