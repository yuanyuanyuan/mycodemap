# Phase 76: Estimation and Reporting - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the reporting layer on top of Phase 75's persisted token-measurement facts so users can read a formatted human report, consume a stable JSON report, and inspect grouped summary statistics by query type. This phase delivers: summary-first human-readable reporting, machine-consumable JSON with grouped query-type statistics, and a clear single-run reporting contract. It does NOT deliver: threshold enforcement, multi-run comparison, trend intelligence, percentile-heavy distribution analysis, custom sample-set expansion, or tokenizer-exact accounting.

</domain>

<decisions>
## Implementation Decisions

### Human-readable report shape
- **D-01:** Phase 76 should render a **sectioned report** with run metadata, a summary block, and a formatted per-query table.
- **D-02:** The report should be **table-first for the row detail**, but not table-only; summary context must stay visible above the rows.
- **D-03:** The current minimal line-based renderer is insufficient as the final Phase 76 UX and should be upgraded rather than preserved as the default presentation.

### Grouping and aggregation semantics
- **D-04:** Phase 76 should keep **raw per-query rows** and add a **grouped summary by `queryType`** rather than replacing raw rows with aggregates.
- **D-05:** `queryType` is the aggregation key for the grouped summary in this phase; `commandSlug` remains a per-row detail field, not a second aggregation dimension.
- **D-06:** Aggregated report statistics should be derived from the Phase 75 persisted detail rows at read/report time rather than introducing new persisted aggregate truth.

### JSON report contract
- **D-07:** The JSON output should remain **narrow and stable**, preserving the existing top-level reporting contract while adding first-class grouped summary data now.
- **D-08:** Phase 76 should include grouped query-type statistics in the JSON contract instead of forcing downstream CI consumers to reconstruct them client-side.
- **D-09:** Phase 76 should not pre-allocate placeholder blocks for trends, thresholds, comparisons, or future intelligence-layer features.

### Default reporting scope
- **D-10:** Report mode should default to the **latest persisted run only**; Phase 76 does not aggregate or compare multiple runs by default.
- **D-11:** Single-run report metadata (`runId`, `recordedAt`, sample/estimator versioning) should remain explicit so later phases can build on a stable run-scoped contract.

### Grouped distribution depth
- **D-12:** Grouped summary stats should include **average + min/max** depth in Phase 76.
- **D-13:** Percentile-style distribution metrics such as `p50` / `p95` are deferred to the later intelligence layer rather than added now.
- **D-14:** Grouped summaries should cover the roadmap-required dimensions: average token cost and response-size distribution signals, using lightweight min/max ranges in this phase.

### Empty-state and command-path behavior
- **D-15:** `codemap agent-metrics report` should present an **explicit no-runs-yet / rebuild-needed** response when persisted report data is unavailable, rather than silently creating a new run.
- **D-16:** The root `codemap agent-metrics` flow may continue to produce an end-to-end report by auto-running the measurement path when no persisted run exists, preserving the existing milestone entry behavior.
- **D-17:** Empty persisted runs and truly absent runs should stay visible conditions, not be hidden behind unconditional auto-run behavior in explicit report mode.

### Phase Boundary Reinforcement
- **D-18:** Phase 76 builds on the locked Phase 75 truth model: `rawCharCount` and `responseSizeBytes` remain truth fields, while token counts remain explicitly estimated.
- **D-19:** Phase 76 should not absorb Phase 77 threshold policy or Phase 78 trend/comparison/distribution-depth work.
- **D-20:** Phase 76 should reuse the existing `agent-metrics` command family and shared output infrastructure rather than branching into a benchmark-specific reporting path.

### the agent's Discretion
- Exact human table layout, spacing, and column ordering, as long as the output remains summary-first and readable in a terminal.
- Exact JSON field names / nesting for grouped summaries, as long as the schema stays narrow, stable, and clearly keyed by `queryType`.
- Exact no-data wording and exit-path ergonomics, as long as explicit `report` mode remains distinct from the root auto-run flow.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Authority
- `.planning/ROADMAP.md` — Phase 76 goal, dependency boundary, and success criteria
- `.planning/PROJECT.md` — active milestone scope, command-family separation, and downstream phase boundaries
- `.planning/phases/75-core-infrastructure-basic-token-analysis/75-CONTEXT.md` — locked Phase 75 truth model, persistence granularity, and estimator boundary

### Upstream Product Intent
- `docs/brainstorms/2026-05-10-agent-effectiveness-validation-requirements.md` — requirement-level intent for human report, JSON output, and later CI/trend separation
- `docs/ideation/2026-05-10-agent-effectiveness-validation-ideation.md` — milestone rationale for measuring and reporting agent token cost

### Existing Code and Reusable Assets
- `src/cli/commands/agent-metrics/index.ts` — current command surface and root/report flow behavior
- `src/cli/commands/agent-metrics/human.ts` — current minimal human renderer that Phase 76 must upgrade
- `src/orchestrator/agent-metrics-service.ts` — current report/token result shapes, latest-run report loading, and auto-run fallback path
- `src/cli/interface-contract/commands/agent-metrics.ts` — command contract and output-shape surface that Phase 76 must evolve carefully
- `src/cli/commands/benchmark.ts` — neighboring reporting/output precedent that should not become the implementation target or merge path

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- The codebase already has a root `agent-metrics` flow, a `token` path, and a `report` path, so Phase 76 is extending a live command family rather than inventing a new surface.
- The service layer already returns single-run `rows`/`items`, totals, and stable version metadata, which provides a natural base for grouped report enrichment.
- The command contract already exposes `schemaVersion`, per-row truth fields, and report/totals structure, so Phase 76 should evolve the schema incrementally rather than replacing it.

### Established Patterns
- Phase 75 locked the milestone to a **new `agent-metrics` command family** with SQLite-backed persisted fact rows and estimated-token labeling.
- The existing root flow (`runReportFlow`) already distinguishes between "latest persisted run exists" and "no run yet, execute token run first", which gives Phase 76 a natural entry-point distinction to preserve.
- The current human renderer is intentionally minimal and line-based, confirming that formatted presentation depth is still open for this phase.

### Integration Points
- CLI human/JSON output branching for `agent-metrics report`
- Service-layer report assembly from persisted detail rows
- Interface contract evolution for grouped query-type summary data
- Future Phase 77 CI consumers that will rely on stable JSON report structure without pulling in trend/comparison concerns

</code_context>

<specifics>
## Specific Ideas

- The user accepted the **default recommendation bundle** for Phase 76 rather than customizing each gray area independently.
- Human-readable output should become **summary + formatted table**, not remain a minimal bullet/list dump.
- The report should expose both **raw per-query rows** and **query-type grouped summaries** in the same report.
- JSON should stay **minimal but stable**, with grouped stats added now instead of placeholder future blocks.
- Default report scope stays **single latest run**, with multi-run comparison deferred.
- Distribution depth should stop at **average + min/max** in this phase.
- Explicit `report` mode should show a **clear no-runs / rebuild-needed state**, while the root `agent-metrics` command may still auto-run end-to-end.

</specifics>

<deferred>
## Deferred Ideas

- Query-type percentile distribution metrics (`p50`, `p95`, etc.)
- Multi-run comparison, deltas, or trend visualization
- Threshold enforcement / CI pass-fail policy
- Trend intelligence about whether token cost offsets tool-call savings
- Custom sample-set extensibility or tokenizer-exact accounting

</deferred>

---

*Phase: 76-estimation-and-reporting*
*Context gathered: 2026-05-10*
