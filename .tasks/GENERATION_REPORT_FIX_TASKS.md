# 任务生成报告 - 修复批次 (基于 FINAL_REVIEW_REPORT)

> 生成时间: 2026-03-01
> 生成依据: `/data/codemap/FINAL_REVIEW_REPORT.md`

---

## 执行摘要

本次生成了 4 个修复任务，全部通过三角色流程 (Generator → QA → Supervisor) 并达到交付标准。

| 任务 | 状态 | 语义得分 | Critical Failures | 审批结果 |
|------|------|----------|-------------------|----------|
| fix-runanalysis-implementation | ✅ 完成 | 98 | 0 | **APPROVED** |
| fix-analyze-orchestrator-integration | ✅ 完成 | 99 | 0 | **APPROVED** |
| fix-output-contract | ✅ 完成 | 100 | 0 | **APPROVED** |
| fix-timeout-mechanism | ✅ 完成 | 99 | 0 | **APPROVED** |

---

## 任务详情

### 1. fix-runanalysis-implementation

**目标**: 实现 Workflow Orchestrator 的 runAnalysis 方法

**问题来源**: 
- `src/orchestrator/workflow/workflow-orchestrator.ts:138-142` 当前是存根实现
- 只打印日志并返回空数组，没有真正调用分析逻辑

**交付文件**:
- `.tasks/fix-runanalysis-implementation/PROMPT.md`
- `.tasks/fix-runanalysis-implementation/EVAL.ts`
- `.tasks/fix-runanalysis-implementation/SCORING.md`
- `.tasks/fix-runanalysis-implementation/task-metadata.yaml`
- `.tasks/fix-runanalysis-implementation/SUPERVISOR_SEMANTIC_REVIEW.md`

---

### 2. fix-analyze-orchestrator-integration

**目标**: Analyze 命令接入 ToolOrchestrator 和 ResultFusion

**问题来源**:
- `src/cli/commands/analyze.ts:114-123` 使用硬编码的 switch
- 没有接入 ToolOrchestrator 进行工具编排
- 没有使用 ResultFusion 进行多工具结果融合

**交付文件**:
- `.tasks/fix-analyze-orchestrator-integration/PROMPT.md`
- `.tasks/fix-analyze-orchestrator-integration/EVAL.ts`
- `.tasks/fix-analyze-orchestrator-integration/SCORING.md`
- `.tasks/fix-analyze-orchestrator-integration/task-metadata.yaml`
- `.tasks/fix-analyze-orchestrator-integration/SUPERVISOR_SEMANTIC_REVIEW.md`

---

### 3. fix-output-contract

**目标**: 修复输出契约校验和字段完整性

**问题来源**:
- `src/cli/commands/ci.ts:150-178` 只读取 package.json，未校验 analyze 输出
- `src/cli/commands/analyze.ts:143-150` machine 输出缺少 schemaVersion/tool/confidence 字段

**交付文件**:
- `.tasks/fix-output-contract/PROMPT.md`
- `.tasks/fix-output-contract/EVAL.ts`
- `.tasks/fix-output-contract/SCORING.md`
- `.tasks/fix-output-contract/task-metadata.yaml`
- `.tasks/fix-output-contract/TRIAD_ROLES.yaml`
- `.tasks/fix-output-contract/TRIAD_WORKFLOW.md`
- `.tasks/fix-output-contract/TRIAD_ACCEPTANCE.md`
- `.tasks/fix-output-contract/SUPERVISOR_SEMANTIC_REVIEW.md`

---

### 4. fix-timeout-mechanism

**目标**: 修复 ToolOrchestrator 超时控制机制

**问题来源**:
- `src/orchestrator/tool-orchestrator.ts:100` 创建了 AbortController
- `src/orchestrator/tool-orchestrator.ts:118` 执行 adapter.execute() 但未传递 signal
- 超时控制名义存在但未真正生效

**交付文件**:
- `.tasks/fix-timeout-mechanism/PROMPT.md`
- `.tasks/fix-timeout-mechanism/EVAL.ts`
- `.tasks/fix-timeout-mechanism/SCORING.md`
- `.tasks/fix-timeout-mechanism/task-metadata.yaml`
- `.tasks/fix-timeout-mechanism/TRIAD_ROLES.yaml`
- `.tasks/fix-timeout-mechanism/TRIAD_WORKFLOW.md`
- `.tasks/fix-timeout-mechanism/TRIAD_ACCEPTANCE.md`
- `.tasks/fix-timeout-mechanism/SUPERVISOR_SEMANTIC_REVIEW.md`

---

## 三角色工作流记录

| 角色 | Agent | 状态 | 证据 |
|------|-------|------|------|
| Generator | task-generator | ✅ completed | 四件套已生成 |
| QA | task-qa | ✅ completed | 质量验收通过 |
| Supervisor | task-supervisor | ✅ completed | 语义判定通过 (>=85分) |

---

## 更新记录

### AGENTS.md
- 在 `<!-- TASK-GENERATOR-CONTEXT-START -->` 和 `<!-- TASK-GENERATOR-CONTEXT-END -->` 之间添加了修复批次任务列表

---

## 后续建议

根据 FINAL_REVIEW_REPORT.md 的建议，在修复这 4 项之前，不建议把重构标记为"已通过最终验收"。建议按以下优先级执行：

1. **fix-runanalysis-implementation** (critical) - Workflow Orchestrator 核心功能
2. **fix-analyze-orchestrator-integration** (critical) - 端到端流程打通
3. **fix-output-contract** (critical) - 契约稳定性
4. **fix-timeout-mechanism** (high) - 可靠性保障

