---
phase: 62-context-routing-gate
plan: 02
subsystem: mcp
tags: [mcp, routing, detail-level, filtering, docs]

requires:
  - phase: 62-context-routing-gate
    provides: native `codemap_context` routing tool with storage-backed payload truth
provides:
  - Explicit `minimal` / `standard` routing contract branches
  - Strict `allowedTools` filtering with fail-closed `FILTER_CONFLICT` semantics
  - Focused staleness/compression/filtering verification and public doc sync
affects: [mcp, docs, phase-closeout]

tech-stack:
  added: []
  patterns: [detail-level-contract, fail-closed-tool-filter, routing-doc-sync]

key-files:
  created: []
  modified:
    - src/server/mcp/context-tool.ts
    - src/server/mcp/types.ts
    - src/server/mcp/server.ts
    - src/server/mcp/__tests__/context-tool.test.ts
    - src/server/mcp/__tests__/dynamic-server.test.ts
    - src/server/mcp/__tests__/CodeMapMcpServer.test.ts
    - AI_GUIDE.md
    - ARCHITECTURE.md

key-decisions:
  - "`minimal` and `standard` are explicit payload branches instead of ad hoc wording differences"
  - "`allowedTools` is fail-closed: a route cannot recommend a tool that the same filter hides"
  - "Stale/partial/missing graph truth lowers confidence and becomes visible in warnings instead of being silently ignored"

patterns-established:
  - "Routing compression is enforced by contract shape and verified by focused tests"
  - "Agent-facing docs describe only the shipped native routing surface and its actual filter semantics"

requirements-completed: [CTX-03, CTX-04]

duration: 1 session
completed: 2026-05-06
---

# Phase 62 Plan 02 Summary

**`codemap_context` now has explicit detail levels, strict tool filtering, and closeout proof that the routing contract stays lightweight and internally consistent.**

## Accomplishments

- Added `detailLevel` support for `minimal` and `standard`, keeping `minimal` to summary/count/risk/suggestions and reserving warnings/rationale/focus areas for `standard`.
- Added strict `allowedTools` filtering that returns structured `FILTER_CONFLICT` errors when the filter would hide a route-required suggestion.
- Added focused tests for invalid task input, missing graph truth, stale/partial graph truth, broken filters, and measurable `minimal` vs `standard` size differentiation.
- Synced `AI_GUIDE.md` and `ARCHITECTURE.md` to the shipped `codemap_context` contract.

## Verification

- `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/context-tool.test.ts src/server/mcp/__tests__/dynamic-server.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts`
- `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/context-tool.test.ts -t "invalid|missing|stale|filter|minimal|standard"`
- `rtk tsc --noEmit`

## Files Created/Modified

- `src/server/mcp/context-tool.ts`, `types.ts`, `server.ts` - detail levels, strict filtering, stale-graph handling, MCP input schema
- `src/server/mcp/__tests__/context-tool.test.ts`, `dynamic-server.test.ts`, `CodeMapMcpServer.test.ts` - compression/filter/staleness/failure-path proof
- `AI_GUIDE.md`, `ARCHITECTURE.md` - public routing contract sync

## Task Commits

None in this run. Changes remain in the workspace and were verified without creating atomic git commits.

## Deviations from Plan

The failure-path verification command again needed the repository’s real Vitest entry (`rtk ./node_modules/.bin/vitest run ...`) instead of `rtk npx vitest run ...` because `npx vitest` does not execute correctly in this environment.

## Next Phase Readiness

Phase 62 is implementation-complete. `codemap_context` now exposes a bounded routing contract that can sit on top of the direct-execution MCP surface without leaking unrelated tools or expanding into dossier-style analysis.

---
*Phase: 62-context-routing-gate*
*Completed: 2026-05-06*
