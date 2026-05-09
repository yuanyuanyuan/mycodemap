---
phase: 66-community-detection-baseline
plan: 01
subsystem: community-detection
tags: [community, mcp, sqlite, graphology, e2e]

requires:
  - phase: 65-recursive-impact-analysis
    provides: shared persisted graph truth, degraded-state envelope, real MCP transport proof
provides:
  - Shared module-level community detection truth over persisted graph storage
  - MCP-native `codemap_communities` surface with interpretable summaries and low-signal warnings
  - Real SQLite + real MCP transport proof for happy-path and sparse degraded-path community output
affects: [mcp, storage, docs, phase-66]

tech-stack:
  added: [graphology, graphology-communities-louvain]
  patterns: [weighted-module-projection, louvain-baseline, thin-mcp-adapter, real-transport-proof]

key-files:
  created:
    - .planning/phases/66-community-detection-baseline/66-01-SUMMARY.md
    - src/infrastructure/storage/community-helpers.ts
    - src/infrastructure/storage/__tests__/community-helpers.test.ts
    - tests/e2e/graph-community-detection.test.ts
  modified:
    - package.json
    - package-lock.json
    - src/interface/types/storage.ts
    - src/server/mcp/types.ts
    - src/server/mcp/service.ts
    - src/server/mcp/server.ts
    - src/server/mcp/__tests__/CodeMapMcpServer.test.ts
    - AI_GUIDE.md
    - ARCHITECTURE.md

key-decisions:
  - "Community detection stays on one shared helper truth; MCP only adapts output shape and does not own clustering logic."
  - "Phase 66 locks a weighted module-level Louvain baseline now, while leaving a clean seam for later algorithm upgrades."
  - "Sparse, singleton-heavy, and partial graph truth reduce confidence through explicit warning codes instead of suppressing output or overclaiming precision."
  - "Real-path validation uses built CLI output, persisted SQLite rows, and real MCP stdio transport rather than mocks."

patterns-established:
  - "Shared community result = summary + communities[] + warnings + remediation."
  - "Public community output is MCP-first and remains interpretable through labels, top_paths, dominant_edge_kinds, and cohesion."

requirements-completed: [COMM-01, COMM-02]

duration: 1 session
completed: 2026-05-09
---

# Phase 66 Plan 01 Summary

**Phase 66 now ships one shared community-detection baseline: persisted graph truth is folded into a weighted module-level projection, clustered with Louvain, and exposed through MCP as an interpretable community summary with explicit low-signal degradation.**

## Accomplishments

- Added shared community contracts in `src/interface/types/storage.ts` and implemented `analyzeCommunitiesInGraph()` in `src/infrastructure/storage/community-helpers.ts` so community truth lives beside existing graph helpers instead of inside an MCP wrapper.
- Locked Phase 66 to the planned real dependency kinds and weights (`call`, `inherit`, `implement`, `import`, `type-ref`), with unsupported or synthetic kinds excluded from the baseline projection.
- Introduced MCP-native `codemap_communities` via `src/server/mcp/service.ts`, `src/server/mcp/types.ts`, and `src/server/mcp/server.ts`, preserving the established `status / confidence / graph_status / warnings / remediation` envelope while exposing interpretable `summary + communities[]` output.
- Normalized community-facing paths relative to the project root so labels and `top_paths` stay readable on real workspaces instead of leaking absolute temp directories.
- Added focused unit/MCP coverage plus a real SQLite + real MCP stdio e2e harness covering both a clear multi-community graph and a sparse singleton-heavy degraded graph.

## Verification

- `rtk npm run build`
- `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/community-helpers.test.ts`
- `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/CodeMapMcpServer.test.ts`
- `rtk ./node_modules/.bin/vitest run tests/e2e/graph-community-detection.test.ts --config vitest.e2e.config.ts`
- `rtk tsc --noEmit`
- `rtk git diff --check`

## Files Created/Modified

- `src/infrastructure/storage/community-helpers.ts`, `src/interface/types/storage.ts` - shared community truth, warnings, and result contract
- `src/server/mcp/service.ts`, `src/server/mcp/types.ts`, `src/server/mcp/server.ts` - MCP adapter, contract, and native tool registration
- `src/infrastructure/storage/__tests__/community-helpers.test.ts`, `src/server/mcp/__tests__/CodeMapMcpServer.test.ts`, `tests/e2e/graph-community-detection.test.ts` - unit, MCP, and real-path verification
- `package.json`, `package-lock.json` - Louvain baseline dependencies
- `AI_GUIDE.md`, `ARCHITECTURE.md` - MCP-first Phase 66 capability and architecture sync

## Task Commits

None in this run. Changes remain in the workspace and were verified without creating atomic git commits.

## Deviations from Plan

The real generated SQLite graph stores absolute module paths in some flows. The shared helper now normalizes community-facing `label` and `top_paths` output back to project-relative paths so the MCP result stays interpretable on real temporary repos and normal workspaces.

## Next Phase Readiness

Ready for milestone verification / closeout. `v2.3 graph-capability` now has schema truth, incremental refresh, recursive impact traversal, and community detection all implemented on the shared persisted graph substrate.

---
*Phase: 66-community-detection-baseline*
*Completed: 2026-05-09*
