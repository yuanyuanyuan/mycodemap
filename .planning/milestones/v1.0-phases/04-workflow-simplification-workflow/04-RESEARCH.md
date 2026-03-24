# Phase 4: Workflow Simplification（Workflow 阶段模型简化） - Research

**Researched:** 2026-03-24
**Domain:** workflow public contract simplification
**Confidence:** HIGH

<research_summary>
## Summary

`workflow` 的核心真相已经迁移到 4 个纯分析阶段：`src/orchestrator/workflow/types.ts:17` 固定 `find → read → link → show`；`src/orchestrator/workflow/workflow-context.ts:25` 让新工作流从 `find` 起步；`src/orchestrator/workflow/templates.ts:55` 让所有内置模板复用同一 4 阶段生成函数；`src/orchestrator/workflow/visualizer.ts:106` 与 `src/orchestrator/workflow/visualizer.ts:150` 也都只按 4 阶段渲染。

第二个结论是：**文档和测试一度仍在传播旧事实**。`README.md:264` 之前把 workflow 描述为 legacy 6 阶段，`docs/ai-guide/COMMANDS.md:245` 也还写“当前过渡能力”；而 `src/orchestrator/workflow/__tests__/types.test.ts`、`phase-checkpoint.test.ts`、`workflow-persistence.test.ts` 仍拿旧阶段名做示例。这些文件不会自动因为主代码变更而同步更新。

第三个结论是：**模板行为需要显式写清楚**。`src/orchestrator/workflow/templates.ts:55` 接受的只是阈值覆写，而不是阶段顺序覆写；所以 README 里“bugfix 模板会从 reference 直接跳到 implementation”这类旧示例已经失真。

**Primary recommendation:** 采用最小可行收口路线：  
1. 保留主代码里已经完成的 4 阶段模型；  
2. 清理 workflow 文档与测试里的旧阶段事实；  
3. 用 workflow 测试集与真实 CLI 输出证明 `FLOW-01/FLOW-02` 达成。
</research_summary>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: Single phase truth
`WorkflowPhase` 和 `WORKFLOW_PHASES` 是 workflow 阶段的单一事实源，其它 CLI、模板、可视化都只能消费这层真相，不能各自再维护一套阶段名。

### Pattern 2: Templates vary thresholds, not sequence
模板仍有价值，但它们现在只调整 `find/read/link/show` 的阶段阈值；这既保留场景差异，也避免把 workflow 再次扩回开发执行流。

### Pattern 3: Docs/tests are part of the contract
workflow 是公开 CLI surface，README、AI 命令文档和测试示例都属于契约的一部分；不同步这些文件，Phase 4 就是假完成。

</architecture_patterns>

<common_pitfalls>
## Common Pitfalls

- 只改 `workflow types`，不改 `README` / `COMMANDS` —— 用户仍会按旧 6 阶段理解产品。
- 只改 CLI 帮助，不改测试示例 —— 旧阶段名会继续在测试或样例代码里扩散。
- 把模板差异误写成“跳过阶段” —— 与 `createWorkflowAnalysisPhases()` 的真实行为冲突。

</common_pitfalls>

---

*Phase: 04-workflow-simplification-workflow*
*Research completed: 2026-03-24*
