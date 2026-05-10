---
phase: 71-parser-legacy-cleanup
plan: 01
subsystem: parser
tags: [parser, analyzer, contracts, compatibility]

provides:
  - active runtime ParseResult unification on interface-layer contracts
  - removal of core/parser legacy adapter shims
  - deprecated legacy IParser surface kept only for compatibility
affects: [core, parser, interface-types]

key-files:
  modified:
    - src/core/analyzer.ts
    - src/core/global-index.ts
    - src/core/__tests__/global-index.test.ts
    - src/parser/index.ts
    - src/parser/interfaces/IParser.ts
    - src/parser/enhancers/PythonTypeEnhancer.ts
    - src/parser/enhancers/__tests__/PythonTypeEnhancer.test.ts
    - src/infrastructure/parser/enhancers/TypeScriptTypeEnhancer.ts
    - src/interface/types/parser.ts

requirements-completed: [PAR-09]
completed: 2026-05-10
---

# Phase 71-01 Summary

**Active runtime now speaks the interface-layer `ParseResult` contract directly, while legacy parser types remain only as deprecated compatibility shells.**

## Accomplishments

- Removed `convertRegistryResultToLegacyResult()` from `src/core/analyzer.ts`.
- Removed `toLegacyParseResult()` from `src/parser/index.ts`.
- Switched analyzer/global-index/enhancers to consume interface-layer `ParseResult`.
- Kept `IParser` / legacy `ParseResult` exportable, but marked compatibility-only and relaxed enough for legacy callers.
- Hoisted `TypeInfo` into `src/interface/types/parser.ts` so active runtime files no longer import legacy parse-shape definitions.

## Verification

- `rtk rg "convertRegistryResultToLegacyResult" src/core/analyzer.ts`
- `rtk rg "import.*ParseResult.*parser/interfaces/IParser" src/core/analyzer.ts`
- `rtk rg "toLegacyParseResult" src/parser/index.ts`
- `rtk rg "from.*parser/interfaces/IParser" src/`
- `rtk npx tsc --noEmit`
- `rtk ./node_modules/.bin/vitest run src/core/__tests__/analyzer.test.ts`
- `rtk ./node_modules/.bin/vitest run src/parser/__tests__`

## Deviations from Plan

None - plan executed exactly as written.

## Notes

- No isolated task commits were created because the workspace already contained in-flight milestone changes outside this plan.
