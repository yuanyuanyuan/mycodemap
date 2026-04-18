---
phase: 20-design-drift-verification-docs-sync
plan: 03
subsystem: "verify-e2e-and-milestone-gate"
tags: [verify, e2e, docs-guardrail, dist-smoke, failure-rehearsal]
requires:
  - phase: 20-01
    provides: verification schema, builder, ready fixture
  - phase: 20-02
    provides: public verify CLI and docs guardrail
provides:
  - full-chain success evidence for `design validate → design map → design handoff → design verify`
  - automated failure rehearsals for missing section / scope blocker / handoff-missing
  - verify-specific docs drift regressions
affects: [phase-20-verify-work, milestone-audit]
tech-stack:
  added: []
  patterns: [full-chain-evidence, failure-first-regression, milestone-gate]
key-files:
  created:
    - src/cli/__tests__/design-verify-e2e.test.ts
    - .planning/phases/20-design-drift-verification-docs-sync/20-03-SUMMARY.md
  modified:
    - src/cli/design-handoff-builder.ts
    - src/cli/design-verification-builder.ts
    - src/cli/__tests__/design-verification-builder.test.ts
    - src/cli/__tests__/validate-docs-script.test.ts
    - tests/fixtures/design-contracts/verify-ready.design.md
key-decisions:
  - "full-chain ready-path 通过真实 handoff artifact 证明，不再依赖 mock narrative"
  - "修复 `createReviewGateApproval()` 的根因 bug：零 assumptions / zero open questions 时不得伪造 `needs-review` approval"
requirements-completed: [VAL-04, DOC-07, VAL-05]
completed: 2026-03-26
---

# Phase 20-03 Summary

**Phase 20 已拿到 full-chain success / failure evidence；verify-specific docs drift 也被锁进自动化。**

## Accomplishments

- 新增 `design-verify-e2e`，真实串起 `design validate → design map → design handoff → design verify`
- 将三类失败模式固化为自动化事实：缺失必填 section、scope blocker、handoff missing / review-needed 不 false-pass
- 修复 `design-handoff-builder` 中 latent review gate bug，避免 zero-unresolved ready-path 被错误标成 `needs-review`
- 扩展 docs drift tests，锁住 `design verify` 入口、`checklist` / `drift` 契约与 workflow 四阶段边界

## Verification

- `pnpm exec vitest run src/cli/__tests__/design-verify-e2e.test.ts`
- `pnpm exec vitest run src/cli/__tests__/design-verification-builder.test.ts src/cli/commands/__tests__/design-verify-command.test.ts src/cli/__tests__/design-handoff-builder.test.ts`
- `pnpm exec vitest run src/cli/__tests__/validate-docs-script.test.ts -t "design verify"`
- `npm run build`
- `node dist/cli/index.js design handoff tests/fixtures/design-contracts/verify-ready.design.md`
- `node dist/cli/index.js design verify tests/fixtures/design-contracts/verify-ready.design.md --json`
- `node dist/cli/index.js design verify tests/fixtures/design-contracts/no-match.design.md --json`
- `npm run docs:check:human`

## Decisions & Deviations

- 关键决策：`dist` smoke 必须先跑 `design handoff` 再跑 `design verify`，否则 ready-path 只会诚实地返回 `handoff-missing`
- 偏差：`npm test` 仍被 preexisting 的 `src/cli/__tests__/design-scope-resolver.test.ts` 与 `src/cli/commands/__tests__/design-map-command.test.ts` 阻断；`mapping-basic.design.md` 当前会触发 `over-broad-scope`，该问题属于 Phase 18 map baseline，与本轮 verify 目标不完全同一 write-scope
