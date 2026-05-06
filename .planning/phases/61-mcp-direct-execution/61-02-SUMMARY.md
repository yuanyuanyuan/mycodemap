---
phase: 61-mcp-direct-execution
plan: 02
subsystem: mcp
tags: [mcp, direct-execution, schema-adapter, output-contract]

requires:
  - phase: 61-mcp-direct-execution
    provides: shared contract-tool execution seam for query/deps/analyze
provides:
  - Direct-execution MCP handlers for query/deps/analyze
  - Structured MCP envelope replacing cli_redirect for the selected family
  - Updated MCP integration tests for success and failure semantics
affects: [61-03, mcp, output]

tech-stack:
  added: []
  patterns: [executor-backed-mcp-handler, envelope-schema]

key-files:
  created: []
  modified:
    - src/server/mcp/schema-adapter.ts
    - src/server/mcp/server.ts
    - src/server/mcp/__tests__/schema-adapter.test.ts
    - src/server/mcp/__tests__/dynamic-server.test.ts
    - src/server/mcp/__tests__/CodeMapMcpServer.test.ts

key-decisions:
  - "codemap_query now reuses the shared contract-tool execution path instead of preserving a hidden second execution truth"
  - "MCP success/failure for the selected family uses one structured envelope instead of status=cli_redirect"
  - "Schema discovery remains contract-driven even though the selected family uses executor-backed handlers"

patterns-established:
  - "Selective direct execution inside schema-adapter without moving business logic into transport code"
  - "MCP tests assert structured success/failure envelopes instead of shell-command hints"

requirements-completed: [MCP-01, MCP-03]

duration: 1 session
completed: 2026-05-06
---

# Phase 61 Plan 02 Summary

**The selected MCP family now executes real logic in-process and returns structured envelopes instead of CLI suggestion stubs.**

## Accomplishments

- Replaced `cli_redirect` success handlers for `codemap_query`, `codemap_deps`, and `codemap_analyze` with executor-backed handlers.
- Kept contract-driven `listTools()` discovery and output-schema exposure while routing the selected family into the shared execution seam.
- Reconciled the `query` naming conflict by making `codemap_query` itself the direct-execution contract tool instead of keeping a hidden `query_contract` truth.
- Rewrote MCP tests so they assert direct execution, structured failures, and no remaining selected-family `cli_redirect` success contract.

## Verification

- `rtk proxy npx vitest run src/server/mcp/__tests__/schema-adapter.test.ts src/server/mcp/__tests__/dynamic-server.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts`
- `rtk tsc --noEmit`

## Files Created/Modified

- `src/server/mcp/schema-adapter.ts` - direct-execution handler routing and structured envelope schema
- `src/server/mcp/server.ts` - contract/native registration reconciliation around `codemap_query`
- `src/server/mcp/__tests__/schema-adapter.test.ts`, `dynamic-server.test.ts`, `CodeMapMcpServer.test.ts` - direct execution and failure-path proof

## Task Commits

None in this run. Changes remain in the workspace and were verified without creating atomic git commits.

## Deviations from Plan

The MCP output schema for `result` is intentionally permissive at the SDK validation boundary to avoid rejecting valid command-native payload variants. The stronger contract is still carried by the shared outer envelope and by command-native payload structure in runtime/test truth.

## Next Phase Readiness

Ready for Plan 61-03. The direct-execution cutover is real, so the remaining work is proof hardening and doc/runtime sync.

---
*Phase: 61-mcp-direct-execution*
*Completed: 2026-05-06*
