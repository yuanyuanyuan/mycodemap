---
phase: 02
slug: cli-surface-cleanup-cli
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm exec vitest run src/cli/__tests__/index-help.test.ts src/cli/__tests__/removed-commands.test.ts src/cli/__tests__/validate-docs-script.test.ts src/cli/commands/__tests__/ci-docs-sync.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~90 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm exec vitest run src/cli/__tests__/index-help.test.ts src/cli/__tests__/removed-commands.test.ts src/cli/__tests__/validate-docs-script.test.ts src/cli/commands/__tests__/ci-docs-sync.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | CLI-01, CLI-02, CLI-03, CLI-04 | CLI/help | `node dist/cli/index.js --help` | ✅ | ⬜ pending |
| 02-01-02 | 01 | 1 | CLI-05 | unit | `pnpm exec vitest run src/cli/__tests__/index-help.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | CLI-05 | unit | `pnpm exec vitest run src/cli/__tests__/index-help.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | CLI-01, CLI-02, CLI-03, CLI-04 | unit | `pnpm exec vitest run src/cli/__tests__/removed-commands.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | CLI-01, CLI-02, CLI-03, CLI-04 | CLI/error | `node dist/cli/index.js server && node dist/cli/index.js watch && node dist/cli/index.js report && node dist/cli/index.js logs` | ✅ | ⬜ pending |
| 02-02-03 | 02 | 2 | CLI-01, CLI-02, CLI-03, CLI-04 | unit | `pnpm exec vitest run src/cli/__tests__/removed-commands.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 3 | CLI-05 | docs | `npm run docs:check` | ✅ | ⬜ pending |
| 02-03-02 | 03 | 3 | CLI-05 | unit | `pnpm exec vitest run src/cli/__tests__/validate-docs-script.test.ts src/cli/commands/__tests__/ci-docs-sync.test.ts` | ✅ | ⬜ pending |
| 02-03-03 | 03 | 3 | CLI-05 | integration | `node dist/cli/index.js ci check-docs-sync` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/cli/__tests__/index-help.test.ts` — 顶层 help surface 回归测试
- [ ] `src/cli/__tests__/removed-commands.test.ts` — removed-command 迁移提示测试

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
