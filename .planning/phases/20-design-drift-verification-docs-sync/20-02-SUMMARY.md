---
phase: 20-design-drift-verification-docs-sync
plan: 02
subsystem: "design-verify-cli-and-docs"
tags: [verify, cli, docs, guardrails, vitest]
requires:
  - phase: 20-01
    provides: verification schema, builder, ready fixture
provides:
  - `design verify` public CLI 入口
  - verify human/json dual output 与 exit semantics
  - docs / guardrail sync for `design validate → design map → design handoff → design verify`
affects: [phase-20-03, public-cli-docs, docs-guardrails]
tech-stack:
  added: []
  patterns: [purpose-built-verify-surface, json-first-cli, docs-sync-guardrail]
key-files:
  created:
    - src/cli/commands/__tests__/design-verify-command.test.ts
  modified:
    - src/cli/commands/design.ts
    - README.md
    - AI_GUIDE.md
    - CLAUDE.md
    - docs/ai-guide/COMMANDS.md
    - docs/ai-guide/OUTPUT.md
    - docs/ai-guide/PATTERNS.md
    - docs/rules/engineering-with-codex-openai.md
    - docs/rules/validation.md
    - scripts/validate-docs.js
    - src/cli/__tests__/validate-docs-script.test.ts
key-decisions:
  - "`design verify` 继续挂在 `design` seam 下，不把 verification 偷渡成 workflow phase"
  - "review-needed 与 blocker 继续分离：`readyForExecution=false` 不等于非零退出"
requirements-completed: [VAL-04, DOC-07, VAL-05]
completed: 2026-03-26
---

# Phase 20-02 Summary

**`design verify` 已成为正式 public seam，并且 README / AI docs / rules / guardrails 都已统一到完整 design chain。**

## Accomplishments

- 在 `src/cli/commands/design.ts` 新增 `design verify [file]`，支持 JSON / human 双输出，并固定 review-needed / blocker exit 语义
- 新增 `design-verify-command` focused regressions，锁住 help、JSON contract、review-needed 非阻断与 blocked path 非零退出
- 同步 README、AI_GUIDE、CLAUDE、`docs/ai-guide/*`、`docs/rules/*` 与 `scripts/validate-docs.js`，把真实链路收口为 `design validate → design map → design handoff → design verify`

## Verification

- `pnpm exec vitest run src/cli/commands/__tests__/design-verify-command.test.ts`
- `pnpm exec vitest run src/cli/commands/__tests__/design-verify-command.test.ts src/cli/__tests__/validate-docs-script.test.ts src/cli/commands/__tests__/ci-docs-sync.test.ts`
- `npm run docs:check:human`

## Decisions & Deviations

- 关键决策：文档层明确写出 `checklist` / `drift` 契约，但 exit code 仍只留给 blocker，避免把 human-review path 错写成 failure
- 偏差：尚未执行 `dist` smoke；留到 `20-03` 的 full-chain / milestone gate 一次性验证，避免在未补 E2E 前对半成品做重复构建
