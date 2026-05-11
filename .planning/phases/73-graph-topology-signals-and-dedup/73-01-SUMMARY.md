---
phase: 73-graph-topology-signals-and-dedup
plan: 01
subsystem: graph-storage
tags: [topology, dedup, communities, sqlite, mcp]

requires:
  - phase: 70-python-call-graph-extraction
    provides: richer shared graph edges for downstream topology work
  - phase: 72-python-complexity-truth
    provides: phase-boundary reinforcement around shared truth reuse
provides:
  - three-layer duplicate suppression across domain graph materialization, SQLite writeback, and community projection reads
  - module-level hub / bridge topology insight on the persisted community truth path
  - MCP-visible topology output that keeps degraded graph warnings explicit
affects: [community-truth, sqlite-graph, governance-cache, mcp-communities]

tech-stack:
  added: []
  patterns: [canonical dependency dedup key, persisted-truth topology projection, warning-aware MCP exposure]

key-files:
  created:
    - .planning/phases/73-graph-topology-signals-and-dedup/73-01-SUMMARY.md
  modified:
    - src/interface/types/storage.ts
    - src/server/mcp/types.ts
    - src/domain/entities/Dependency.ts
    - src/domain/entities/CodeGraph.ts
    - src/infrastructure/storage/adapters/SQLiteStorage.ts
    - src/infrastructure/storage/community-helpers.ts
    - src/infrastructure/storage/__tests__/community-helpers.test.ts
    - src/infrastructure/storage/__tests__/SQLiteStorage.test.ts
    - src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts
    - src/server/mcp/service.ts
    - src/server/mcp/__tests__/CodeMapMcpServer.test.ts

key-decisions:
  - "Duplicate suppression uses canonical dependency identity with entity-role awareness instead of raw dependency IDs."
  - "First-release topology stays module-level and rides the existing shared community result family."
  - "Community/topology readers dedup again defensively so stale persisted duplicates cannot inflate scores."

patterns-established:
  - "Persisted graph truth can expose topology insight without creating a second ad-hoc graph-analysis surface."
  - "SQLite writeback and projection helpers should both enforce duplicate-safe graph semantics when downstream analytics depend on edge weight."

requirements-completed: [HOOK-01, HOOK-03]

completed: 2026-05-10
---

# Phase 73: Graph Topology Signals and Dedup Summary

**Persisted graph truth now suppresses duplicate dependency artifacts across build, SQLite writeback, and read/projection seams, and the shared community surface exposes first-release module-level hub / bridge insight without forking a second topology path**

## Accomplishments

- Extended the shared community/storage and MCP contracts so community results now carry bounded topology insight (`hubs`, `bridges`, dedup counters).
- Strengthened dependency identity and graph/materialization paths so duplicate graph artifacts collapse before they become persisted SQLite truth.
- Added defensive read/projection dedup in `community-helpers` and computed interpretable module-level hub / bridge candidates from the deduped adjacency.
- Exposed the new topology result through the existing `codemap_communities` MCP path while preserving partial/sparse warning behavior.

## Files Created/Modified

- `src/interface/types/storage.ts` - shared community result now carries topology candidates and dedup counters
- `src/server/mcp/types.ts` - MCP contract mirrors the new topology payload
- `src/domain/entities/Dependency.ts` - canonical dependency key now includes entity-role semantics needed for duplicate suppression
- `src/domain/entities/CodeGraph.ts` - constructor-level dependency dedup protects domain graph materialization
- `src/infrastructure/storage/adapters/SQLiteStorage.ts` - SQLite normalization/writeback now collapses duplicate dependencies before rewriting rows
- `src/infrastructure/storage/community-helpers.ts` - projection reads now dedup defensively and compute module-level hub / bridge output
- `src/infrastructure/storage/__tests__/community-helpers.test.ts` - duplicate-inflation regression proof and topology output assertions
- `src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` - SQLite row-count proof for duplicate collapse
- `src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts` - memory-eager vs sqlite-direct parity proof with duplicate inputs
- `src/server/mcp/service.ts` - maps shared topology truth onto the native communities MCP output
- `src/server/mcp/__tests__/CodeMapMcpServer.test.ts` - end-to-end MCP proof for topology payload plus degraded warnings

## Verification

- `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/community-helpers.test.ts src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts`
- `rtk npx tsc --noEmit`

## Deviations from Plan

None in scope. The implementation stayed on the existing community/MCP surface and did not reopen parser, complexity, or schema-redesign work.

## Issues Encountered

- One community-helper expectation had to be adjusted after the implementation correctly surfaced incident `inherit` edges in the hub explanation set. No code-path change was required.

## User Setup Required

None.

## Next Phase Readiness

- Phase 74 can proceed without revisiting topology or dedup seams.
- Downstream surfaces that want topology insight should read the persisted community result first rather than recomputing graph centrality independently.

---
*Phase: 73-graph-topology-signals-and-dedup*
*Completed: 2026-05-10*
