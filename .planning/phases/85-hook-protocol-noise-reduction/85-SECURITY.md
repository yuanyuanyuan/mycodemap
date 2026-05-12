---
phase: 85
slug: hook-protocol-noise-reduction
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-12
---

# Phase 85 — Security

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Hook internals -> shell output | Hook decides whether to print human logs or only protocol lines. | blocker state, rule metadata, attempt log path |
| Hook protocol -> agent recovery path | Agent may follow `log_path` to reconstruct full blocker payload. | protocol JSON, resolution commands, status taxonomy |
| Template truth -> managed copies | Installed projects inherit the same protocol-only and log-path behavior. | shell hook logic, protocol contract |

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-85-01 | Availability | protocol-only mode | mitigate | output suppression happens at file-descriptor level, but protocol lines are always written through preserved fd 3. | closed |
| T-85-02 | Recovery loss | truncated shell output | mitigate | `CODEMAP_PRECHECK_LOG_PATH` provides a short fallback pointer and the full JSON is written to the attempt log file before emission. | closed |
| T-85-03 | Semantic drift | check status taxonomy | mitigate | `not_applicable` is only used on true non-applicable paths; blocked downstream checks remain `skipped`, preserving route semantics. | closed |
| T-85-04 | False alarm | report-only time limit | mitigate | human wording avoids exception-like `timed out` phrasing and structured details mark the result as `limit-reached` with `non_blocking=true`. | closed |

## Accepted Risks Log

No accepted risks.

## Sign-Off

- [x] All threats have a disposition.
- [x] No open risk remains.
- [x] `threats_open: 0` confirmed.

**Approval:** verified 2026-05-12
