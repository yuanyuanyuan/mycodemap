# MyClaude 使用指南

> 归档时间：2026-03-15
> 归档原因：外部工具调研笔记，不属于当前仓库执行协议或现行规则。
> 当前依据：`docs/references/README.md` 与对应上游官方文档
> 状态：仅供历史对照，不作为当前执行依据。


> 基于官方 README 编写 | 官方仓库: https://github.com/stellarlinkco/myclaude

---

## 1. 系统架构

### 1.1 双智能体核心架构

官方定义 (来源: README.md Core Architecture):

| 角色 | 组件 | 职责 |
|------|------|------|
| **Orchestrator** | Claude Code | 规划、上下文收集、验证 |
| **Executor** | codeagent-wrapper | 代码编辑、测试执行 |

支持的后端: **Codex / Claude / Gemini / OpenCode**

### 1.2 官方 Backend CLI 要求

| 后端 | 必须支持的功能 |
|------|----------------|
| Codex | `codex e`, `--json`, `-C`, `resume` |
| Claude | `--output-format stream-json`, `-r` |
| Gemini | `-o stream-json`, `-y`, `-r` |
| OpenCode | `opencode`, stdin mode |

---

## 2. 六大模块 (官方)

官方模块列表 (来源: README.md Modules Overview):

| 模块 | 命令 | 说明 |
|------|------|------|
| **do** | `/do` | 5阶段功能开发 (推荐) |
| **omo** | `/omo` | 多智能体智能路由编排 |
| **bmad** | `/bmad-pilot` | 6角色敏捷工作流 |
| **requirements** | `/requirements-pilot` | 轻量级需求到代码 |
| **essentials** | `/code`, `/debug` 等 | 11核心开发命令 |
| **sparv** | `/sparv` | SPARV工作流 (Specify→Plan→Act→Review→Vault) |
| **course** | 组合模块 | 课程开发 |
| **claudekit** | 组合模块 | do skill + 全局钩子 |

### 2.1 模块选择指南 (官方)

官方推荐 (来源: README.md Workflow Selection Guide):

| 场景 | 推荐命令 |
|------|----------|
| 功能开发 | `/do` |
| Bug调查+修复 | `/omo` |
| 大型企业项目 | `/bmad-pilot` |
| 快速原型 | `/requirements-pilot` |
| 简单任务 | `/code`, `/debug` |

---

## 3. /do 模块 (5阶段开发)

官方描述: "5-phase feature development with codeagent orchestration"

**5阶段流程:**

```
Phase 1: Understand    → 需求理解 + 代码分析
Phase 2: Clarify      → 解决阻塞性问题
Phase 3: Design       → 设计实现计划
Phase 4: Implement    → 代码实现 + 审查
Phase 5: Complete     → 完成总结
```

**使用方式:**

```bash
/do <任务描述>
```

---

## 4. /omo 模块 (多智能体编排)

官方描述: "Multi-agent orchestration with intelligent routing"

**智能路由**: 系统会根据任务特征自动选择合适的 agent

**使用方式:**

```bash
/omo <任务描述>
```

---

## 5. /bmad-pilot 模块 (6角色敏捷)

官方描述: "BMAD agile workflow with 6 specialized agents"

BMAD 源自独立的 BMAD-METHOD 项目 (https://github.com/bmad-code-org/BMAD-METHOD)，是敏捷开发方法论的 AI 化实现。

**6角色:**

| 角色 | 说明 |
|------|------|
| Product Owner | 产品负责人 |
| Architect | 架构师 |
| Tech Lead | 技术负责人 |
| Developer | 开发者 |
| Code Reviewer | 代码审查者 |
| QA Engineer | 质量工程师 |

**使用方式:**

```bash
/bmad-pilot <任务描述>
```

---

## 6. /requirements-pilot 模块

官方描述: "Lightweight requirements-to-code pipeline"

**适用场景**: 快速原型、明确定义的小功能

**使用方式:**

```bash
/requirements-pilot <任务描述>
```

---

## 7. essentials 模块 (11核心命令)

官方列表 (来源: README.md Essentials Commands):

> ask, bugfix, code, debug, docs, enhance-prompt, optimize, refactor, review, test, think

**使用方式:**

```bash
/code <任务>          # 直接代码生成
/debug <问题>         # 调试辅助
/test <模块>         # 测试生成
/review <代码>        # 代码审查
/refactor <代码>      # 重构
/optimize <代码>     # 性能优化
/docs <主题>         # 文档生成
/ask <问题>          # 知识问答
/bugfix <问题>       # Bug修复
/think <问题>        # 深度思考
/enhance-prompt <内容>  # 提示词优化
```

---

## 8. /sparv 模块

官方描述: "SPARV workflow (Specify→Plan→Act→Review→Vault)"

**5阶段:**

```
Specify → Plan → Act → Review → Vault
```

**使用方式:**

```bash
/sparv <任务描述>
```

---

## 9. codeagent-wrapper 使用

### 9.1 核心功能 (官方文档)

- 多后端统一接口: Codex / Claude / Gemini / OpenCode
- 并行执行: `--parallel`
- Skill 注入: `--skills`
- Git Worktree 隔离: `--worktree`
- 会话恢复: `resume <session_id>`

### 9.2 使用示例

**单 Agent:**

```bash
codeagent-wrapper --agent explore - . <<'EOF'
分析代码
EOF
```

**并行执行:**

```bash
codeagent-wrapper --parallel <<'EOF'
---TASK---
id: t1
agent: develop
---CONTENT---
任务1
EOF

---TASK---
id: t2
agent: develop
---CONTENT---
任务2
EOF
EOF
```

### 9.3 环境变量 (官方)

| 变量 | 功能 |
|------|------|
| CODEAGENT_BACKEND | 默认后端 |
| CODEAGENT_PARALLEL | 启用并行 |
| CODEAGENT_TIMEOUT | 超时(秒) |
| CODEAGENT_LOG_LEVEL | 日志级别 |

---

## 10. 安装配置

### 10.1 安装命令 (官方)

```bash
npx github:stellarlinkco/myclaude

npx github:stellarlinkco/myclaude --list

npx github:stellarlinkco/myclaude --update
```

### 10.2 目录结构 (官方)

```
~/.claude/
├── bin/codeagent-wrapper
├── CLAUDE.md
├── commands/          (essentials)
├── agents/            (bmad/requirements)
├── skills/            (do/omo/sparv/course)
├── hooks/             (claudekit)
├── settings.json
└── installed_modules.json
```

### 10.3 模块配置 (官方)

```json
{
  "modules": {
    "bmad": { "enabled": false },
    "do": { "enabled": true },
    "omo": { "enabled": false }
  }
}
```

---

## 11. 故障排除 (官方)

官方文档 (来源: README.md Troubleshooting):

### Codex wrapper not found

```bash
npx github:stellarlinkco/myclaude
# 选择: codeagent-wrapper
```

### Module not loading

```bash
cat ~/.claude/installed_modules.json
npx github:stellarlinkco/myclaude --force
```

---

## 信息来源

| 内容 | 来源 |
|------|------|
| 模块列表 | README.md Modules Overview |
| 工作流选择 | README.md Workflow Selection Guide |
| 核心架构 | README.md Core Architecture |
| 后端要求 | README.md Backend CLI Requirements |
| Essentials命令 | README.md Essentials Commands |
| 目录结构 | README.md Directory Structure |
| 故障排除 | README.md Troubleshooting |
| BMAD方法论 | https://github.com/bmad-code-org/BMAD-METHOD |
