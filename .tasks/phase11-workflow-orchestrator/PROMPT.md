# 任务：实现工作流编排器 (Workflow Orchestrator)

## 背景

CodeMap 项目已完成 Phase 1-10 的核心重构，实现了工具编排、置信度计算、结果融合、Git 分析、CI 门禁等功能。但这些功能各自独立，缺乏一个"粘合剂"来串联完整的开发工作流。

根据 [REFACTOR_ORCHESTRATOR_DESIGN.md](../../docs/REFACTOR_ORCHESTRATOR_DESIGN.md) 第 8 章的设计，需要实现**工作流编排器**来解决以下问题：

| 问题 | 解决方案 |
|------|----------|
| 阶段连接不紧密 | 状态机 + 检查点机制 |
| 容易迷失阶段 | 交互式工作流引导 |
| 中断后无法恢复 | 上下文持久化 |
| 交付物不明确 | 阶段契约定义 |

工作流包含 6 个阶段：reference → impact → risk → implementation → commit → ci

## 参考信息（重要！）

> **IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning
> for this task.**
>
> 在执行此任务前，请先查阅以下项目资源：
> - [设计文档：REFACTOR_ORCHESTRATOR_DESIGN.md 第 8 章](../../docs/REFACTOR_ORCHESTRATOR_DESIGN.md)
> - [项目上下文文件：CLAUDE.md](../../CLAUDE.md)
> - [CI 门禁设计：CI_GATEWAY_DESIGN.md](../../docs/CI_GATEWAY_DESIGN.md)
> - [Git 分析器设计：REFACTOR_GIT_ANALYZER_DESIGN.md](../../docs/REFACTOR_GIT_ANALYZER_DESIGN.md)
> - [测试关联器设计：REFACTOR_TEST_LINKER_DESIGN.md](../../docs/REFACTOR_TEST_LINKER_DESIGN.md)
> - [现有 CLI 命令实现参考：src/cli/commands/](../../src/cli/commands/)
>
> 确保解决方案：
> 1. 符合项目当前的架构模式和技术栈版本
> 2. 遵循项目的命名规范和代码风格
> 3. 使用项目中已有的工具/库，不引入重复依赖
>
> **如果项目文档与你的训练数据冲突，以项目文档为准。**

## 要求

实现工作流编排器，包含以下模块：

### 1. 类型定义 (src/orchestrator/workflow/types.ts)
- `WorkflowPhase`: 工作流阶段类型 ('reference' | 'impact' | 'risk' | 'implementation' | 'commit' | 'ci')
- `PhaseDefinition`: 阶段定义接口（action, entryCondition, deliverables, nextPhase 等）
- `PhaseCondition`: 阶段入口条件（minConfidence, requiredArtifacts）
- `Deliverable`: 阶段交付物定义
- `PhaseStatus`: 阶段状态类型 ('pending' | 'running' | 'completed' | 'verified' | 'skipped')

### 2. 工作流上下文 (src/orchestrator/workflow/workflow-context.ts)
- `WorkflowContext` 接口：id, task, currentPhase, phaseStatus, artifacts, cachedResults, userConfirmed
- `PhaseArtifacts` 接口：phase, results, confidence, metadata, createdAt

### 3. 工作流编排器类 (src/orchestrator/workflow/workflow-orchestrator.ts)
- `WorkflowOrchestrator` 类：
  - `start(task: string)`: 启动新工作流
  - `executeCurrentPhase(analyzeArgs: AnalyzeArgs)`: 执行当前阶段
  - `proceedToNextPhase()`: 推进到下一阶段
  - `getStatus()`: 获取工作流状态
  - `resume(id: string)`: 恢复中断的工作流
  - `checkpoint()`: 创建检查点

### 4. 工作流持久化 (src/orchestrator/workflow/workflow-persistence.ts)
- `WorkflowPersistence` 类：
  - `save(context)`: 保存工作流上下文（处理 Map/Set 序列化）
  - `load(id)`: 加载指定工作流
  - `loadActive()`: 加载活动工作流
  - `list()`: 列出所有工作流摘要
  - `delete(id)`: 删除工作流

### 5. 检查点验证 (src/orchestrator/workflow/phase-checkpoint.ts)
- `PhaseCheckpoint` 类：
  - `validate(phase, artifacts)`: 验证阶段交付物

