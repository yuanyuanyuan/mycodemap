# Phase 79: Complexity Truth Unification - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Unify complexity calculation for active TS/JS/Python/Go parser flows so downstream surfaces read one canonical complexity truth instead of mixing persisted truth, regex heuristics, AST fallback recompute, and placeholder estimates. This phase delivers: one canonical complexity calculation path, shared writeback into existing parser/module/symbol truth where applicable, explicit handling for files or languages that cannot produce canonical truth, and regression proof that deprecated complexity paths no longer silently diverge. It does NOT deliver: new parser routing modes, new CLI features, broader graph/schema redesign, preview/plugin cleanup outside active paths, or extra reporting surfaces beyond preserving current behavior on existing consumers.

</domain>

<decisions>
## Implementation Decisions

### Canonical Truth Model
- **D-01:** `src/core/ast-complexity-analyzer.ts` is the canonical complexity calculation seam for active parser flows in this phase.
- **D-02:** Downstream consumers should continue reading shared parser/module/symbol truth where it already exists; the unification work is to make that persisted/shared truth originate from the canonical analyzer instead of parallel implementations.
- **D-03:** Phase 72's persisted Python module/symbol truth remains valid and must be preserved; Phase 79 aligns its source with the canonical analyzer rather than replacing persisted read behavior.

### Failure and Drift Policy
- **D-04:** If a file or language cannot produce canonical complexity truth on the active path, the system must fail explicitly or surface a clearly non-canonical warning path during migration; no silent estimate/placeholder truth should masquerade as canonical output.
- **D-05:** At least one regression proof must show that a previously parallel complexity seam no longer drifts silently from the canonical analyzer.

### Detail Identity and Shared Read Contract
- **D-06:** Function and method detail should stay aligned to the existing shared symbol / qualified-name contract, including symbol-level complexity where already supported.
- **D-07:** Module totals and function details must remain readable through existing consumer paths (`complexity` CLI, analyzer/module truth, storage-backed reads) without forcing downstream surfaces to invent a new adapter.

### Scope Boundary for This Phase
- **D-08:** Phase 79 only needs to unify active parser flows, analyzer truth handoff, storage/read paths, and the current `complexity` CLI consumer.
- **D-09:** Preview scanners, plugins, and legacy helper surfaces outside the active parser/analyzer/CLI path are not required closeout targets for this phase unless they are proven to block the canonical path claim.

### the agent's Discretion
- Exact adapter shape between `ast-complexity-analyzer.ts` and each active language parser, as long as all active paths converge on one canonical calculation seam.
- Exact migration mechanics for any warn-only transitional path, as long as non-canonical results are explicit and test-backed.
- Exact regression test placement, as long as it proves deprecated complexity seams no longer silently diverge.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Authority
- `.planning/ROADMAP.md` — Phase 79 goal, dependencies, and success criteria for canonical complexity truth
- `.planning/PROJECT.md` — active milestone framing for `v2.6 polish-and-stabilize` and the requirement to start Phases `79-83`
- `.planning/STATE.md` — current project position showing Phase 79 is the active next step
- `.planning/REQUIREMENTS.md` — `POL-01` wording for shared canonical complexity truth across TS/JS/Python/Go paths
- `docs/backlog.md` — retained `v2.6` backlog statement that `ast-complexity-analyzer.ts` becomes the unique complexity source

### Prior Phase Decisions
- `.planning/phases/72-python-complexity-truth/72-CONTEXT.md` — locked Python persisted-truth decisions that Phase 79 must preserve while changing the source seam
- `.planning/phases/72-python-complexity-truth/72-01-SUMMARY.md` — confirms Python complexity already flows through shared module/symbol truth and `complexity` CLI persisted-read behavior
- `.planning/phases/71-parser-legacy-cleanup/71-CONTEXT.md` — parser/runtime contract cleanup and warning against reintroducing parallel legacy paths

### Current Complexity Seams
- `src/core/ast-complexity-analyzer.ts` — intended canonical calculation seam for this phase
- `src/cli/commands/complexity.ts` — current consumer that mixes persisted truth, estimation, and AST fallback
- `src/core/analyzer.ts` — shared analyzer flow that requests parser complexity and converts it into module truth
- `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts` — active Python parser path with custom complexity extraction and symbol writeback
- `src/infrastructure/parser/implementations/TreeSitterParser.ts` — active shared TS/JS parser path with its own regex-style complexity calculation
- `src/parser/implementations/smart-parser.ts` — legacy parser path still carrying a separate complexity implementation
- `src/infrastructure/parser/interfaces/ParserBase.ts` — placeholder complexity implementation that can leak non-canonical truth if left active

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/core/ast-complexity-analyzer.ts`: already computes file-level and function-level complexity details and is the natural canonical seam for Phase 79.
- `src/core/analyzer.ts`: already requests `includeComplexity: true` and transfers parser complexity into shared module truth, so it is the right convergence handoff.
- `src/cli/commands/complexity.ts`: already prefers persisted/shared truth in parts of the read path, which means Phase 79 can preserve consumer behavior while fixing upstream source drift.
- `src/interface/types/parser.ts` and `src/interface/types/index.ts`: existing shared `ParseResult.complexity`, `ModuleInfo.complexity`, and symbol-level complexity fields provide the contract for canonical writeback.

### Established Patterns
- Recent parser phases use shared parser/analyzer/module truth instead of language-specific side channels.
- Python already established the pattern "compute on parser path, persist into shared symbol/module truth, consume via existing CLI surface"; Phase 79 should generalize that pattern across active languages rather than invent a second read contract.
- The repository still contains transitional legacy and placeholder implementations, so explicit failure or explicit non-canonical warning is preferable to silent fallback.

### Integration Points
- Parser-level complexity production in `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts` and `src/infrastructure/parser/implementations/TreeSitterParser.ts`
- Legacy complexity production in `src/parser/implementations/smart-parser.ts`
- Shared truth handoff in `src/core/analyzer.ts`
- Consumer read behavior and fallback logic in `src/cli/commands/complexity.ts`
- Shared type contract in `src/interface/types/parser.ts` and `src/interface/types/index.ts`

</code_context>

<specifics>
## Specific Ideas

- The user accepted the recommended path: persisted/shared truth remains the consumer-facing contract, but all active paths should converge on one canonical analyzer source.
- The user accepted explicit failure or explicitly marked non-canonical warning behavior over silent estimate fallback.
- The user accepted keeping symbol / qualified-name detail stable where existing consumers already rely on it.
- The user accepted limiting Phase 79 scope to active parser flows, analyzer truth handoff, storage/read paths, and the current `complexity` CLI surface.

</specifics>

<deferred>
## Deferred Ideas

- Full cleanup of preview/plugin/helper complexity surfaces outside the active parser/analyzer/CLI path
- New complexity reporting UX or additional downstream consumers beyond preserving existing behavior
- Broader parser routing or architecture redesign unrelated to canonical complexity source convergence

</deferred>

---

*Phase: 79-complexity-truth-unification*
*Context gathered: 2026-05-11*
