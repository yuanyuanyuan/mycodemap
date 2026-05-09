# Phase 64: Incremental Graph Refresh - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Add scoped incremental graph refresh on top of the Phase 63 persisted graph truth so maintainers can refresh only the affected graph neighborhoods from a changed-file set instead of rebuilding the entire repository graph every time. This phase covers changed-input sourcing, invalidation radius, safe writeback, and observability for reused vs recomputed graph slices. It does not add new analysis capabilities beyond refresh, and it must preserve the stable CLI/MCP success envelope established in prior phases.

</domain>

<decisions>
## Implementation Decisions

### Changed-input sourcing
- **D-01:** Phase 64 defaults to `git diff` as the changed-input source, while also supporting explicit `--changed-files` input.
- **D-02:** Explicit `--base` / `--against` revision inputs take priority when provided; otherwise the default diff baseline falls back to `HEAD`.
- **D-03:** If both `git diff`-based inputs and explicit `--changed-files` are provided, explicit `--changed-files` wins and the diff-derived input is ignored with visible guidance.
- **D-04:** If the system cannot derive a reliable changed-file set, it must fail closed and direct the user to run a full graph regenerate rather than silently broadening scope or guessing.

### Invalidation radius
- **D-05:** The default incremental refresh radius is the changed files plus a `2-hop` graph neighborhood.
- **D-06:** Invalidation propagates across both `upstream` and `downstream` relationships rather than only one direction.
- **D-07:** `INFERRED` and `AMBIGUOUS` edges are treated conservatively during propagation; they should expand refresh scope rather than be trusted as narrow precise boundaries.
- **D-08:** High-risk change surfaces or any case where the impact boundary cannot be determined reliably must force a full regenerate instead of continuing incrementally.

### Writeback and recovery
- **D-09:** Incremental refresh must rebuild the affected slice in memory or another temporary graph representation first, then replace persisted truth transactionally after validation succeeds.
- **D-10:** Partial refresh is allowed: successfully recomputed slices may be committed while failed slices are marked `stale` / `partial` rather than pretending the whole refresh succeeded cleanly.
- **D-11:** The system should retain exactly one pre-refresh snapshot so the latest incremental attempt can be compared or rolled back without turning Phase 64 into a multi-version history feature.
- **D-12:** External refresh status uses three explicit states: `success`, `partial`, and `failed`.

### Observability and downgrade behavior
- **D-13:** Incremental refresh output must expose, at minimum, counts for `changed`, `reused`, `recomputed`, `invalidated`, and `failed` graph slices.
- **D-14:** Output must also expose the affected files/modules plus short reason summaries for why slices were reused, recomputed, invalidated, or failed.
- **D-15:** These diagnostics must be available in both human-facing CLI output and structured JSON/MCP output; the human path may be thinner, but it must still surface the core refresh story.
- **D-16:** Warning and failure categories must use stable machine-readable codes, not only prose.
- **D-17:** When incremental refresh hits a high-risk downgrade condition, the default result is `failed` with explicit guidance to run a full generate; it must not silently auto-fallback into full regeneration inside the same command path.

### the agent's Discretion
- Exact flag names and command-surface placement for incremental refresh, as long as explicit changed-file inputs remain able to override diff-derived scope.
- Exact neighborhood computation and validation mechanics, as long as the default behavior preserves the locked `2-hop`, bidirectional, conservative propagation semantics.
- Exact snapshot storage format and location, as long as only one pre-refresh snapshot is retained and rollback/diagnostic comparisons stay possible.
- Exact warning/error code names and output field names, as long as the structured diagnostics remain stable and the `success | partial | failed` state boundary stays explicit.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase authority
- `.planning/ROADMAP.md` — Phase 64 goal, single plan slot, and success criteria for incremental graph refresh
- `.planning/REQUIREMENTS.md` — locked milestone requirements `INCR-01` and `INCR-02`
- `.planning/PROJECT.md` — milestone-level product direction for `v2.3 graph-capability`
- `.planning/STATE.md` — current milestone position and carry-forward decisions after Phase 63 closeout

