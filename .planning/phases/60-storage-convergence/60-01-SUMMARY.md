---
phase: 60-storage-convergence
plan: 01
subsystem: storage
tags: [storage, sqlite, deprecation, runtime-truth]

requires:
  - phase: 59-parser-cutover
    provides: deprecation-style actionable error handling pattern
provides:
  - SQLite-only persistent storage truth in StorageFactory
  - Deterministic rejection for filesystem/kuzudb/neo4j requests
  - Active storage contract narrowed to sqlite + memory
affects: [60-02, 60-03, storage, cli]

tech-stack:
  added: []
  patterns: [sqlite-only-factory-truth, deprecated-storage-input-rejection]

key-files:
  created: []
  modified:
    - src/infrastructure/storage/StorageFactory.ts
    - src/interface/types/storage.ts
    - src/infrastructure/storage/index.ts
    - src/infrastructure/storage/__tests__/StorageFactory.test.ts
    - src/infrastructure/storage/__tests__/fallback-mechanism.test.ts

key-decisions:
  - "storage.type=auto now resolves only inside the SQLite family"
  - "filesystem/kuzudb/neo4j are preserved only as deprecated inputs that fail with guidance"
  - "Legacy adapter classes remain in-repo for compatibility/migration, but are no longer healthy runtime options"

patterns-established:
  - "Factory truth: reject deprecated input at the selection boundary instead of cross-family fallback"
  - "Public active type vs deprecated input type split: keep compile-time space for rejection while narrowing healthy runtime truth"

requirements-completed: [STOR-01, STOR-02]

duration: 1 session
completed: 2026-05-06
---

# Phase 60 Plan 01 Summary

**StorageFactory now exposes one persistent storage truth: SQLite family only.**

## Accomplishments

- Removed healthy runtime selection paths that instantiated `FileSystemStorage` or lazy-loaded `KuzuDBStorage`.
- Changed `auto` to resolve directly to SQLite-family persistence while preserving `memory` for tests/temporary use.
- Narrowed active public storage types to `sqlite` and `memory`, while keeping deprecated input literals available for explicit rejection and migration messaging.
- Replaced legacy cross-family fallback assertions with deterministic unsupported-backend coverage.

## Verification

- `rtk proxy npx vitest run src/infrastructure/storage/__tests__/StorageFactory.test.ts src/infrastructure/storage/__tests__/fallback-mechanism.test.ts`
- `rtk rg -n "new FileSystemStorage|loadKuzuDBStorage|return 'filesystem'|return 'kuzudb'" src/infrastructure/storage/StorageFactory.ts`

## Files Created/Modified

- `src/infrastructure/storage/StorageFactory.ts` - SQLite-only runtime truth and unsupported-storage rejection
- `src/interface/types/storage.ts` - Active type narrowing plus deprecated input compatibility layer
- `src/infrastructure/storage/index.ts` - Removed legacy runtime exports from the healthy storage surface
- `src/infrastructure/storage/__tests__/StorageFactory.test.ts`, `src/infrastructure/storage/__tests__/fallback-mechanism.test.ts` - SQLite-only selection and rejection proof

## Task Commits

None in this run. Changes remain in the workspace and were verified without creating atomic git commits.

## Deviations from Plan

Kept deprecated literals in `StorageConfig`/`IStorage` compile-time space so legacy adapter classes can still compile while the runtime boundary rejects them explicitly. This preserves the intended runtime truth without forcing unrelated adapter deletions in the same plan.

## Next Phase Readiness

Ready for Plan 60-02 and 60-03. Runtime storage truth is stable, so config/output alignment and fallback observability can build on a single boundary.

---
*Phase: 60-storage-convergence*
*Completed: 2026-05-06*
