import { formatHour } from './datetime';
import type { DayAvailability, SlotRow } from './types';

export function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c),
  );
}

// Accepts HTML — callers are responsible for escaping any user-derived values.
export function setStatus(html: string): void {
  document.getElementById('status')!.innerHTML = html;
}

export function renderResults(availability: DayAvailability[]): void {
  const container = document.getElementById('results-all')!;
  container.innerHTML = '';

  const anyRows = availability.some(d => d.rows.length > 0);
  if (!anyRows) {
    container.innerHTML =
      '<div class="empty">No available slots for these filters. Try a different borough, field type, or date range.</div>';
    return;
  }

  for (const day of availability) {
    const section = document.createElement('section');
    section.className = 'day-group';

    const h2 = document.createElement('h2');
    h2.className = 'day-heading';
    h2.textContent = day.label;
    section.appendChild(h2);

    if (day.rows.length === 0) {
      const p = document.createElement('p');
      p.className = 'no-day';
      p.textContent = '— no available slots —';
      section.appendChild(p);
    } else {
      const ul = document.createElement('ul');
      ul.className = 'slot-list';
      for (const r of day.rows) {
        const li = document.createElement('li');
        li.className = 'slot-row';
        li.innerHTML =
          `<span class="slot-time">${formatHour(r.hour)}</span>` +
          `<span class="slot-park">${escapeHtml(r.park)}</span>` +
          `<span class="slot-borough">${escapeHtml(r.borough)}</span>` +
          `<span class="slot-count">${r.freeCount} of ${r.totalOfType} field${r.totalOfType !== 1 ? 's' : ''} free</span>`;
        ul.appendChild(li);
      }
      section.appendChild(ul);
    }

    container.appendChild(section);
  }
}

export function renderCollapsedResults(availability: DayAvailability[]): void {
  const container = document.getElementById('results-collapsed')!;
  container.innerHTML = '';

  const anyRows = availability.some(d => d.rows.length > 0);
  if (!anyRows) {
    container.innerHTML =
      '<div class="empty">No available slots for these filters. Try a different borough, field type, or date range.</div>';
    return;
  }

  for (const day of availability) {
    const section = document.createElement('section');
    section.className = 'day-group';

    const h2 = document.createElement('h2');
    h2.className = 'day-heading';
    h2.textContent = day.label;
    section.appendChild(h2);

    if (day.rows.length === 0) {
      const p = document.createElement('p');
      p.className = 'no-day';
      p.textContent = '— no available slots —';
      section.appendChild(p);
      container.appendChild(section);
      continue;
    }

    // Group rows by (hour, borough)
    const groups = new Map<string, { hour: number; borough: string; rows: SlotRow[] }>();
    for (const r of day.rows) {
      const key = `${r.hour}::${r.borough}`;
      if (!groups.has(key)) groups.set(key, { hour: r.hour, borough: r.borough, rows: [] });
      groups.get(key)!.rows.push(r);
    }

    // Sort groups by hour then borough
    const sorted = [...groups.values()].sort(
      (a, b) => a.hour - b.hour || a.borough.localeCompare(b.borough),
    );

    const ul = document.createElement('ul');
    ul.className = 'slot-list';

    for (const g of sorted) {
      const totalParks = g.rows.length;
      const totalFields = g.rows.reduce((s, r) => s + r.freeCount, 0);

      const li = document.createElement('li');
      li.className = 'collapse-item';

      const details = document.createElement('details');

      const summary = document.createElement('summary');
      summary.innerHTML =
        `<div class="collapse-summary">` +
        `<span class="slot-time">${formatHour(g.hour)}</span>` +
        `<span class="slot-borough">${escapeHtml(g.borough)}</span>` +
        `<span class="slot-park">${totalParks} park${totalParks !== 1 ? 's' : ''} available</span>` +
        `<span class="slot-count">${totalFields} field${totalFields !== 1 ? 's' : ''} free</span>` +
        `<span class="collapse-arrow">▼</span>` +
        `</div>`;
      details.appendChild(summary);

      const inner = document.createElement('div');
      inner.className = 'collapse-inner';
      const innerUl = document.createElement('ul');
      innerUl.className = 'slot-list';
      for (const r of g.rows) {
        const innerLi = document.createElement('li');
        innerLi.className = 'slot-row';
        innerLi.innerHTML =
          `<span class="slot-park">${escapeHtml(r.park)}</span>` +
          `<span class="slot-borough">${escapeHtml(r.borough)}</span>` +
          `<span class="slot-count">${r.freeCount} of ${r.totalOfType} field${r.totalOfType !== 1 ? 's' : ''} free</span>`;
        innerUl.appendChild(innerLi);
      }
      inner.appendChild(innerUl);
      details.appendChild(inner);

      li.appendChild(details);
      ul.appendChild(li);
    }

    section.appendChild(ul);
    container.appendChild(section);
  }
}
