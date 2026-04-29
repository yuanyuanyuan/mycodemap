---
phase: 39
slug: publish-polling-and-reporting
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-23
updated: 2026-04-23
---

# Phase 39 — Validation Strategy

> Per-phase validation contract for standalone publish follow-up polling. This phase validates read-only snapshot truth, command wiring, docs routing, and planning updates; it must not trigger a real publish, tag, push, rerun, or workflow dispatch.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | existing Vitest + `tsc` + docs guardrails + targeted grep |
| **Quick run command** | `rtk npm test -- src/cli/commands/ship/__tests__/monitor.test.ts src/cli/commands/ship/__tests__/pipeline.test.ts src/cli/commands/__tests__/publish-status-command.test.ts` |
| **Build command** | `rtk npm run build` |
| **Docs command** | `rtk npm run docs:check` |
| **Diff hygiene** | `rtk git diff --check` |
| **Estimated runtime** | ~30-90 seconds |

---

## Sampling Rate

- **After monitor snapshot lands:** run targeted `rg` against `src/cli/commands/ship/monitor.ts`
- **After command wiring lands:** run targeted `rg` against `src/cli/index.ts` and `src/cli/commands/publish-status.ts`
- **After docs routing lands:** run targeted `rg` against release / skill / AI guide docs
- **Before phase close:** run focused Vitest, `rtk npm run build`, `rtk npm run docs:check`, `rtk git diff --check`
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 39-01-01 | 01 | 1 | RELF-02, SAFE-02 | snapshot contract | `rtk proxy rg -n "snapshotPublishStatus|ambiguous|unavailable|export async function monitorCI" src/cli/commands/ship/monitor.ts` | ✅ | ✅ green |
| 39-01-02 | 01 | 1 | RELF-02 | monitor tests | `rtk npm test -- src/cli/commands/ship/__tests__/monitor.test.ts` | ✅ | ✅ green |
| 39-01-03 | 01 | 1 | RELF-02, SAFE-02 | command wiring | `rtk proxy rg -n "publish-status" src/cli/index.ts src/cli/commands/publish-status.ts` | ✅ | ✅ green |
| 39-01-04 | 01 | 1 | RELF-02 | command flags / machine mode | `rtk proxy rg -n -- "--tag|--sha|--workflow-file|--json|--structured" src/cli/commands/publish-status.ts` | ✅ | ✅ green |
| 39-01-05 | 01 | 1 | RELF-02, SAFE-02 | command tests | `rtk npm test -- src/cli/commands/__tests__/publish-status-command.test.ts` | ✅ | ✅ green |
| 39-01-06 | 01 | 1 | RELF-02, SAFE-01, SAFE-02 | focused regression | `rtk npm test -- src/cli/commands/ship/__tests__/monitor.test.ts src/cli/commands/ship/__tests__/pipeline.test.ts src/cli/commands/__tests__/publish-status-command.test.ts` | ✅ | ✅ green |
| 39-01-07 | 01 | 1 | RELF-02, SAFE-02 | build | `rtk npm run build` | ✅ | ✅ green |
| 39-01-08 | 01 | 1 | RELF-02, SAFE-01 | docs routing | `rtk proxy rg -n "publish-status|follow-up observability|只读|single authority|单一权威" docs/rules/release.md .agents/skills/release/SKILL.md docs/ai-guide/COMMANDS.md` | ✅ | ✅ green |
| 39-01-09 | 01 | 1 | RELF-02, SAFE-01 | docs guardrail | `rtk npm run docs:check` | ✅ | ✅ green |
| 39-01-10 | 01 | 1 | SAFE-02 | diff hygiene | `rtk git diff --check` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Manual-Only Verifications

- Confirm `publish-status` never calls `publish(...)`, rerun APIs, workflow dispatch, or any git write path.
- Confirm `publish-status` keeps exact-match truth (`tag + sha`) and does not present itself as a second release authority.

---

## Validation Sign-Off

- [x] All tasks have automated verify steps
- [x] No validation step can trigger a real publish side effect
- [x] Machine-readable output and human-readable output both covered by tests
- [x] `nyquist_compliant: true` set only after all verification rows turn green

**Approval:** approved
