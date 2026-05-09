# Phase 65: Recursive Impact Analysis - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship graph-native impact traversal on top of the Phase 63/64 persisted graph truth so maintainers can start from a file or symbol entrypoint and retrieve recursive downstream reachability with a compact layered summary. This phase covers entrypoint resolution, recursive traversal, direct-vs-transitive result shaping, and explicit degraded/failure semantics for missing or incomplete graph truth. It does not add community detection, surprise scoring, execution-flow tracing, or a broader server-analysis redesign.

</domain>

<decisions>
## Implementation Decisions

### Unified entrypoint model
- **D-01:** Phase 65 must support both `file` and `symbol` entrypoints as first-class inputs.
- **D-02:** File and symbol entrypoints must be resolved through a shared entrypoint-resolver step before traversal begins.
- **D-03:** After resolution, both entrypoint types must flow through the same recursive traversal and layered result pipeline rather than maintaining separate impact semantics.
- **D-04:** CLI and MCP may keep thin surface-specific adapters, but they must not maintain different impact-traversal truth.

### Result structure and layered summary
- **D-05:** Phase 65 uses a compact layered result shape: `summary + direct[] + transitiveLayers[]`.
- **D-06:** `direct` and `transitive` are part of the returned result structure, not merely a request-time mode switch.
- **D-07:** `direct[]` contains only first-hop impacted nodes.
- **D-08:** `transitiveLayers[]` groups downstream impact by hop/depth so second-hop and deeper reachability remain explainable without flattening everything into one list.
- **D-09:** Every impacted node must expose at least `depth` plus one representative `path`; additional explanation such as reason or edge confidence is allowed when useful.
- **D-10:** The summary must stay compact enough for both human-facing CLI output and agent/MCP structured consumption without requiring callers to post-process raw graph tables.

### Missing-entrypoint and degraded-graph behavior
- **D-11:** Missing or unresolvable entrypoints must return explicit structured failure states rather than an empty success payload.
- **D-12:** Entrypoint ambiguity must be surfaced explicitly as an `ambiguous`-style result, not silently narrowed by heuristics.
- **D-13:** When graph truth is missing, Phase 65 must return an `unavailable`-style result with explicit remediation guidance to regenerate graph truth.
- **D-14:** When graph truth is `partial` or stale, Phase 65 may return impact results, but it must lower confidence and attach warnings about incomplete precision.
- **D-15:** Traversal truncation caused by depth/limit boundaries is allowed, but the result must explicitly mark truncation rather than presenting the output as complete.
- **D-16:** Empty lists are never an acceptable substitute for explicit failure, ambiguity, or degraded-state signaling.

### Delivery surface
- **D-17:** Phase 65’s primary delivery surfaces are CLI and MCP together; both must align to the same entrypoint resolution, traversal, and layered-result truth.
- **D-18:** HTTP `/analysis/impact` may reuse the new capability when practical, but it is not the core completion bar for this phase.
- **D-19:** MCP should stop presenting impact as a separate experimental semantic branch once the shared Phase 65 truth exists; remaining surface differences should be adapter-level only.

### the agent's Discretion
- Exact field names for the shared impact result, as long as `summary + direct[] + transitiveLayers[]` remains the semantic truth.
- Exact resolver API shape for file vs symbol inputs, as long as both inputs converge before traversal.
- Exact confidence/warning code names, as long as missing, ambiguous, partial, stale, and truncated states remain explicit and machine-readable.
- Exact node payload details beyond `depth` and representative `path`, as long as the result stays compact and explainable.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase authority
- `.planning/ROADMAP.md` — Phase 65 goal, plan slot, and success criteria for recursive impact traversal
- `.planning/REQUIREMENTS.md` — locked milestone requirements `IMPT-01` and `IMPT-02`
- `.planning/PROJECT.md` — milestone-level product direction for `v2.3 graph-capability`
- `.planning/STATE.md` — current milestone position showing Phase 64 complete and Phase 65 next

### Prior locked context
- `.planning/phases/64-incremental-graph-refresh/64-CONTEXT.md` — persisted refresh truth, partial/stale semantics, fail-closed downgrade posture, and graph metadata expectations
- `.planning/phases/63-graph-schema-foundation/63-CONTEXT.md` — graph-optimized persistence truth, edge confidence semantics, and CLI/MCP compatibility boundary
- `.planning/phases/62-context-routing-gate/62-CONTEXT.md` — compact structured-output posture, warnings/unknown visibility, and predictable thin-result expectations
- `.planning/phases/61-mcp-direct-execution/61-CONTEXT.md` — one shared execution truth with thin CLI/MCP adapters rather than duplicated semantics

