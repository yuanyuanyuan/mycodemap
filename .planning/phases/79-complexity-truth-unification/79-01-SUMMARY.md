---
phase: 79-complexity-truth-unification
plan: 01
subsystem: parser
tags: [complexity, canonical-truth, parser, cli, legacy]

requires:
  - phase: 72-python-complexity-truth
    provides: Shared Python module/symbol complexity truth contract
provides:
  - Canonical language-aware complexity seam for active TS/JS/Python/Go paths
  - Active parser writeback through shared ParseResult/ModuleInfo truth
  - Canonical-only CLI behavior without silent estimate or silent AST recompute
  - Deprecated smart-parser complexity delegation proof against silent drift
affects: [parser-truth, analyzer, complexity-cli, legacy-parser]

tech-stack:
  added: []
  patterns: [canonical analyzer seam, shared truth handoff, explicit missing-truth failure]

key-files:
  created:
    - .planning/phases/79-complexity-truth-unification/79-01-SUMMARY.md
  modified:
    - src/core/ast-complexity-analyzer.ts
    - src/core/__tests__/ast-complexity-analyzer.test.ts
    - src/infrastructure/parser/implementations/TreeSitterParser.ts
    - src/infrastructure/parser/implementations/PythonTreeSitterParser.ts
    - src/infrastructure/parser/implementations/GoParser.ts
    - src/infrastructure/parser/__tests__/GoParser.test.ts
    - src/cli/commands/complexity.ts
    - src/cli/commands/__tests__/complexity-command.test.ts
    - src/parser/implementations/smart-parser.ts
    - src/parser/__tests__/smart-parser.test.ts

key-decisions:
  - "src/core/ast-complexity-analyzer.ts is now the canonical complexity seam for active TS/JS/Python/Go flows."
  - "Shared ParseResult / ModuleInfo / symbol truth remains the consumer contract; the source seam changed, not the read contract."
  - "The default complexity CLI path now fails explicitly when canonical truth is missing instead of estimating or silently recomputing."
  - "The deprecated smart-parser no longer carries a separate complexity formula; it delegates to the canonical analyzer."

patterns-established:
  - "Active parsers may adapt file content into one shared analyzer seam without inventing per-language consumer contracts."
  - "Explicit opt-in recompute paths can remain for tooling, but default CLI output must be canonical-only."

requirements-completed: [POL-01]

duration: 55min
completed: 2026-05-11
---

# Phase 79: Complexity Truth Unification Summary

**TS/JS/Python/Go active parser flows now source complexity from one canonical analyzer seam, and the default CLI path no longer fabricates non-canonical complexity output**

## Performance

- **Duration:** 55 min
- **Started:** 2026-05-11T12:20:00+08:00
- **Completed:** 2026-05-11T13:15:00+08:00
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments

- Extended `src/core/ast-complexity-analyzer.ts` from TS file-path analysis into a language-aware canonical complexity entrypoint for TS/JS/Python/Go content.
- Routed active complexity production in `TreeSitterParser`, `PythonTreeSitterParser`, and `GoParser` through that canonical analyzer while preserving shared parser/module truth and Python symbol-level backfill.
- Removed silent estimate/recompute behavior from the default `complexity` CLI path by failing explicitly when canonical truth is missing.
- Delegated deprecated `smart-parser` complexity calculation to the canonical analyzer so compatibility callers cannot drift silently.

## Task Commits

This run did not create an isolated execution commit because the workspace already contained unrelated in-progress modifications.

## Files Created/Modified

- `src/core/ast-complexity-analyzer.ts` - canonical language-aware complexity seam and shared file/content adapters
- `src/core/__tests__/ast-complexity-analyzer.test.ts` - proof for TS/JS/Python/Go canonical content entrypoints
- `src/infrastructure/parser/implementations/TreeSitterParser.ts` - active TS/JS complexity delegation to canonical analyzer
- `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts` - active Python complexity delegation while preserving symbol backfill
- `src/infrastructure/parser/implementations/GoParser.ts` - active Go complexity writeback when `includeComplexity` is requested
- `src/infrastructure/parser/__tests__/GoParser.test.ts` - proof that Go active path now returns shared complexity truth
- `src/cli/commands/complexity.ts` - canonical-only default consumer behavior with explicit missing-truth failure
- `src/cli/commands/__tests__/complexity-command.test.ts` - regression proof for missing-truth failure and no silent AST recompute
- `src/parser/implementations/smart-parser.ts` - deprecated seam now delegates complexity to canonical analyzer
- `src/parser/__tests__/smart-parser.test.ts` - regression proof that smart-parser complexity matches the canonical analyzer

## Decisions Made

- Kept the persisted/shared truth contract intact and changed only the upstream complexity source seam.
- Chose explicit failure for missing canonical truth on the default CLI path instead of warning-plus-estimate.
- Preserved explicit AST recompute capability only behind opt-in programmatic paths (`useAST`), not as silent default behavior.

## Deviations from Plan

None. The active parser convergence, CLI cleanup, and legacy drift proof all landed within the original plan scope.

## Issues Encountered

- Native tree-sitter was unavailable in this environment, so Python-focused tests ran via the existing WASM fallback path.

## User Setup Required

None.

## Verification

- `rtk ./node_modules/.bin/vitest run src/core/__tests__/ast-complexity-analyzer.test.ts`
- `rtk ./node_modules/.bin/vitest run src/core/__tests__/analyzer.test.ts`
- `rtk ./node_modules/.bin/vitest run src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts`
- `rtk ./node_modules/.bin/vitest run src/infrastructure/parser/__tests__/GoParser.test.ts`
- `rtk ./node_modules/.bin/vitest run src/cli/commands/__tests__/complexity-command.test.ts`
- `rtk ./node_modules/.bin/vitest run src/parser/__tests__/smart-parser.test.ts`
- `rtk npx tsc --noEmit`

## Next Phase Readiness

- `POL-01` is now complete; v2.6 can move to `POL-02` without carrying parallel complexity truth seams forward.
- Any downstream consumer that wants canonical complexity should read persisted/shared truth, not re-estimate from symbols or LOC.

---
*Phase: 79-complexity-truth-unification*
*Completed: 2026-05-11*
