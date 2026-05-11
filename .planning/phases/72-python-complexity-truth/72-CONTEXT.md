# Phase 72: Python Complexity Truth - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Persist Python complexity metrics from the active AST-based Python parser path into shared symbol/module truth, then prove an existing downstream consumer reads that persisted truth. This phase delivers: Python complexity computation on the active shared AST seam, symbol-level writeback for function/method complexity, module-level complexity summary persistence, and a `complexity` CLI proof path that reads shared truth rather than recomputing it by default. It does NOT deliver: parser routing changes, regex fallback revival, new Python-only side channels, topology scoring, hook behavior, or broader graph/schema redesign.

</domain>

<decisions>
## Implementation Decisions

### Truth Writeback Granularity
- **D-01:** Phase 72 persists Python complexity into both **symbol-level** and **module-level** shared truth.
- **D-02:** Function/method complexity must be written next to the corresponding symbol definition, aligning with `PY-08`'s "persist beside symbol definitions" requirement.
- **D-03:** Module-level complexity remains as the aggregate summary surface for downstream readers; symbol-level truth does not replace module summaries.

### Downstream Proof Path
- **D-04:** The required downstream proof path for Phase 72 is the existing `complexity` CLI surface.
- **D-05:** The proof should demonstrate that `complexity` CLI reads persisted shared truth for Python complexity rather than silently recomputing a separate AST-only view by default.
- **D-06:** This phase should optimize for the shortest verifiable proof path, not for expanding complexity consumption into additional MCP/analyzer surfaces.

### Phase Boundary Reinforcement
- **D-07:** Do not reopen parser routing, grammar fallback, or parser/result seam decisions already locked by Phases 67, 69, 70, and 71.
- **D-08:** Do not introduce a Python-only complexity side channel; complexity truth must flow through the existing shared parser/analyzer/module surfaces.

### the agent's Discretion
- Exact internal shape and field placement for symbol-level complexity, as long as it is attached to shared symbol truth and downstream agents can read it without a Python-only adapter.
- Exact wiring between Python complexity extraction and existing shared parser/analyzer seams, as long as the active AST-based Python path remains the source of truth.
- Exact verification strategy for showing `complexity` CLI prefers persisted truth, as long as it clearly distinguishes persisted-read behavior from recomputation behavior.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Authority
- `.planning/ROADMAP.md` — Phase 72 goal, dependency boundary, and success criteria
- `.planning/PROJECT.md` — active milestone goals and remaining `v2.5` scope (`PY-08`)
- `.planning/STATE.md` — recorded milestone state; use only as background, not as authority for changing `v2.5` ordering
- `.planning/milestones/v2.4-REQUIREMENTS.md` — original locked wording for `PY-08`, especially "persist beside symbol definitions"
- `.planning/research/SUMMARY.md` — milestone research ordering and why Phase 72 follows Phase 70

### Prior Phase Decisions
- `.planning/phases/67-tree-sitter-python-grammar/67-CONTEXT.md` — strict AST-first Python parser baseline and explicit deferral of complexity work
- `.planning/phases/69-pythontypeenhancer/69-CONTEXT.md` — top-level shared truth pattern and targeted symbol backfill precedent
- `.planning/phases/70-python-call-graph-extraction/70-CONTEXT.md` — shared parser/result seam, no Python-only side channels, explicit uncertainty posture
- `.planning/phases/70-python-call-graph-extraction/70-01-SUMMARY.md` — confirms Phase 72 should build on the same AST/runtime seam without reopening parser routing
- `.planning/phases/71-parser-legacy-cleanup/71-CONTEXT.md` — shared `ParseResult` / parser contract cleanup; avoid reintroducing legacy parallel paths

### Shared Types and Analyzer Surfaces
- `src/interface/types/parser.ts` — canonical `ParseResult` shape, including top-level `complexity`
- `src/interface/types/index.ts` — shared `ModuleInfo`, `ModuleSymbol`, and `ComplexityMetrics` shapes that Phase 72 may need to extend
- `src/core/analyzer.ts` — current analyzer path that converts `ParseResult` into module truth and already carries top-level `result.complexity`

### Python Parser and Complexity Consumers
- `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts` — active AST-based Python parser path; Phase 72 should extend this seam rather than invent a new parser path
- `src/infrastructure/parser/implementations/TreeSitterParser.ts` — shared AST parser capability and existing complexity hook pattern for non-Python paths
- `src/core/ast-complexity-analyzer.ts` — existing complexity computation seam relevant to implementation choices, but not itself the shared truth contract
- `src/cli/commands/complexity.ts` — required downstream proof surface; currently mixes persisted reads and recomputation paths

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ParseResult.complexity` in `src/interface/types/parser.ts`: existing top-level shared parser truth slot that can carry Python complexity out of the parser path.
- `ModuleInfo.complexity` in `src/interface/types/index.ts`: existing downstream shared module truth slot already populated by the analyzer.
- `src/core/analyzer.ts`: already transfers `result.complexity` into `ModuleInfo.complexity`, making it the natural persistence path.
- `src/core/ast-complexity-analyzer.ts`: existing computation seam that can inform or be reused by Phase 72 if it can be wired without breaking the shared truth contract.

### Established Patterns
- Recent Python phases prefer shared top-level truth plus targeted symbol backfill, rather than language-specific side channels.
- Parser/result truth is already the locked architecture; new Python deep-analysis capabilities should enter through shared `ParseResult` and shared module/symbol surfaces.
- The repo currently tolerates CLI fallback/recompute behavior in some places, but Phase 72's proof path must make persisted-truth reading explicit for Python complexity.

### Integration Points
- Python complexity extraction in `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts`
- Shared parser truth in `src/interface/types/parser.ts`
- Module truth persistence in `src/core/analyzer.ts`
- Shared output types in `src/interface/types/index.ts`
- Downstream proof path in `src/cli/commands/complexity.ts`

</code_context>

<specifics>
## Specific Ideas

- The user explicitly chose **symbol + module** persistence, not module-only truth.
- The user explicitly chose **`complexity` CLI** as the downstream proof path, prioritizing the shortest verifiable consumer.
- The user explicitly wants Phase 72 to stay on the `v2.5` mainline and not drift into `v2.7` / Phase 75 work.

</specifics>

<deferred>
## Deferred Ideas

- Extending persisted complexity consumption into additional MCP/analyzer surfaces beyond the one required proof path
- Class-level or broader aggregate complexity truth, unless strictly needed to support symbol/function and module summary persistence
- Hook behavior (`HOOK-02`) remains Phase 74
- Hub / bridge detection and node dedup (`HOOK-01`, `HOOK-03`) remain Phase 73
- Any parser routing, fallback, or schema redesign work remains outside Phase 72

</deferred>

---

*Phase: 72-python-complexity-truth*
*Context gathered: 2026-05-10*
