---
phase: 63
slug: graph-schema-foundation
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-08
---

# Phase 63 - Validation Strategy

> Per-phase validation contract for the graph schema foundation phase.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts` |
| **Failure-path command** | `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/server/handlers/__tests__/QueryHandler.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts` |
| **Compatibility command** | `rtk ./node_modules/.bin/vitest run src/server/handlers/__tests__/QueryHandler.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts src/cli/commands/__tests__/generate.test.ts src/cli/commands/__tests__/analyze-command.test.ts src/cli/commands/__tests__/deps-output.test.ts src/cli/commands/__tests__/query-output.test.ts` |
| **Type gate** | `rtk tsc --noEmit` |
| **Full suite command** | `rtk npm test` |
| **Real-path check** | `node dist/cli/index.js generate` against a real temp repo and SQLite file, then verify `codemap.json` and SQLite-backed handler reads both succeed |
| **Estimated quick latency** | ~20-40 seconds |

## Sampling Rate

- **After every storage/schema task commit:** Run `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts`
- **After every compatibility task commit:** Run `rtk ./node_modules/.bin/vitest run src/server/handlers/__tests__/QueryHandler.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts src/cli/commands/__tests__/generate.test.ts src/cli/commands/__tests__/analyze-command.test.ts src/cli/commands/__tests__/deps-output.test.ts src/cli/commands/__tests__/query-output.test.ts`
- **After every plan wave:** Run `rtk tsc --noEmit` and `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts src/server/handlers/__tests__/QueryHandler.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts src/cli/commands/__tests__/generate.test.ts src/cli/commands/__tests__/analyze-command.test.ts src/cli/commands/__tests__/deps-output.test.ts src/cli/commands/__tests__/query-output.test.ts`
- **Before `$gsd-verify-work`:** Run `rtk npm test`
- **Max feedback latency:** 40 seconds for focused checks; full-suite latency follows `npm test`

## Verification Coverage Map

| Validation Slice | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Real Evidence Required | Status |
|------------------|-------------|------------|-----------------|-----------|-------------------|------------------------|--------|
| Schema version + projection persistence | `GRAPH-01` | `T-63-01` outdated schema accepted silently | New SQLite schema persists graph-native traversal truth and rejects incompatible old graph DB state with explicit remediation | integration | `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` | Yes | ✅ green |
| Confidence enum round-trip | `GRAPH-03` | `T-63-02` invalid confidence value corrupts persisted truth | `EXTRACTED` / `INFERRED` / `AMBIGUOUS` survive save/load and reject illegal values | integration | `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` | No | ✅ green |
| Cache / direct-read parity | `GRAPH-01`, `GRAPH-02` | `T-63-03` projection truth diverges from compatibility reads | SQLite direct path and cache/parity path expose the same graph truth for supported queries | integration | `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts` | No | ✅ green |
| Handler success-envelope compatibility | `GRAPH-02` | `T-63-04` schema redesign changes shipped query envelope | `query`/handler success payloads remain stable on the new persisted truth | integration | `rtk ./node_modules/.bin/vitest run src/server/handlers/__tests__/QueryHandler.test.ts` | Yes | ✅ green |
| MCP success-envelope compatibility | `GRAPH-02` | `T-63-05` internal schema drift leaks into MCP surface | MCP tools keep their shipped success/error envelope while reading the new persisted truth | integration | `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/CodeMapMcpServer.test.ts` | No | ✅ green |
| Direct-execution compatibility | `GRAPH-02` | `T-63-06` `codemap.json` path regresses while SQLite schema changes | `generate -> codemap.json -> query/deps/analyze` success path still works after schema changes | integration | `rtk ./node_modules/.bin/vitest run src/cli/commands/__tests__/generate.test.ts src/cli/commands/__tests__/analyze-command.test.ts src/cli/commands/__tests__/deps-output.test.ts src/cli/commands/__tests__/query-output.test.ts` | No | ✅ green |
| Rebuild-first failure diagnostics | `GRAPH-01`, `GRAPH-02` | `T-63-07` partial upgrade returns misleading success | Missing projection / stale schema fails closed with rebuild guidance instead of partial truth | integration | `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/server/handlers/__tests__/QueryHandler.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts` | Yes | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

## Wave 0 Requirements

- [x] `src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` — add schema-version gate, projection-row persistence, confidence three-state round-trip, and rebuild-required failure scenario coverage
- [x] `src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts` — add projection/cache parity coverage beyond the current module-only happy path
- [x] `src/server/handlers/__tests__/QueryHandler.test.ts` — add new-schema success-envelope parity plus stale-schema failure diagnostics
- [x] `src/server/mcp/__tests__/CodeMapMcpServer.test.ts` or equivalent — add MCP success-envelope parity on the new persisted truth
- [x] Direct-execution coverage in existing CLI command tests or a new compatibility test — prove `generate -> codemap.json -> query/deps/analyze` remains stable
- [x] Real temp-repo validation recipe — prove `generate -> SQLite -> compatibility read` on real filesystem artifacts instead of mock-only assertions

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real CLI generate cutover on a fresh temp repo | `GRAPH-01`, `GRAPH-02` | Existing automated tests do not yet prove end-to-end `generate` plus SQLite artifact inspection on a fresh repo | Create `mktemp -d`, run `node dist/cli/index.js generate` against a small real fixture repo, confirm `.mycodemap/governance.sqlite` is rebuilt, confirm `.mycodemap/codemap.json` still exists, then run a SQLite-backed query/deps/analyze read path and capture stdout/file evidence |
| Stale-schema remediation proof | `GRAPH-01`, `GRAPH-02` | Failure contract must be readable by humans, not just by assertions over thrown objects | Seed or downgrade a SQLite graph file missing the Phase 63 projection/version, invoke the affected read path, and capture the explicit rebuild/remediation error text |

## Failure Scenarios Required

- **Stale schema:** old SQLite graph DB lacks the Phase 63 schema version or traversal projection and returns explicit rebuild guidance
- **Invalid confidence:** persisted or loaded dependency row contains a confidence outside `EXTRACTED | INFERRED | AMBIGUOUS` and is rejected diagnostically
- **Compatibility drift:** new SQLite schema stores graph truth, but handler/query/MCP/direct-execution success envelope changes; test must fail on payload drift rather than accepting a silent shape change

## Validation Sign-Off

- [x] Focused automated commands cover storage, cache/parity, handler, MCP, and direct-execution compatibility surfaces
- [x] At least one failure-path command is reserved for stale-schema and compatibility-drift checks
- [x] Real filesystem + real subprocess evidence is required before phase closeout
- [x] `rtk tsc --noEmit` remains part of the phase gate
- [x] No watch-mode or mock-only closeout gate is used
- [x] `nyquist_compliant: true` is explicitly set
- [x] Wave 0 test gaps are implemented before execution closeout

**Approval:** approved
