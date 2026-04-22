# NYC Parks Field & Court Availability

A static web app that shows which NYC Parks fields and courts are free to use, based on issued permit data from the NYC Parks system.

**Live site**: https://ebhyams.github.io/nyc-parks-fields/

## Usage

No setup required — just open the link, pick a field type and borough, set a date range, and hit Search.

## Architecture

The app is a single static HTML file (built with Vite + TypeScript, deployed on GitHub Pages).

**Data sources**
- **Park index**: NYC Open Data / Socrata API — lists parks and their property codes by borough
- **Permit data**: NYC Parks permit CSVs (`nycgovparks.org/permits/field-and-court/issued/{code}/csv`), one file per park

**Cloudflare Worker proxy** (`nyc-parks-proxy.ebhyams.workers.dev`): The NYC Parks CSV endpoint blocks requests that don't come from a browser on nycgovparks.org. The Worker forwards requests with the correct headers so the static site can fetch the data. Source is in `worker/worker.js`.

**Availability logic**: For each park, the app compares 1-hour slots (6 AM–11 PM) against the park's permit intervals. A slot is free if at least one field of the selected type has no overlapping issued permit.

## Local development

```
npm install
npm run dev
```

Requires Node.js. The dev server runs at `http://localhost:5173`.

To deploy changes: push to `main` — GitHub Actions builds and deploys automatically.

The Cloudflare Worker is deployed separately via Wrangler (`cd worker && wrangler deploy`).

## Known limitations

- **Data coverage**: A park only appears in results if it has permit history for the selected field type. Parks with fields but no permit history won't show up, even if the field is free.
- **"All boroughs" is unreliable**: The all-boroughs search sometimes returns results from only one borough. It works inconsistently and isn't ready for real use.
- **"All boroughs" is slow and heavy**: Fetches ~1,200 permit files throttled to 8 at a time. Expect 1–3 minutes on a cold search, with real load on the NYC Parks server.
- **Results can be up to 10 minutes stale**: Permit CSVs are cached in the browser for 10 minutes.
- **Issued permits only**: Informal use, maintenance closures, and reservation holds aren't reflected.
- **Operating hours fixed at 6 AM–11 PM**: Actual park hours vary by location.
- **Field type inflexibility**: Field types are based on a static list, could break or miss data if new field types are added.

## If this were a real production app

This was built as an exercise. Here's what I'd change to run it reliably at scale:

**Fix "All boroughs"**: The current approach fires ~1,200 browser requests per search. This is fragile — the NYC Parks server rate-limits under load, which is why all-boroughs results are inconsistent. The fix would be to move permit fetching server-side, on a schedule, so the client never makes more than one request per search.

**Server-side pre-fetching and caching**: A nightly (or hourly) job would fetch all park CSVs, parse them, and store structured availability data in a database or key-value store. The frontend would query that instead of raw CSVs. This removes the WAF/proxy problem entirely and makes results fast and reliable.

**Proper rate limiting**: The Cloudflare Worker currently has no rate limiting — a single "All boroughs" search hammers the NYC Parks origin with 1,200 requests. In production, the Worker (or a backend job) would use exponential backoff, respect retry-after headers, and use Cloudflare KV to cache park CSVs at the edge so repeat requests don't hit the origin at all.

**Surface parks with no permit history**: Right now, parks that have never filed a permit are invisible, even if they have fields. A separate dataset mapping park codes to field types (e.g. from NYC Open Data's parks properties data) would let us show those parks as "likely available, no permit history."

**User-facing rate limiting**: For a public app, the "All boroughs" option would either be removed, require authentication, or be replaced by a pre-computed borough-level view served from cache.
