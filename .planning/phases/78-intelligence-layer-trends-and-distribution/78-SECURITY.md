---
phase: 78
slug: intelligence-layer-trends-and-distribution
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-11T10:59:00+08:00
---

# Phase 78 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| persisted run metadata -> trend truth | latest-vs-previous ordering must stay deterministic or the trend layer becomes plausible-but-false | `agent_metrics_runs.recorded_at`, `agent_metrics_runs.id` |
| historical query-type rows -> percentile summaries | percentile sample pools must stay explicit and bounded or `p50/p95` becomes unstable noise | persisted `agent_metrics` rows grouped by `queryType` |
| shared report truth -> human/JSON renderer | renderers must consume additive intelligence fields instead of recomputing them | `queryTypeSummaries`, `queryTypeTrends`, `highestCostQueryTypes`, `highestCostRows`, `gate` |
| advisory intelligence -> Phase 77 gate | ranked/high-cost fields must not mutate blocking semantics or exit-code ownership | report payload plus CLI threshold handling |
| historical reads -> CLI latency | report mode must avoid unbounded analytics scans while still exposing historical sample counts | latest two runs + queryType-scoped history reads |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-78-01 | Integrity | recent-run ordering | mitigate | `listRecentAgentMetricsRuns()` uses `recorded_at DESC, id DESC`; storage tests pin deterministic latest/previous ordering and one-run behavior. | closed |
| T-78-02 | Integrity | missing baseline | mitigate | service emits `baselineAvailable=false` and `previous*=null` when no previous run exists; service/command tests and single-run human verification cover this path. | closed |
| T-78-03 | Drift | percentile math | mitigate | nearest-rank percentile helpers stay in `AgentMetricsService`; orchestrator tests pin exact `p50/p95` values and historical sample counts. | closed |
| T-78-04 | Drift | renderer vs JSON contract | mitigate | intelligence fields are computed once in the service and surfaced through additive contract assertions plus human/JSON command tests. | closed |
| T-78-05 | Scope creep | gate semantics | mitigate | `gate` evaluation remains unchanged; fail-path and equality-pass command verification confirm advisory fields do not affect verdict or exit code. | closed |
| T-78-06 | Availability | historical sample reads | mitigate | trend reads stay limited to recent runs and latest-run queryType keys only; grouped summaries expose `historicalSampleCount` explicitly. | closed |

*Status: open · closed*  
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-11 | 6 | 6 | 0 | Codex |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-11
