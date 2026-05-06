---
phase: 61-mcp-direct-execution
plan: 01
subsystem: mcp
tags: [mcp, direct-execution, shared-seam, cli-wrapper]

requires:
  - phase: 60-storage-convergence
    provides: stable runtime bootstrap and SQLite-only storage truth
provides:
  - Shared contract-tool execution seam for query/deps/analyze
  - CLI wrappers delegated to transport-free execution modules
  - Common execution envelope with status/error/diagnostics/result semantics
affects: [61-02, 61-03, cli, mcp]

tech-stack:
  added: []
  patterns: [contract-tool-executor-seam, thin-cli-wrapper]

key-files:
  created:
    - src/execution/contract-tools/index.ts
    - src/execution/contract-tools/types.ts
    - src/execution/contract-tools/query.ts
    - src/execution/contract-tools/deps.ts
    - src/execution/contract-tools/analyze.ts
  modified:
    - src/cli/commands/query.ts
    - src/cli/commands/deps.ts
    - src/cli/commands/analyze.ts
    - src/cli/storage-runtime.ts

key-decisions:
  - "query / deps / analyze first converge on a family-scoped execution seam instead of inventing a universal command abstraction"
  - "CLI wrappers keep parse/render/exit-code ownership while execution truth moves to src/execution/contract-tools/"
  - "The shared outer envelope standardizes status/error/diagnostics and keeps command-native payloads nested under result"

patterns-established:
  - "Transport-free execution seam reused by multiple surfaces"
  - "Wrapper thinning by delegation, not by duplicating renderer logic inside services"

requirements-completed: [MCP-02, MCP-04]

duration: 1 session
completed: 2026-05-06
---

# Phase 61 Plan 01 Summary

**Phase 61 now has one shared execution truth for `query` / `deps` / `analyze`, and the CLI wrappers no longer own the family’s primary business execution.**

## Accomplishments

- Introduced `src/execution/contract-tools/` as the dedicated direct-execution seam for `query`, `deps`, and `analyze`.
- Moved CLI `query`, `deps`, and `analyze` to call the shared seam and keep only wrapper responsibilities.
- Added a reusable execution envelope with `status`, `error`, `diagnostics`, and nested `result`.
- Centralized code-map runtime loading in `src/cli/storage-runtime.ts` so the shared seam can bootstrap runtime truth without duplicating loader logic.

## Verification

- `rtk proxy npx vitest run src/cli/commands/__tests__/query-output.test.ts src/cli/commands/__tests__/deps-output.test.ts src/cli/commands/__tests__/analyze-command.test.ts`
- `rtk tsc --noEmit`

## Files Created/Modified

- `src/execution/contract-tools/index.ts`, `types.ts`, `query.ts`, `deps.ts`, `analyze.ts` - shared execution modules and result envelope
- `src/cli/commands/query.ts`, `deps.ts`, `analyze.ts` - thin wrappers over the shared seam
- `src/cli/storage-runtime.ts` - centralized runtime loader for shared execution

## Task Commits

None in this run. Changes remain in the workspace and were verified without creating atomic git commits.

## Deviations from Plan

`AnalyzeCommand` itself remains structurally heavier than `query`/`deps`, but its direct-execution truth now lives outside the CLI wrapper, which satisfies the intended Wave 1 boundary without forcing a full rewrite in the same plan.

## Next Phase Readiness

Ready for Plan 61-02. MCP handlers can now route into a stable shared seam instead of shelling out through `cli_redirect`.

---
*Phase: 61-mcp-direct-execution*
*Completed: 2026-05-06*
