# Keyset (cursor) pagination over offset pagination

The spec requires the list endpoints to stay fast as data grows. Offset pagination degrades linearly with depth (`skip(5000)` reads and discards 5,000 documents on every request), and the count query ran on *every* page. We paginate by keyset instead: each response carries `meta.nextCursor` — an opaque base64url token encoding the last row's `(createdAt, _id)` position — and the next request resumes with `$or: [{ createdAt: { $lt: c } }, { createdAt: c, _id: { $lt: id } }]` under the newest-first sort. `meta.hasMore` (a limit+1 peek) ends the walk, and `total`/`totalPages` ride only the first page of a listing, the one place the pager shows record totals.

## Consequences

- The list-query grammar accepts `cursor` and no longer accepts `page` (strict Zod parsing rejects it with a 400). This is a breaking API change; the first-party web app was migrated in the same change.
- No jump-to-page: the UI pager is prev/next by design, so this costs nothing there. Deep links to a page number are no longer possible (page position is client-side display state; a URL without a cursor lands on page 1).
- `total` is last-known on cursor pages: counts don't refresh mid-walk, so the record total can lag writes made while paging. It refreshes on any first-page fetch.
- Prev-page navigation walks a client-side cursor stack; a fresh visit's Previous button returns to page 1 (the server never serves reverse traversal).
- Every compound list index ends in `createdAt: -1, _id: -1` so the full sort is index-covered (ESR). Deployments upgrading from the offset era have old `{ field, createdAt: -1 }` indexes that Mongoose will not drop — drop them once in Atlas/mongosh when convenient (e.g. `db.patients.dropIndex("doctor_1_createdAt_-1")`).
- The dashboard cache (60s TTL, generation-bumped on every patient/doctor mutation) and the pool-sizing env knobs (`DB_MAX_POOL_SIZE`, `DB_MIN_POOL_SIZE`, `DB_MAX_IDLE_TIME_MS`, `DB_SERVER_SELECTION_TIMEOUT_MS`) landed in the same optimization pass; both are documented in the README.
