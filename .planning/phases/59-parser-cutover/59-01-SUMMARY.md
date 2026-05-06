---
phase: 59-parser-cutover
plan: 01
subsystem: parser
tags: [parser, registry, analyzer, deprecation, actionable-errors]

# Dependency graph
requires:
  - phase: 58-subagent-environment-contract-injection
    provides: current actionable-error and verification conventions
provides:
  - Registry-backed analyzer main path without hybrid threshold switching
  - Legacy createParser compatibility wrapper with deprecated mode rejection
  - DEPRECATED_PARSER_MODE actionable error contract
affects: [59-02, 59-03, parser, cli]

# Tech tracking
tech-stack:
  added: []
  patterns: [registry-backed-parser-main-path, actionable-deprecated-input-error]

key-files:
  created: []
  modified:
    - src/core/analyzer.ts
    - src/parser/index.ts
    - src/interface/types/index.ts
    - src/generator/index.ts
    - src/parser/interfaces/IParser.ts
    - src/cli/output/error-codes.ts
    - src/cli/output/errors.ts

key-decisions:
  - "Analyzer main flow now rejects deprecated parser modes instead of silently selecting fast/smart branches"
  - "createParser() remains callable but delegates to a registry-backed compatibility parser"
  - "Known ErrorCodes must survive normalizeError() so DEPRECATED_PARSER_MODE reaches user-facing output intact"

patterns-established:
  - "Deprecated input handling: throw Error with stable code and let output layer attach remediation"
  - "Analyzer orchestration: discover files -> registry.getParserByFile() -> convert to legacy ParseResult -> build graph"

requirements-completed: [PAR-01, PAR-02, PAR-03]

# Metrics
duration: 1 session
completed: 2026-05-06
---

# Phase 59 Plan 01 Summary

**Analyzer and legacy parser entry now share one registry-backed parser truth, while deprecated mode requests fail with a structured DEPRECATED_PARSER_MODE contract**

## Accomplishments

- Removed hybrid-threshold orchestration from `src/core/analyzer.ts` and switched the active parse flow to `createDefaultParserRegistry()` plus per-file routing.
- Kept `createParser()` as a compatibility wrapper in `src/parser/index.ts`, but removed `FastParser`/`SmartParser` selection from the main path.
- Added `DEPRECATED_PARSER_MODE` to the canonical error registry and fixed `normalizeError()` so known codes are preserved instead of collapsing into generic runtime failures.
- Removed `CodeMap.actualMode` and generator output that still advertised the deleted fast/smart runtime split.

## Verification

- `rtk npx tsc --noEmit`
- `rtk ./node_modules/.bin/vitest run src/core/__tests__/analyzer.test.ts`
- `rtk ./node_modules/.bin/vitest run src/cli/output/__tests__/errors.test.ts`

## Files Created/Modified

- `src/core/analyzer.ts` - Single parser orchestration path, parser init/dispose, graph build from registry results
- `src/parser/index.ts` - Compatibility wrapper, deprecated mode rejection, registry-backed parser adapter
- `src/interface/types/index.ts` - Removed `actualMode`, introduced parser-mode input types, added `enhanceTypes`
- `src/parser/interfaces/IParser.ts` - Narrowed active parser mode contract and added compatibility input type
- `src/cli/output/error-codes.ts`, `src/cli/output/errors.ts` - Canonical deprecated parser mode remediation and code-preservation fix
- `src/generator/index.ts` - Removed obsolete mode banner from generated output

## Task Commits

None in this run. Changes remain in the workspace and were verified without creating atomic git commits.

## Deviations from Plan

None on scope. The only implementation-level correction was preserving known `ErrorCodes` during normalization so `DEPRECATED_PARSER_MODE` could actually surface through the existing output layer.

## Next Phase Readiness

Ready for Plan 59-02 and 59-03. The runtime now has one parser truth, so multi-language routing, TS-only enhancement, CLI/config cleanup, and failure-path tests can build on a stable boundary.

---
*Phase: 59-parser-cutover*
*Completed: 2026-05-06*
