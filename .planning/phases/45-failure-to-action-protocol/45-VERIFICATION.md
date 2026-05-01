---
status: passed
---

# Phase 45 Verification: Failure-to-Action Protocol

## Success Criteria Checklist

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Errors return `{attempted, rootCause, remediationPlan, confidence, nextCommand}` | ✅ Done — `normalizeError` always returns `ActionableError` |
| 2 | Native dependency failures auto-suggest `--wasm-fallback` or prebuilt binary URL | ✅ Done — `DEP_NATIVE_MISSING` / `DEP_WASM_FALLBACK_AVAILABLE` codes |
| 3 | Agents can attempt remediation without human intervention (using `nextCommand`) | ✅ Done — `tryApplySuggestion` with `--apply-suggestion` flag |
| 4 | Confidence scoring on suggestions prevents cascading failures | ✅ Done — 0.8 threshold gate |
| 5 | No auto-execution without explicit `--apply-suggestion` | ✅ Done — Gate 1 checks flag presence |

## Test Results

- All 1118 tests pass across 481 test suites
- TypeScript compiles with zero errors
- Key test coverage:
  - `apply-suggestion.test.ts`: 6 tests (gate logic, execution, stderr NDJSON)
  - `wasm-fallback.test.ts`: 6 tests (native/WASM detection, fallback activation, createNativeDepError)
  - `errors.test.ts`: 21 tests (JSON/human modes, auto-detection, createActionableError, isActionableError)
  - Enhanced `analyze-output.test.ts`, `query-output.test.ts`, `deps-output.test.ts` with ActionableError assertions

## What Was Implemented

### Wave 1: ActionableError Type System & Error Codes
- Extended `StructuredError` to `ActionableError` with `attempted`, `rootCause`, `remediationPlan`, `confidence`, `nextCommand`, `causes` fields
- Created `error-codes.ts` registry with prefix-classified codes: `DEP_*`, `CFG_*`, `RUN_*`, `FS_*`
- Upgraded `normalizeError` to always return `ActionableError` with auto-detected codes from Node.js error patterns
- Added `--apply-suggestion` and `--wasm-fallback` global flags in CLI entry point

### Wave 2: Auto-Remediation Engine & WASM Fallback Handler
- Implemented `tryApplySuggestion` with 3-gate safety: flag set, confidence >= 0.8, nextCommand exists
- Execution results returned as structured `{type: "result", success, data?}` to stderr NDJSON
- Implemented `checkAndActivateWasmFallback` reactive handler for tree-sitter/better-sqlite3
- Implemented `createNativeDepError` for standardized ActionableError on native dep failures

### Wave 3: Command Migration to ActionableError
- Migrated `analyze`, `query`, `deps` commands to pass `attempted` parameter to `formatError`
- Error output now includes specific operation context instead of "unknown operation"

## Gaps

- Remaining CLI commands beyond `analyze`, `query`, `deps` not yet migrated to ActionableError — planned as follow-up maintenance, not blocking for this phase
