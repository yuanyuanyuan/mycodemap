# Phase 66: Community Detection Baseline - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a first graph-native community-detection capability on top of the persisted Phase 63-65 graph truth so maintainers and agents can see meaningful module boundaries beyond raw dependency chains. This phase covers baseline clustering, simple weighted graph semantics, interpretable cluster output, and explicit low-signal degradation behavior on at least one existing agent-facing surface. It does not expand into richer graph ranking, dual-surface rollout, symbol-level clustering, or advanced multi-pass community optimization.

</domain>

<decisions>
## Implementation Decisions

### Baseline algorithm and weighting
- **D-01:** Phase 66 uses `Louvain` as the initial community-detection baseline rather than starting with Leiden or a pluggable algorithm framework.
- **D-02:** The implementation should preserve a clean seam for a later Leiden upgrade, but Phase 66 itself does not need to ship algorithm switching.
- **D-03:** Phase 66 locks a first-pass edge-type weighting scheme now instead of using equal weights.
- **D-04:** The weighting scheme should stay simple and interpretable, with stronger structural/call relationships weighted above weaker context-only relationships.
- **D-05:** The historical backlog weights are valid starting guidance for planning and research: `CALLS=1.0`, `INHERITS=0.8`, `IMPORTS_FROM=0.7`, `IMPLEMENTS=0.7`, `DEPENDS_ON=0.6`, `TESTED_BY=0.4`, `CONTAINS=0.3`.

### Cluster grain and graph truth
- **D-06:** Phase 66 clusters at the `module/file` level for the baseline instead of starting with symbol-level or mixed-granularity communities.
- **D-07:** Symbol-level or hybrid communities are explicitly deferred; the baseline should reveal module boundaries first because that is more stable and easier to explain.
- **D-08:** Phase 66 must reuse the persisted graph truth established in Phases 63-65 rather than introducing a separate community-only graph representation.

### Delivery surface
- **D-09:** The first public delivery surface for Phase 66 is an existing `agent-facing` surface, with `MCP` preferred over CLI for the baseline rollout.
- **D-10:** Phase 66 is complete with one well-formed public surface; it does not need to ship CLI and MCP simultaneously.
- **D-11:** If a thin CLI seam or internal helper is useful for implementation, that is acceptable, but only the MCP surface is required to satisfy the baseline completion bar.

### Output shape and degradation posture
- **D-12:** Community output should be primarily `interpretable` rather than a raw algorithm dump.
- **D-13:** The baseline result should include readable cluster summaries plus simple quality/explanation fields, not just opaque community IDs or scores.
- **D-14:** Sparse or weak-signal graphs should still be allowed to return cluster results when possible, but the result must explicitly downgrade confidence and attach warnings instead of overclaiming precision.
- **D-15:** Phase 66 should follow the established graph capability pattern: partial, weak-signal, or otherwise degraded community truth must be surfaced explicitly through structured warnings/status rather than hidden behind empty success or unqualified confidence.
- **D-16:** Hard refusal is reserved for cases where the graph truth is unavailable or clustering cannot be computed meaningfully at all; low-signal alone is not sufficient reason to suppress all output.

### the agent's Discretion
- Exact MCP tool shape and naming, as long as the first public surface is agent-facing and reuses existing graph-envelope conventions.
- Exact cluster summary fields, as long as the output remains readable and includes enough explanation for downstream agents to reason about module boundaries.
- Exact weak-signal heuristics and downgrade thresholds, as long as sparse or low-confidence cases are surfaced honestly and machine-readably.
- Exact internal library choice or implementation style for Louvain, as long as it fits the current TypeScript/Node stack and preserves a later Leiden-upgrade seam.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase authority
- `.planning/ROADMAP.md` — Phase 66 goal, plan slot, and success criteria for community detection baseline
- `.planning/REQUIREMENTS.md` — locked milestone requirements `COMM-01` and `COMM-02`
- `.planning/PROJECT.md` — milestone-level product direction for `v2.3 graph-capability`
- `.planning/STATE.md` — current milestone position showing Phase 65 complete and Phase 66 next

