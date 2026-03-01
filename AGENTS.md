# AGENTS.md - CodeMap 项目开发指南

> 本文档面向 AI 编程助手，介绍如何在 CodeMap 项目中高效工作。


## 可用技能

| 技能 | 路径 | 用途 | 触发词 |
|------|------|------|--------|
| task-generator | `.claude/skills/task-generator/` | 生成任务四件套 | 创建任务、设计任务 |
| **task-executor** | `.claude/skills/task-executor/` | **执行任务四件套** | **执行任务、跑任务** |
| task-analyzer | `.claude/skills/task-analyzer/` | 分析审计任务质量 | 审计任务、分析任务、检查任务质量 |
| task-qa | `.claude/skills/task-qa/` | 质量验收 | 验收任务 |
| task-supervisor | `.claude/skills/task-supervisor/` | 最终审核 | 审核任务 |

## 任务技能闭环流程

任务管理遵循**生成 → 验收 → 审核 → 执行 → 分析 → 改进**的闭环流程：

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  task-generator │ --> │     task-qa     │ --> │ task-supervisor │
│   (创建任务)     │     │   (质量验收)     │     │   (最终审核)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
         ^                                               │
         │              发现问题，重新生成或修复            │
         │                                               v
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ task-analyzer   │ <-- │  task-executor  │ <-- │   批准执行       │
│  (审计分析)      │     │   (执行任务)     │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 流程说明

1. **创建任务** (`task-generator`): 生成任务四件套（PROMPT.md、EVAL.ts、SCORING.md、task-metadata.yaml）
2. **质量验收** (`task-qa`): 检查四件套完整性、总分=100、负向断言、Triad工件
3. **最终审核** (`task-supervisor`): 4维度语义评分（>=85分通过）
4. **执行任务** (`task-executor`): 按标准化流程实施任务，更新任务状态
5. **审计分析** (`task-analyzer`): 扫描存量任务、检测质量问题、生成审计报告
6. **改进闭环**: 根据审计发现的问题，决定重新执行任务或重新生成任务

> **重要**: 五个技能必须配套使用，形成完整的任务管理闭环。执行后务必进行审计，确保任务质量。

## 测试覆盖情况

### 当前测试统计

| 模块 | 测试文件 | 测试数量 | 状态 |
|------|----------|----------|------|
| orchestrator | 11个 | 408个 | ✅ 全部通过 |
| adapters | 4个 | 100个 | ✅ 全部通过 |
| workflow | 6个 | 142个 | ✅ 全部通过 |
| cli/commands | 9个 | 91个 | ⚠️ 部分通过 |
| parser | 2个 | ~20个 | ✅ 通过 |
| cache | 2个 | 44个 | ✅ 通过 |
| core | 1个 | ~10个 | ✅ 通过 |
| generator | 1个 | ~10个 | ✅ 通过 |
| plugins | 1个 | 9个 | ✅ 通过 |
| **总计** | **~37个** | **~834个** | ** actively growing** |

### 测试生成任务

最新测试生成任务位于 `.tasks/` 目录：

