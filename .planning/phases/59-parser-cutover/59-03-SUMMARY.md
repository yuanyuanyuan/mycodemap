---
phase: 59-parser-cutover
plan: 03
subsystem: cli
tags: [cli, config, docs, tests, deprecation, wasm-fallback]

# Dependency graph
requires:
  - phase: 59-parser-cutover
    provides: single parser main path and TS-only enhancement seam
provides:
  - Public CLI/config/server parser contract aligned to tree-sitter main path
  - Deprecated parser mode guidance in docs and tests
  - Failure-path proof for deprecated mode output and WASM fallback contract
affects: [verify-work, cli, docs]

# Tech tracking
tech-stack:
  added: []
  patterns: [single-parser-main-path-messaging, deprecated-config-rejection, actionable-failure-proof]

key-files:
  created: []
  modified:
    - src/cli/index.ts
    - src/cli-new/index.ts
    - src/interface/config/index.ts
    - src/server/routes/api.ts
    - src/server/handlers/AnalysisHandler.ts
    - src/cli/config-loader.ts
    - src/cli/commands/generate.ts
    - src/cli/__tests__/config-loader.test.ts
    - src/cli/commands/__tests__/generate.test.ts
    - src/cli/output/__tests__/errors.test.ts
    - docs/ai-guide/OUTPUT.md
    - ARCHITECTURE.md

key-decisions:
  - "Config defaults now use tree-sitter and reject fast/smart/hybrid with DEPRECATED_PARSER_MODE"
  - "generateCommand surfaces actionable formatting on failure instead of a raw stringified error"
  - "Server request types may still describe deprecated inputs, but only as rejected compatibility values, not healthy runtime modes"

patterns-established:
  - "Public contract sync: code, config, tests, and docs should describe the same parser story"
  - "Failure-path proof: preserve stable error code + nextCommand fields and keep WASM fallback tests alongside loader warning text"

requirements-completed: [PAR-05]

# Metrics
duration: 1 session
completed: 2026-05-06
---

# Phase 59 Plan 03 Summary

**CLI/config/server/docs now describe a single tree-sitter parser path, and deprecated mode failures surface through the actionable error contract with tests**

## Accomplishments

- Updated CLI help text, config typing/defaults, and server request types to stop presenting fast/smart/hybrid as healthy runtime modes.
- Made `generateCommand()` print the single parser main-path message and format failures through the existing actionable error output layer.
- Updated `docs/ai-guide/OUTPUT.md` and `ARCHITECTURE.md` so the documented parser contract matches the implemented cutover.
- Added/updated tests proving `DEPRECATED_PARSER_MODE` preserves `nextCommand` and remediation fields, while existing WASM fallback tests continue to validate the native/WASM failure contract.

## Verification

- `rtk npx tsc --noEmit`
- `rtk ./node_modules/.bin/vitest run src/cli/commands/__tests__/generate.test.ts`
- `rtk ./node_modules/.bin/vitest run src/cli/output/__tests__/errors.test.ts src/cli/output/__tests__/wasm-fallback.test.ts`
- `rtk ./node_modules/.bin/vitest run src/cli/__tests__/config-loader.test.ts`

## Files Created/Modified

- `src/cli/index.ts`, `src/cli-new/index.ts` - Updated parser mode help text
- `src/interface/config/index.ts`, `src/cli/config-loader.ts` - Tree-sitter default and deprecated config rejection
- `src/cli/commands/generate.ts` - Single-path messaging and actionable error formatting
- `src/server/routes/api.ts`, `src/server/handlers/AnalysisHandler.ts` - Public request/response types aligned to rejected-compatibility semantics
- `src/cli/__tests__/config-loader.test.ts`, `src/cli/commands/__tests__/generate.test.ts`, `src/cli/output/__tests__/errors.test.ts` - Contract and failure-path tests
- `docs/ai-guide/OUTPUT.md`, `ARCHITECTURE.md` - Documentation sync

## Task Commits

None in this run. Changes remain in the workspace and were verified without creating atomic git commits.

## Deviations from Plan

None on scope. The only practical extension was updating `config-loader` tests because the new tree-sitter default and deprecated-mode rejection changed canonical config semantics.

## Next Phase Readiness

Phase 59 implementation is ready for `verify-work`: runtime path, public contracts, and targeted failure-path tests are aligned around the parser cutover.

---
*Phase: 59-parser-cutover*
*Completed: 2026-05-06*
