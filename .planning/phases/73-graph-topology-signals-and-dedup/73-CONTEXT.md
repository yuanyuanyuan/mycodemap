# Phase 73: Graph Topology Signals and Dedup - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver interpretable hub / bridge detection on top of the existing persisted graph/community baseline, and protect that topology truth with a three-layer dedup strategy. This phase delivers: module-level topology signals built from persisted graph truth, dedup protection across graph build, persistence/writeback, and read/projection stages, and regression/failure-path proof that duplicate graph artifacts do not inflate topology results. It does NOT deliver: a new symbol-level topology truth layer, new parser capabilities, new Python analysis seams, hook reminder behavior, or broad graph schema redesign.

</domain>

<decisions>
## Implementation Decisions

### Topology Signal Granularity
- **D-01:** Phase 73 ships **module-level first** hub / bridge signals.
- **D-02:** The first release should build on the existing module projection / community baseline rather than opening a new symbol-level topology truth layer.
- **D-03:** Interpretable output for users/agents matters more than maximum granularity in the first release.

### Dedup Boundary
- **D-04:** `HOOK-03` is a **three-layer dedup** strategy: build-time, persistence/writeback-time, and read/projection-time.
- **D-05:** Phase 73 should not assume dedup at one layer is sufficient; topology truth must remain protected even if duplicate artifacts leak from an earlier stage.
- **D-06:** Hub / bridge scoring must be computed only after the dedup protections are in place, not in parallel with untrusted duplicate artifacts.

### Phase Boundary Reinforcement
- **D-07:** Phase 73 must consume the existing persisted graph/community truth rather than introducing ad-hoc per-surface topology calculations.
- **D-08:** Do not reopen parser routing, Python deep-analysis seams, or complexity truth decisions already locked by Phases 70 and 72.

### the agent's Discretion
- Exact scoring algorithm and thresholds for hub / bridge signals, as long as the first release stays module-level and interpretable.
- Exact canonicalization keys or internal helper boundaries for the three dedup layers, as long as duplicate graph artifacts are suppressed across build, persistence, and read/projection stages.
- Exact user-facing surface for the first topology output, as long as it remains consistent with the persisted graph/community baseline and does not silently fork a second truth path.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Authority
- `.planning/ROADMAP.md` — Phase 73 goal, dependency boundary, and success criteria
- `.planning/PROJECT.md` — active milestone scope and remaining `HOOK-01` / `HOOK-03` work
- `.planning/STATE.md` — recorded milestone state; use only as background, not as authority for changing `v2.5` ordering
- `.planning/research/SUMMARY.md` — research ordering and the explicit conclusion that `HOOK-03` is a prerequisite for `HOOK-01`

### Prior Phase Decisions
- `.planning/phases/70-python-call-graph-extraction/70-CONTEXT.md` — richer graph edges now flow through shared truth and should be the topology input baseline
- `.planning/phases/70-python-call-graph-extraction/70-01-SUMMARY.md` — confirms Python call truth is available for downstream graph/topology work
- `.planning/phases/72-python-complexity-truth/72-CONTEXT.md` — phase boundary reinforcement against reopening parser/result seams or introducing side channels
- `.planning/phases/72-python-complexity-truth/72-01-SUMMARY.md` — Python deep-analysis truth now persists through shared module/symbol surfaces

### Persisted Graph and Community Baseline
- `src/infrastructure/storage/community-helpers.ts` — existing module-level community projection, interpretable output fields, and degraded-signal warnings
- `src/infrastructure/storage/graph-helpers.ts` — shared graph clone/query helpers and current graph-truth read behavior
- `src/infrastructure/storage/adapters/SQLiteStorage.ts` — persisted graph truth, graph metadata, and write/read path where writeback dedup may need to apply
- `src/infrastructure/repositories/CodeGraphRepositoryImpl.ts` — repository seam between domain graph truth and storage persistence

### Verification Surfaces
- `src/infrastructure/storage/__tests__/community-helpers.test.ts` — current module-level community truth and degraded-signal proof style
- `src/core/__tests__/analyzer.test.ts` — analyzer-level dependency dedup precedent
- `src/server/mcp/service.ts` — current shared service surface that consumes persisted community truth
- `src/server/mcp/server.ts` — MCP exposure for graph/community-style outputs

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `community-helpers.ts`: already projects persisted graph truth into module-level community signals with interpretable labels, dominant edge kinds, cohesion, and warnings.
- `SQLiteStorage.ts`: already owns persisted graph metadata and write/read paths, making it the likely persistence-layer dedup enforcement seam.
- `CodeGraphRepositoryImpl.ts`: existing repository seam where graph truth still passes before/after storage.
- `core/analyzer.ts` and its tests: already show a precedent for deduplicating dependency edges before downstream consumption.

### Established Patterns
- Persisted graph/community truth is already the accepted source for impact/community surfaces; Phase 73 should extend that path rather than adding a detached topology calculation.
- Existing community outputs degrade confidence and keep warnings visible when graph truth is partial or low-signal; hub / bridge output should follow the same explainability posture.
- Recent deep-analysis phases prefer explicit truth protection over silent heuristics; dedup should be structural and test-backed, not cosmetic.

### Integration Points
- Build-time graph artifact creation feeding into persisted graph truth
- SQLite write/read path in `src/infrastructure/storage/adapters/SQLiteStorage.ts`
- Module-level projection in `src/infrastructure/storage/community-helpers.ts`
- Existing MCP/shared graph result surfaces that may expose the first hub / bridge output

</code_context>

<specifics>
## Specific Ideas

- The user explicitly chose **module-level first** for hub / bridge scoring, not symbol-level first.
- The user explicitly chose **build + persistence + read** as the three dedup layers, not a narrower partial defense.
- The user wants `Phase 73` to stay on the `v2.5` mainline after `70` and `72`, not drift back into `v2.7`.

</specifics>

<deferred>
## Deferred Ideas

- A first-release symbol-level topology truth layer
- Broad graph schema redesign or alternative storage models for dedup
- Hook reminder behavior (`HOOK-02`) remains Phase 74
- Any new parser/deep-analysis capabilities beyond consuming the truth already produced by Phases 70 and 72

</deferred>

---

*Phase: 73-graph-topology-signals-and-dedup*
*Context gathered: 2026-05-10*