| 任务组 | 模块 | 状态 |
|--------|------|------|
| group-a-core | confidence.ts, types.ts | ✅ 完成 (166 tests) |
| group-b-adapters-v2 | adapters/* | ✅ 完成 (100 tests) |
| group-c-cli | cli/commands/* | ⚠️ 部分完成 (91 tests) |
| group-d-workflow | workflow/* | ✅ 完成 (142 tests) |

## 设计文档索引

- [REFACTOR_ARCHITECTURE_OVERVIEW.md](./docs/REFACTOR_ARCHITECTURE_OVERVIEW.md) - 架构概览
- [REFACTOR_REQUIREMENTS.md](./docs/REFACTOR_REQUIREMENTS.md) - 需求与用户场景
- [REFACTOR_ORCHESTRATOR_DESIGN.md](./docs/REFACTOR_ORCHESTRATOR_DESIGN.md) - 编排层设计
- [REFACTOR_CONFIDENCE_DESIGN.md](./docs/REFACTOR_CONFIDENCE_DESIGN.md) - 置信度机制设计
- [REFACTOR_RESULT_FUSION_DESIGN.md](./docs/REFACTOR_RESULT_FUSION_DESIGN.md) - 结果融合设计
- [REFACTOR_TEST_LINKER_DESIGN.md](./docs/REFACTOR_TEST_LINKER_DESIGN.md) - 测试关联器设计
- [REFACTOR_GIT_ANALYZER_DESIGN.md](./docs/REFACTOR_GIT_ANALYZER_DESIGN.md) - Git 分析器设计
- [CI_GATEWAY_DESIGN.md](./docs/CI_GATEWAY_DESIGN.md) - CI 门禁设计

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
| **kimi-cli**    | YAML 配置 + `CreateSubagent` / `Task`                                   | 子 Agent 禁止嵌套调用 `Task` |
| **Claude Code** | Skill: `agent-teams-playbook`                                           | 按 skill 定义流程执行        |

### kimi-cli 环境执行详情

> ✅ 已验证可用（2026-03-01）：CreateSubagent 和 Task 工具完全可用

**配置方式**：通过 `.kimi/config.yaml` 配置多 Agent：

```yaml
version: 1
agent:
  name: codemap-checker
  extend: default
  system_prompt_path: ./system.md
  tools:
    - "kimi_cli.tools.multiagent:CreateSubagent"  # 创建动态子 Agent
    - "kimi_cli.tools.multiagent:Task"            # 调用子 Agent
  subagents:
    ci-checker:                                    # 预定义子 Agent
      path: ./subagents/ci-checker.yaml
      description: "CI Gateway 设计检查员"
```

**子 Agent 配置示例** (`.kimi/subagents/ci-checker.yaml`)：

```yaml
version: 1
agent:
  name: ci-checker
  system_prompt_path: ./prompt.md
  tools:
    - "kimi_cli.tools.shell:Shell"
    - "kimi_cli.tools.file:ReadFile"
```

**使用方法**：

```bash
# 方式1: 使用配置文件启动
kimi --agent-file .kimi/config.yaml

# 方式2: 动态创建子 Agent
CreateSubagent({
  name: "my-checker",
  system_prompt: "你的角色描述..."
})

# 调用子 Agent 执行任务
Task({
  subagent_name: "my-checker",
  description: "任务描述",
  prompt: "详细任务指令..."
})
```

**约束**：
1. 子 Agent 配置中**禁止**使用 `extend` 指向包含自身的主配置（会导致循环引用）
2. 子 Agent **禁止**嵌套调用 `Task`（避免无限递归）
3. 主协调器必须做最终汇总与验收

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

<IMPORTANT>
**强制约束 - CI 护栏不可绕过（必须修复后提交）**

- 严禁通过忽略、跳过、删除、注释 CI 护栏来强行提交（含 `pre-commit`、`commit-msg`、GitHub Actions、`codemap ci *`）。
- 严禁使用 `--no-verify`、临时关闭 hooks、放宽阈值、替换"永远通过"脚本等方式绕过门禁。
- 护栏失败时，必须按护栏提示修复问题；只有护栏通过后才允许提交。
- 涉及 CI 护栏的改动必须提供"失败场景 + 修复验证"证据（命令与结果）。
- 若确需临时豁免，必须先获得明确人工批准，并记录原因、范围与失效时间。
</IMPORTANT>

<IMPORTANT>
**强制约束 - 工具选择规范（根据综合推荐表）**

基于 comprehensive_test_report.md 的工具推荐，选择最适合的工具：

| 需求 | 推荐工具 | 原因 |
|------|----------|------|
| 快速文本搜索 | **rg/grep** | 速度快60-300倍，无需索引 |
| 符号定义查找 | **CodeMap** | 结构化输出，带类型信息（需修复搜索算法） |
| 依赖分析 | **CodeMap** | 双向分析、循环检测、传递依赖 |
| 影响范围评估 | **CodeMap** | 独有传递依赖分析，风险评估 |
| 复杂度监控 | **ESLint/SonarQube** | CodeMap指标计算不准确 |
| CI/CD集成 | **CodeMap** | JSON输出便于自动化（需修复格式问题） |
| IDE插件开发 | **CodeMap** | 语义化查询，结构化输出 |

### ✅ 场景化工具选择

| 场景 | 禁止命令 | 必须使用 |
|------|----------|----------|
| 搜索符号/函数 | `grep -r "functionName"` | `node dist/cli/index.js query -S "functionName"` |
| 查找文件 | `find . -name "*.ts"` | `node dist/cli/index.js query -f "*.ts"` |
| 查看模块结构 | `rg "export class"` | `node dist/cli/index.js query -m "module-path"` |
| 分析依赖关系 | 手动追踪 import | `node dist/cli/index.js deps -m "module-path"` |
| 评估变更影响 | 人工分析依赖 | `node dist/cli/index.js impact -f <file>` |
| 检查循环依赖 | `grep` 组合命令 | `node dist/cli/index.js cycles` |
| 代码复杂度分析 | codemap complexity | **ESLint/SonarQube** |
| 快速文本搜索 | codemap query | **rg/grep** |

### 🎯 核心原则

1. **按需选择**：根据具体需求选择最适合的工具，不是非 codemap 不可
2. **高频验证**：对 codemap 优势场景（依赖分析、影响评估）高频使用，发现 bug
3. **发现问题**：通过高频使用主动发现 codemap 的问题（搜索算法、格式问题、复杂度计算）
4. **积累数据**：每次使用都是数据积累，帮助改进工具的准确性和覆盖度

### ⚠️ 正确使用场景（codemap 优势场景）

- 符号定义查找（带类型信息）
- 依赖分析（双向、循环检测、传递依赖）
- 影响范围评估（传递依赖分析）
- CI/CD 集成（JSON 输出）
- IDE 插件开发（语义化查询）

### ⚠️ 正确使用例外（应使用其他工具）

- **快速文本搜索**：使用 `rg` 或 `grep`，codemap 速度较慢
- **复杂度监控**：使用 ESLint/SonarQube，codemap 指标计算不准确

仅在以下情况允许使用传统工具：
- codemap 工具尚未构建（`dist/` 不存在）
- codemap 本身出现严重故障，需要紧急排查
- 需要搜索非代码文件（如 `.md`, `.json` 配置文件）



> **目的**：按需选择工具，在 codemap 优势场景高频使用以发现问题，同时不回避其不足之处。
</IMPORTANT>
