# Prefix search on normalized lowercase fields

The spec requires indexed, performant search over doctors and patients. Unanchored case-insensitive `$regex` cannot use indexes (collection scans), MongoDB `$text` only matches whole words (no "joh" → "John"), and Atlas Search would break local-development parity. We store lowercase shadow fields (e.g. `nameLower`) alongside the display fields and search with anchored, case-sensitive prefix regexes (`/^joh/`) `$or`-ed across the searched fields, each backed by an index and verified with `.explain()` (IXSCAN).

## Consequences

- Matching is prefix-from-word-start only; mid-word substrings ("ohn") intentionally do not match.
- Shadow fields must be kept in sync on every create/update; this lives in the service layer, never the client.