### Prior locked context
- `.planning/phases/65-recursive-impact-analysis/65-CONTEXT.md` — shared graph-native traversal truth, thin surface adapter pattern, and explicit degraded-state semantics
- `.planning/phases/65-recursive-impact-analysis/65-01-SUMMARY.md` — confirms community detection should build on the same persisted truth and degradation posture
- `.planning/phases/64-incremental-graph-refresh/64-CONTEXT.md` — partial/stale graph-state truth, fail-closed posture, and explicit diagnostics conventions
- `.planning/phases/63-graph-schema-foundation/63-CONTEXT.md` — persisted graph truth shape, confidence semantics, and compatibility boundary
- `.planning/phases/62-context-routing-gate/62-CONTEXT.md` — thin structured-output posture and warning visibility conventions for agent-facing surfaces

### Existing implementation surfaces
- `src/infrastructure/storage/graph-helpers.ts` — existing shared graph analysis helper seam and structured warning/confidence behavior
- `src/interface/types/storage.ts` — current shared graph result and graph metadata contract surface
- `src/server/mcp/server.ts` — existing MCP tool registration pattern for graph-native capabilities
- `src/server/mcp/service.ts` — existing persisted-graph MCP adapter and graph-envelope/error conventions
- `src/server/mcp/types.ts` — MCP structured payload conventions
- `src/infrastructure/storage/adapters/SQLiteStorage.ts` — persisted graph load/save and graph metadata access

### Roadmap seeds and historical guidance
- `docs/backlog.md` — historical Phase 66 candidate guidance for Louvain baseline, simple edge weights, community naming, and cohesion scoring

### Architecture and codebase maps
- `ARCHITECTURE.md` — top-level architecture narrative that should remain aligned as graph capability expands
- `.planning/codebase/STACK.md` — runtime/tooling baseline for Node/TypeScript implementation choices
- `.planning/codebase/ARCHITECTURE.md` — current layered + legacy coexistence map and storage/runtime boundaries
- `.planning/codebase/INTEGRATIONS.md` — CLI/runtime/MCP integration seams and local execution expectations

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/infrastructure/storage/graph-helpers.ts` already owns shared graph analysis helpers plus structured warning/confidence shaping; Phase 66 can follow this pattern instead of inventing a separate result language.
- `src/interface/types/storage.ts` already defines shared graph metadata and degraded-state contracts that community detection can reuse or extend.
- `src/server/mcp/server.ts` and `src/server/mcp/service.ts` already provide the best existing pattern for exposing one graph-native capability through a thin agent-facing structured surface.
- `src/infrastructure/storage/adapters/SQLiteStorage.ts` already owns persisted graph truth and metadata access, making it the natural integration seam for community computation.

### Established Patterns
- Recent phases prefer one persisted graph truth with thin adapters rather than parallel CLI/MCP semantics.
- The repository has already standardized on explicit degraded-state signaling (`missing`, `partial`, warnings, confidence reduction) instead of silent empty success.
- Brownfield graph-capability work in `v2.3` evolves existing surfaces in place rather than launching a parallel public command family unless necessary.

### Integration Points
- Community computation should connect to the persisted graph/storage seam first, then flow through an MCP adapter rather than being implemented as a surface-local algorithm.
- Output design should align with the existing graph-envelope style used by MCP graph tools so downstream agents can reason about status/warnings consistently.
- Verification will likely need storage/helper coverage plus real MCP transport proof, following the same validation discipline used in Phase 65.

</code_context>

<specifics>
## Specific Ideas

- Use `module/file` communities as the minimum viable explanatory unit for the baseline.
- Keep the first weighting model simple and readable so cluster behavior can be debugged by maintainers instead of becoming an opaque scoring system.
- Treat low-signal community results like partial impact results: still useful, but visibly downgraded.
- Preserve room for future upgrades such as Leiden, richer naming heuristics, CLI rollout, or more advanced quality metrics without making Phase 66 solve them now.

</specifics>

<deferred>
## Deferred Ideas

- Symbol-level communities and mixed-granularity clustering belong to a later graph-experience phase.
- Simultaneous CLI + MCP rollout is out of scope for the baseline; CLI can follow once the agent-facing surface and cluster semantics are stable.
- Multi-pass refinement such as automatic large-community re-splitting with Leiden is deferred beyond the Phase 66 baseline.
- Rich editable naming/configuration for communities belongs to a later phase; Phase 66 only needs interpretable default summaries.

</deferred>

---

*Phase: 66-community-detection-baseline*
*Context gathered: 2026-05-08*
