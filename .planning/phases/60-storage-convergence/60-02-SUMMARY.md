---
phase: 60-storage-convergence
plan: 02
subsystem: cli
tags: [storage, config, generate, docs, actionable-errors]

requires:
  - phase: 60-storage-convergence
    provides: SQLite-only runtime truth and unsupported backend rejection
provides:
  - SQLite-default config normalization
  - Actionable unsupported-storage remediation at config/output boundaries
  - Generate/docs/runtime wording aligned to SQLite-only persistence
affects: [60-03, cli, docs, output]

tech-stack:
  added: []
  patterns: [config-boundary-rejection, registry-error-remediation-override]

key-files:
  created: []
  modified:
    - src/cli/config-loader.ts
    - src/interface/config/index.ts
    - src/cli/output/error-codes.ts
    - src/cli/output/errors.ts
    - src/cli/__tests__/config-loader.test.ts
    - src/cli/commands/generate.ts
    - src/cli/commands/__tests__/generate.test.ts
    - docs/ai-guide/OUTPUT.md
    - ARCHITECTURE.md

key-decisions:
  - "Config defaults now point to .mycodemap/governance.sqlite instead of filesystem storage"
  - "filesystem/kuzudb/neo4j fail early with UNSUPPORTED_STORAGE_TYPE and migration guidance"
  - "Known error codes may override registry remediation fields so phase-specific guidance survives formatting"

patterns-established:
  - "Config truth: reject deprecated storage values before runtime work begins"
  - "Output truth: preserve stable error code, remediationPlan, and nextCommand across human/json formatting"

requirements-completed: [STOR-02, STOR-04]

duration: 1 session
completed: 2026-05-06
---

# Phase 60 Plan 02 Summary

**Config defaults, CLI messaging, and docs now all tell the same SQLite-only persistence story.**

## Accomplishments

- Switched default storage config to SQLite and made `auto` a SQLite-family alias instead of a cross-backend router.
- Rejected deprecated `filesystem` and `kuzudb` values at config-loader boundaries with stable `UNSUPPORTED_STORAGE_TYPE` remediation.
- Updated `formatError()` to preserve caller-provided remediation metadata for known error codes.
- Synced `generate` output and architecture/output docs to describe SQLite as the single persistent backend family.

## Verification

- `rtk proxy npx vitest run src/cli/__tests__/config-loader.test.ts src/cli/commands/__tests__/generate.test.ts src/cli/output/__tests__/errors.test.ts`
- `rtk rg -n "filesystem|kuzudb" src/cli/config-loader.ts src/cli/commands/generate.ts docs/ai-guide/OUTPUT.md ARCHITECTURE.md`

## Files Created/Modified

- `src/cli/config-loader.ts` - SQLite defaults, deprecated storage rejection, `autoThresholds` deprecation
- `src/interface/config/index.ts` - Storage contract comments aligned with SQLite-only persistence
- `src/cli/output/error-codes.ts`, `src/cli/output/errors.ts` - Canonical unsupported-storage remediation handling
- `src/cli/commands/generate.ts`, `src/cli/commands/__tests__/generate.test.ts` - Generate-time output and failure-path proof
- `src/cli/__tests__/config-loader.test.ts` - Default, valid, and deprecated storage config coverage
- `docs/ai-guide/OUTPUT.md`, `ARCHITECTURE.md` - Docs sync for parser/storage convergence truth

## Task Commits

None in this run. Changes remain in the workspace and were verified without creating atomic git commits.

## Deviations from Plan

`autoThresholds` was left in the config type surface only as a deprecated field that is recognized and rejected with actionable guidance. This keeps old config files diagnosable without preserving the old routing semantics.

## Next Phase Readiness

Ready for Plan 60-03. Runtime and config surfaces agree on SQLite-only persistence, so fallback validation can focus on observability and recovery paths instead of contract drift.

---
*Phase: 60-storage-convergence*
*Completed: 2026-05-06*
