---
phase: 81-edge-id-normalization
plan: 01
subsystem: graph-storage
tags: [graph, dependency, edge-id, normalization, sqlite]

requires:
  - phase: 73-graph-topology-signals-and-dedup
    provides: canonical dependency semantics for duplicate-safe graph truth
  - phase: 80-mcp-stdio-blank-line-filtering
    provides: current v2.6 execution baseline
provides:
  - Canonical lowercase / underscore-safe edge ID helper
  - Stable dependency IDs in generate + SQLite writeback paths
  - Initialize-time legacy SQLite edge ID backfill
affects: [generate, sqlite-storage, query, impact, governance-cache]

tech-stack:
  added: []
  patterns: [canonical identity helper, initialize-time truth backfill, stable path-and-location references]

key-files:
  created:
    - .planning/phases/81-edge-id-normalization/81-01-SUMMARY.md
    - .planning/phases/81-edge-id-normalization/81-CONTEXT.md
    - .planning/phases/81-edge-id-normalization/81-RESEARCH.md
    - .planning/phases/81-edge-id-normalization/81-01-PLAN.md
  modified:
    - src/domain/entities/Dependency.ts
    - src/cli/commands/generate.ts
    - src/infrastructure/storage/adapters/SQLiteStorage.ts
    - src/infrastructure/storage/__tests__/SQLiteStorage.test.ts
    - src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts
    - src/server/handlers/__tests__/QueryHandler.test.ts
    - src/server/mcp/__tests__/CodeMapMcpServer.test.ts
    - src/cli/__tests__/generate.test.ts

key-decisions:
  - "Canonical edge ID must not depend on random module/symbol IDs; it is derived from stable path/location truth instead."
  - "SQLite initialize now performs a no-schema-change backfill when persisted dependency IDs are legacy or drifting."
  - "The same canonical helper is shared by generate-time graph materialization and SQLite writeback to avoid surface drift."

patterns-established:
  - "Dependency identity is now a first-class canonical helper rather than an ad-hoc storage concern."
  - "Legacy graph truth is repaired at initialization time instead of waiting for a future manual rebuild."

requirements-completed: [POL-03]

duration: 55min
completed: 2026-05-11
---

# Phase 81: Edge ID Normalization Summary

**Graph edge IDs now use one canonical lowercase / underscore-safe form across generate, SQLite persistence, query, impact, and governance-cache paths.**

## Accomplishments

- Added canonical dependency ID helpers to [Dependency.ts](/data/codemap/src/domain/entities/Dependency.ts:1), including stable module/symbol references.
- Replaced random generate-time dependency IDs with path/location-derived canonical IDs in [generate.ts](/data/codemap/src/cli/commands/generate.ts:1).
- Extended [SQLiteStorage.ts](/data/codemap/src/infrastructure/storage/adapters/SQLiteStorage.ts:1) so writeback rewrites dependency IDs canonically and initialize-time backfills legacy persisted IDs without a schema bump.
- Updated focused storage, query, MCP, and generate tests to assert canonical IDs instead of legacy `dep-*` placeholders.

## Verification

- `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/SQLiteStorage.test.ts`
- `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts`
- `rtk ./node_modules/.bin/vitest run src/server/handlers/__tests__/QueryHandler.test.ts`
- `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/CodeMapMcpServer.test.ts`
- `rtk ./node_modules/.bin/vitest run src/cli/__tests__/generate.test.ts`
- `rtk npx tsc --noEmit`

## Files Created/Modified

- `src/domain/entities/Dependency.ts` - canonical edge ID and stable entity reference helpers
- `src/cli/commands/generate.ts` - generate-time dependency IDs now derive from stable module/symbol truth
- `src/infrastructure/storage/adapters/SQLiteStorage.ts` - canonical ID rewrite on save and initialize-time legacy backfill
- `src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` - canonical ID persistence, migration, and fail-closed coverage
- `src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts` - cache/direct parity assertions now use canonical IDs
- `src/server/handlers/__tests__/QueryHandler.test.ts` - query detail and stale-truth assertions aligned to canonical IDs
- `src/server/mcp/__tests__/CodeMapMcpServer.test.ts` - stale projection failure proof aligned to canonical IDs
- `src/cli/__tests__/generate.test.ts` - generate symbol-call dependency proof now asserts canonical ID output

## Decisions Made

- Chose stable module path and symbol file/name/line/column references instead of random entity IDs as canonical edge ID input.
- Kept canonicalization line-insensitive at the dependency ID layer so it stays aligned with existing dedup semantics from Phase 73.
- Failed closed earlier on invalid persisted dependency confidence because initialize-time backfill must read graph truth before hydrating the cache.

## Deviations from Plan

None.

## Issues Encountered

- Invalid dependency-confidence fixtures now fail during `initialize()` rather than later `loadCodeGraph()` reads because initialization performs graph normalization. The test suite was updated to assert the stricter fail-closed behavior.

## Next Phase Readiness

- `POL-03` is complete.
- `v2.6` can now move to Phase 82 (`POL-04` Interface Contract `1.0.0`).

---
*Phase: 81-edge-id-normalization*
*Completed: 2026-05-11*
