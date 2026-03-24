# 05-02 Summary

## 完成内容

- 将 `src/cli/commands/ship/rules/quality-rules.ts` 的 `workingTreeClean`、`correctBranch`、`allChecksPass` 改为直接委托 `ci` helper。
- 删除 `src/cli/commands/ship/checker.ts` 中直接读取 branch 的实现，只保留组装 `CheckContext` 与置信度计算。
- 为 ship 规则委托新增测试，并同步 README / AI_GUIDE / COMMANDS / validation / engineering 文档，明确 `ship` CHECK 阶段复用 `ci check-working-tree`、`ci check-branch`、`ci check-scripts`。

## 验证

- `pnpm exec vitest run src/cli/commands/ship/__tests__/quality-rules.test.ts src/cli/commands/ship/__tests__/pipeline.test.ts`
- `npm run docs:check`
- `node dist/cli/index.js ci check-docs-sync`

## 失败场景预演

- 若 `ship` 继续保留自己的 branch / script 检查逻辑，`ci` 和 `ship` 会再次出现分叉；本次通过委托测试锁定了复用链。
- 若入口文档不说明 `ship` 复用 `ci`，用户会继续把两者看成平行而独立的检查面；本次已在 README / AI docs / rules 中同步说明。

## 剩余风险

- docs guardrail 还没有专门检查新 CI 子命令和 ship 对齐文案；需要在 Phase 6 固化成脚本级护栏。
