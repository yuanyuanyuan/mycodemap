---
phase: 72-python-complexity-truth
plan: 01
subsystem: parser
tags: [python, complexity, tree-sitter, analyzer, cli]

requires:
  - phase: 70-python-call-graph-extraction
    provides: Stable Python AST deep-analysis seam and shared parser/analyzer writeback path
provides:
  - Python complexity persistence through shared ParseResult and ModuleInfo truth
  - symbol-level complexity backfill for Python functions and methods
  - complexity CLI persisted-read proof path for Python modules
affects: [parser-truth, analyzer, complexity-cli, 73-graph-topology-signals-and-dedup]

tech-stack:
  added: []
  patterns: [shared complexity truth, symbol-level backfill, persisted-read cli fallback]

key-files:
  created: []
  modified:
    - src/interface/types/index.ts
    - src/infrastructure/parser/implementations/PythonTreeSitterParser.ts
    - src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts
    - src/core/__tests__/analyzer.test.ts
    - src/cli/commands/complexity.ts
    - src/cli/commands/__tests__/complexity-command.test.ts

key-decisions:
  - "Python complexity truth is computed on the active tree-sitter Python path, not the deprecated regex path."
  - "Function and method complexity is persisted beside shared symbols, while module summaries remain on shared module truth."
  - "The existing complexity CLI prefers persisted truth and only falls back to AST recompute when persisted function details are missing."

patterns-established:
  - "Shared symbol truth can carry bounded complexity metadata without introducing a Python-only adapter surface."
  - "Downstream complexity reads should prefer persisted module and symbol truth before recomputing."

requirements-completed: [PY-08]

duration: 20min
completed: 2026-05-10
---

# Phase 72: Python Complexity Truth Summary

**Python AST analysis now persists complexity into shared module and symbol truth, and the complexity CLI proves it reads that persisted truth by default**

## Performance

- **Duration:** 20 min
- **Started:** 2026-05-10T10:57:00Z
- **Completed:** 2026-05-10T11:01:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Extended shared symbol truth so Python functions and methods can carry bounded complexity metadata.
- Added Python tree-sitter complexity extraction and symbol backfill inside `PythonTreeSitterParser`.
- Updated the complexity CLI to prefer persisted module and symbol truth, with AST recompute only as an explicit fallback when persisted detail is unavailable.

## Task Commits

This run did not create isolated task commits because the workspace already contained unrelated in-progress modifications.

## Files Created/Modified

- `src/interface/types/index.ts` - shared `ModuleSymbol` contract now carries bounded symbol-level complexity metadata
- `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts` - Python AST complexity extraction, maintainability calculation, and symbol backfill
- `src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` - parser proof for module-level and symbol-level Python complexity persistence
- `src/core/__tests__/analyzer.test.ts` - end-to-end analyzer proof that persisted Python complexity survives into module output
- `src/cli/commands/complexity.ts` - CLI now prefers persisted truth and derives function detail display from shared symbol/module data before recomputing
- `src/cli/commands/__tests__/complexity-command.test.ts` - proof that file-scoped JSON output reads persisted complexity truth

## Decisions Made

- Kept Python complexity extraction inside the active Python parser seam instead of adding a separate helper-only truth path.
- Used symbol backfill for function/method complexity so `PY-08` stays aligned with "persist beside symbol definitions".
- Preserved recompute as a fallback path only when persisted detail is absent, rather than as the silent default.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 73 can now rely on Python deep-analysis truth that includes both call-graph and complexity persistence.
- Any downstream consumer beyond `complexity` CLI should read the shared persisted truth first rather than recomputing Python complexity ad hoc.

---
*Phase: 72-python-complexity-truth*
*Completed: 2026-05-10*
