# Phase 77: CI Gate and Threshold Enforcement - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Build CI-facing threshold gate behavior on top of the shipped `agent-metrics` measurement and reporting paths so users can detect token-cost regressions and optionally fail automation when any single query exceeds a declared limit. This phase delivers: threshold flags on the reporting path, warn-only default behavior, blocking behavior when an explicit threshold is supplied, and concise gate-oriented output for human and JSON consumers. It does NOT deliver: trend analysis, percentile/distribution depth beyond Phase 76, new command families, implicit calibrated default thresholds, or behavior/intelligence-layer analytics.

</domain>

<decisions>
## Implementation Decisions

### Threshold attachment and command-path scope
- **D-01:** `--max-tokens-per-query` should be supported on the **reporting path only**: explicit `codemap agent-metrics report` and bare-root `codemap agent-metrics`.
- **D-02:** `codemap agent-metrics token` remains a **pure measurement** command and must not absorb gate semantics in Phase 77.
- **D-03:** Threshold evaluation should be performed against **per-query rows**, not grouped summaries, because the roadmap defines failure as "any single query exceeds the threshold."
- **D-04:** The row-level comparison target is `estimatedTotalTokens`, reusing the existing Phase 75/76 estimated-token contract.

### Bare-root behavior with thresholds
- **D-05:** Bare-root `codemap agent-metrics --max-tokens-per-query <N>` should preserve the existing convenience-path semantics: if no persisted run exists, it may auto-run measurement first and then immediately evaluate the gate.
- **D-06:** Explicit `codemap agent-metrics report --max-tokens-per-query <N>` should continue to rely on the persisted latest-run path rather than silently switching to measurement behavior.

### Default gate semantics
- **D-07:** When no `--max-tokens-per-query` flag is provided, Phase 77 defaults to **warn-only** behavior rather than returning a non-zero exit code.
- **D-08:** When `--max-tokens-per-query` is provided explicitly, the command should enter **blocking gate** mode and set a non-zero exit code if any single query row exceeds the declared threshold.
- **D-09:** Warn-only behavior must stay **visible**; it is not a silent success path.

### Default warn-only without a fake baseline
- **D-10:** Phase 77 must not invent or hard-code an implicit numeric default threshold before a real baseline is calibrated.
- **D-11:** In the no-threshold warn-only path, the command should surface advisory signals such as the highest observed token row / worst sample, rather than pretending a numeric pass line already exists.
- **D-12:** Baseline calibration remains a planning/research concern; Phase 77 only needs to keep the warn-only surface useful and honest until a trusted default threshold exists.

### Output visibility and consumer contract
- **D-13:** Warn-only and blocking outcomes should both be visible in **human-readable output** and **JSON output**.
- **D-14:** Phase 77 should extend the existing report contract with gate verdict data rather than creating a separate output surface or command family.
- **D-15:** Gate output should stay **concise and CI-oriented**, focusing on verdict, threshold context, and the rows that caused the verdict.

### Phase Boundary Reinforcement
- **D-16:** Phase 77 builds directly on the shipped Phase 76 report path and must not reopen the grouped-summary design or command-path split already locked there.
- **D-17:** Phase 77 should reuse existing CLI patterns for threshold checks, JSON status blocks, and `process.exitCode` handling where practical instead of inventing a second gate model.
- **D-18:** Phase 77 must not absorb Phase 78 work such as trends, top-cost query-type intelligence, percentile depth, or broader scenario analysis.

### the agent's Discretion
- Exact JSON field names and nesting for gate verdict metadata, as long as both human and machine consumers can detect warn/pass/fail clearly.
- Exact human warning wording and formatting, as long as warn-only stays visible and blocking failures identify the offending query rows.
- Exact count and ordering of surfaced violating rows in concise summaries, as long as the gate remains understandable and CI-focused.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Authority
- `.planning/ROADMAP.md` — Phase 77 goal, dependency boundary, and success criteria
- `.planning/PROJECT.md` — active milestone focus, CI requirements, and remaining concerns
- `.planning/REQUIREMENTS.md` — `CI-01`, `CI-02`, and `CI-03` requirement mapping and milestone-wide boundaries

