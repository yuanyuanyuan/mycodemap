# Phase 78: Intelligence Layer - Trends and Distribution - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the intelligence layer on top of the shipped `agent-metrics` measurement, reporting, and CI-gate spine so users can compare the latest run against the immediately previous run, identify the highest-cost query types and samples, and inspect per-query-type distribution statistics that highlight outliers. This phase delivers: latest-vs-previous trend comparison by `queryType`, ranked cost-risk surfaces with short explanatory notes, and distribution depth at `p50` / `p95` / `max`. It does NOT deliver: wider historical windows by default, a second blocking gate model, explicit risk grades, normalized token trends, git-history scenario extraction, behavior-classification analytics, or broader MCP-gateway intelligence work.

</domain>

<decisions>
## Implementation Decisions

### Trend window and comparison scope
- **D-01:** Phase 78 default trend comparison should be **latest run vs previous run** only.
- **D-02:** Phase 78 should not default to comparing `N` recent runs or all historical runs.
- **D-03:** If trend comparison is unavailable because no previous run exists, the command should stay honest about that missing baseline rather than silently widening the time window.

### Cost-risk presentation
- **D-04:** Highest-cost results should be surfaced as a **ranked list** rather than buried inside grouped statistics.
- **D-05:** Each ranked high-cost query type or sample should include a **short risk note** explaining why its token cost may negate the benefit of reduced agent call frequency.
- **D-06:** Phase 78 should not introduce explicit `high / medium / low` risk grades by default.

### Distribution depth
- **D-07:** Phase 78 should extend the grouped summary with **`p50` / `p95` / `max`** depth by `queryType`.
- **D-08:** Existing `avg/min/max` style reporting from Phase 76 remains valid background context, but Phase 78's new outlier signal is the percentile layer.
- **D-09:** Phase 78 should not default to a heavier percentile set or long worst-sample appendices when `p50` / `p95` / `max` already answers the milestone requirement.

### Phase boundary reinforcement
- **D-10:** Phase 78 builds on the locked Phase 76 single-run report contract and the locked Phase 77 gate contract; it should extend them rather than replace them.
- **D-11:** Phase 78 should preserve the current report/root command family and avoid introducing a parallel analytics command surface.
- **D-12:** Phase 78 intelligence remains **advisory**, not a second CI-blocking policy surface beside Phase 77.

### the agent's Discretion
- Exact trend delta fields and wording, as long as default comparison remains latest-vs-previous and missing-history behavior stays explicit.
- Exact top-N count and ordering details for the ranked cost-risk section, as long as the highest-cost query types/samples remain obvious.
- Exact JSON field names and nesting for percentile/trend metadata, as long as the contract stays additive and machine-readable.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Authority
- `.planning/ROADMAP.md` — Phase 78 goal, dependency boundary, and success criteria
- `.planning/PROJECT.md` — active milestone framing, remaining debt, and broader `v2.7` intent
- `.planning/REQUIREMENTS.md` — `TOKEN-03`, `TOKEN-04`, and `TOKEN-05` requirement mapping
- `.planning/v2.7-MILESTONE-AUDIT.md` — current milestone gap analysis showing Phase 78 as the remaining mainline blocker

### Prior Phase Decisions
- `.planning/phases/75-core-infrastructure-basic-token-analysis/75-CONTEXT.md` — locked command-family split, persisted fact model, and estimated-token truth boundary
- `.planning/phases/76-estimation-and-reporting/76-CONTEXT.md` — locked single-run report contract, grouped summary semantics, and explicit deferral of trend/distribution depth to Phase 78
- `.planning/phases/77-ci-gate-threshold-enforcement/77-CONTEXT.md` — locked gate boundary, warn-only semantics, and advisory-vs-blocking split that Phase 78 must not reopen

### Upstream Product Intent
- `docs/brainstorms/2026-05-10-agent-effectiveness-validation-requirements.md` — milestone rationale, intelligence-layer requirements, and threshold/baseline framing
- `docs/ideation/2026-05-10-agent-effectiveness-validation-ideation.md` — broader product motivation for measuring agent token economics

### Existing Code and Reusable Assets
- `src/orchestrator/agent-metrics-service.ts` — current report assembly, grouped summaries, and gate truth on top of persisted rows
- `src/cli/interface-contract/commands/agent-metrics.ts` — current machine contract for rows, grouped summaries, and gate output that Phase 78 should extend incrementally
- `src/interface/types/storage.ts` — storage contract for agent-metrics run/detail persistence
- `src/infrastructure/storage/sqlite/schema.ts` — `agent_metrics_runs` / `agent_metrics` tables and existing query-oriented indexes
- `src/infrastructure/storage/adapters/SQLiteStorage.ts` — current persistence and latest-run/detail-row read paths that Phase 78 will likely extend for historical comparisons

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `agent_metrics_runs` and `agent_metrics` SQLite tables already exist, including a `recorded_at` index and `run_id` / `query_type` access paths, so Phase 78 can build historical intelligence on top of persisted truth instead of inventing a second store.
- `AgentMetricsService` already produces stable report rows, grouped `queryTypeSummaries`, totals, and gate metadata, giving Phase 78 a natural seam for adding trend and percentile intelligence.
- The `agent-metrics` interface contract already has additive JSON structure for grouped summaries and gate output, so new trend/distribution fields can extend the existing report shape.

### Established Patterns
- Phase 75 locked `agent-metrics` as a thin CLI wrapper over a service layer with SQLite-backed fact rows.
- Phase 76 locked report mode to the latest persisted run by default and deferred trend/comparison work to the intelligence layer.
- Phase 77 locked gate behavior to the report/root path and kept blocking exit semantics at the CLI edge only.

### Integration Points
- Historical run retrieval and comparison logic in the agent-metrics service layer
- Report payload enrichment for trend deltas, ranked risk surfaces, and percentile summaries
- Human-readable report rendering for ranked cost-risk output and latest-vs-previous trend visibility
- Interface-contract evolution so JSON consumers can read percentile and trend sections without re-deriving them client-side

</code_context>

<specifics>
## Specific Ideas

- Default trend window is **latest vs previous**, not `N` runs and not full history.
- Cost-risk output should be a **ranked list plus a short risk sentence** for each costly query type or sample.
- Distribution depth should default to **`p50` / `p95` / `max`** by `queryType`.
- The user chose to keep Phase 78 advisory and readable, rather than turning it into a second gate or a heavy analytics surface.

</specifics>

<deferred>
## Deferred Ideas

- Longer default historical windows such as `latest vs last N` or full-history trend mode
- Explicit `high / medium / low` risk grades
- Heavier percentile sets or default worst-sample appendices beyond `p50` / `p95` / `max`
- Normalized token trends, git-history scenario extraction, and broader intelligence-layer analytics beyond Phase 78

</deferred>

---

*Phase: 78-intelligence-layer-trends-and-distribution*
*Context gathered: 2026-05-10*
