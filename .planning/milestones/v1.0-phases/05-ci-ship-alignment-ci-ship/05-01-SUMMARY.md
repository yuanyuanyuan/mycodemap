# 05-01 Summary

## 完成内容

- 在 `src/cli/commands/ci.ts` 中新增 `runWorkingTreeCheck`、`runBranchCheck`、`runScriptsCheck` 三个共享 helper。
- 暴露新的 `ci` 子命令：`check-working-tree`、`check-branch`、`check-scripts`。
- 为这些 gate checks 增加独立测试，覆盖 clean/dirty、allowed/disallowed branch、scripts skip/failure 路径。

## 验证

- `pnpm exec vitest run src/cli/commands/__tests__/ci-gate-checks.test.ts`
- `npm run build`
- `node dist/cli/index.js ci --help`
- `node dist/cli/index.js ci check-branch --allow <current-branch>`

## 失败场景预演

- 若 `check-branch` 仍允许任何分支通过，`ship` 会在错误分支上继续发布；本次通过 `release-only` 失败路径验证阻断。
- 若 `check-working-tree` 不能直接暴露 dirty tree，发布前问题会被吞掉；本次真实输出已展示当前工作区变更列表。