### Prior Phase Decisions
- `.planning/phases/75-core-infrastructure-basic-token-analysis/75-CONTEXT.md` — locked command-family split, estimated-token truth model, and pure-measurement boundary
- `.planning/phases/76-estimation-and-reporting/76-CONTEXT.md` — locked report-path semantics, grouped report shape, and explicit deferral of threshold policy to Phase 77

### Upstream Product Intent
- `docs/brainstorms/2026-05-10-agent-effectiveness-validation-requirements.md` — milestone-level CI gate intent, explicit threshold requirement, and default-threshold deferral
- `docs/ideation/2026-05-10-agent-effectiveness-validation-ideation.md` — broader motivation for measuring agent token economics and validating tool usefulness

### Existing Code and Reusable Assets
- `src/cli/commands/agent-metrics/index.ts` — current `token` / `report` / bare-root command split and exit-code handling points
- `src/orchestrator/agent-metrics-service.ts` — current report rows, grouped summaries, and latest-run vs auto-run flow behavior
- `src/cli/interface-contract/commands/agent-metrics.ts` — current report contract surface that Phase 77 should extend incrementally
- `src/cli/commands/ci.ts` — existing threshold + concise summary + JSON status precedent for CLI gate behavior

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/cli/commands/agent-metrics/index.ts` already cleanly separates `token`, explicit `report`, and bare-root flows, which gives Phase 77 a narrow place to attach gate flags without reopening command registration.
- `src/orchestrator/agent-metrics-service.ts` already exposes stable per-row report truth (`rows`) and grouped summaries (`queryTypeSummaries`), so row-level threshold evaluation can build on persisted report data rather than adding a new measurement path.
- `src/cli/commands/ci.ts` already demonstrates concise human summary, JSON verdict output, threshold echoing, and non-zero exit handling for CLI gates.

### Established Patterns
- The `agent-metrics` family is intentionally a thin CLI wrapper over a service layer, and Phase 77 should preserve that split rather than pushing policy into ad hoc renderer-only logic.
- Explicit `report` vs bare-root behavior was deliberately split in Phase 76; gate behavior must preserve that distinction.
- Existing repo gate surfaces separate advisory visibility from blocking exit codes, which aligns with the locked Phase 77 warn-only default.

### Integration Points
- `agent-metrics report` path for persisted-run gate evaluation
- bare-root `agent-metrics` path for auto-run-then-gate behavior
- interface-contract evolution for gate verdict fields in human/JSON consumers
- CLI exit-code wiring and CI pipeline consumption of report output

</code_context>

<specifics>
## Specific Ideas

- The user accepted the recommended narrow command-path model: thresholding belongs to the reporting path, not the pure measurement path.
- The user accepted row-level `estimatedTotalTokens` as the gate truth source instead of grouped averages.
- The user accepted that explicit thresholds should be blocking, while no-threshold runs should remain warn-only and visible.
- The user explicitly preferred honesty over a fake baseline: no hidden default numeric threshold until real calibration exists.

</specifics>

<deferred>
## Deferred Ideas

- Exact gate-verdict JSON schema shape (`status`, `warnOnly`, `violations`, etc.) remains for planning detail, as long as both human and JSON outputs expose the verdict clearly.
- Exact concise-summary granularity (all violating rows vs top N vs grouped presentation) remains for planning detail, within the constraint that summaries stay CI-oriented and understandable.
- Default numeric threshold calibration is deferred until a trustworthy baseline exists.
- Trend analysis, percentile/distribution deepening, and highest-cost query-type intelligence remain Phase 78 work.

</deferred>

---

*Phase: 77-ci-gate-threshold-enforcement*
*Context gathered: 2026-05-10*
