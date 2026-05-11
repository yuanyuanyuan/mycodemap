---
phase: 80-mcp-stdio-blank-line-filtering
plan: 01
subsystem: mcp
tags: [mcp, stdio, transport, protocol, validation]

requires:
  - phase: 61-mcp-direct-execution
    provides: stable MCP direct-execution baseline and transport-level test style
provides:
  - Repository-owned MCP stdio transport seam
  - Blank-line filtering before request parsing
  - Explicit JSON-RPC parse-error frames for malformed non-blank payloads
affects: [mcp, transport, protocol-hygiene]

tech-stack:
  added: []
  patterns: [transport boundary filtering, explicit parse-failure framing]

key-files:
  created:
    - .planning/phases/80-mcp-stdio-blank-line-filtering/80-01-SUMMARY.md
    - src/server/mcp/stdio-transport.ts
    - src/server/mcp/__tests__/stdio-transport.test.ts
  modified:
    - src/server/mcp/server.ts

key-decisions:
  - "Blank-line filtering belongs at the MCP stdio transport boundary, not inside tool/service business logic."
  - "Malformed non-blank payloads must surface as explicit JSON-RPC parse-error frames instead of silent swallow."
  - "Production MCP startup path now owns its own stdio transport seam instead of delegating parse behavior entirely to the SDK default transport."

patterns-established:
  - "Transport noise is filtered before protocol parsing, preserving stdout purity."
  - "Transport-level failure cases are verified with real PassThrough stdio wiring, not mock-only tests."

requirements-completed: [POL-02]

duration: 35min
completed: 2026-05-11
---

# Phase 80: MCP Stdio Blank-Line Filtering Summary

**The MCP stdio server now ignores blank input lines before parsing and emits explicit parse-error protocol frames for malformed non-blank payloads.**

## Accomplishments

- Added [stdio-transport.ts](/data/codemap/src/server/mcp/stdio-transport.ts:1) as a repository-owned MCP stdio transport seam.
- Filtered whitespace-only input lines before JSON parsing, eliminating blank-line protocol noise on the `mcp start` path.
- Emitted explicit JSON-RPC parse-error frames for malformed non-blank payloads instead of silently swallowing them.
- Kept valid MCP client flows working on the same stdio path through real transport tests.

## Verification

- `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/stdio-transport.test.ts`
- `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/CodeMapMcpServer.test.ts`
- `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/dynamic-server.test.ts src/server/mcp/__tests__/env-contract-tool.test.ts src/cli/commands/__tests__/mcp.test.ts`
- `rtk npx tsc --noEmit`

## Files Created/Modified

- `src/server/mcp/stdio-transport.ts` - transport-owned blank-line filtering and explicit parse-error framing
- `src/server/mcp/server.ts` - MCP startup path now uses the repository-owned stdio transport
- `src/server/mcp/__tests__/stdio-transport.test.ts` - real stdio regression proof for blank lines and malformed payloads

## Decisions Made

- Chose a thin custom transport seam over patching SDK internals.
- Kept malformed non-blank payloads explicit by writing JSON-RPC parse-error frames to stdout, which preserves protocol purity.
- Limited scope strictly to stdio transport; no tool contract or business-logic changes were needed.

## Deviations from Plan

None.

## Issues Encountered

- Existing MCP registration tests still emit native-vs-contract name-collision warnings for `codemap_env_contract`; those are pre-existing and unrelated to Phase 80.

## Next Phase Readiness

- `POL-02` is complete.
- `v2.6` can now move to Phase 81 (`POL-03` edge ID normalization).

---
*Phase: 80-mcp-stdio-blank-line-filtering*
*Completed: 2026-05-11*