### Prior locked context
- `.planning/phases/63-graph-schema-foundation/63-CONTEXT.md` — graph-v1 persistence truth, confidence semantics, fail-closed compatibility, and stable success-envelope boundary
- `.planning/phases/62-context-routing-gate/62-CONTEXT.md` — explicit warnings/unknowns, thin output posture, and fail-closed routing patterns
- `.planning/phases/61-mcp-direct-execution/61-CONTEXT.md` — shared execution truth and structured CLI/MCP result-envelope expectations
- `.planning/phases/60-storage-convergence/60-CONTEXT.md` — SQLite-only runtime truth and explicit remediation posture

### Existing implementation surfaces
- `src/cli/commands/generate.ts` — current graph-generation entrypoint and dependency-confidence assignment path
- `src/infrastructure/storage/adapters/SQLiteStorage.ts` — persisted graph truth, schema compatibility, save/load behavior, and transaction boundary
- `src/infrastructure/repositories/CodeGraphRepositoryImpl.ts` — repository seam between domain graph truth and storage
- `src/infrastructure/storage/graph-helpers.ts` — shared graph clone/query helpers that may support slice rebuild or snapshot comparison
- `src/cache/index.ts` — existing invalidate / cascade patterns relevant to propagation design
- `src/cli/contract-diff-scope.ts` — existing explicit-changed-files-overrides-base precedence pattern
- `src/cli/commands/ci.ts` — current `git diff` changed-file detection patterns and failure handling
- `src/server/handlers/AnalysisHandler.ts` — existing unsupported incremental/refresh surface and structured error-code conventions

### Architecture and codebase maps
- `ARCHITECTURE.md` — top-level architecture narrative that must remain aligned with graph refresh behavior
- `.planning/codebase/STACK.md` — runtime/tooling baseline for Node/TypeScript/SQLite implementation
- `.planning/codebase/ARCHITECTURE.md` — transitional architecture map and current graph/storage boundaries
- `.planning/codebase/INTEGRATIONS.md` — CLI/runtime integration seams and local execution expectations

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `generate.ts` already owns the graph build path, so incremental refresh should extend that flow instead of inventing a parallel standalone graph writer.
- `SQLiteStorage` already owns persisted graph load/save and compatibility validation, making it the most natural place for transactional slice replacement and snapshot-aware writeback.
- `CodeGraphRepositoryImpl` already provides the narrow persistence seam between domain graph truth and storage.
- `src/cache/index.ts` already contains cascade invalidation patterns that can inform graph refresh propagation semantics.
- Existing `git diff` handling in CLI surfaces provides precedent for diff-derived scope and explicit-input override behavior.

### Established Patterns
- Recent phases consistently prefer one execution/storage truth with thin compatibility layers instead of parallel code paths.
- Phase 63 locked fail-closed graph truth, explicit diagnostics, and rebuild-first remediation; incremental refresh must follow the same reliability posture.
- Structured CLI/MCP output and stable machine-readable status/error codes are established project norms and should be preserved here.

### Integration Points
- Incremental refresh will likely touch `generate` command wiring, graph persistence/storage logic, repository-level save/load boundaries, and output shaping for both human and structured consumers.
- Warning/error/status semantics must remain coherent with existing CLI/MCP envelopes rather than becoming a graph-only side protocol.
- Verification will likely require real filesystem + real subprocess coverage for both successful scoped refresh and fail-closed downgrade paths.

</code_context>

<specifics>
## Specific Ideas

- Treat incremental refresh as a safe narrowing of full generate, not as a separate competing generation engine.
- Prefer explicit scope truth over convenience: if the system cannot trust the changed-file boundary, it should stop and ask for a full regenerate.
- Keep partial refresh semantics honest and visible; `partial` is a first-class result, not a disguised success.
- Make reused/recomputed/invalidated reasons cheap to consume for both humans and agents so later impact/community phases inherit diagnosable graph state.

</specifics>

<deferred>
## Deferred Ideas

- Automatic silent fallback from incremental refresh into full regenerate is out of scope for Phase 64.
- Multi-version graph-history retention beyond one pre-refresh snapshot belongs to a later phase if it ever becomes necessary.
- New analysis capabilities such as recursive impact traversal or community detection remain Phase 65+ work and must not be folded into Phase 64.
- Smarter heuristic narrowing beyond the locked conservative `2-hop` bidirectional propagation can be explored later only after Phase 64 proves safe.

</deferred>

---

*Phase: 64-incremental-graph-refresh*
*Context gathered: 2026-05-08*
