---
phase: 20
slug: design-drift-verification-docs-sync
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-26
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm exec vitest run src/cli/__tests__/design-verification-builder.test.ts src/cli/commands/__tests__/design-verify-command.test.ts` |
| **Full suite command** | `npm test && npm run docs:check:human` |
| **Estimated runtime** | ~150 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm exec vitest run src/cli/__tests__/design-verification-builder.test.ts src/cli/commands/__tests__/design-verify-command.test.ts`
- **After every plan wave:** Run `npm run docs:check:human`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 150 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | VAL-04 | static | `rg -n "DesignVerificationResult|DesignVerificationChecklistItem|DesignDriftItem|DesignVerificationStatus" src/interface/types/design-verification.ts src/interface/types/index.ts` | ❌ W0 | ⬜ pending |
| 20-01-02 | 01 | 1 | VAL-04 | unit | `pnpm exec vitest run src/cli/__tests__/design-verification-builder.test.ts` | ❌ W0 | ⬜ pending |
| 20-01-03 | 01 | 1 | VAL-04, VAL-05 | smoke | `node dist/cli/index.js design verify tests/fixtures/design-contracts/verify-ready.design.md --json | node -e "const fs=require('fs'); const o=JSON.parse(fs.readFileSync(0,'utf8')); if (!Array.isArray(o.checklist) || !o.summary) process.exit(1);"` | ❌ W0 | ⬜ pending |
| 20-02-01 | 02 | 2 | VAL-04 | unit | `pnpm exec vitest run src/cli/commands/__tests__/design-verify-command.test.ts` | ❌ W0 | ⬜ pending |
| 20-02-02 | 02 | 2 | DOC-07 | docs | `npm run docs:check:human && pnpm exec vitest run src/cli/__tests__/validate-docs-script.test.ts src/cli/commands/__tests__/ci-docs-sync.test.ts` | ✅ | ⬜ pending |
| 20-02-03 | 02 | 2 | VAL-04, DOC-07 | smoke | `node dist/cli/index.js design verify tests/fixtures/design-contracts/verify-ready.design.md --json` | ❌ W0 | ⬜ pending |
| 20-03-01 | 03 | 3 | VAL-04 | e2e | `pnpm exec vitest run src/cli/__tests__/design-verify-e2e.test.ts` | ❌ W0 | ⬜ pending |
| 20-03-02 | 03 | 3 | VAL-05 | failure | `(node dist/cli/index.js design verify tests/fixtures/design-contracts/no-match.design.md --json >/tmp/phase20-no-match.json 2>&1; test $? -ne 0 && rg -n '"code": "blocked-mapping"|"code": "no-candidates"' /tmp/phase20-no-match.json)` | ❌ W0 | ⬜ pending |
| 20-03-03 | 03 | 3 | DOC-07, VAL-05 | docs-failure | `pnpm exec vitest run src/cli/__tests__/validate-docs-script.test.ts -t "design verify"` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure already covers docs guardrail、CLI regression 与 fixture-based failure testing；Phase 20 只需补 verify builder / command / E2E 测试文件。

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| verify 的 human summary 是否真的让 reviewer 看懂 checklist / drift / why-not-ready | VAL-04 | 自动化可以校验字段与状态，但无法完全判断输出文案是否足够可操作 | 运行 `node dist/cli/index.js design verify tests/fixtures/design-contracts/verify-ready.design.md`，确认输出至少能直接定位 checklist 总数、通过/待复核/失败数量、drift 摘要与 next action |
| full-chain 示例是否体现“人类设计 → handoff → verify”而不是 fresh guess | VAL-04, DOC-07 | 需要人工检查 example narrative 与 command chain 是否忠于 approved handoff boundary | 先运行 `design handoff` 再运行 `design verify`，确认 verify 读取的是 deterministic handoff truth，而不是只靠新的 mapping 结果给出 satisfied 结论 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 150s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
