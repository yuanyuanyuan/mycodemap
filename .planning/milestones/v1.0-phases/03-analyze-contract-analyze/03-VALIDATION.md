---
phase: 03
slug: analyze-contract-analyze
status: passed
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-24
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm exec vitest run src/orchestrator/__tests__/intent-router.test.ts src/orchestrator/__tests__/types.test.ts src/orchestrator/__tests__/confidence.test.ts src/cli/commands/__tests__/analyze-command.test.ts src/cli/__tests__/validate-docs-script.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm exec vitest run src/orchestrator/__tests__/intent-router.test.ts src/orchestrator/__tests__/types.test.ts src/orchestrator/__tests__/confidence.test.ts src/cli/commands/__tests__/analyze-command.test.ts src/cli/__tests__/validate-docs-script.test.ts`
- **After every plan wave:** Run `node dist/cli/index.js analyze --help && npm run docs:check`
- **Before `$gsd-verify-work`:** `npm test`, `npm run docs:check`, `node dist/cli/index.js ci check-docs-sync`
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | ANL-01, ANL-05 | CLI/help | `node dist/cli/index.js analyze --help` | ✅ | ✅ green |
| 03-01-02 | 01 | 1 | ANL-01, ANL-05 | unit | `pnpm exec vitest run src/orchestrator/__tests__/intent-router.test.ts` | ✅ | ✅ green |
| 03-01-03 | 01 | 1 | ANL-01, ANL-05 | CLI/error | `node dist/cli/index.js analyze -i invalid -t src/cli/index.ts` | ✅ | ✅ green |
| 03-02-01 | 02 | 2 | ANL-02, ANL-03, ANL-04 | unit | `pnpm exec vitest run src/orchestrator/__tests__/types.test.ts` | ✅ | ✅ green |
| 03-02-02 | 02 | 2 | ANL-02, ANL-03, ANL-04 | unit | `pnpm exec vitest run src/orchestrator/__tests__/confidence.test.ts` | ✅ | ✅ green |
| 03-02-03 | 02 | 2 | ANL-02, ANL-03, ANL-04, ANL-05 | CLI/json | `node dist/cli/index.js analyze -i read -t src/cli/index.ts --json && node dist/cli/index.js analyze -i link -t src/cli/index.ts --json` | ✅ | ✅ green |
| 03-03-01 | 03 | 3 | ANL-01, ANL-02, ANL-03, ANL-04, ANL-05 | unit | `pnpm exec vitest run src/cli/commands/__tests__/analyze-command.test.ts` | ✅ | ✅ green |
| 03-03-02 | 03 | 3 | ANL-01, ANL-02, ANL-03, ANL-04, ANL-05 | docs | `npm run docs:check` | ✅ | ✅ green |
| 03-03-03 | 03 | 3 | ANL-01, ANL-02, ANL-03, ANL-04, ANL-05 | integration | `node dist/cli/index.js ci check-docs-sync` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/cli/commands/__tests__/analyze-command.test.ts` — analyze 新旧 intent、warning、错误码的 CLI 回归测试

---

## Manual-Only Verifications

- [x] 人工 spot-check 一次 `node dist/cli/index.js analyze -i read -t src/cli/index.ts --output-mode human`，确认 human warning / summary 文案可读且不与 JSON 契约混淆

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** passed
