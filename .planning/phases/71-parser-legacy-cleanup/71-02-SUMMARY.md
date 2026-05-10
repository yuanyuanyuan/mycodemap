---
phase: 71-parser-legacy-cleanup
plan: 02
subsystem: parser
tags: [parser, tree-sitter, infrastructure, registry]

provides:
  - infrastructure-owned TreeSitterParser as the active TS/JS parser
  - registry cutover from regex TypeScriptParser to shared TreeSitterParser
  - removal of active internal dependency on the legacy tree-sitter parser path
affects: [parser, infrastructure, cli]

key-files:
  created:
    - src/infrastructure/parser/implementations/TreeSitterParser.ts
  modified:
    - src/infrastructure/parser/index.ts
    - src/infrastructure/parser/implementations/TypeScriptParser.ts
    - src/infrastructure/parser/implementations/PythonTreeSitterParser.ts
    - src/infrastructure/parser/__tests__/ParserRegistry.test.ts
    - src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts
    - src/parser/__tests__/tree-sitter-parser.test.ts
    - src/core/__tests__/analyzer.test.ts
    - src/cli/commands/benchmark.ts
  deleted:
    - src/parser/implementations/tree-sitter-parser.ts

requirements-completed: [PAR-10]
completed: 2026-05-10
---

# Phase 71-02 Summary

**`TreeSitterParser` now lives in Infrastructure, is the registry’s active TypeScript/JavaScript parser, and still provides shared AST helpers consumed by the Python parser.**

## Accomplishments

- Moved shared Tree-sitter logic into `src/infrastructure/parser/implementations/TreeSitterParser.ts`.
- Made the new class a real `ParserBase` / `ILanguageParser` implementation with TS/JS registry registration.
- Reduced `TypeScriptParser` to a deprecated compatibility wrapper instead of the active runtime implementation.
- Updated PythonTreeSitterParser, analyzer tests, parser tests, and benchmark entrypoints to use the infrastructure parser.
- Removed the legacy `src/parser/implementations/tree-sitter-parser.ts` file entirely after clearing internal references.

## Verification

- `rtk rg -n "parser/implementations/tree-sitter-parser" src`
- `rtk npx tsc --noEmit`
- `rtk ./node_modules/.bin/vitest run src/parser/__tests__/tree-sitter-parser.test.ts src/infrastructure/parser/__tests__/ParserRegistry.test.ts src/infrastructure/parser/__tests__/TypeScriptParser.test.ts src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts src/core/__tests__/analyzer.test.ts`
- `rtk mycodemap query -s "TreeSitterParser" -j`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Blocking] moved enhancer import paths broke test-time module resolution**
- **Issue:** relocating parser files exposed stale relative imports after the infrastructure cutover.
- **Fix:** updated moved file imports and reran `tsc` plus parser/analyzer suites.
- **Files modified:** `src/infrastructure/parser/enhancers/TypeScriptTypeEnhancer.ts`
- **Verification:** `rtk npx tsc --noEmit`, parser/analyzer vitest suites

---

**Total deviations:** 1 auto-fixed (1 blocking)  
**Impact on plan:** No scope creep; only path-fix work required by the relocation itself.

## Notes

- `mycodemap query -s "TreeSitterParser"` still reported the deleted legacy path immediately after the move, which appears to be index staleness rather than a remaining source import.
