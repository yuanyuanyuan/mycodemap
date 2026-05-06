---
phase: 59-parser-cutover
plan: 04
gap_closure: true
status: complete
started: 2026-05-06
completed: 2026-05-06
---

## Objective

Add DEPRECATED_PARSER_MODE rejection for deprecated parser modes (fast/smart/hybrid) on the server side, aligning with the CLI-side error handling from 59-01.

## What Changed

### DeprecatedParserModeError (new class)
- `src/server/handlers/AnalysisHandler.ts` — Added `DeprecatedParserModeError` class with statusCode 400, code `DEPRECATED_PARSER_MODE`, and `nextCommand: 'mycodemap doctor'`
- `AnalysisHandler.analyze()` now checks for deprecated mode values before throwing the generic 501, returning a specific 400 with remediation guidance

### API route update
- `src/server/routes/api.ts` — Updated `toAnalysisErrorResponse` to handle `DeprecatedParserModeError`, returning 400 with code and nextCommand fields
- `/analysis` route now uses `AnalyzeRequest` type from AnalysisHandler instead of inline type
- Error response includes `nextCommand` field for deprecated mode errors

### Tests
- `src/server/handlers/__tests__/AnalysisHandler.test.ts` — 4 new tests: fast/smart/hybrid → DeprecatedParserModeError(400), tree-sitter → UnsupportedAnalysisOperationError(501)
- `src/server/routes/__tests__/api-analysis-routes.test.ts` — 2 new tests: POST /analysis with mode=fast → 400 + DEPRECATED_PARSER_MODE, tree-sitter → 501

### Incidental fix
- `src/cli/commands/__tests__/preview-command.test.ts` — Fixed 2 tests using deprecated `mode: 'smart'` in test config, which now fails under config-loader normalization after 59-01. Changed to `mode: 'tree-sitter'`.

## Key Files Created

- `DeprecatedParserModeError` class in `src/server/handlers/AnalysisHandler.ts`
- `isDeprecatedParserModeError` type guard in `src/server/handlers/AnalysisHandler.ts`

## Deviations

None.

## Self-Check

- [x] All tasks executed
- [x] Each task committed individually
- [x] SUMMARY.md created in plan directory
- [x] No modifications to shared orchestrator artifacts
