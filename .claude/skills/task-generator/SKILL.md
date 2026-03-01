---
name: task-generator
description: 任务生成专用技能。通过固定脚本与模板生成 AI 评估任务四件套与 triad 工件，不负责分析存量任务。触发词：创建任务、设计任务、生成任务。
---

# task-generator

## 交付目标

1. **任务四件套**：`.tasks/{task-name}/PROMPT.md`、`EVAL.ts`、`SCORING.md`、`task-metadata.yaml`
2. **持久上下文块**：写入 `AGENTS.md` 和 `CLAUDE.md`，使用 marker 幂等更新

## 能力边界（必须）

- 本技能只负责**生成**任务（create flow）。
- 已生成任务的分析/审计/复查由独立技能 `task-analyzer` 负责。
- 生成时优先使用固定模板和脚本，避免自由生成。

## 7 阶段流程

| Phase | 说明                                     |
| ----- | ---------------------------------------- |
| 0     | 收集项目上下文（技术栈、约定、文档入口） |
| 1     | 明确能力维度                             |
| 2     | 设计真实场景                             |
| 3     | 设计陷阱与反例                           |
| 4     | 设计分层检查点与测试代码                 |
| 5     | 设计评分标准                             |
| 6     | 生成输出并执行质量门禁                   |

## 强制规则

1. 不得跳过 Phase 4；每个检查点必须有测试代码。
2. `SCORING.md` 分值总和必须等于 100。
3. `PROMPT.md` 与上下文块必须包含：`Prefer retrieval-led reasoning over pre-training-led reasoning`。
4. 持久上下文必须使用以下 marker 且成对出现一次：
   - `<!-- TASK-GENERATOR-CONTEXT-START -->`
   - `<!-- TASK-GENERATOR-CONTEXT-END -->`
5. 交付前必须运行 `.tasks/scripts/task-quality-gate.ts`。
6. **单次生成任务数不得超过 5**；请求数量 `>5` 必须立即阻断，不得继续生成。
7. **每个任务必须走三角色流程**：`generator`（生成）→ `qa`（质量验收）→ `supervisor`（复核监督），三者均完成才可交付。
8. **三角色必须是 3 个独立 agents**：禁止同名复用；必须在项目 `.agents` 下存在角色定义文件。
9. **supervisor 必须执行独立深语义判定引擎**：基于固定 prompt template 输出语义评审结论。

## 质量门禁（强制）

```bash
# 编译
pnpm exec tsc .claude/skills/task-generator/scripts/task-quality-gate.ts \
  --target ES2022 --module Node16 --moduleResolution Node16 \
  --types node --outDir /tmp/task-quality-gate

# 校验任务四件套 + 持久上下文（默认 AGENTS.md）
node /tmp/task-quality-gate/task-quality-gate.js \
  --tasks-dir .tasks \
  --require-context \
  --context-file AGENTS.md

# 运行时判断 + skill 适配初始化（claude/codex/kimi）
node .tasks/scripts/skills/init-runtime-skills.js --runtime auto

# 初始化三角色 agents（若缺失）
node .claude/skills/task-generator/scripts/bootstrap-triad-agents.js \
  --agents-dir .agents \
  --agents-store-dir .tasks/agents \
  --generator task-generator \
  --qa task-qa \
  --supervisor task-supervisor

# 历史任务回填（补齐 semantic_review 与语义报告）
node .claude/skills/task-generator/scripts/backfill-triad-semantic.js \
  --tasks-dir .tasks \
  --agents-dir .agents
```

> 如果项目把上下文写在 `CLAUDE.md`，将 `--context-file` 改为 `CLAUDE.md`。

## 输出规范

### 目录结构

```text
.tasks/{task-name}/
├── PROMPT.md
├── EVAL.ts
├── SCORING.md
└── task-metadata.yaml
```

### PROMPT.md 必备章节

1. 背景
2. 要求
3. 初始状态
4. 约束条件
5. 验收标准
6. 用户价值
7. 反例场景

### 上下文块最小结构

```markdown
<!-- TASK-GENERATOR-CONTEXT-START -->

[Task Knowledge Index]|version:1|root: ./.tasks|IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for task execution.|If context missing, regenerate: <project-command>

<!-- TASK-GENERATOR-CONTEXT-END -->
```

## 模板与参考文件

