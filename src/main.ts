import { FIELD_TYPES, CONCURRENCY } from './constants';
import { stripTime } from './datetime';
import { fetchSocrata } from './socrata';
import { fetchPermitsCsv } from './permits';
import { pool } from './pool';
import { computeAvailability } from './availability';
import { renderResults, setStatus, escapeHtml } from './render';
import type { Park, ParkPermits } from './types';

// --- DOM refs ---
const fieldTypeSelect = document.getElementById('fieldType') as HTMLSelectElement;
const boroughSelect = document.getElementById('borough') as HTMLSelectElement;
const allWarning = document.getElementById('allWarning') as HTMLElement;
const searchBtn = document.getElementById('searchBtn') as HTMLButtonElement;
const startDateInput = document.getElementById('startDate') as HTMLInputElement;
const endDateInput = document.getElementById('endDate') as HTMLInputElement;
const filtersForm = document.getElementById('filters') as HTMLFormElement;

// --- Bootstrap ---
for (const t of FIELD_TYPES) {
  const o = document.createElement('option');
  o.value = t;
  o.textContent = t;
  fieldTypeSelect.appendChild(o);
}

const today = new Date();
const weekOut = new Date(today);
weekOut.setDate(today.getDate() + 6);
startDateInput.valueAsDate = stripTime(today);
endDateInput.valueAsDate = stripTime(weekOut);

boroughSelect.addEventListener('change', () => {
  allWarning.hidden = boroughSelect.value !== 'ALL';
  searchBtn.disabled = !boroughSelect.value;
});

filtersForm.addEventListener('submit', e => { e.preventDefault(); runSearch(); });

// --- Parks index ---
let parksIndexPromise: Promise<Park[]> | null = null;

function loadParksIndex(): Promise<Park[]> {
  if (!parksIndexPromise) parksIndexPromise = fetchSocrata();
  return parksIndexPromise;
}

// Preload so first search is snappy
loadParksIndex()
  .then(list => setStatus(`${list.length} parks loaded from NYC Open Data. Pick filters and Search.`))
  .catch(err => {
    const msg = err instanceof Error ? err.message : String(err);
    setStatus(`<div class="error">Failed to load park index: ${escapeHtml(msg)}</div>`);
  });

// --- Search ---
async function runSearch(): Promise<void> {
  const fieldType = fieldTypeSelect.value;
  const borough = boroughSelect.value;
  const startStr = startDateInput.value;
  const endStr = endDateInput.value;

  if (!borough || !startStr || !endStr) return;

  const start = stripTime(new Date(startStr + 'T00:00:00'));
  const end = stripTime(new Date(endStr + 'T00:00:00'));

  if (end < start) {
    setStatus('<div class="error">End date must be on or after start date.</div>');
    return;
  }

  document.getElementById('results')!.innerHTML = '';
  searchBtn.disabled = true;
  searchBtn.textContent = 'Loading…';

  try {
    setStatus('Loading park index…');
    const allParks = await loadParksIndex();
    const parks = borough === 'ALL' ? allParks : allParks.filter(p => p.borough === borough);

    if (parks.length === 0) {
      setStatus('<div class="error">No parks found for that borough in the open-data feed.</div>');
      return;
    }

    setStatus(
      `Fetching permits for ${parks.length} parks…` +
      `<div class="progress"><div class="progress-bar" id="pb" style="width:0%"></div></div>`,
    );
    const pb = document.getElementById('pb');

    const results = await pool(
      parks,
      CONCURRENCY,
      async p => {
        const permits = await fetchPermitsCsv(p.code);
        return { park: p, permits } satisfies ParkPermits;
      },
      (done, total) => { if (pb) pb.style.width = `${Math.round(100 * done / total)}%`; },
    );

    const errors = results.filter(r => !r.ok).length;
    const withData = results
      .filter((r): r is { ok: true; value: ParkPermits } => r.ok && r.value.permits.length > 0)
      .map(r => r.value);
    const empty = results.length - errors - withData.length;

    setStatus(
      `Computing availability for ${withData.length} parks with permit data ` +
      `(${empty} empty, ${errors} fetch errors)…`,
    );
    const availability = computeAvailability(withData, start, end, fieldType);
    renderResults(availability);
    setStatus(
      `${parks.length} parks queried · ${withData.length} with permit data · ` +
      `${empty} empty · ${errors} errors · ${fieldType} · ${startStr} → ${endStr}`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setStatus(`<div class="error">Error: ${escapeHtml(msg)}</div>`);
    console.error(err);
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = 'Search';
  }
}
