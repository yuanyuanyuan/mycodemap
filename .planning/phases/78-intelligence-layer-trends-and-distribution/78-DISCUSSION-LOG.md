# Phase 78: Intelligence Layer - Trends and Distribution - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 78-intelligence-layer-trends-and-distribution
**Areas discussed:** Trend window, Cost-risk labeling, Distribution depth

---

## Trend window

| Option | Description | Selected |
|--------|-------------|----------|
| `latest vs previous` | Compare only the newest run against the immediately previous run | ✓ |
| `recent N runs` | Compare across a short rolling window such as 5 or 10 runs | |
| `all history` | Compare against the entire persisted history by default | |
| Other | Use a custom window rule | |

**User's choice:** `1`
**Notes:** The user chose the lightest default comparison window so Phase 78 stays focused on actionable drift detection rather than heavy history analysis.

---

## Cost-risk labeling

| Option | Description | Selected |
|--------|-------------|----------|
| Advisory ranking only | Rank costly query types/samples without explicit grades | |
| Risk grades | Assign levels such as `high / medium / low` | |
| Scenario prompts only | Focus on narrative explanations without a ranking surface | |
| Combination | Combine two presentation styles | ✓ |

**User's choice:** `4`
**Notes:** The initial choice was a combined presentation. This was narrowed in the follow-up discussion below.

---

## Cost-risk combination detail

| Option | Description | Selected |
|--------|-------------|----------|
| Ranking + short risk sentence | Rank high-cost query types/samples and add one-line risk context | ✓ |
| Risk grade + scenario prompt | Add explicit levels plus scenario explanations | |

**User's choice:** `1`
**Notes:** The user preferred a readable advisory surface over a heavier grading system so Phase 78 does not become a second gate.

---

## Distribution depth

| Option | Description | Selected |
|--------|-------------|----------|
| `p50 / p95 / max` | Standard outlier-oriented percentile depth with controlled output size | ✓ |
| `p50 / p90 / p95 / max` | Broader percentile set | |
| `p95` only | Minimal outlier signal | |
| Include worst samples by default | Add percentile depth plus detailed worst-sample output | |

**User's choice:** `1`
**Notes:** The user chose the standard `p50 / p95 / max` bundle as the best tradeoff between insight and report weight.

---

## the agent's Discretion

- Exact field names and nesting for trend and percentile metadata
- Exact top-N size for ranked cost-risk output
- Exact wording for "trend unavailable" or other missing-history states

## Deferred Ideas

- Default multi-run windows beyond `latest vs previous`
- Explicit risk grades
- Heavier percentile sets or default worst-sample appendices
