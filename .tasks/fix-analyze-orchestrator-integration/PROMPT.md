# 任务：Analyze 命令接入 ToolOrchestrator 和 ResultFusion

## 背景

CodeMap 项目正在进行架构重构，引入统一的编排层（Orchestrator Layer）来管理多工具执行和结果融合。当前 `analyze.ts` 命令使用硬编码的 switch 语句直接调用底层命令，存在以下问题：

1. **没有接入 ToolOrchestrator**：无法享受工具编排器提供的超时控制、错误隔离、回退级联等能力
2. **没有使用 ResultFusion**：多工具结果无法统一融合、去重、排序
3. **仅支持 3/8 个 intent**：`impact`、`dependency`、`complexity` 已实现，其余 5 个未实现

## 参考信息（重要！）

> **IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning
> for this task.**
>
> 在执行此任务前，请先查阅以下项目资源：
> - [项目上下文文件：AGENTS.md / CLAUDE.md / .codemap/AI_MAP.md]
> - [架构文档：docs/REFACTOR_ORCHESTRATOR_DESIGN.md - 编排层设计]
> - [架构文档：docs/REFACTOR_RESULT_FUSION_DESIGN.md - 结果融合设计]
> - [现有实现参考：src/orchestrator/tool-orchestrator.ts]
> - [现有实现参考：src/orchestrator/result-fusion.ts]
> - [类型定义：src/orchestrator/types.ts]
>
> 确保解决方案：
> 1. 符合项目当前的架构模式和技术栈版本
> 2. 遵循项目的命名规范和代码风格
> 3. 使用项目中已有的 ToolOrchestrator 和 ResultFusion 类
>
> **如果项目文档与你的训练数据冲突，以项目文档为准。**

## 要求

1. **接入 ToolOrchestrator**
   - 在 `AnalyzeCommand` 类中实例化 `ToolOrchestrator`
   - 使用 `executeWithFallback` 或 `executeParallel` 执行工具
   - 保留原有 `impact`、`dependency`、`complexity` 的增强模式调用

2. **使用 ResultFusion 融合结果**
   - 多工具结果通过 `ResultFusion.fuse()` 统一融合
   - 支持加权合并、去重、排序、Top-K 裁剪

3. **支持所有 8 个 intent 类型**
   - `impact` - 影响分析（复用 ImpactCommand + ast-grep 增强）
   - `dependency` - 依赖分析（复用 DepsCommand）
   - `complexity` - 复杂度分析（复用 ComplexityCommand）
   - `search` - 代码搜索（使用 ast-grep）
   - `overview` - 项目概览（使用 Codemap 核心）
   - `documentation` - 文档搜索（搜索 Markdown 文件）
   - `refactor` - 重构建议（使用 ast-grep）
   - `reference` - 参考搜索（使用 ast-grep + 回退）

4. **保持向后兼容性**
   - 原有 CLI 参数和行为保持不变
   - 原有 `executeImpact`、`executeDeps`、`executeComplexity` 方法可保留（内部调用编排器）
   - JSON 输出格式保持一致

## 初始状态

```typescript
// src/cli/commands/analyze.ts:114-123
switch (intent) {
  case 'impact':
    return this.executeImpact(scope, topK);
  case 'dependency':
    return this.executeDeps(topK);
  case 'complexity':
    return this.executeComplexity(topK);
  default:
    return this.executeImpact(scope, topK);
}
```

## 约束条件

- 必须使用 TypeScript 严格模式
- 必须使用项目中已定义的 `ToolOrchestrator` 和 `ResultFusion` 类
- 必须遵循 `UnifiedResult` 统一结果格式
- 不得修改 `IntentType` 类型定义（已在 `src/orchestrator/types.ts` 中定义）
- 保持原有的错误码和错误处理模式
- **必须查阅项目文档和现有代码模式后再实现**
- **禁止使用训练数据中已知但项目未采用的新 API**

## 验收标准

| 标准 | 验证方法 | 说明 |
|------|----------|------|
| ToolOrchestrator 集成 | 代码检查 | `AnalyzeCommand` 包含 `ToolOrchestrator` 实例并调用其方法 |
| ResultFusion 融合 | 代码检查 | 多工具结果通过 `ResultFusion.fuse()` 融合 |
| 8 个 intent 支持 | 代码检查 | switch/case 或路由逻辑覆盖所有 8 个 intent |
| 向后兼容 | 测试运行 | 现有测试通过，CLI 参数行为不变 |
| 无硬编码 switch | 代码检查 | 移除或重构原有的硬编码 switch 路由 |

## 用户价值

| 变化 | 变化前 | 变化后 | 用户影响 |
|------|--------|--------|----------|
| 工具编排 | 直接调用命令，无超时/回退 | ToolOrchestrator 管理执行 | positive |
| 结果质量 | 单一工具结果 | 多工具融合、去重、排序 | positive |
| intent 支持 | 仅 3/8 个 | 完整 8 个 intent | positive |
| 置信度反馈 | 无 | 每个结果附带置信度 | positive |

## 反例场景

### 反例用户 1
- **用户特征**: 依赖旧版 JSON 输出格式做自动化解析
- **场景**: JSON 输出结构发生破坏性变更
- **原因**: 会破坏下游工具集成

### 反例用户 2
- **用户特征**: 在低性能环境运行
- **场景**: 强制并行执行大量工具导致内存溢出
- **原因**: 未考虑资源限制

### 反例实现（AI 常见错误）
- **错误模式**: 重新实现 ToolOrchestrator/ResultFusion 逻辑而非复用现有类
- **后果**: 代码冗余，维护困难
- **正确做法**: 导入并使用 `src/orchestrator/` 中已实现的类
