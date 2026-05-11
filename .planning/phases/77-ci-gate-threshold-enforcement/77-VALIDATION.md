---
phase: 77
slug: ci-gate-threshold-enforcement
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-10
---

# Phase 77 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `./node_modules/.bin/vitest run src/orchestrator/__tests__/agent-metrics-service.test.ts src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts src/cli/interface-contract/__tests__/interface-contract.test.ts` |
| **Full suite command** | `npm test` |
| **Built CLI command** | `npm run build && node dist/cli/index.js agent-metrics --json` |
| **Estimated runtime** | Quick: ~20-40s; full: ~2-4min |

---

## Sampling Rate

- **After every task commit:** Run the task-local Vitest command plus `npm run typecheck`.
- **After every plan wave:** Run `npm run lint` and `npm test`.
- **Before `$gsd-verify-work`:** `npm run typecheck` → `npm run lint` → `npm test` must be green.
- **Max feedback latency:** 40s for quick checks; 5min for full suite.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 77-01-01 | 01 | 1 | CI-01, CI-03 | T-77-01 / T-77-02 | Report truth computes warn/pass/fail only from row-level `estimatedTotalTokens` and preserves latest-run/root-flow semantics | unit | `./node_modules/.bin/vitest run src/orchestrator/__tests__/agent-metrics-service.test.ts` | ✅ extend existing | ✅ green |
| 77-01-02 | 01 | 1 | CI-02, CI-03 | T-77-03 | Human and JSON outputs expose one stable `gate` contract without recomputing verdicts in the renderer | command + meta-schema | `./node_modules/.bin/vitest run src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts src/cli/interface-contract/__tests__/interface-contract.test.ts` | ✅ extend existing | ✅ green |
| 77-01-03 | 01 | 1 | CI-01, CI-02, CI-03 | T-77-02 / T-77-04 / T-77-05 | Threshold flags stay on report/root only, invalid input is rejected, and exit-code parity stays at the CLI edge | command + unit | `./node_modules/.bin/vitest run src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts src/orchestrator/__tests__/agent-metrics-service.test.ts && npm run typecheck` | ✅ extend existing | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Task-Local Test Creation

- [x] `src/orchestrator/__tests__/agent-metrics-service.test.ts` — warn/pass/fail fixtures, equality-pass case, grouped-average false-pass guard, stable max-row ordering
- [x] `src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts` — threshold flag routing, JSON `gate` block parsing, warn-only exit `0`, fail exit `1`, invalid threshold error
- [x] `src/cli/interface-contract/__tests__/interface-contract.test.ts` — assertions that the `agent-metrics` contract's `outputShape` includes the new `gate` block and still round-trips through meta-schema validation

---

## Manual-Only Verifications

All phase behaviors have automated verification. Supplemental built-CLI/UAT confirmation is recorded in `77-UAT.md`.

---

## Validation Audit 2026-05-10

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Audit evidence:
- `rtk ./node_modules/.bin/vitest run src/orchestrator/__tests__/agent-metrics-service.test.ts src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts src/cli/interface-contract/__tests__/interface-contract.test.ts`
- `rtk npm run typecheck`
- `77-UAT.md` completed with `5/5` checks passed
- `77-SECURITY.md` completed with `threats_open: 0`

---

## Validation Sign-Off

- [x] All tasks have `<verify>` blocks with automated commands or explicit manual evidence rules.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 coverage exists inside existing test seams; no extra harness is required.
- [x] No watch-mode flags in validation commands.
- [x] Feedback latency < 90s.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** verified 2026-05-10
