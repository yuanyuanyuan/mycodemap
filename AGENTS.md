# AGENTS.md - CodeMap 项目开发指南

> 本文档面向 AI 编程助手，介绍如何在 CodeMap 项目中高效工作。


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

