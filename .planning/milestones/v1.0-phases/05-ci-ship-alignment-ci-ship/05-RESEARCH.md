# Phase 5: CI Ship Alignment（CI 与 Ship 边界对齐） - Research

**Researched:** 2026-03-24
**Domain:** CI Gateway / ship preflight convergence
**Confidence:** HIGH

<research_summary>
## Summary

Phase 5 的核心问题不是“少了三个命令”，而是**同一类发布前检查分散在两套实现里**。`src/cli/commands/ship/checker.ts` 之前直接读取当前分支，而 `src/cli/commands/ship/rules/quality-rules.ts` 又分别维护 `workingTreeClean`、`correctBranch`、`allChecksPass` 规则。这样一来，任何分支策略或脚本集合一改，`ci` 和 `ship` 就会立刻漂移。

第二个结论是：**最稳的修法是把 gate checks 升格到 `ci` 层**。`src/cli/commands/ci.ts` 已是公开门禁入口，因此把 `working tree / branch / scripts` 统一实现为 `ci` helper + 子命令，再让 `ship` 规则层调用这些 helper，能同时满足 CLI 可见性和单一事实源。

第三个结论是：**`noBreakingWithoutMajor` 不该强行塞进 `ci`**。这是 release policy，而不是通用预检命令；如果为了“绝对统一”把它也搬进 `ci`，只会扩大 Phase 5 范围。

**Primary recommendation:**  
1. 在 `ci.ts` 实现 `runWorkingTreeCheck`、`runBranchCheck`、`runScriptsCheck` 与对应子命令；  
2. 让 `ship/rules/quality-rules.ts` 直接复用这些 helper；  
3. 移除 `ship/checker.ts` 里的直接 branch 读取；  
4. 同步入口文档说明 `ship` CHECK 阶段复用 `ci` gate checks。
</research_summary>

<common_pitfalls>
## Common Pitfalls

- 只给 `ci` 新增命令，不改 `ship` 规则 —— `SHIP-01` 依然不满足。
- 只在 `ship` 里 shell 调 `node dist/cli/index.js ci ...` —— 运行成本更高，测试更脆弱，也不如共享 helper 清晰。
- 把 `check-scripts` 做成另一套脚本列表 —— 会再次产生“命令存在但 ship 不用”的漂移。

</common_pitfalls>

---

*Phase: 05-ci-ship-alignment-ci-ship*
*Research completed: 2026-03-24*
