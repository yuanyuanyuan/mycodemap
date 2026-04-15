---
phase: 19-handoff-package-human-gates
plan: 03
subsystem: "design-handoff-cli-and-docs"
tags: [handoff, cli, docs, guardrails, dist-smoke]
requires:
  - phase: 19-01
    provides: handoff schema and renderer
  - phase: 19-02
    provides: canonical builder and gate semantics
provides:
  - `design handoff` public CLI 入口
  - human/json dual output 与 write-to-disk behavior
  - docs / guardrail sync for `design validate → design map → design handoff`
affects: [public-cli-docs, docs-guardrails, phase-20]
tech-stack:
  added: []
  patterns: [purpose-built-design-surface, json-first-cli, docs-sync-guardrail]
key-files:
  created:
    - src/cli/commands/__tests__/design-handoff-command.test.ts
  modified:
    - src/cli/commands/design.ts
    - README.md
    - AI_GUIDE.md
    - CLAUDE.md
    - docs/ai-guide/COMMANDS.md
    - docs/ai-guide/OUTPUT.md
    - docs/ai-guide/PATTERNS.md
    - docs/rules/engineering-with-codex-openai.md
    - scripts/validate-docs.js
    - src/cli/__tests__/validate-docs-script.test.ts
key-decisions:
  - "`design handoff` 继续挂在 `design` seam 下，不新增 top-level command，也不污染 analyze/workflow"
  - "docs guardrail 立即同步 handoff surface，不把 public contract drift 留到 Phase 20"
requirements-completed: [HOF-01, HOF-04]
completed: 2026-03-25
---

# Phase 19-03 Summary

**`design handoff` 已成为正式 public seam，并带着 docs guardrail 与 dist smoke 一起落地。**

## Accomplishments

- 在 `src/cli/commands/design.ts` 新增 `design handoff [file]`，支持 `--json` 与 `--output`
- human mode 会写出 `.handoff.md` / `.handoff.json`，JSON mode 保持纯 `DesignHandoffResult`
- README / AI docs / rules / `validate-docs.js` 已同步 `design validate → design map → design handoff` 与 `readyForExecution / approvals / assumptions / openQuestions` 契约

## Verification

- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec vitest run src/cli/__tests__/design-handoff-builder.test.ts src/cli/commands/__tests__/design-handoff-command.test.ts src/cli/__tests__/validate-docs-script.test.ts src/cli/commands/__tests__/ci-docs-sync.test.ts`
- `npm run build`
- `node dist/cli/index.js design handoff tests/fixtures/design-contracts/handoff-basic.design.md --json`
- `node dist/cli/index.js design handoff tests/fixtures/design-contracts/handoff-pending-review.design.md --json`
- `node dist/cli/index.js design handoff tests/fixtures/design-contracts/no-match.design.md --json`
- `npm test`
- `npm run docs:check:human`

## Decisions & Deviations

- 关键决策：针对 docs/command 层使用 mock-driven unit tests，真实 repo 行为改由 `dist` smoke 兜底，避免把 unit test 做成慢速 integration test
- 偏差：未执行 git commit；遵循当前运行时更高优先级约束，仅保留文件改动、验证证据与 summary
