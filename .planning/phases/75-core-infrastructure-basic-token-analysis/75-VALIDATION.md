---
phase: 75
slug: core-infrastructure-basic-token-analysis
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-10
---

# Phase 75 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `rtk ./node_modules/.bin/vitest run src/orchestrator/__tests__/agent-metrics-service.test.ts src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` |
| **Full suite command** | `rtk npm test` |
| **Built CLI command** | `rtk npm run build && rtk node dist/cli/index.js agent-metrics --json` |
| **Estimated runtime** | Quick: ~5-20s; full: repo dependent |

---

## Sampling Rate

- **After every task commit:** run the task-local Vitest command plus `rtk npm run typecheck`
- **After every plan wave:** run `rtk npm run build`
- **Before `$gsd-verify-work`:** re-run quick Vitest coverage, `rtk npm run typecheck`, and the built CLI smoke path
- **Max feedback latency:** under 60s for task-local verification

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 75-01-01 | 01 | 1 | CMD-01, CMD-02 | T-75-04 | `agent-metrics` stays a separate command family with stable `token` / `report` routing and no-arg default report behavior | command | `rtk ./node_modules/.bin/vitest run src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts` | ✅ extend existing | ✅ green |
| 75-01-02 | 01 | 1 | TOKEN-01, TOKEN-02 | T-75-01 / T-75-02 / T-75-03 | fixed built-in samples persist row truth plus explicit estimated-token fields; failed samples surface explicit errors | unit + storage | `rtk ./node_modules/.bin/vitest run src/orchestrator/__tests__/agent-metrics-service.test.ts src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` | ✅ extend existing | ✅ green |
| 75-01-03 | 01 | 1 | CMD-02, TOKEN-02 | T-75-02 / T-75-03 | minimal report/default flow reuses persisted truth and shared output instead of emitting empty-success payloads | command + unit | `rtk ./node_modules/.bin/vitest run src/orchestrator/__tests__/agent-metrics-service.test.ts src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts` | ✅ extend existing | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Task-Local Test Creation

- [x] `src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts` — command-family discoverability, no-arg report routing, JSON contract shape
- [x] `src/orchestrator/__tests__/agent-metrics-service.test.ts` — fixed sample execution, explicit estimate labeling, loud failure-path behavior
- [x] `src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` — SQLite run/detail persistence and reload path

---

## Manual-Only Verifications

Supplemental command-surface confirmation is recorded in `75-UAT.md`; all phase requirements also have automated verification.

---

## Validation Audit 2026-05-10

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Audit evidence:
- `rtk ./node_modules/.bin/vitest run src/orchestrator/__tests__/agent-metrics-service.test.ts src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/cli/interface-contract/__tests__/interface-contract.test.ts`
- `rtk npm run typecheck`
- `rtk npm run build`
- `rtk node dist/cli/index.js agent-metrics --json`
- Service failure path remains covered by `src/orchestrator/__tests__/agent-metrics-service.test.ts` with `AGENT_METRICS_SAMPLE_FAILED`

---

## Validation Sign-Off

- [x] All tasks have automated verification commands or existing test seams
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 coverage exists in existing command/service/storage tests
- [x] No watch-mode flags in validation commands
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** verified 2026-05-10
