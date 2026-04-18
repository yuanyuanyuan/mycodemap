---
phase: 17
slug: design-contract-surface
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm exec vitest run src/cli/__tests__/index-help.test.ts src/cli/__tests__/design-contract-loader.test.ts src/cli/commands/__tests__/design-command.test.ts src/cli/__tests__/validate-docs-script.test.ts src/cli/commands/__tests__/ci-docs-sync.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm exec vitest run src/cli/__tests__/index-help.test.ts src/cli/__tests__/design-contract-loader.test.ts src/cli/commands/__tests__/design-command.test.ts src/cli/__tests__/validate-docs-script.test.ts src/cli/commands/__tests__/ci-docs-sync.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | DES-01 | schema | `rg -n "DEFAULT_DESIGN_CONTRACT_PATH|REQUIRED_DESIGN_SECTIONS|DesignContract" src/interface src/cli` | ✅ | ⬜ pending |
| 17-01-02 | 01 | 1 | DES-01 | docs/template | `test -f docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md` | ✅ | ⬜ pending |
| 17-01-03 | 01 | 1 | DES-01 | unit | `pnpm exec vitest run src/cli/__tests__/design-contract-loader.test.ts` | ❌ W0 | ⬜ pending |
| 17-02-01 | 02 | 2 | DES-02 | unit | `pnpm exec vitest run src/cli/__tests__/design-contract-loader.test.ts src/cli/commands/__tests__/design-command.test.ts` | ❌ W0 | ⬜ pending |
| 17-02-02 | 02 | 2 | DES-02 | CLI/help | `node dist/cli/index.js design validate --help` | ✅ | ⬜ pending |
| 17-02-03 | 02 | 2 | DES-02 | CLI/failure | `node dist/cli/index.js design validate tests/fixtures/design-contracts/missing-acceptance.design.md --json` | ❌ W0 | ⬜ pending |
| 17-03-01 | 03 | 3 | DES-03 | docs | `npm run docs:check` | ✅ | ⬜ pending |
| 17-03-02 | 03 | 3 | DES-03 | unit | `pnpm exec vitest run src/cli/__tests__/validate-docs-script.test.ts src/cli/commands/__tests__/ci-docs-sync.test.ts src/cli/__tests__/index-help.test.ts` | ✅ | ⬜ pending |
| 17-03-03 | 03 | 3 | DES-03 | integration | `node dist/cli/index.js ci check-docs-sync` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/cli/__tests__/design-contract-loader.test.ts` — design contract section parsing / diagnostics regression
- [ ] `src/cli/commands/__tests__/design-command.test.ts` — `design validate` CLI surface 回归
- [ ] `tests/fixtures/design-contracts/valid-basic.design.md` — 成功路径 fixture
- [ ] `tests/fixtures/design-contracts/missing-acceptance.design.md` — 缺失必填段失败 fixture

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 人类可按模板快速编写一份可通过验证的 contract | DES-01 | authoring ergonomics 很难完全由单元测试衡量 | 从 `docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md` 复制到仓库根目录，填写一个真实 feature，运行 `node dist/cli/index.js design validate mycodemap.design.md --json`，确认无 blocker diagnostics |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
