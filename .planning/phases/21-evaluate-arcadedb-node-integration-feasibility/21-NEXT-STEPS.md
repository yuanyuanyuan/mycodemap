# Phase 21 Next Steps

## If Accepted

Only proceed to an `isolated server-backed prototype`.

That follow-up must be approved against:

- new config fields
- doc updates
- runtime/setup guidance
- auth and TLS constraints

## If Rejected

Keep the current `filesystem / kuzudb / memory / auto` line.

Phase 21 ends as research and evidence artifacts only. No product code surface is opened.

## Suggested Follow-up Phase

**Suggested name:** `Evaluate isolated ArcadeDB server-backed prototype`

**Suggested goal:** validate whether a non-shipped prototype can complete live smoke and collect setup/latency evidence without changing `storage.type` or public config schema.

## Non-Goals

- `storage.type = arcadedb`
- shipped runtime integration
- migration from KùzuDB
- benchmark claims without successful live smoke