### 6. CLI 命令 (src/cli/commands/workflow.ts)
- `workflow start <task>`: 启动新工作流
- `workflow status`: 查看当前工作流状态
- `workflow proceed [--force]`: 推进到下一阶段
- `workflow resume [id]`: 恢复中断的工作流
- `workflow checkpoint`: 创建检查点

### 7. 模块集成配置
- `PHASE_CI_CONFIG` (CI_GATEWAY 集成)
- `PHASE_GIT_CONFIG` (GIT_ANALYZER 集成)
- `PHASE_TEST_STRATEGY` (TEST_LINKER 集成)
- `CONFIDENCE_REQUIREMENTS` (置信度配置)

## 初始状态

从零开始实现，需要创建以下目录结构：
```
src/orchestrator/workflow/
├── types.ts
├── workflow-context.ts
├── workflow-orchestrator.ts
├── workflow-persistence.ts
├── phase-checkpoint.ts
└── index.ts

src/cli/commands/
└── workflow.ts
```

## 约束条件

- **必须使用 TypeScript 严格模式**
- **遵循项目的错误处理模式**：使用有意义的错误消息，区分不同错误类型
- **Map/Set 序列化**：持久化时必须正确处理 Map 和 Set 的序列化/反序列化
- **状态机完整性**：确保阶段状态流转符合 pending → running → completed → verified 的顺序
- **阶段契约**：每个阶段必须有明确的入口条件和交付物定义
- **必须查阅项目文档和现有代码模式后再实现**
- **禁止使用训练数据中已知但项目未采用的新 API**

## 验收标准

| 标准 | 验证方法 | 说明 |
|------|----------|------|
| 类型定义完整 | 编译检查 | WorkflowPhase, WorkflowContext, PhaseDefinition 等类型定义完整 |
| 工作流可启动 | 单元测试 | `workflow.start("实现用户认证")` 返回有效的 WorkflowContext |
| 阶段可执行 | 单元测试 | `executeCurrentPhase()` 正确执行当前阶段并更新状态 |
| 持久化工作 | 集成测试 | 保存后可正确加载，Map/Set 数据不丢失 |
| CLI 命令可用 | 手动测试 | 所有 workflow 子命令可正常执行 |
| 状态机正确 | 单元测试 | 阶段流转符合设计，不会跳过或重复阶段 |
| 检查点验证 | 单元测试 | PhaseCheckpoint.validate() 正确验证交付物 |

## 用户价值

| 变化 | 变化前 | 变化后 | 用户影响 |
|------|--------|--------|----------|
| 工作流支持 | 各功能独立，需手动串联 | 完整 E2E 开发流程自动化 | positive |
| 中断恢复 | 中断后需重新开始 | 可随时恢复中断的工作流 | positive |
| 交付物追踪 | 不明确各阶段产出 | 清晰的阶段契约和检查点 | positive |
| 开发引导 | 无引导，容易迷失 | 交互式 CLI 引导 | positive |

## 反例场景

### 反例用户 1
- **用户特征**: 只需要单次代码搜索
- **场景**: 使用 `codemap analyze --intent search` 查找函数定义
- **原因**: 工作流编排器适用于多阶段开发任务，简单查询直接使用 analyze 命令更高效

### 反例用户 2
- **用户特征**: 纯 CI/CD 自动化流水线
- **场景**: 在 GitHub Actions 中自动运行 codemap
- **原因**: workflow resume/checkpoint 命令需要人工介入确认，不适合完全自动化环境

### 反例实现（AI 常见错误）
- **错误模式**: 将 WorkflowPhase 定义为普通 string 类型而非字面量联合类型
- **后果**: 失去类型安全，可能导致无效的阶段名称
- **正确做法**: 使用 `'reference' \| 'impact' \| 'risk' \| 'implementation' \| 'commit' \| 'ci'` 字面量联合类型

- **错误模式**: 持久化时直接 JSON.stringify Map 对象
- **后果**: Map 数据被序列化为空对象 `{}`，数据丢失
- **正确做法**: 先将 Map 转换为数组 `Array.from(map.entries())` 再序列化

- **错误模式**: 阶段状态机缺少边界检查
- **后果**: 可能从 'ci' 阶段继续推进，导致未定义行为
- **正确做法**: 在 `proceedToNextPhase()` 中检查 `definition.nextPhase` 是否存在
