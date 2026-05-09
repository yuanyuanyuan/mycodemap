---
phase: 63-graph-schema-foundation
plan: 02
subsystem: cli-mcp
tags: [compatibility, e2e, mcp, query-handler, sqlite-loader]

requires:
  - phase: 63-graph-schema-foundation
    provides: graph-v1 schema, traversal projection, and fail-closed compatibility gate
provides:
  - Stable handler/MCP success envelopes on the new persisted truth
  - Real subprocess proof for `generate` + `query` success path and stale-projection failure path
  - ESM-safe SQLite-family loader for built CLI execution
affects: [phase-64, cli, mcp, dist]

tech-stack:
  added: []
  patterns: [compatibility-envelope-lock, real-subprocess-proof, esm-safe-loader]

key-files:
  created:
    - tests/e2e/graph-schema-foundation.test.ts
  modified:
    - src/server/handlers/__tests__/QueryHandler.test.ts
    - src/server/mcp/__tests__/CodeMapMcpServer.test.ts
    - src/cli/commands/__tests__/generate.test.ts
    - src/infrastructure/storage/adapters/sqlite-loader.ts

key-decisions:
  - "Compatibility proof stays at the envelope level; no new CLI/MCP output fields were introduced for Phase 63"
  - "Real subprocess verification uses built `dist/cli/index.js` for success and built `SQLiteStorage` for stale-schema failure proof"
  - "The SQLite-family loader must be ESM-safe because graph verification runs through built CLI entrypoints, not only source tests"

patterns-established:
  - "Upper-layer tests prove stale graph truth does not degrade into false success"
  - "Built CLI verification uses the same `dist/` entrypoints shipped to users"

requirements-completed: [GRAPH-02]

duration: 1 session
completed: 2026-05-08
---

# Phase 63 Plan 02 Summary

**Phase 63 compatibility proof now covers handler, MCP, direct-execution CLI, and real subprocess failure remediation on top of the new graph persistence truth.**

## Accomplishments

- Extended `QueryHandler` and MCP tests so Phase 63 reads keep their stable success envelopes while stale projection state is rejected instead of returning empty success.
- Added generate-command regression coverage that locks parser-backed dependency confidence to `EXTRACTED` during persistence.
- Fixed `sqlite-loader.ts` to use ESM-safe module loading so built CLI subprocesses can initialize SQLite-family backends without crashing on `require is not defined`.
- Added `tests/e2e/graph-schema-foundation.test.ts` to prove the built CLI writes both `.mycodemap/governance.sqlite` and `.mycodemap/codemap.json`, keeps `query --search` successful, and fails closed with rebuild guidance after projection tampering.

## Verification

- `rtk ./node_modules/.bin/vitest run src/server/handlers/__tests__/QueryHandler.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts src/cli/commands/__tests__/generate.test.ts src/cli/commands/__tests__/analyze-command.test.ts src/cli/commands/__tests__/deps-output.test.ts src/cli/commands/__tests__/query-output.test.ts`
- `rtk npm run build`
- `rtk ./node_modules/.bin/vitest run tests/e2e/graph-schema-foundation.test.ts --config vitest.e2e.config.ts`
- `rtk tsc --noEmit`

## Files Created/Modified

- `src/server/handlers/__tests__/QueryHandler.test.ts` - success-envelope stability and stale-schema rejection
- `src/server/mcp/__tests__/CodeMapMcpServer.test.ts` - partial-graph envelope stability and stale persisted truth rejection
- `src/cli/commands/__tests__/generate.test.ts` - confidence persistence regression lock
- `src/infrastructure/storage/adapters/sqlite-loader.ts` - ESM-safe module loading for CLI/runtime SQLite fallback paths
- `tests/e2e/graph-schema-foundation.test.ts` - real filesystem + real subprocess success/failure proof

## Task Commits

None in this run. Changes remain in the workspace and were verified without creating atomic git commits.

## Deviations from Plan

The stale-schema failure proof had to use a real Node subprocess importing built `SQLiteStorage` instead of a direct CLI read command, because the shipped `query` / `deps` / `analyze` family still reads `codemap.json` as its direct-execution truth in this milestone.

## Next Phase Readiness

Ready for Phase 64. The graph persistence layer and its compatibility contract are now stable enough for incremental refresh work to build on.

---
*Phase: 63-graph-schema-foundation*
*Completed: 2026-05-08*
