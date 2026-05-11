# Phase 77: CI Gate and Threshold Enforcement - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 77-ci-gate-threshold-enforcement
**Areas discussed:** Threshold attachment and command scope, Default gate policy

---

## Threshold attachment and command scope

| Option | Description | Selected |
|--------|-------------|----------|
| Report only | Attach `--max-tokens-per-query` only to explicit `agent-metrics report`; keep bare-root separate | |
| Report + bare root | Attach thresholding to explicit `report` and bare-root `agent-metrics`; keep `token` pure measurement | ✓ |
| Token + report + bare root | Support thresholding on every command path including `token` | |

**User's choice:** Followed the recommended narrow reporting-path model.
**Notes:** The user accepted the recommended bundle for this area. The resulting decisions lock thresholding to `report` and bare-root flows, use row-level `estimatedTotalTokens` as the gate truth, preserve bare-root auto-run behavior before gating, and keep `token` free of gate semantics.

---

## Default gate policy

| Option | Description | Selected |
|--------|-------------|----------|
| Pure report unless threshold provided | No warn-only semantics without an explicit threshold | |
| Warn-only by default; explicit threshold blocks | No-threshold runs stay visible and advisory; explicit threshold enables blocking gate behavior | ✓ |
| Always advisory unless a separate strict flag is added | Explicit threshold still would not block by default | |

**User's choice:** Followed the recommended warn-only-by-default policy.
**Notes:** The user accepted the recommended bundle for this area. The resulting decisions are: no-threshold runs are warn-only and visible in both human and JSON outputs; explicit `--max-tokens-per-query` enables blocking behavior; Phase 77 should not invent a hidden default numeric threshold before baseline calibration exists.

---

## the agent's Discretion

- Exact verdict-field naming and JSON nesting for the gate contract
- Exact warning wording and human summary formatting
- Exact concise-summary row count / ordering strategy for CI-focused output

## Deferred Ideas

- Exact JSON verdict block shape for CI consumers
- Exact violating-row summary granularity (all vs top N vs grouped)
- Default numeric threshold calibration after baseline data exists
- Phase 78 intelligence work: trends, percentile depth, and highest-cost query-type analysis