### Existing implementation surfaces
- `src/cli/commands/impact.ts` — current legacy file-level impact command, direct/transitive mode split, and human/JSON shaping baseline
- `src/infrastructure/storage/graph-helpers.ts` — current graph-level impact traversal helpers for module and symbol impact
- `src/infrastructure/storage/adapters/SQLiteStorage.ts` — persisted graph access, existing `calculateImpact` / `calculateSymbolImpact` seams, and graph-backed query surface
- `src/interface/types/storage.ts` — current storage-level `ImpactResult`, `SymbolImpactResult`, graph metadata, and degraded-state types
- `src/server/mcp/service.ts` — current native MCP symbol-impact surface and graph-envelope/error semantics
- `src/server/mcp/types.ts` — current MCP-native impact result/error typing conventions
- `src/server/mcp/server.ts` — MCP tool registration surface, including the current `codemap_impact` experimental boundary
- `src/server/routes/api.ts` — current `/analysis/impact` HTTP route that may optionally reuse the shared Phase 65 capability
- `src/server/handlers/AnalysisHandler.ts` — current unsupported-analysis posture showing why Phase 65 should avoid expanding server scope beyond capability reuse

### Architecture and codebase maps
- `ARCHITECTURE.md` — top-level architecture narrative that should remain aligned as graph capability expands
- `.planning/codebase/STACK.md` — runtime/tooling baseline for Node/TypeScript/SQLite implementation
- `.planning/codebase/ARCHITECTURE.md` — transitional architecture map showing legacy CLI, layered storage, and MCP coexistence
- `.planning/codebase/INTEGRATIONS.md` — local runtime / CLI-first integration guidance relevant to CLI and MCP delivery surfaces

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `impact.ts` already provides a public CLI entry surface and existing output affordances, so the phase can evolve that command instead of inventing a separate new CLI family.
- `graph-helpers.ts` already contains recursive graph traversal helpers for both module and symbol cases, making it the natural starting point for a shared traversal pipeline.
- `SQLiteStorage` already exposes `calculateImpact` and `calculateSymbolImpact`, which can become the shared storage-backed seam after entrypoint resolution is unified.
- `CodeMapMcpService` already returns structured graph-envelope results with explicit error semantics; it is the right adapter pattern for the MCP side of the shared truth.
- `GraphMetadata` and incremental refresh summaries already establish `complete` vs `partial` graph-state truth that Phase 65 can reuse for degraded confidence/warning behavior.

### Established Patterns
- Recent phases consistently prefer one execution/traversal truth with thin compatibility adapters instead of separate CLI and MCP semantics.
- Structured warnings, confidence degradation, and explicit remediation are established project norms; impact must follow that pattern for missing/stale/partial graph truth.
- Compact structured outputs are preferred over flat dumps when both humans and agents are downstream consumers.
- Brownfield convergence in this repo favors evolving existing surfaces in place rather than shipping a parallel "new graph capability" command family.

### Integration Points
- The biggest impact seam is the divide between current file-level CLI impact and symbol-level MCP impact; Phase 65 should collapse that divide at the resolver/traversal layer.
- Result-type changes in `src/interface/types/storage.ts` and `src/server/mcp/types.ts` will have broad blast radius and should be planned carefully.
- Tests will likely need to cover storage/helper-level traversal truth, CLI readable shaping, MCP structured output, and degraded-state behaviors together.
- If `/analysis/impact` is reused, it should consume the new shared truth rather than inventing a third impact implementation.

</code_context>

<specifics>
## Specific Ideas

- Treat entrypoint resolution as the real unification seam: once a file or symbol is mapped into a canonical graph entrypoint, the rest of the pipeline should not care which original surface the request came from.
- Keep the layered result compact: `summary + direct[] + transitiveLayers[]` is enough to explain reachability without drifting into raw graph-debug payloads.
- Prefer representative paths over exhaustive path enumeration in Phase 65; the goal is explainable reachability, not full path-search exhaustiveness.
- Preserve the current explicit graph-envelope style on MCP so missing or partial graph truth remains immediately visible to agent consumers.

</specifics>

<deferred>
## Deferred Ideas

- Community detection remains Phase 66 work and must not be folded into Phase 65 result shaping.
- Surprise score, execution-flow trace, and bare-name resolution stay deferred to later graph/agent-experience milestones.
- A broader server-analysis redesign or making `/analysis/impact` a first-class Phase 65 completion gate is out of scope.
- Exhaustive multi-path explanation, ranking, or path-scoring can be explored later if the compact layered summary proves insufficient.

</deferred>

---

*Phase: 65-recursive-impact-analysis*
*Context gathered: 2026-05-08*
