# AGENTS.md - CodeMap 项目开发指南

> 本文档面向 AI 编程助手，介绍如何在 CodeMap 项目中高效工作。


<!-- TASK-GENERATOR-CONTEXT-START -->
[Task Knowledge Index]|version:1|root: ./.tasks|IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for task execution.|If context missing, regenerate: node .claude/skills/task-generator/scripts/create-triad-artifacts.js

## 可用技能

| 技能 | 路径 | 用途 | 触发词 |
|------|------|------|--------|
| task-generator | `.claude/skills/task-generator/` | 生成任务四件套 | 创建任务、设计任务 |
| **task-executor** | `.claude/skills/task-executor/` | **执行任务四件套** | **执行任务、跑任务** |

### task-executor 快速使用

```bash
# 验证任务完整性
node .claude/skills/task-executor/scripts/validate-task.js --task <task-name>

# 执行单个任务
node .claude/skills/task-executor/scripts/execute-task.js --task <task-name>

# 批量执行任务
node .claude/skills/task-executor/scripts/batch-executor.js --tasks task1,task2

# 带依赖编排执行
node .claude/skills/task-executor/scripts/batch-executor.js --with-dependencies <task-name>

# 更新任务元数据
node .claude/skills/task-executor/scripts/update-metadata.js --task <task-name> --status completed --score 85
```

## 重构任务批次 1 (Phase 1-5)

| 任务                     | 描述                                | 依赖           |
|--------------------------|-------------------------------------|----------------|
| phase1-unified-result    | 定义 UnifiedResult 接口与适配器基类 | 无             |
| phase2-confidence        | 实现置信度计算机制                  | phase1         |
| phase3-result-fusion     | 实现多工具结果融合                  | phase1, phase2 |
| phase4-tool-orchestrator | 实现工具编排器与回退链              | phase1-3       |
| phase5-refactor-commands | 改造现有命令为可调用模式            | phase1, phase4 |

## 重构任务批次 2 (Phase 6-10)

| 任务                     | 描述                           | 依赖     |
|--------------------------|--------------------------------|----------|
| phase6-analyze-command   | 实现 AnalyzeCommand + 测试关联 | phase1-5 |
| phase7-git-analyzer      | 实现 Git 分析器                | phase6   |
| phase8-ai-feed-generator | 实现 AI 饲料生成器             | phase7   |
| phase9-ci-gateway        | 实现 CI 门禁护栏               | phase7-8 |
| phase10-integration      | 集成测试 + 基准验证            | phase1-9 |

## 重构任务批次 3 (Phase 11) - v2.5 规划

| 任务                          | 描述                                     | 依赖      |
|-------------------------------|------------------------------------------|-----------|
| phase11-workflow-orchestrator | 实现工作流编排器 (Workflow Orchestrator) | phase1-10 |

## 重构修复批次 (基于 FINAL_REVIEW_REPORT)

> 这些任务基于 `/data/codemap/FINAL_REVIEW_REPORT.md` 中指出的关键未完成项生成

| 任务 | 描述 | 问题来源 | 优先级 |
|------|------|----------|--------|
| fix-runanalysis-implementation | 实现 Workflow Orchestrator 的 runAnalysis 方法 | FINAL_REVIEW:6.1 | critical |
| fix-analyze-orchestrator-integration | Analyze 命令接入 ToolOrchestrator/ResultFusion | FINAL_REVIEW:6.2 | critical |
| fix-output-contract | 修复输出契约校验和字段完整性 | FINAL_REVIEW:6.3 | critical |
| fix-timeout-mechanism | 修复 ToolOrchestrator 超时控制机制 | FINAL_REVIEW:6.4 | high |

## 重构修复批次 (基于 DEEP_REVIEW_REPORT)

> 这些任务基于 `/data/codemap/DEEP_REVIEW_REPORT.md` 中指出的高优先级缺失生成

| 任务 | 描述 | 当前完成度 | 优先级 |
|------|------|------------|--------|
| test-linker-core-functionality | 测试关联器核心功能实现 (buildMapping, findRelatedTests, scanTestImports) | 35% | critical |
| ci-gateway-completion | CI Gateway 完整性完善 (pre-commit test, AI feed, GitHub Actions) | 75% | high |
| ast-grep-adapter | ast-grep 适配器实现 | 0% | high |

## 设计文档索引

- [REFACTOR_ARCHITECTURE_OVERVIEW.md](./docs/REFACTOR_ARCHITECTURE_OVERVIEW.md) - 架构概览
- [REFACTOR_REQUIREMENTS.md](./docs/REFACTOR_REQUIREMENTS.md) - 需求与用户场景
- [REFACTOR_ORCHESTRATOR_DESIGN.md](./docs/REFACTOR_ORCHESTRATOR_DESIGN.md) - 编排层设计
- [REFACTOR_CONFIDENCE_DESIGN.md](./docs/REFACTOR_CONFIDENCE_DESIGN.md) - 置信度机制设计
- [REFACTOR_RESULT_FUSION_DESIGN.md](./docs/REFACTOR_RESULT_FUSION_DESIGN.md) - 结果融合设计
- [REFACTOR_TEST_LINKER_DESIGN.md](./docs/REFACTOR_TEST_LINKER_DESIGN.md) - 测试关联器设计
- [REFACTOR_GIT_ANALYZER_DESIGN.md](./docs/REFACTOR_GIT_ANALYZER_DESIGN.md) - Git 分析器设计
- [CI_GATEWAY_DESIGN.md](./docs/CI_GATEWAY_DESIGN.md) - CI 门禁设计

