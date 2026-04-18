---
phase: 25
slug: fix-codemap-cli-dogfood-gaps-hard-fail-analyze-find-scan-err
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-19
---

# Phase 25 — Validation Strategy

> Reconstructed after execution from phase plans, summaries, verification evidence, and live focused checks on 2026-04-19.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `rtk pnpm exec vitest run src/cli/commands/__tests__/analyze-command.test.ts src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts src/cli/commands/__tests__/complexity-command.test.ts src/cli/commands/__tests__/ci-command-risk.test.ts src/cli/commands/__tests__/workflow.test.ts src/cli/__tests__/validate-docs-script.test.ts` |
| **Full suite command** | `rtk pnpm exec vitest run src/cli/commands/__tests__/analyze-command.test.ts src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts src/cli/commands/__tests__/complexity-command.test.ts src/cli/commands/__tests__/ci-command-risk.test.ts src/cli/commands/__tests__/workflow.test.ts src/cli/__tests__/validate-docs-script.test.ts && rtk npm run docs:check` |
| **Estimated runtime** | ~12 seconds |

---

## Sampling Rate

- **After every task commit:** Run the most-local focused `vitest` command for the touched task.
- **After every plan wave:** Run `rtk pnpm exec vitest run src/cli/commands/__tests__/analyze-command.test.ts src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts src/cli/commands/__tests__/complexity-command.test.ts src/cli/commands/__tests__/ci-command-risk.test.ts src/cli/commands/__tests__/workflow.test.ts src/cli/__tests__/validate-docs-script.test.ts`.
- **Before milestone audit:** Run `rtk npm run docs:check`.
- **Max feedback latency:** ~12 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| `25-01-01` | 01 | 1 | `P25-SC1` | — | scanner failure must never masquerade as a trustworthy empty success result | unit | `rtk pnpm exec vitest run src/cli/commands/__tests__/analyze-command.test.ts src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts` | ✅ | ✅ green |
| `25-01-02` | 01 | 1 | `P25-SC2` | — | fallback discovery must stay inside config-aware include/exclude and `.gitignore` boundaries | unit | `rtk pnpm exec vitest run src/cli/commands/__tests__/analyze-command.test.ts src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts` | ✅ | ✅ green |
| `25-01-03` | 01 | 1 | `P25-SC3` | — | stdout JSON must expose `diagnostics.status` across success / partial failure / failure | unit | `rtk pnpm exec vitest run src/cli/commands/__tests__/analyze-command.test.ts src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts` | ✅ | ✅ green |
| `25-02-01` | 02 | 2 | `P25-DOGFOOD-COMPLEXITY` | — | `complexity -f --json` must return a single file object rather than project-wide modules | unit | `rtk pnpm exec vitest run src/cli/commands/__tests__/complexity-command.test.ts` | ✅ | ✅ green |
| `25-02-02` | 02 | 2 | `P25-DOGFOOD-CI-RISK` | — | `ci assess-risk --json` must emit parseable `passed` / `failed` / `skipped` machine truth | unit | `rtk pnpm exec vitest run src/cli/commands/__tests__/ci-command-risk.test.ts` | ✅ | ✅ green |
| `25-02-03` | 02 | 2 | `P25-DOGFOOD-WORKFLOW` | — | `workflow start --json` must stay pure JSON without expanding workflow product scope | unit | `rtk pnpm exec vitest run src/cli/commands/__tests__/workflow.test.ts` | ✅ | ✅ green |
| `25-03-01` | 03 | 3 | `P25-SC4` | — | AI docs must preserve stable command guidance while documenting repaired diagnostics behavior | docs | `rtk pnpm exec vitest run src/cli/__tests__/validate-docs-script.test.ts && rtk npm run docs:check` | ✅ | ✅ green |
| `25-03-02` | 03 | 3 | `P25-SC5` | — | output schema and guardrails must lock the additive diagnostics contract in place | docs | `rtk pnpm exec vitest run src/cli/__tests__/validate-docs-script.test.ts && rtk npm run docs:check` | ✅ | ✅ green |
| `25-03-03` | 03 | 3 | `P25-DOCS` | — | AI-facing docs and guardrails must remain synchronized with the implemented CLI contract | docs | `rtk pnpm exec vitest run src/cli/__tests__/validate-docs-script.test.ts && rtk npm run docs:check` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Audit Basis

- Plans: `25-01-PLAN.md`, `25-02-PLAN.md`, `25-03-PLAN.md`
- Execution evidence: `25-01-SUMMARY.md`, `25-02-SUMMARY.md`, `25-03-SUMMARY.md`
- Phase verification: `25-VERIFICATION.md`
- Live rerun on `2026-04-19`:
  - focused `vitest` suite: `109` tests passed
  - `rtk npm run docs:check`: passed

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-19
