---
phase: 45
status: complete
verified: true
verification_date: "2026-05-01"
---

# Phase 45: Failure-to-Action Protocol — Execution Summary

## Objective

Turn every error into a structured, recoverable state transition. Errors return `{attempted, rootCause, remediationPlan, confidence, nextCommand}`, native dependency failures auto-suggest `--wasm-fallback`, agents can attempt remediation via `--apply-suggestion`, and confidence scoring prevents cascading failures.

## What Was Done

### Wave 1: ActionableError Type System & Error Codes

- Extended `StructuredError` to `ActionableError` with `attempted`, `rootCause`, `remediationPlan`, `confidence`, `nextCommand`, `causes` fields
- Created `error-codes.ts` registry with prefix-classified codes: `DEP_*`, `CFG_*`, `RUN_*`, `FS_*`
- Upgraded `normalizeError` to always return `ActionableError` with auto-detected codes from Node.js error patterns
- Added custom error code preservation for codes not in the registry (backward compat with Phase 44)
- Registered `--apply-suggestion` and `--wasm-fallback` global flags in CLI entry point

**Files:** `src/cli/output/types.ts`, `src/cli/output/error-codes.ts`, `src/cli/output/errors.ts`, `src/cli/output/index.ts`, `src/cli/index.ts`

### Wave 2: Auto-Remediation Engine & WASM Fallback Handler

- Implemented `tryApplySuggestion` with 3-gate safety: flag set, confidence >= 0.8, nextCommand exists
- Execution results returned as structured `{type: "result", success, data?}` to stderr NDJSON
- No retry on auto-exec failure — prevents cascading damage
- Implemented `checkAndActivateWasmFallback` reactive handler for tree-sitter/better-sqlite3
- Implemented `createNativeDepError` for standardized ActionableError on native dep failures
- WASM fallback activation sets `CODEMAP_USE_WASM_*` env var for downstream consumption

**Files:** `src/cli/output/apply-suggestion.ts`, `src/cli/output/wasm-fallback.ts`, `src/cli/output/index.ts`

### Wave 3: Command Migration to ActionableError

- Migrated `analyze`, `query`, `deps` commands to pass `attempted` parameter to `formatError`
- Error output now includes specific operation context (e.g., "codemap analyze") instead of "unknown operation"
- Enhanced existing output tests to verify ActionableError fields in both JSON and human modes

**Files:** `src/cli/commands/analyze.ts`, `src/cli/commands/query.ts`, `src/cli/commands/deps.ts`

## Verification Results

- All 1118 tests pass across 481 test suites
- TypeScript compiles with zero errors
- Key test coverage:
  - `apply-suggestion.test.ts`: 6 tests (gate logic, execution, stderr NDJSON)
  - `wasm-fallback.test.ts`: 6 tests (native/WASM detection, fallback activation, createNativeDepError)
  - `errors.test.ts`: 21 tests (JSON/human modes, auto-detection, createActionableError, isActionableError)
  - Enhanced `analyze-output.test.ts`, `query-output.test.ts`, `deps-output.test.ts` with ActionableError assertions

## Success Criteria Mapping

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Errors return `{attempted, rootCause, remediationPlan, confidence, nextCommand}` | Done — normalizeError always returns ActionableError |
| 2 | Native dependency failures auto-suggest `--wasm-fallback` or prebuilt binary URL | Done — DEP_NATIVE_MISSING/DEP_WASM_FALLBACK_AVAILABLE codes |
| 3 | Agents can attempt remediation without human intervention (using `nextCommand`) | Done — tryApplySuggestion with --apply-suggestion flag |
| 4 | Confidence scoring on suggestions prevents cascading failures | Done — 0.8 threshold gate |
| 5 | No auto-execution without explicit `--apply-suggestion` | Done — Gate 1 checks flag |

## Commits

1. `[FEATURE] output: add ActionableError type system, error codes, and global flags (Phase 45, Wave 1)`
2. `[FEATURE] output: add auto-remediation engine and WASM fallback handler (Phase 45, Wave 2)`
3. `[FEATURE] cli: migrate analyze, query, deps commands to ActionableError (Phase 45, Wave 3)`
