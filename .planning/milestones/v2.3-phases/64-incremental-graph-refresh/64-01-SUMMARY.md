---
phase: 64-incremental-graph-refresh
plan: 01
subsystem: incremental-refresh
tags: [incremental, generate, sqlite, codemap-json, e2e]

requires:
  - phase: 63-graph-schema-foundation
    provides: graph-v1 persisted truth, projection parity gate, direct-execution sync baseline
provides:
  - Scoped incremental refresh on the existing `generate` path
  - `git diff` / explicit changed-files scope resolution with fail-closed downgrade
  - `success | partial | failed` refresh summary persisted into SQLite metadata and emitted via JSON/human output
  - Real subprocess proof for incremental success, partial, and fail-closed failure paths
affects: [phase-65, cli, storage, direct-execution]

tech-stack:
  added: []
  patterns: [incremental-scope-resolution, merged-truth-writeback, fail-closed-refresh, real-subprocess-proof]

key-files:
  created:
    - .planning/phases/64-incremental-graph-refresh/64-01-SUMMARY.md
  modified:
    - src/cli/commands/generate.ts
    - src/cli/index.ts
    - src/interface/types/storage.ts
    - src/interface/types/index.ts
    - src/domain/entities/CodeGraph.ts
    - src/domain/repositories/CodeGraphRepository.ts
    - src/infrastructure/repositories/CodeGraphRepositoryImpl.ts
    - src/infrastructure/storage/graph-helpers.ts
    - src/infrastructure/storage/adapters/SQLiteStorage.ts
    - src/cli/commands/__tests__/generate.test.ts
    - src/infrastructure/storage/__tests__/SQLiteStorage.test.ts
    - tests/e2e/graph-schema-foundation.test.ts

key-decisions:
  - "Incremental refresh stays on `generate` instead of opening a new public refresh API or a second graph-writing command."
  - "The command computes scope from existing persisted truth, re-analyzes only the invalidated file set, then rebuilds one merged full truth for both SQLite and `codemap.json`."
  - "When scope is unreliable or the changed file is outside current graph truth, the command returns `failed` with explicit full-regenerate remediation instead of auto-falling back."
  - "Partial refresh keeps stale slices from the previous truth and records the degraded state explicitly in `last_refresh_summary_json`."

patterns-established:
  - "JSON-mode generate suppresses analyzer chatter so structured output stays machine-parseable."
  - "Incremental verification uses real filesystem + real subprocess evidence for success, partial, and fail-closed cases."

requirements-completed: [INCR-01, INCR-02]

duration: 1 session
completed: 2026-05-08
---

# Phase 64 Plan 01 Summary

**Phase 64 now ships one incremental refresh path on top of the persisted graph truth, with conservative 2-hop invalidation, explicit diagnostics, and real-process proof that stale or unreliable scope fails closed.**

## Accomplishments

- Extended `mycodemap generate` with `--incremental`, `--changed-files`, `--base`, `--against`, `--json`, and `--structured`, while keeping the command on the existing generate surface instead of opening a new refresh API.
- Added refresh contracts for `success | partial | failed`, changed/reused/recomputed/invalidated/failed counts, stable diagnostics codes, and affected-slice reasons. The latest refresh summary now persists in SQLite metadata and travels with the in-memory graph truth.
- Implemented incremental scope resolution from either explicit changed files or `git diff`, then derived a conservative 2-hop bidirectional invalidation neighborhood from persisted graph edges before re-analyzing only the affected files.
- Chose merged full-truth writeback instead of in-place SQLite surgery: recomputed slices replace only the refreshed modules, failed slices keep prior truth as stale, and the merged result is written back to both SQLite and `codemap.json`.
- Added contract tests plus real subprocess e2e coverage for incremental success, partial refresh via unreadable changed-file failure, and fail-closed rejection when a changed file falls outside the persisted graph truth.

## Verification

- `./node_modules/.bin/vitest run src/cli/commands/__tests__/generate.test.ts src/infrastructure/storage/__tests__/SQLiteStorage.test.ts`
- `./node_modules/.bin/vitest run tests/e2e/graph-schema-foundation.test.ts --config vitest.e2e.config.ts`
- `./node_modules/.bin/tsc --noEmit`
- `git diff --check`

## Files Created/Modified

- `src/cli/commands/generate.ts` - incremental scope resolution, merged-truth writeback, JSON/human refresh envelope
- `src/cli/index.ts` - generate CLI flags for incremental refresh and structured output
- `src/interface/types/storage.ts`, `src/interface/types/index.ts` - refresh summary contract shared across CLI, repository, storage, and persisted metadata
- `src/domain/entities/CodeGraph.ts`, `src/domain/repositories/CodeGraphRepository.ts`, `src/infrastructure/repositories/CodeGraphRepositoryImpl.ts` - repository seam for refresh-summary persistence
- `src/infrastructure/storage/graph-helpers.ts`, `src/infrastructure/storage/adapters/SQLiteStorage.ts` - conservative neighborhood collection and `last_refresh_summary_json` persistence
- `src/cli/commands/__tests__/generate.test.ts`, `src/infrastructure/storage/__tests__/SQLiteStorage.test.ts`, `tests/e2e/graph-schema-foundation.test.ts` - unit + storage + real subprocess proof

## Task Commits

None in this run. Changes remain in the workspace and were verified without creating atomic git commits.

## Deviations from Plan

The partial-path real-world rehearsal uses an unreadable changed file rather than a pure syntax error, because the shipped parser stack is permissive enough that malformed TypeScript did not reliably produce a failed slice under real subprocess execution.

## Next Phase Readiness

Ready for Phase 65. Persisted graph truth now supports scoped refresh with explicit degradation semantics, so recursive impact traversal can build on a stable incremental substrate.

---
*Phase: 64-incremental-graph-refresh*
*Completed: 2026-05-08*
