---
phase: 05-ci-ship-alignment-ci-ship
verified: 2026-03-24T07:45:00Z
status: passed
score: 4/4 must-haves verified
---

# Phase 5: ci-ship-alignment-ci-ship Verification Report

**Phase Goal:** 把 ship 的质量检查收敛到 `ci` 能力中，并让文档与验证链明确二者关系。  
**Verified:** 2026-03-24T07:45:00Z  
**Status:** passed

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `ci` 已提供 `check-working-tree`、`check-branch`、`check-scripts` 三个发布前 gate checks | ✓ VERIFIED | `src/cli/commands/ci.ts:88`, `src/cli/commands/ci.ts:125`, `src/cli/commands/ci.ts:156`, `src/cli/commands/ci.ts:763`, `src/cli/commands/ci.ts:768`, `src/cli/commands/ci.ts:774` |
| 2 | `ship` 的 must-pass 检查复用了 `ci` helper，而不是自己重复实现 working tree / branch / scripts 逻辑 | ✓ VERIFIED | `src/cli/commands/ship/rules/quality-rules.ts:59`, `src/cli/commands/ship/rules/quality-rules.ts:64`, `src/cli/commands/ship/rules/quality-rules.ts:70`, `src/cli/commands/ship/rules/quality-rules.ts:76` |
| 3 | `ship/checker.ts` 不再直接读取当前分支，只负责组装上下文与调用规则层 | ✓ VERIFIED | `src/cli/commands/ship/checker.ts:17`, `src/cli/commands/ship/checker.ts:21`, `src/cli/commands/ship/checker.ts:29` |
| 4 | README、AI guide、命令文档与验证规则已明确 `ship` CHECK 阶段复用 `ci` gate checks | ✓ VERIFIED | `README.md:625`, `README.md:649`, `AI_GUIDE.md:54`, `docs/ai-guide/COMMANDS.md:210`, `docs/ai-guide/COMMANDS.md:247`, `docs/ai-guide/COMMANDS.md:365`, `docs/rules/validation.md:15`, `docs/rules/engineering-with-codex-openai.md:64` |

**Score:** 4/4 truths verified

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `CI-01`: `ci` 提供 `check-working-tree` | ✓ SATISFIED | `src/cli/commands/ci.ts:88`, `src/cli/commands/ci.ts:764`, `src/cli/commands/__tests__/ci-gate-checks.test.ts:24` |
| `CI-02`: `ci` 提供 `check-branch` | ✓ SATISFIED | `src/cli/commands/ci.ts:125`, `src/cli/commands/ci.ts:769`, `src/cli/commands/__tests__/ci-gate-checks.test.ts:44` |
| `CI-03`: `ci` 提供 `check-scripts` | ✓ SATISFIED | `src/cli/commands/ci.ts:156`, `src/cli/commands/ci.ts:775`, `src/cli/commands/__tests__/ci-gate-checks.test.ts:64` |
| `SHIP-01`: `ship` 的 check 阶段通过 `ci` 命令执行，而不是重复实现检查逻辑 | ✓ SATISFIED | `src/cli/commands/ship/rules/quality-rules.ts:64`, `src/cli/commands/ship/rules/quality-rules.ts:70`, `src/cli/commands/ship/rules/quality-rules.ts:76`, `src/cli/commands/ship/__tests__/quality-rules.test.ts:36` |

## Automated Checks

- `pnpm exec vitest run src/cli/commands/__tests__/ci-docs-sync.test.ts src/cli/commands/__tests__/ci-gate-checks.test.ts src/cli/commands/ship/__tests__/quality-rules.test.ts src/cli/commands/ship/__tests__/pipeline.test.ts`
- `npm run build`
- `node dist/cli/index.js ci --help`
- `node dist/cli/index.js ci check-branch --allow $(git branch --show-current)`
- `node dist/cli/index.js ci check-branch --allow release-only`
- `node dist/cli/index.js ci check-working-tree`
- `SHIP_IN_CI=1 node dist/cli/index.js ci check-scripts`
- `npm run docs:check`
- `node dist/cli/index.js ci check-docs-sync`

## Failure Rehearsal

1. **错误分支执行发布前检查**
   - Rehearsal: `node dist/cli/index.js ci check-branch --allow release-only`
   - Expected failure: 输出 `E0014` 并列出允许的分支。

2. **工作区存在未提交变更**
   - Rehearsal: `node dist/cli/index.js ci check-working-tree`
   - Expected failure: 输出 `E0013` 并打印 dirty working tree。

## Human Verification Required

None — 新子命令、ship 委托链和文档入口均已通过自动化与 CLI spot-check 验证。

## Gaps Summary

**No product gaps found.** Phase 5 goal achieved and ready to move to Phase 6.
