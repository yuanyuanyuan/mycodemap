---
phase: 74
slug: env-contract-reminder-hook
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-10
---

# Phase 74 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/cli/env-contract/__tests__/reminder-engine.test.ts src/cli/env-contract/__tests__/reminder-hook-runner.test.ts src/cli/commands/__tests__/env-contract-command.test.ts src/cli/init/__tests__/init-assistant.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~25 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/cli/env-contract/__tests__/reminder-hook-runner.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 25 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 74-01-01 | 01 | 1 | HOOK-02 | T-74-01 / T-74-03 | Codex seam probe only accepts the chosen delegated-start event and snapshots role/session payload without mutating shared reminder state | unit | `npx vitest run src/cli/env-contract/__tests__/reminder-hook-runner.test.ts -t "codex seam probe"` | ❌ task-created | ⬜ pending |
| 74-01-02 | 01 | 1 | HOOK-02 | T-74-01 / T-74-02 / T-74-04 | Shared reminder engine enforces `parent session × role`, visible warn-and-continue, and no hidden fallback | unit | `npx vitest run src/cli/env-contract/__tests__/reminder-engine.test.ts src/cli/env-contract/__tests__/reminder-hook-runner.test.ts` | ❌ task-created | ⬜ pending |
| 74-01-03 | 01 | 1 | HOOK-02 | T-74-04 | Existing CLI/MCP/bootstrap retrieval surfaces remain valid after reminder wiring | regression | `npx vitest run src/cli/commands/__tests__/env-contract-command.test.ts src/server/mcp/__tests__/env-contract-tool.test.ts src/cli/init/__tests__/init-assistant.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Task-Local Test Creation

- [ ] `src/cli/env-contract/__tests__/reminder-engine.test.ts` — in Task 2, add first remind, same-role silence, different-role remind, warning continues
- [ ] `src/cli/env-contract/__tests__/reminder-hook-runner.test.ts` — in Task 1/2, add Codex seam-proof fixture, Claude adapter output validity, runtime failure warning transport
- [ ] Existing infrastructure covers command/bootstrap/MCP regression checks; no separate Wave 0 plan is required

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real Codex delegated-start event mapping matches the chosen seam | HOOK-02 | Requires an actual spawned Codex subagent session | Trigger a worker-style subagent in Codex with the probe enabled, record whether `SessionStart` or `UserPromptSubmit` fires, and confirm the payload contains the normalized role/session fields used by the implementation. |
| Real delegated-start flow stays non-blocking when retrieval is unavailable | HOOK-02 | Runtime UX visibility differs slightly between Codex and Claude surfaces | Temporarily mask the retrieval surface, start a delegated agent, verify a visible warning with exact remediation appears, and confirm delegated work continues. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Missing test references are produced inside Task 1/2 rather than a separate Wave 0
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
