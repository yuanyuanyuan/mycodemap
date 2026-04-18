---
phase: 18-design-to-code-mapping
plan: 03
subsystem: "design-map-blockers-and-docs"
tags: [design-map, blockers, docs, guardrails]
requires:
  - phase: 18-01
    provides: baseline mapping command
  - phase: 18-02
    provides: enriched mapping output
provides:
  - `no-candidates` / `over-broad-scope` / `high-risk-scope` blocker semantics
  - success + 3 blocker fixtures 与 focused regressions
  - `design map` 文档同步与 docs guardrail 校验
affects: [docs-guardrails, public-cli-docs, verify-work]
tech-stack:
  added: []
  patterns: [failure-first-mapping, blocker-fixtures, docs-sync-guardrail]
key-files:
  created:
    - tests/fixtures/design-contracts/no-match.design.md
    - tests/fixtures/design-contracts/over-broad.design.md
    - tests/fixtures/design-contracts/high-risk.design.md
  modified:
    - src/cli/design-scope-resolver.ts
    - src/cli/__tests__/design-scope-resolver.test.ts
    - src/cli/commands/__tests__/design-map-command.test.ts
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
  - "一旦满足 blocker 条件就提前返回，不再在失败路径上继续做昂贵 enrichment"
  - "`design map` 只做最小 docs sync，不提前越界到 Phase 19/20 的 handoff/drift 叙事"
requirements-completed: [MAP-03]
completed: 2026-03-25
---

# Phase 18-03 Summary

**Phase 18 的 blocker 语义、失败夹具与最小 public docs 面已经一起锁住。**

## Accomplishments

- `no-candidates`、`over-broad-scope`、`high-risk-scope` 已成为正式 blocker，CLI 在 blocker path 返回非零 exit code
- 新增 success + 3 类 blocker fixtures，并通过 resolver/command 回归与 `dist` smoke test 锁住
- README / AI docs / rules / `validate-docs.js` 已同步 `design validate → design map` 最小工作流与 `candidates/unknowns/diagnostics` 契约

## Verification

- `npm exec vitest run src/cli/__tests__/design-scope-resolver.test.ts src/cli/commands/__tests__/design-map-command.test.ts`
- `npm exec vitest run src/cli/__tests__/validate-docs-script.test.ts src/cli/commands/__tests__/ci-docs-sync.test.ts`
- `npm run docs:check:human`
- `node dist/cli/index.js design map tests/fixtures/design-contracts/mapping-basic.design.md --json`
- `node dist/cli/index.js design map tests/fixtures/design-contracts/no-match.design.md --json`
- `node dist/cli/index.js design map tests/fixtures/design-contracts/over-broad.design.md --json`
- `node dist/cli/index.js design map tests/fixtures/design-contracts/high-risk.design.md --json`

## Decisions & Deviations

- 关键决策：blocker path 先阻断再返回，避免“失败场景反而更慢”
- 偏差：未执行 git commit；遵循当前运行时更高优先级约束，仅保留文件改动、验证证据与 summary
