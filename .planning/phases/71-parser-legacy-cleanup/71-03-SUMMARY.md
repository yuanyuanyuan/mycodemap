---
phase: 71-parser-legacy-cleanup
plan: 03
subsystem: architecture
tags: [core, composition-root, parser, enhancers]

provides:
  - injected parser registry / type enhancer context for analyzer
  - infrastructure-owned TypeScriptTypeEnhancer
  - CLI composition root for analysis wiring
affects: [core, cli, composition, interface-types, parser]

key-files:
  created:
    - src/composition/parser-composition.ts
  modified:
    - src/core/analyzer.ts
    - src/interface/types/index.ts
    - src/interface/types/parser.ts
    - src/cli/commands/generate.ts
    - src/cli/commands/watch-foreground.ts
    - src/core/__tests__/analyzer.test.ts
    - src/parser/index.ts
    - src/infrastructure/parser/enhancers/TypeScriptTypeEnhancer.ts

requirements-completed: [PAR-11]
completed: 2026-05-10
---

# Phase 71-03 Summary

**Core no longer constructs parser infrastructure itself; CLI composition code now injects parser registries and type enhancers from the outer layer.**

## Accomplishments

- Removed direct `createDefaultParserRegistry` import from `src/core/analyzer.ts`.
- Added `parserRegistry` and `typeEnhancers` to `AnalysisOptions`.
- Introduced `ITypeEnhancer` in the interface layer.
- Created `src/composition/parser-composition.ts` as the analysis composition root.
- Moved `TypeScriptTypeEnhancer` into `src/infrastructure/parser/enhancers/`.
- Updated `generate` and `watch-foreground` to build and pass analysis context explicitly.

## Verification

- `rtk rg "import.*createDefaultParserRegistry" src/core/analyzer.ts`
- `rtk rg "from.*parser/enhancers/TypeScriptTypeEnhancer" src/`
- `rtk npx tsc --noEmit`
- `rtk ./node_modules/.bin/vitest run src/core/__tests__/analyzer.test.ts src/cli/commands/__tests__/generate.test.ts`

## Deviations from Plan

None - plan executed exactly as written.

## Notes

- The composition root currently lives in `src/composition/parser-composition.ts`, not inside `src/cli/commands/`; this still keeps Infrastructure instantiation outside Core and gives both CLI entrypoints one shared wiring surface.
