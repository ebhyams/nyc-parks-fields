import { formatHour } from './datetime';
import type { DayAvailability } from './types';

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
  const container = document.getElementById('results')!;
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
