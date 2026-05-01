---
plan: 49-01
phase: 49-integration-wiring
status: complete
wave: 1
---

# Summary: Loader & Error Handler Wiring

## What Was Built

Unified command action wrapper (`createActionHandler`) that combines three previously disconnected subsystems:

1. **Loader-aware tree-sitter check** — `validateTreeSitterAsync()` replaces synchronous `validateTreeSitter()`, enabling WASM fallback path when native tree-sitter is unavailable.
2. **Centralized error handling** — All tree-sitter-dependent commands now route errors through `formatError()` + `resolveOutputMode()` for consistent structured output.
3. **Suggestion auto-remediation** — `tryApplySuggestion()` is now actually called in the error catch block when `--apply-suggestion` flag is set and error confidence >= 0.8.
4. **Flag consumption** — `--wasm-fallback` and `--apply-suggestion` global flags are now read and acted upon.

## Key Changes

| File | Change |
|------|--------|
| `src/cli/tree-sitter-check.ts` | Added `validateTreeSitterAsync()` — async, uses `detectTreeSitter()`, throws with WASM fallback hint |
| `src/cli/index.ts` | Replaced `wrapWithTreeSitterCheck` with `createActionHandler`; added 6 command wrappers; wired `--wasm-fallback` and `--apply-suggestion` |

## Commands Wrapped

- `generate`, `analyze`, `complexity`, `impact`, `deps`, `cycles`

## Verification

- `npx tsc --noEmit` — 0 errors
- Full test suite: 119 files, 1129 tests — all passed

## Deviations

None. Implementation followed PLAN.md exactly.

## Self-Check: PASSED
