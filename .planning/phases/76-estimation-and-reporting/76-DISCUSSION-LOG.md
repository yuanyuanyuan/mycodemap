# Phase 76: Estimation and Reporting - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 76-estimation-and-reporting
**Areas discussed:** Human report layout, Grouping semantics, JSON schema depth, Default run scope, Distribution depth, Empty-state behavior

---

## Human report layout

| Option | Description | Selected |
|--------|-------------|----------|
| Sectioned summary + table | Show run metadata, totals summary, then a formatted per-query table | ✓ |
| Table only | Keep output compact and mostly table-driven | |
| Minimal line-based text | Preserve the current plain list-style renderer | |

**User's choice:** 默认建议组合  
**Notes:** Phase 76 should upgrade the current minimal line-based renderer into a clearer human report without turning it into a dashboard. Summary + table is the preferred balance.

---

## Grouping semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Raw rows + grouped summary by query type | Preserve per-query rows and add grouped aggregates keyed by query type | ✓ |
| Group by query type only | Show only grouped aggregates, no raw row detail | |
| Query type + command slug aggregates | Add a second aggregation layer in Phase 76 | |

**User's choice:** 默认建议组合  
**Notes:** Phase 76 should satisfy roadmap grouping needs without hiding the underlying samples. `commandSlug` stays visible in raw rows, while grouped summaries aggregate at `queryType`.

---

## JSON schema depth

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal stable schema + grouped stats | Keep the schema narrow but add first-class grouped summary blocks now | ✓ |
| Rows + totals only | Defer all grouping structure to a later phase | |
| Future-facing placeholder blocks | Pre-allocate trend / threshold / comparison sections early | |

**User's choice:** 默认建议组合  
**Notes:** The machine-consumable contract should become stable enough for CI consumers in later phases, but it should not pre-allocate Phase 77/78 concerns.

---

## Default run scope

| Option | Description | Selected |
|--------|-------------|----------|
| Latest run only | Report mode reads one latest persisted run and exposes its metadata | ✓ |
| Aggregate multiple runs | Blend recent runs into one default report | |
| Multi-run comparison | Show deltas / comparisons between runs in Phase 76 | |

**User's choice:** 默认建议组合  
**Notes:** Multi-run comparison is a separate concern and belongs with the later intelligence layer. Phase 76 should stay anchored on a single run.

---

## Distribution depth

| Option | Description | Selected |
|--------|-------------|----------|
| Average + min/max | Provide lightweight grouped distribution signals now | ✓ |
| Average only | Keep grouped stats to a single central tendency metric | |
| Average + p50/p95/max | Add percentile distribution depth in Phase 76 | |

**User's choice:** 默认建议组合  
**Notes:** Percentiles are explicitly better aligned with Phase 78. Phase 76 should stop at averages plus min/max ranges.

---

## Empty-state behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Command-path-sensitive behavior | `agent-metrics` root flow may auto-run; `report` should show an explicit no-runs message | ✓ |
| Always auto-run | Any report request should implicitly create a fresh run | |
| Always fail with no data | Never auto-run; require prior token execution | |

**User's choice:** 默认建议组合  
**Notes:** Preserve the Phase 75 default flow where `codemap agent-metrics` can still produce a report end-to-end, but keep `codemap agent-metrics report` honest about persisted-data availability.

---

## the agent's Discretion

- Exact table columns and ordering, as long as the report remains summary-first and keeps per-query rows readable
- Exact grouped-stat field names and JSON nesting, as long as query-type grouped summaries are first-class and stable
- Exact no-data wording and error/exit behavior, as long as root-flow auto-run and explicit report-mode empty-state behavior remain distinct

## Deferred Ideas

- Query-type percentile stats such as `p50` / `p95`
- Multi-run comparison or trend visualization
- Threshold policy or CI pass/fail output tuning
- Custom sample-set extensibility or broader intelligence-layer analytics
