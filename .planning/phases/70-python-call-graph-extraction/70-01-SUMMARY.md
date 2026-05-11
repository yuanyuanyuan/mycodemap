---
phase: 70-python-call-graph-extraction
plan: 01
subsystem: parser
tags: [python, call-graph, tree-sitter, analyzer, global-index]

requires:
  - phase: 67-tree-sitter-python-grammar
    provides: Python AST parsing baseline
  - phase: 69-pythontypeenhancer
    provides: Shared Python parser/result baseline
  - phase: 71-parser-legacy-cleanup
    provides: Active runtime uses shared ParseResult contract
provides:
  - conservative Python local call-graph extraction
  - qualified method symbols for symbol-level call truth
  - explicit unsupported_dynamic / ambiguous / unresolved outcomes
  - Python-aware imported callee resolution through global-index
affects: [72-python-complexity-truth, 73-graph-topology-signals-and-dedup, analyzer, graph-truth]

tech-stack:
  added: []
  patterns: [qualified method symbol naming, explicit non-edge call outcomes, Python-aware import resolution]

key-files:
  created: []
  modified:
    - src/interface/types/parser.ts
    - src/interface/types/index.ts
    - src/infrastructure/parser/interfaces/ParserBase.ts
    - src/infrastructure/parser/implementations/TreeSitterParser.ts
    - src/infrastructure/parser/implementations/PythonTreeSitterParser.ts
    - src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts
    - src/core/global-index.ts
    - src/core/__tests__/global-index.test.ts
    - src/core/analyzer.ts
    - src/core/__tests__/analyzer.test.ts

key-decisions:
  - "Python methods use qualified names like `Service.run` so symbol-level edges stay collision-resistant."
  - "Dynamic call shapes remain explicit issues instead of emitting guessed edges."
  - "Imported Python callees resolve through the existing global-index seam with exact indexed matches only."

patterns-established:
  - "Shared call-graph contracts can carry explicit non-edge outcomes via `issues`."
  - "Python import resolution accepts `.py` and `__init__.py` indexed matches without introducing fuzzy file search."

requirements-completed: [PY-07]

duration: 10min
completed: 2026-05-10
---

# Phase 70: Python Call-graph Extraction Summary

**Python AST analysis now emits conservative symbol-level call truth, preserves dynamic non-edge outcomes, and resolves imported Python callees through the existing analyzer/global-index pipeline**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-10T01:24:00Z
- **Completed:** 2026-05-10T01:34:00Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Added shared `callGraph.issues` support for explicit `unresolved` / `ambiguous` / `unsupported_dynamic` outcomes.
- Extended `PythonTreeSitterParser` to emit qualified method symbols and conservative local call relationships.
- Extended `GlobalSymbolIndexBuilder` and `analyzer` so imported Python callees and non-edge metadata survive end-to-end.

## Task Commits

This run did not create isolated task commits because the workspace already contained unrelated in-progress modifications.

## Files Created/Modified
- `src/interface/types/parser.ts` - shared parser call-graph contract now carries explicit non-edge outcomes
- `src/interface/types/index.ts` - module-facing call-graph output now exposes `issues`
- `src/infrastructure/parser/interfaces/ParserBase.ts` - default call-graph result now includes empty `issues`
- `src/infrastructure/parser/implementations/TreeSitterParser.ts` - baseline tree-sitter call-graph shape kept compatible with the extended contract
- `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts` - Python call extraction, qualified method symbol naming, and dynamic issue classification
- `src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` - parser proof for local calls, qualified methods, and `getattr(... )()` negative path
- `src/core/global-index.ts` - Python-aware import resolution for functions and qualified class methods
- `src/core/__tests__/global-index.test.ts` - cross-file imported Python callee resolution proof
- `src/core/analyzer.ts` - analyzer persistence for `callGraph.issues`
- `src/core/__tests__/analyzer.test.ts` - end-to-end Python call-graph persistence proof

## Decisions Made

- Used `Service.run`-style symbol keys for direct class-body methods instead of inventing a second symbol ID system.
- Kept dynamic call handling conservative: preserve explicit issues, emit no guessed call edges.
- Extended the existing shared parser/global-index/analyzer seam instead of adding a Python-only graph channel.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Python call-graph truth is now available for downstream complexity, topology, and graph-write follow-up work.
- Phase 72 can build on the same AST/runtime seam without reopening parser routing or cross-file call infrastructure.

---
*Phase: 70-python-call-graph-extraction*
*Completed: 2026-05-10*

