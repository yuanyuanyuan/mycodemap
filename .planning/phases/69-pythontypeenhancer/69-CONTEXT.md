# Phase 69: PythonTypeEnhancer - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a `PythonTypeEnhancer` that runs after the existing Python AST parse path and enriches Python parse results with type metadata inferred from PEP 484 annotations, Python docstrings, and common high-confidence patterns. This phase delivers: a Python post-parse type enhancement seam, Python type metadata written through the same top-level `typeInfo` entry point used by the TypeScript enhancer, and targeted symbol backfill for directly visible Python type information. It does NOT deliver: parser routing changes, regex fallback policy changes, Python call-graph work, Python complexity work, or parser architecture cleanup that belongs to Phase 71.

</domain>

<decisions>
## Implementation Decisions

### Output Shape and Write-back Contract
- **D-01:** `PythonTypeEnhancer` should follow the existing TypeScript enhancer contract by using top-level `result.typeInfo` as the authoritative enhancement output entry point.
- **D-02:** "Matching the shape that `TypeScriptTypeEnhancer` produces" means downstream readers should use the same field names and read through the same top-level entry surface first, rather than requiring a Python-specific access path.
- **D-03:** Python enhancement should not turn Phase 69 into a parser-interface cleanup phase. Keep the enhancement contract aligned with the existing TS seam instead of introducing a broader parser/result refactor.

### Symbol Backfill Expectations
- **D-04:** Class attribute types should be written to both the top-level type metadata summary and the directly relevant symbol structures when the type signal is explicit and high confidence.
- **D-05:** Symbol backfill is meant to make Python type enrichment visible and easy to inspect, but the top-level `typeInfo` object remains the single authoritative read entry for downstream agents and graph persistence.
- **D-06:** Backfill should stay targeted: populate clearly derivable symbol fields, but do not duplicate every piece of type metadata into every possible symbol location.

### Docstring Parsing Scope
- **D-07:** Support Google, NumPy, and Sphinx docstring styles in Phase 69, but only for a stable, high-confidence subset of each style rather than broad permissive parsing.
- **D-08:** The first-priority extraction targets are function parameter types, return types, and clearly declared class attribute types because those are the roadmap-critical enrichment wins for this phase.
- **D-09:** For complex, ambiguous, or weakly structured docstrings, fail soft: leave the metadata empty rather than guessing or writing low-confidence types into graph truth.
- **D-10:** "Support" for each docstring style in this phase means at least one mainstream, test-backed pattern per style is parsed correctly through fixtures and focused verification.

### Phase Boundary Reinforcement
- **D-11:** Phase 69 is a post-parse type enrichment phase only. It must not reopen Python strict AST-first behavior, parser extension routing, or fallback semantics already locked by Phases 67 and 68.
- **D-12:** Any broader unification of type enhancer contracts, parser interfaces, or layer placement stays deferred to Phase 71 unless a minimal helper is strictly necessary to land the enhancer cleanly.

### the agent's Discretion
- Exact internal helper names and parsing decomposition for Google/NumPy/Sphinx docstring extraction, as long as the external decisions above remain true.
- Exact organization of the Python type metadata inside `typeInfo`, as long as downstream readers use the same top-level entry surface and field naming conventions expected from the TypeScript enhancer path.
- Exact threshold for what counts as "high confidence" within clearly explicit docstring or annotation patterns, as long as ambiguous cases fail soft rather than being guessed.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and Phase Authority
- `.planning/ROADMAP.md` — Phase 69 goal and success criteria; locks Python type enhancement around docstrings, annotations, and graph metadata enrichment
- `.planning/REQUIREMENTS.md` — locked milestone requirements `PY-05` and `PY-06`
- `.planning/PROJECT.md` — v2.4 milestone direction and scope boundary against reopening earlier parser/storage/graph foundations
- `.planning/STATE.md` — current milestone position, prior phase decisions, and readiness context