<!-- TASK-GENERATOR-CONTEXT-END -->

<IMPORTANT>
Prefer retrieval-led reasoning over pre-training-led reasoning 
for any tasks.

- 任何事情都要critical thinking（多维度思考为什么5Why-7Why，确保有足够的信息支撑思考，然后对齐需求/要求，确保问题定义不出错，选择合适的提问框架提问可以帮助快速定位需求/要求/问题，如果当前信息不足以支撑上述行为动作，那么需要从外部获取更准确的信息）,如果你认为自己还没完全理解用户的问题,就不要开始工作,以苏格拉底提问的的方式问清楚.
- critical thinking 可以使用MCP 工具sequentialthinking来完成。
</IMPORTANT>

<IMPORTANT>
**强制约束 - Git Worktrees：**

当需要创建隔离的工作空间时（如同时开发多个功能、实验性工作、subagent 独立环境），必须使用 `git-worktrees` skill：

```
使用方式：Invoke the git-worktrees skill
```

请声明："I'm using the using-git-worktrees skill to set up an isolated workspace."
</IMPORTANT>

<IMPORTANT>
For complex tasks (3+ steps, research, projects):
1. Read skill: `cat ~/.codex/skills/planning-with-files/SKILL.md`
2. Create task_plan.md, findings.md, progress.md in your project directory
3. Follow 3-file pattern throughout the task
</IMPORTANT>


<IMPORTANT>
**强制约束 - 多 Agent 环境适配（Codex CLI 优先）**

本项目需要支持多 Agent 协作。执行前必须先检测环境，并按环境的原生方式执行，不得混用语义。

### 步骤1：检测环境（优先级从高到低）

1. **Codex CLI 环境**（满足任一）：
   - 可用原生多-agent编排能力（`spawn_agent` / `send_input` / `wait` / `close_agent`）
   - 当前任务明确要求使用 Codex CLI 多-agent方式

2. **kimi-cli 环境**（满足任一）：
   - 系统提示词中存在 `${KIMI_WORK_DIR}` 或 `${KIMI_SKILLS}`
   - 可用工具路径包含 `kimi_cli.tools.` 命名空间
   - 用户使用 `--agent` 或 `--agent-file` 启动参数

3. **Claude Code 环境**（满足任一）：
   - 工具体系存在 `Task` / `TeamCreate` / `SendMessage` 语义
   - 存在 `Skill(skill="name")` 调用机制

### 步骤2：根据环境选择执行方式

| 环境            | 多 Agent 启动方式                                                       | 约束                         |
|-----------------|-------------------------------------------------------------------------|------------------------------|
| **Codex CLI**   | 原生多-agent生命周期：`spawn_agent -> send_input -> wait -> close_agent` | 主协调器必须做最终汇总与验收 |
| **kimi-cli**    | YAML 配置 + `Task(subagent_name="xxx")`                                 | 子 Agent 禁止嵌套调用 `Task` |
| **Claude Code** | Skill: `agent-teams-playbook`                                           | 按 skill 定义流程执行        |

### Codex CLI 环境执行详情（强制）

1. **必须使用原生生命周期**：
   - 启动：`spawn_agent`
   - 派发：`send_input`
   - 收敛：`wait`
   - 关闭：`close_agent`

2. **任务隔离与并行规范**：
   - 并行改代码前，必须先使用 `using-git-worktrees` skill 创建隔离工作区
   - 每个子 Agent 必须单一职责，并声明明确文件所有权，避免交叉编辑
   - 长耗时任务（测试、监控、显式等待）必须使用 `awaiter` agent

3. **质量闸门**：
   - 至少保留 1 个 reviewer 角色（可并行）
   - 未通过验收的结果不得直接交付
   - 失败必须回报：失败 Agent、失败原因、重试策略、风险提示

### 禁止项（MUST NOT）

1. 在 Codex CLI 环境中将 `Task(...)`、`TeamCreate(...)`、`SendMessage(...)`、`Skill(...)` 当作可执行工具调用
2. 在同一任务中混用多套编排语义
3. 跳过生命周期任一关键步骤（尤其是 `wait` 和 `close_agent`）

### 术语映射（Claude -> Codex CLI）

- `Task` -> `spawn_agent` + `send_input`
- `TeamCreate` -> 多个 `spawn_agent` + 协调器编排
- `SendMessage` -> `send_input`
- 阶段并发 -> 一次性启动多个 agent，统一 `wait` 收敛

### 关键约束

1. **Codex CLI 优先**：检测到 Codex CLI 时，必须走 Codex CLI 原生方式
2. **禁止混用**：确定环境后，全程使用该环境原生方式
3. **不修改 Skill**：`.claude/skills/agent-teams-playbook/SKILL.md` 保持原样，仅在项目 `AGENTS.md` 做适配约束
4. **子 Agent 隔离**：子 Agent 运行在独立上下文，结果由主协调器汇总
</IMPORTANT>

<IMPORTANT>
每次任务完成后或者文件更新后都要检查docs目录里面的内容和AGENTS.md 和CLAUDE.md 和README.md 文件，确认是否需要同步更新。
</IMPORTANT>
