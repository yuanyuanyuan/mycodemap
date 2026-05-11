---
phase: 76
slug: estimation-and-reporting
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-10
---

# Phase 76 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `rtk ./node_modules/.bin/vitest run src/orchestrator/__tests__/agent-metrics-service.test.ts src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts` |
| **Full suite command** | `rtk npm test` |
| **Built CLI commands** | `rtk npm run build && rtk node dist/cli/index.js agent-metrics report --json` / `rtk node dist/cli/index.js agent-metrics --json` |
| **Estimated runtime** | Quick: ~5-20s; full: repo dependent |

---

## Sampling Rate

- **After every task commit:** run the task-local Vitest command plus `rtk npm run typecheck`
- **After every plan wave:** run `rtk npm run build`
- **Before `$gsd-verify-work`:** re-run quick Vitest coverage, `rtk npm run typecheck`, and the built CLI report paths
- **Max feedback latency:** under 60s for task-local verification

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 76-01-01 | 01 | 1 | RPT-03 | T-76-01 / T-76-02 | grouped query-type summaries are derived at read time from persisted rows and explicit latest-report semantics do not auto-run | unit | `rtk ./node_modules/.bin/vitest run src/orchestrator/__tests__/agent-metrics-service.test.ts` | ✅ extend existing | ✅ green |
| 76-01-02 | 01 | 1 | RPT-01 | T-76-03 | human report consumes shared summary truth and renders summary/grouped/raw sections without recomputing stats | command | `rtk ./node_modules/.bin/vitest run src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts` | ✅ extend existing | ✅ green |
| 76-01-03 | 01 | 1 | RPT-02, RPT-03 | T-76-02 / T-76-04 | JSON contract stays stable around `schemaVersion`, truth fields, and grouped summary arrays while root/report semantics remain distinct | command + unit | `rtk ./node_modules/.bin/vitest run src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts src/orchestrator/__tests__/agent-metrics-service.test.ts` | ✅ extend existing | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Task-Local Test Creation

- [x] `src/orchestrator/__tests__/agent-metrics-service.test.ts` — grouped summary correctness, latest-run-only report behavior, empty-run/no-run protection
- [x] `src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts` — summary-first human output, grouped JSON summary, root/report split

---

## Manual-Only Verifications

Supplemental command-surface confirmation is recorded in `76-UAT.md`; all phase requirements also have automated verification.

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
- Failure scenario: `rtk bash -lc 'tmpdir=$(mktemp -d /tmp/agent-metrics-verify-XXXXXX) && cd "$tmpdir" && node /data/codemap/dist/cli/index.js agent-metrics report --json; status=$?; echo "__EXIT_CODE__=$status"; rm -rf "$tmpdir"'` returns `AGENT_METRICS_REPORT_MISSING` and exit code `1`

---

## Validation Sign-Off

- [x] All tasks have automated verification commands or existing test seams
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 coverage exists in existing command/service tests
- [x] No watch-mode flags in validation commands
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** verified 2026-05-10