### Predecessor Phase Decisions
- `.planning/phases/67-tree-sitter-python-grammar/67-CONTEXT.md` — Python AST-first parser baseline, strict no-silent-fallback behavior, and deferred type enhancement boundary
- `.planning/phases/68-multi-language-parser-switching/68-CONTEXT.md` — extension-driven parser routing and phase boundary against relitigating parser switching here
- `.planning/phases/71-parser-legacy-cleanup/71-CONTEXT.md` — explicit deferral of parser/result contract cleanup and enhancer relocation work

### Existing Enhancement and Parse Surfaces
- `src/parser/enhancers/TypeScriptTypeEnhancer.ts` — canonical post-parse enhancement seam and top-level `typeInfo` write-back pattern that Python should follow
- `src/parser/index.ts` — registry-backed parser compatibility layer that currently applies the TypeScript enhancer after parse
- `src/core/analyzer.ts` — main analysis path that currently applies type enhancement before graph/module conversion
- `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts` — current Python AST parse result surface, including explicit signature extraction and Python parser metadata
- `src/parser/interfaces/IParser.ts` — legacy parse result shape that currently carries top-level `typeInfo`

### Architecture and Codebase Context
- `.planning/codebase/STACK.md` — Node/TypeScript/test/runtime baseline for parser and enhancer work
- `.planning/codebase/ARCHITECTURE.md` — transitional architecture constraints; important for keeping Phase 69 narrow
- `.planning/codebase/INTEGRATIONS.md` — confirms this work should stay as an internal parser/enrichment capability rather than a new external surface

### Verification and Fixtures
- `tests/fixtures/python/comprehensive.py` — existing Python fixture already containing annotations and Optional-style patterns relevant to type enrichment
- `src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` — current Python AST verification surface and fixture usage patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/parser/enhancers/TypeScriptTypeEnhancer.ts`: already defines the repository's accepted post-parse enhancement seam and top-level `typeInfo` write-back contract
- `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts`: already extracts Python function signatures, parameters, and return annotations that the enhancer can reuse instead of rediscovering from scratch
- `src/core/analyzer.ts`: already applies type enhancement centrally before converting parse results into downstream module/graph shapes
- `src/parser/index.ts`: existing registry-backed parser compatibility path already knows how to run an enhancer after parsing and before returning results

### Established Patterns
- Type enhancement is currently a post-parse augmentation step, not part of raw parser selection or AST routing
- The codebase is still in a transitional parser architecture, so narrow enhancement work should avoid taking on Phase 71 cleanup scope
- Recent parser phases favor strict, explicit truth over silent fallback or broad guess-heavy heuristics; Python type enhancement should preserve that posture

### Integration Points
- `src/parser/enhancers/`: likely home for the new enhancer in the current architecture, matching the existing TS enhancement seam
- `src/parser/index.ts` and `src/core/analyzer.ts`: the two current places where TypeScript type enhancement is applied and where Python enhancement likely needs to be wired in
- Python fixtures/tests under `tests/fixtures/python/` and `src/infrastructure/parser/__tests__/`: the critical place to prove docstring enrichment increases metadata richness without destabilizing parsing

</code_context>

<specifics>
## Specific Ideas

- The user explicitly chose top-level `typeInfo` as the authoritative Python enhancement entry, with targeted symbol backfill rather than symbol-only storage.
- The user explicitly chose stable-subset docstring support: Google, NumPy, and Sphinx should all be recognized, but only through high-confidence mainstream formats in this phase.
- The user explicitly prioritized correctness over breadth: ambiguous or weakly structured docstring text should be skipped rather than inferred aggressively.

</specifics>

<deferred>
## Deferred Ideas

- Full parser/result contract unification or enhancer relocation work belongs to Phase 71, not Phase 69.
- Broad permissive docstring parsing that tries to cover many edge-case variants can be reconsidered in a future polish phase if the stable subset proves insufficient.
- Python call-graph, cross-file type reasoning, and complexity enrichment remain Phase 70 or later concerns.

</deferred>

---

*Phase: 69-PythonTypeEnhancer*
*Context gathered: 2026-05-09*
