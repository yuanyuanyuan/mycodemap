---
name: task-executor
description: 任务实施执行专用技能。按照 task-generator 生成的任务四件套（PROMPT.md、EVAL.ts、SCORING.md、task-metadata.yaml）标准化执行任务。支持单任务、批量任务、依赖编排三种执行模式。执行前验证任务完整性，执行后更新元数据状态。触发词：执行任务、实施任务、跑任务、execute task、run task。
---

# task-executor

## 能力边界

- **本技能只负责执行**已生成的任务（execute flow）
- **不负责**：任务生成（由 task-generator 负责）、任务审计（由 task-analyzer 负责）
- **必须**：执行前验证四件套完整性，执行后更新元数据状态

## 执行模式

| 模式 | 触发条件 | 说明 |
|------|----------|------|
| **单任务模式** | 用户指定单个任务 | 直接执行，适合简单任务 |
| **批量模式** | 用户指定多个任务 | 并行执行，任务间无依赖 |
| **编排模式** | 任务有 dependencies | 拓扑排序，按依赖顺序执行 |

## 执行流程

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 0: 初始化与验证                                        │
│   1. 解析任务标识（路径或名称）                              │
│   2. 验证任务四件套完整性（validate-task.js）               │
│   3. 加载 task-metadata.yaml                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: 执行模式决策                                        │
│   ├─ 单任务 → 进入 Phase 2                                   │
│   ├─ 批量任务 → 依赖解析 → 拓扑排序 → 顺序执行               │
│   └─ 复杂任务 → 启动多 Agent 协作                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: 任务执行                                            │
│   1. 读取并解析 PROMPT.md                                    │
│   2. 分析项目上下文（AGENTS.md、CLAUDE.md、设计文档）       │
│   3. 生成/修改代码实现                                       │
│   4. 运行 EVAL.ts 测试                                       │
│   5. 对照 SCORING.md 自评                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: 结果汇总与状态更新                                  │
│   1. 生成执行报告（generate-report.js）                     │
│   2. 更新 task-metadata.yaml 状态（update-metadata.js）     │
│   3. 输出验收结果                                            │
└─────────────────────────────────────────────────────────────┘
```

## 多 Agent 协作（复杂任务）

当任务满足以下任一条件时，启动多 Agent 协作：
- estimated_minutes > 60
- difficulty == "hard"
- 涉及多个文件修改（>5 个）
- 有跨模块依赖

### 角色分工

| 角色 | 职责 | Agent 名称 |
|------|------|-----------|
| **Executor** | 核心代码实现 | task-executor |
| **Reviewer** | 代码审查、质量把关 | code-reviewer |
| **Validator** | 运行测试、验证验收标准 | task-validator |

### 协作流程

```
Executor 生成代码
    ↓
Reviewer 审查（如发现问题，返回 Executor）
    ↓
Validator 运行测试（如失败，返回 Executor）
    ↓
全部通过 → 更新状态
```

## 使用方式

### 单任务执行

```bash
# 通过任务名称
node .claude/skills/task-executor/scripts/execute-task.js --task phase1-unified-result

# 通过路径
node .claude/skills/task-executor/scripts/execute-task.js --path .tasks/phase1-unified-result
```

### 批量任务执行

```bash
# 执行多个指定任务
node .claude/skills/task-executor/scripts/batch-executor.js --tasks phase1-unified-result,phase2-confidence

# 执行所有待完成任务
node .claude/skills/task-executor/scripts/batch-executor.js --status pending
```

### 依赖编排执行

```bash
# 自动解析依赖并排序执行
node .claude/skills/task-executor/scripts/batch-executor.js --with-dependencies phase1-unified-result
```

## 四件套验证

执行前必须验证以下文件存在且有效：

| 文件 | 验证内容 |
|------|----------|
| `PROMPT.md` | 必须包含：背景、要求、初始状态、约束条件、验收标准 |
| `EVAL.ts` | 必须是有效的 TypeScript/Vitest 测试文件 |
| `SCORING.md` | 总分必须等于 100，必须包含评分等级定义 |
| `task-metadata.yaml` | 必须是有效的 YAML，包含 metadata、task、capabilities |

验证命令：
```bash
node .claude/skills/task-executor/scripts/validate-task.js --task <task-name>
```

## 执行报告格式

每个任务执行完成后生成报告：

```markdown
# Task Execution Report: {task-name}

## 执行摘要
- 执行时间: {timestamp}
- 执行模式: single|batch|orchestrated
- 执行状态: success|partial|failed
- 最终得分: {score}/100

## 代码变更
- 修改文件数: {n}
- 新增文件数: {n}
- 删除文件数: {n}

## 测试结果
- 通过检查点: {n}/{total}
- 失败检查点: {list}
- 测试输出: {summary}

## 自评详情
对照 SCORING.md 逐项评分...

## 元数据更新
- 执行状态已更新: {timestamp}
- 执行证据: {evidence}
```

## 元数据状态更新

执行完成后更新 `task-metadata.yaml`：

```yaml
workflow:
  execution:
    status: "completed|failed|partial"
    executed_at: "2026-03-01T10:00:00Z"
    executed_by: "task-executor"
    final_score: 85
    evidence: "执行报告路径或关键结果"
    artifacts:
      report: "EXECUTION_REPORT.md"
      changes: "git commit hash"
```

## 脚本工具

| 脚本 | 用途 |
|------|------|
| `scripts/validate-task.js` | 验证任务四件套完整性 |
| `scripts/execute-task.js` | 单任务核心执行逻辑 |
| `scripts/batch-executor.js` | 批量任务编排执行 |
| `scripts/dependency-resolver.js` | 解析任务依赖关系 |
| `scripts/update-metadata.js` | 更新 task-metadata.yaml |
| `scripts/generate-report.js` | 生成执行报告 |

## 参考文档

- [执行模式详解](references/execution-patterns.md)
- [多 Agent 协作流程](references/multi-agent-workflow.md)
