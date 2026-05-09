---
phase: 65-recursive-impact-analysis
plan: 01
subsystem: impact-analysis
tags: [impact, cli, mcp, sqlite, e2e]

requires:
  - phase: 64-incremental-graph-refresh
    provides: persisted graph truth, partial-graph metadata, rebuild-required parity gate
provides:
  - Shared graph-native impact contract with layered `direct[]` and `transitiveLayers[]`
  - One resolver/traversal truth reused by CLI `impact` and MCP `codemap_impact`
  - Explicit not_found / ambiguous / unavailable / partial / truncated semantics on shipped surfaces
  - Real built-CLI + MCP transport evidence for success and degraded paths
affects: [phase-66, cli, mcp, storage, docs]

tech-stack:
  added: []
  patterns: [shared-impact-contract, layered-traversal, thin-surface-adapters, real-transport-proof]

key-files:
  created:
    - .planning/phases/65-recursive-impact-analysis/65-01-SUMMARY.md
    - src/cli/commands/__tests__/impact-command.test.ts
    - tests/e2e/graph-impact-analysis.test.ts
  modified:
    - src/cli/commands/impact.ts
    - src/infrastructure/storage/graph-helpers.ts
    - src/infrastructure/storage/adapters/SQLiteStorage.ts
    - src/interface/types/storage.ts
    - src/infrastructure/storage/__tests__/graph-helpers.test.ts
    - src/infrastructure/storage/__tests__/SQLiteStorage.test.ts
    - src/server/mcp/service.ts
    - src/server/mcp/types.ts
    - src/server/mcp/server.ts
    - src/server/mcp/__tests__/CodeMapMcpServer.test.ts
    - src/server/handlers/QueryHandler.ts
    - ARCHITECTURE.md

key-decisions:
  - "Impact truth now resolves file/symbol entrypoints first, then traverses one shared graph-native BFS pipeline."
  - "CLI keeps the existing file-first surface, while MCP keeps the symbol-entry surface; both adapt the same layered result contract."
  - "Partial graph and traversal truncation reduce confidence and surface warnings instead of degrading to empty success."
  - "Real-path validation uses built CLI plus real MCP stdio transport; MCP symbol traversal is seeded through persisted SQLite truth rather than mocks."

patterns-established:
  - "Shared impact result = entrypoint + summary + direct + transitiveLayers + warnings + remediation."
  - "Surface adapters may reshape field names, but they do not own traversal semantics."

requirements-completed: [IMPT-01, IMPT-02]

duration: 1 session
completed: 2026-05-08
---

# Phase 65 Plan 01 Summary

**Phase 65 now ships one shared recursive impact truth: file and symbol entrypoints resolve into the same persisted-graph traversal pipeline, and both CLI and MCP surfaces expose layered direct-vs-transitive results with explicit degraded-state semantics.**

## Accomplishments

- Replaced the legacy `impact` command's local `codemap.json` walk with storage-backed graph truth via `analyzeImpactInGraph()`, preserving the file-first CLI while changing the result semantics to layered `summary + direct[] + transitiveLayers[]`.
- Added a shared impact contract in `src/interface/types/storage.ts` and completed the resolver/traversal helpers in `src/infrastructure/storage/graph-helpers.ts`, including explicit `not_found`, `ambiguous`, `unavailable`, `partial`, and `truncated` states.
- Switched `SQLiteStorage.calculateSymbolImpact()` and MCP `codemap_impact` to the same shared traversal truth instead of keeping a second symbol-only BFS implementation.
- Evolved the MCP impact payload to expose layered direct/transitive output, shared entrypoint metadata, warnings, and remediation while keeping the established `status` / `confidence` / `graph_status` envelope.
- Added targeted CLI/MCP/unit coverage plus a real built-CLI + real MCP stdio e2e harness covering success, missing graph, missing file, ambiguous symbol, partial graph warning, and traversal truncation.

## Verification

- `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/graph-helpers.test.ts src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts src/cli/commands/__tests__/impact-command.test.ts`
- `rtk tsc --noEmit`
- `rtk npm run build`
- `rtk ./node_modules/.bin/vitest run tests/e2e/graph-impact-analysis.test.ts --config vitest.e2e.config.ts`
- `rtk git diff --check`

## Files Created/Modified

- `src/cli/commands/impact.ts` - switched to persisted graph truth and layered output
- `src/interface/types/storage.ts`, `src/infrastructure/storage/graph-helpers.ts`, `src/infrastructure/storage/adapters/SQLiteStorage.ts` - shared impact contract and one traversal truth
- `src/server/mcp/service.ts`, `src/server/mcp/types.ts`, `src/server/mcp/server.ts` - layered MCP adapter and payload contract
- `src/infrastructure/storage/__tests__/graph-helpers.test.ts`, `src/infrastructure/storage/__tests__/SQLiteStorage.test.ts`, `src/server/mcp/__tests__/CodeMapMcpServer.test.ts`, `src/cli/commands/__tests__/impact-command.test.ts`, `tests/e2e/graph-impact-analysis.test.ts` - regression and real-path proof
- `ARCHITECTURE.md` - impact architecture truth updated to shared traversal + thin adapters

## Task Commits

None in this run. Changes remain in the workspace and were verified without creating atomic git commits.

## Deviations from Plan

The real generated fixture did not reliably materialize the symbol caller chain needed for MCP success/truncation proof, so the e2e harness seeds minimal persisted SQLite symbol/dependency rows after `generate --symbol-level`. This preserves real filesystem + real transport validation while avoiding mock-only proof.

## Next Phase Readiness

Ready for Phase 66. Recursive impact traversal now exists as one shared graph capability, so community detection can build on the same persisted truth and explicit degradation posture.

---
*Phase: 65-recursive-impact-analysis*
*Completed: 2026-05-08*