| 文件 | 位置 |
|------|------|
| PROMPT 模板 | `assets/templates/prompt-template.md` |
| EVAL 模板 | `assets/templates/eval-template.ts` |
| SCORING 模板 | `assets/templates/scoring-template.md` |
| metadata 模板 | `assets/templates/metadata-template.yaml` |
| context 模板 | `assets/templates/context-template.md` |
| triad 角色模板 | `assets/templates/triad-roles-template.yaml` |
| triad 工作流模板 | `assets/templates/triad-workflow-template.md` |
| triad 验收模板 | `assets/templates/triad-acceptance-template.md` |
| 原则说明 | `assets/principles.md` |
| 研究依据 | `assets/research.md` |

## 脚本工具

| 脚本 | 用途 |
|------|------|
| `scripts/bootstrap-triad-agents.js` | 初始化三角色 agents 到 `.agents/` |
| `scripts/create-triad-artifacts.js` | 为任务创建 triad 工件 |
| `scripts/run-triad-workflow.js` | 自动化三角色流程编排 |
| `scripts/task-quality-gate.ts` | 任务质量门禁校验 |

## Agent Teams 集成（强制）

本技能使用 **Agent Teams** 编排模式，每个任务必须走三角色流程。

### 团队组建

| 角色 | Agent 名称 | 职责 |
|------|-----------|------|
| Generator | `task-generator` | 生成任务四件套 |
| QA | `task-qa` | 质量验收检查 |
| Supervisor | `task-supervisor` | 语义判定复核 |

### 执行流程

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 0: 初始化                                            │
│   1. 检查 .agents/ 目录是否存在三角色 agent 定义            │
│   2. 如缺失，运行 bootstrap-triad-agents.js                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Generator (task-generator)                        │
│   1. 收集项目上下文                                        │
│   2. 使用模板生成 PROMPT.md, EVAL.ts, SCORING.md          │
│   3. 创建 task-metadata.yaml                               │
│   4. 运行 create-triad-artifacts.js 创建 triad 工件         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: QA (task-qa)                                      │
│   1. 执行 task-quality-gate.ts 质量门禁                    │
│   2. 验证四件套完整性                                      │
│   3. 检查 SCORING.md 总分 = 100                            │
│   4. 验证负向断言存在                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: Supervisor (task-supervisor)                      │
│   1. 读取 .agents/task-supervisor.semantic.prompt.md      │
│   2. 执行独立语义判定                                      │
│   3. 计算 semantic_score                                   │
│   4. 输出 SUPERVISOR_SEMANTIC_REVIEW.md                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 4: 交付确认                                          │
│   - 如果 semantic_score >= 85 且 critical_failures = 0    │
│     → workflow.approved = true                             │
│   - 否则 → 任务终止或打回修改                              │
└─────────────────────────────────────────────────────────────┘
```

### 使用 Agent 工具调用子 Agents

根据 agent-teams-playbook 手册，本技能使用 `Task` 工具调用子 agents：

```javascript
// 调用 Generator
Agent({
  subagent_type: "general-purpose",
  name: "generator-agent",
  prompt: `你是 task-generator agent。请参考 .agents/task-generator.agent.md
  生成任务 ${taskName} 的四件套。使用模板：.claude/skills/task-generator/assets/templates/`
});

// 调用 QA
Agent({
  subagent_type: "general-purpose",
  name: "qa-agent",
  prompt: `你是 task-qa agent。请参考 .agents/task-qa.agent.md
  验证任务 ${taskName} 的四件套质量。运行质量门禁脚本检查。`
});

// 调用 Supervisor
Agent({
  subagent_type: "general-purpose",
  name: "supervisor-agent",
  prompt: `你是 task-supervisor agent。请参考 .agents/task-supervisor.agent.md
  和 .agents/task-supervisor.semantic.prompt.md 执行语义判定。`
});
```

### 批量任务处理

- **单任务**: 按顺序执行 Phase 1-4
- **多任务 (2-5个)**: 每个任务独立走完三角色流程，全部通过后批量交付
- **超过 5 个**: 必须拆分为多个批次，每批 <= 5 个任务

## 执行入口（Phase 0）

开始时向用户收集三项信息：

1. 项目类型和技术栈
2. 架构约定与代码规范
3. 文档入口与代码地图位置

若本轮计划生成的任务数量超过 5，必须先中止并要求缩小到 `<=5` 的批次。
