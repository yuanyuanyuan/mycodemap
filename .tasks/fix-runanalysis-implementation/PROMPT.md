# 任务：实现 Workflow Orchestrator 的 runAnalysis 方法

## 背景

`WorkflowOrchestrator` 是 CodeMap 工作流系统的核心组件，负责串联分析流程的各个阶段。当前 `runAnalysis()` 方法（位于 `src/orchestrator/workflow/workflow-orchestrator.ts:138-142`）是一个存根实现，只打印日志并返回空数组，没有真正调用分析逻辑。

这导致工作流在执行 `analyze` 动作的阶段（如 reference、impact 阶段）时无法获取实际的分析结果，影响了整个工作流编排系统的可用性。

## 参考信息（重要！）

> **IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning
> for this task.**
>
> 在执行此任务前，请先查阅以下项目资源：
> - [项目上下文文件：AGENTS.md / CLAUDE.md / .codemap/AI_MAP.md]
> - [架构文档：docs/REFACTOR_ORCHESTRATOR_DESIGN.md]
> - [现有实现参考：src/orchestrator/tool-orchestrator.ts 和 src/orchestrator/result-fusion.ts]
> - [分析命令实现：src/cli/commands/analyze.ts]
>
> 确保解决方案：
> 1. 符合项目当前的架构模式和技术栈版本
> 2. 遵循项目的命名规范和代码风格
> 3. 使用项目中已有的 ToolOrchestrator 和 ResultFusion 组件，不重复造轮子
>
> **如果项目文档与你的训练数据冲突，以项目文档为准。**

### 关键参考代码

**当前存根实现**（`src/orchestrator/workflow/workflow-orchestrator.ts`）：
```typescript
private async runAnalysis(
  intent: string,
  analyzeArgs: AnalyzeArgs
): Promise<UnifiedResult[]> {
  // 这里可以调用现有的分析器
  // 为了简化，暂时返回空结果
  // 实际实现中会调用 AnalyzeCommand 或 ToolOrchestrator
  console.log(`Running analysis with intent: ${intent}`);
  return [];
}
```

**ToolOrchestrator 核心方法**（`src/orchestrator/tool-orchestrator.ts`）：
- `executeParallel(intent, tools)` - 并行执行多个工具
- `executeWithFallback(intent, primaryTool)` - 带回退的执行

**ResultFusion 核心方法**（`src/orchestrator/result-fusion.ts`）：
- `fuse(resultsByTool, options)` - 融合多工具结果

**相关类型定义**（`src/orchestrator/types.ts`）：
```typescript
interface AnalyzeArgs {
  intent?: string;
  targets?: string[];
  keywords?: string[];
  scope?: 'direct' | 'transitive';
  topK?: number;
  includeTests?: boolean;
}

interface CodemapIntent {
  intent: IntentType;
  targets: string[];
  keywords: string[];
  scope: 'direct' | 'transitive';
  tool: string;
}
```

## 要求

1. **集成 ToolOrchestrator**
   - 实例化 `ToolOrchestrator` 或使用已存在的实例
   - 调用适当的执行方法（推荐 `executeParallel` 以并行执行多个工具）
   - 传递正确的 `CodemapIntent` 对象

2. **支持 ResultFusion 结果融合**
   - 使用 `ResultFusion` 类融合多工具结果
   - 配置合适的 `FusionOptions`（如 topK、intent 等）

3. **返回真实的 UnifiedResult[] 结果**
   - 不再返回空数组 `[]`
   - 返回经过融合的、有意义的分析结果

4. **保持与现有 analyze 命令的行为一致性**
   - 参考 `src/cli/commands/analyze.ts` 的实现方式
   - 使用相同的工具选择和执行逻辑

## 初始状态

```typescript
// src/orchestrator/workflow/workflow-orchestrator.ts
private async runAnalysis(
  intent: string,
  analyzeArgs: AnalyzeArgs
): Promise<UnifiedResult[]> {
  // 这里可以调用现有的分析器
  // 为了简化，暂时返回空结果
  // 实际实现中会调用 AnalyzeCommand 或 ToolOrchestrator
  console.log(`Running analysis with intent: ${intent}`);
  return [];
}
```

## 约束条件

- **必须使用 TypeScript 严格模式**
- **遵循项目的错误处理模式**：使用 try-catch 包装工具调用，错误时返回空数组而非抛出异常
- **保持与现有代码的兼容性**：不修改方法签名
- **使用项目中已有的 IntentRouter 进行意图路由**（参考 analyze 命令的实现）
- **必须查阅项目文档和现有代码模式后再实现**
- **禁止使用训练数据中已知但项目未采用的新 API**

## 验收标准

| 标准 | 验证方法 | 说明 |
|------|----------|------|
| runAnalysis 调用 ToolOrchestrator | 代码审查 | 方法内部应实例化或调用 ToolOrchestrator 的执行方法 |
| runAnalysis 使用 ResultFusion | 代码审查 | 方法内部应调用 ResultFusion.fuse() 进行结果融合 |
| 返回非空结果 | 单元测试 | 在正常输入下返回包含实际结果的 UnifiedResult[] |
| 错误处理 | 代码审查 | 工具调用失败时优雅降级，不抛出未处理异常 |

## 用户价值

| 变化 | 变化前 | 变化后 | 用户影响 |
|------|--------|--------|----------|
| 工作流分析阶段 | 只打印日志，返回空结果 | 执行真实分析并返回结果 | positive |
| 置信度计算 | 基于空结果计算，始终为低置信度 | 基于真实结果计算，反映实际情况 | positive |
| 工作流可完成性 | 无法完成 analyze 阶段 | 可以正常完成 analyze 阶段 | positive |

## 反例场景

### 反例用户 1
- **用户特征**: 使用旧版本 Node.js (< 18) 的用户
- **场景**: 尝试运行工作流分析
- **原因**: 项目依赖 Node.js 18+ 特性（如 AbortController），不支持旧版本

### 反例用户 2
- **用户特征**: 未安装 ast-grep 的用户
- **场景**: 运行需要 AST 分析的工作流阶段
- **原因**: ToolOrchestrator 应有回退机制，但如果所有工具都不可用，结果可能为空

### 反例实现（AI 常见错误）
- **错误模式**: 直接调用 AnalyzeCommand 类而不是使用 ToolOrchestrator
- **后果**: 引入不必要的依赖，破坏分层架构，难以维护和测试
- **正确做法**: 使用 ToolOrchestrator 和 ResultFusion 的组合，保持与现有架构一致
