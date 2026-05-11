---
phase: 78
slug: intelligence-layer-trends-and-distribution
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-11
---

# Phase 78 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `rtk ./node_modules/.bin/vitest run src/orchestrator/__tests__/agent-metrics-service.test.ts` |
| **Full suite command** | `rtk npm test` |
| **Estimated runtime** | ~30 seconds |

## Sampling Rate

- **After every task commit:** Run the task-specific smallest verify command from the plan; default quick smoke is `rtk ./node_modules/.bin/vitest run src/orchestrator/__tests__/agent-metrics-service.test.ts`
- **After every plan wave:** Run `rtk npm test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 78-01-01 | 01 | 0 | TOKEN-03 | T-78-01 / T-78-02 | previous-run lookup never fabricates a baseline when none exists | unit | `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/orchestrator/__tests__/agent-metrics-service.test.ts` | ✅ | ⬜ pending |
| 78-01-02 | 01 | 1 | TOKEN-03 / TOKEN-05 | T-78-03 / T-78-04 | trend and percentile math come from one service-owned report object | unit | `rtk ./node_modules/.bin/vitest run src/orchestrator/__tests__/agent-metrics-service.test.ts` | ✅ | ⬜ pending |
| 78-01-03 | 01 | 1 | TOKEN-04 / TOKEN-05 | T-78-05 / T-78-06 | human and JSON surfaces expose additive advisory fields without changing gate behavior | unit | `rtk ./node_modules/.bin/vitest run src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts src/cli/interface-contract/__tests__/interface-contract.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

## Wave 0 Requirements

- [ ] `src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` — add latest + previous run read assertions
- [ ] `src/orchestrator/__tests__/agent-metrics-service.test.ts` — add missing-baseline and percentile-formula assertions
- [ ] `src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts` — add ranked advisory and missing-baseline rendering assertions
- [ ] `src/cli/interface-contract/__tests__/interface-contract.test.ts` — add additive trend / percentile / ranking contract assertions

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Human-readable report keeps advisory copy readable while baseline is missing | TOKEN-03 / TOKEN-04 | Final wording/readability is easier to judge from rendered CLI output than snapshot strings alone | Run `rtk node dist/cli/index.js agent-metrics --json` and `rtk node dist/cli/index.js agent-metrics`, compare missing-baseline advisory text and ranked section placement |
| Advisory intelligence does not mutate CI gate semantics | TOKEN-04 | Needs an end-to-end check that `gate.verdict` and exit code remain owned by Phase 77 logic | Run `rtk node dist/cli/index.js agent-metrics report --max-tokens-per-query <N>` before and after Phase 78 changes and confirm only additive advisory fields differ |

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-11
