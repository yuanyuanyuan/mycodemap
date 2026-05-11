# Phase 70: Python Call-graph Extraction - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend the shipped Python AST parser/type baseline into a stable Python call-graph path that produces high-confidence function/method-level call relationships and writes them into shared graph truth. This phase delivers: file-local call extraction, cross-file imported callee resolution where it can be proven statically, explicit unresolved/ambiguous/unsupported-dynamic outcomes, and symbol-level dependency edges. It does NOT deliver: Python complexity persistence, hook behavior, topology scoring, broad dynamic dispatch inference, or complex inheritance-based call resolution.

</domain>

<decisions>
## Implementation Decisions

### Call-graph Scope
- **D-01:** Phase 70 uses a **standard first release scope**: cover high-confidence static calls, including direct function calls, direct instance/class method calls, `@staticmethod` / `@classmethod`, and imported function/method calls that can be resolved clearly.
- **D-02:** Do **not** include complex inheritance dispatch inference in this phase. If the true callee depends on non-trivial class hierarchy reasoning, treat it as outside the first-release boundary.
- **D-03:** Do **not** reopen parser routing, grammar fallback, or shared parser/result seam decisions already locked by Phases 68, 69, and 71.

### Dynamic Python Features
- **D-04:** Dynamic call shapes are handled with a **strict conservative policy**. Do not infer edges for `getattr()`, monkey patching, runtime rebinding/aliasing, or duck-typed dynamic dispatch.
- **D-05:** When a call target depends on runtime behavior rather than clear static evidence, preserve that fact explicitly instead of guessing.

### Uncertainty and Edge Emission
- **D-06:** Emit only **high-confidence** call edges into shared graph truth.
- **D-07:** Calls that cannot be proven statically must not produce inferred edges in this phase. They should remain explicitly classified as `unresolved`, `ambiguous`, or `unsupported_dynamic`.
- **D-08:** This phase optimizes for graph truth cleanliness and explainability over aggressive coverage.

### Graph Write-back Granularity
- **D-09:** The canonical write-back unit for Phase 70 is **function/method-level symbol edges** (`caller symbol -> callee symbol`).
- **D-10:** Do not introduce a second file/module-level writeback truth path in this phase. If file-level views are needed, they should be derived later from symbol-level edges.

### the agent's Discretion
- Exact internal representation of unresolved/ambiguous/unsupported-dynamic outcomes, as long as they remain explicit and do not silently degrade into guessed edges.
- Exact helper boundaries between parser extraction, call resolution, and graph writeback, as long as the phase stays within the shared parser/result contract.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Authority
- `.planning/ROADMAP.md` — Phase 70 goal, dependency boundary, and success criteria
- `.planning/REQUIREMENTS.md` — locked requirement `PY-07`
- `.planning/PROJECT.md` — active milestone goals, constraints, and current planning focus
- `.planning/STATE.md` — current milestone/phase state

### Prior Phase Decisions
- `.planning/phases/68-multi-language-parser-switching/68-CONTEXT.md` — shared parser capability, extension-only switching, and strict no-regex-fallback carry-forward
- `.planning/phases/69-pythontypeenhancer/69-CONTEXT.md` — Python type enhancement boundary and explicit deferral of call-graph work to Phase 70+
- `.planning/phases/71-parser-legacy-cleanup/71-CONTEXT.md` — shared `ParseResult` / parser contract cleanup; do not create Python-only side channels

### Parser and Result Contracts
- `src/interface/types/parser.ts` — canonical `ParseOptions`, `ParseResult`, and `CallGraphInfo` shapes
- `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts` — active Python AST parser path and current supported features
- `src/infrastructure/parser/implementations/TreeSitterParser.ts` — shared Tree-sitter parser capability used by the active runtime

### Call Resolution and Downstream Consumption
- `src/core/global-index.ts` — existing cross-file symbol/import/export resolution path that already consumes `ParseResult.callGraph`
- `src/core/analyzer.ts` — active analyzer flow that converts parser truth into module/graph-facing outputs
- `src/orchestrator/adapters/codemap-adapter.ts` — current downstream analysis consumer surface for impact/complexity-related execution paths

### Existing Complexity / Future Boundary
- `src/core/ast-complexity-analyzer.ts` — existing complexity seam; relevant as a neighboring capability that remains out of scope for Phase 70

### Product / Backlog Direction
- `docs/backlog.md` — milestone ordering and the fact that complexity / hook / topology follow in later v2.5 and v2.6 work

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PythonTreeSitterParser` — already owns the Python AST main path, so Phase 70 should extend it rather than introducing a second Python parser.
- `GlobalSymbolIndexBuilder` — already builds file indexes from imports/exports/symbols and consumes `result.callGraph`, making it the natural seam for cross-file Python call resolution.
- Shared `ParseResult.callGraph` contract — already exists, so Phase 70 can write through the canonical top-level surface instead of inventing a Python-only path.

### Established Patterns
- Recent parser phases prioritize explicit failure / explicit uncertainty over silent fallback or guess-heavy inference.
- Shared parser/result truth is already the accepted architecture; new Python deep-analysis work should flow through that seam.
- Transitional legacy vs infrastructure architecture still exists, so Phase 70 should avoid folding in cleanup work already closed by Phase 71.

### Integration Points
- Python AST extraction in `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts`
- Cross-file call resolution in `src/core/global-index.ts`
- Downstream module/graph conversion in `src/core/analyzer.ts`
- Shared graph/analysis surfaces that later consume the new symbol-level edges

</code_context>

<specifics>
## Specific Ideas

- First release should be **standard-scope, high-confidence, symbol-level** rather than broad and heuristic-heavy.
- `staticmethod` / `classmethod` are explicitly in scope for the first release.
- Dynamic Python features should remain visible as unsupported or unresolved, not silently narrowed or guessed.

</specifics>

<deferred>
## Deferred Ideas

- Python complexity persistence (`PY-08`) remains Phase 72, not Phase 70
- Hook behavior (`HOOK-02`) remains Phase 74
- Hub / bridge detection and node dedup (`HOOK-01`, `HOOK-03`) remain Phase 73
- Broad dynamic dispatch heuristics or complex inheritance inference can be reconsidered only in a later follow-up phase

</deferred>

---
*Phase: 70-python-call-graph-extraction*
*Context gathered: 2026-05-10*
