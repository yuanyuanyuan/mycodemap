---
phase: 63-graph-schema-foundation
plan: 01
subsystem: storage
tags: [sqlite, graph-schema, confidence, compatibility-gate]

requires:
  - phase: 62-context-routing-gate
    provides: stable CLI/MCP direct-execution baseline over SQLite storage
provides:
  - Graph-oriented SQLite schema version with traversal projection
  - `EXTRACTED | INFERRED | AMBIGUOUS` dependency confidence truth across interface/domain/storage
  - Fail-closed rebuild diagnostics for stale schema, projection drift, and invalid confidence rows
affects: [63-02, storage, generate, mcp]

tech-stack:
  added: []
  patterns: [projection-parity-gate, rebuild-first-cutover, confidence-contract]

key-files:
  created: []
  modified:
    - src/interface/types/index.ts
    - src/domain/entities/Dependency.ts
    - src/infrastructure/storage/sqlite/schema.ts
    - src/infrastructure/storage/adapters/SQLiteStorage.ts
    - src/infrastructure/storage/sqlite/GovernanceGraphCache.ts
    - src/cli/commands/generate.ts
    - src/infrastructure/storage/__tests__/SQLiteStorage.test.ts
    - src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts

key-decisions:
  - "Primary truth stays in projects/modules/symbols/dependencies; graph_edges is an internal traversal projection"
  - "Phase 63 uses rebuild-first cutover instead of auto-migrating governance-v3 materialized databases"
  - "Invalid persisted confidence and projection drift are hard failures with `mycodemap generate` remediation"

patterns-established:
  - "Schema compatibility is checked before reads and cache hydration, not silently rewritten during initialize"
  - "Traversal projection is rebuilt transactionally alongside primary truth and parity-checked after writes"

requirements-completed: [GRAPH-01, GRAPH-03]

duration: 1 session
completed: 2026-05-08
---

# Phase 63 Plan 01 Summary

**Phase 63 storage foundation now persists graph truth in a graph-oriented SQLite shape without changing the primary domain tables.**

## Accomplishments

- Replaced the old `high | ambiguous` dependency confidence contract with durable `EXTRACTED | INFERRED | AMBIGUOUS` semantics across interface, domain, generate, and storage.
- Introduced `graph-v1` schema versioning plus internal `graph_edges` traversal projection and indexes for source, target, dependency type, and confidence.
- Added fail-closed compatibility gates so stale `governance-v3` databases, missing projection rows, projection drift, and invalid confidence strings return rebuild-required diagnostics instead of partial success.
- Updated storage/runtime tests to prove projection parity, confidence round-trip, and stale-schema rejection on real SQLite files.

## Verification

- `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts`
- `rtk tsc --noEmit`

## Files Created/Modified

- `src/interface/types/index.ts`, `src/domain/entities/Dependency.ts` - shared dependency confidence contract
- `src/infrastructure/storage/sqlite/schema.ts` - `graph-v1` schema and `graph_edges` projection DDL
- `src/infrastructure/storage/adapters/SQLiteStorage.ts` - transactional projection rebuild, compatibility gates, and projection parity checks
- `src/infrastructure/storage/sqlite/GovernanceGraphCache.ts` - traversal projection-backed cache hydration
- `src/cli/commands/generate.ts` - parser-evidence-based confidence assignment
- `src/infrastructure/storage/__tests__/SQLiteStorage.test.ts`, `src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts` - projection parity and rebuild-required proof

## Task Commits

None in this run. Changes remain in the workspace and were verified without creating atomic git commits.

## Deviations from Plan

The work also fixed a real ESM/runtime blocker in the SQLite loader path indirectly uncovered by the new subprocess verification. That blocker is carried formally by Plan 63-02 because it only manifested under built CLI execution.

## Next Phase Readiness

Ready for Plan 63-02. Handler/MCP/CLI compatibility can now validate against stable persisted truth and explicit failure semantics.

---
*Phase: 63-graph-schema-foundation*
*Completed: 2026-05-08*
