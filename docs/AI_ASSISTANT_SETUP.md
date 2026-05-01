# AI 助手集成配置指南

> 配置 MyCodeMap 与各类 AI 编程助手的完整指南

---

## 目录

1. [概述](#概述)
2. [Kimi CLI 配置](#kimi-cli-配置)
3. [Claude Code 配置](#claude-code-配置)
4. [Codex CLI 配置](#codex-cli-配置)
5. [GitHub Copilot 配置](#github-copilot-配置)
6. [通用提示词模板](#通用提示词模板)
7. [高级配置](#高级配置)

---

## 概述

MyCodeMap 可以与多种 AI 编程助手集成，让 AI 能够：

- 🔍 **智能查询** - 快速定位代码符号和模块
- 📊 **依赖分析** - 理解项目结构和模块关系
- ⚡ **影响评估** - 分析代码变更的影响范围
- 🛡️ **质量门禁** - 自动执行 CI 检查
- 🩺 **持续健康诊断** (`doctor`) - 安装 / 配置 / 运行时 / Agent 四类健康检查
- 🧬 **WASM 回退** - 当 Native 依赖不可用时自动切换 WASM 实现
- 📜 **接口契约自省** (`--schema`) - 输出完整 CLI 契约 JSON，供 Agent 动态发现能力
- 🔌 **MCP 自动网关** - 所有 Schema 定义的 CLI 命令自动暴露为 MCP tools，动态注册

### 快速选择

| AI 助手 | 配置难度 | 功能支持 | 推荐场景 |
|---------|----------|----------|----------|
| Kimi CLI | ⭐ 简单 | 完整 | 中文环境、Kimi 用户 |
| Claude Code | ⭐ 简单 | 完整 | Claude 用户 |
| Codex CLI | ⭐⭐ 中等 | 完整 | OpenAI 生态 |
| Copilot | ⭐⭐⭐ 复杂 | 基础 | VS Code 用户 |
| Cursor | ⭐ 简单 | 基础 | Cursor 用户 |

### MyCodeMap 输出文件说明

| 文件 | 说明 | AI 读取优先级 |
|------|------|--------------|
| `.mycodemap/AI_MAP.md` | 项目全局概览 | ⭐⭐⭐ 最高 |
| `.mycodemap/codemap.json` | 结构化数据 | ⭐⭐ |
| `.mycodemap/CONTEXT.md` | 上下文入口 | ⭐⭐ |
| `.mycodemap/context/` | 模块详细上下文 | ⭐ |
| `.mycodemap/dependency-graph.md` | Mermaid 依赖图 | ⭐ |

### 当前仓库维护者附加护栏

如果你在维护当前 CodeMap 仓库，而不是只在使用安装包：

- 修改 README、AI 助手提示、CLI 示例、测试事实后，先运行 `npm run docs:check`
- 也可以通过 `mycodemap ci check-docs-sync` 走统一的 CI 子命令入口
- 当前仓库的 agent 工程规则以 `docs/rules/engineering-with-codex-openai.md` 为准
- 若文档或提示词仍把 `server`、`watch`、`report`、`logs` 当成当前 public CLI，必须同步改成 removed-command 迁移说明
- 若项目启用了 `.mycodemap/config.json` 中 `storage.type = "sqlite"`，先确认 `better-sqlite3` 已安装且 Node.js `>=20`；若仍看到 `kuzudb` / `neo4j` 配置，应先迁移再让 AI 判断 graph backend 失败原因

---

## Kimi CLI 配置

### 步骤 1：创建 Skill 目录

```bash
mkdir -p .kimi/skills/codemap
```

### 步骤 2：创建 Skill 文件

创建 `.kimi/skills/codemap/SKILL.md`：

```markdown
---
name: codemap
description: MyCodeMap 代码分析技能，用于项目结构分析、符号查询、依赖分析和影响评估。
---

# MyCodeMap Skill

## 环境检测

首先检测 CLI 是否可用：

```bash
# 检测全局安装的 mycodemap
if command -v mycodemap &> /dev/null; then
    CODEMAP_CMD="mycodemap"
# 检测本地安装的 mycodemap
elif [ -f "./node_modules/.bin/mycodemap" ]; then
    CODEMAP_CMD="./node_modules/.bin/mycodemap"
# 使用 npx
else
    CODEMAP_CMD="npx @mycodemap/mycodemap"
fi
```

## 常用命令

### 生成代码地图
```bash
$CODEMAP_CMD generate
```

### 查询符号
```bash
$CODEMAP_CMD query -s "<symbol-name>"
```

### 查询模块
```bash
$CODEMAP_CMD query -m "<module-path>"
```

### 模糊搜索
```bash
$CODEMAP_CMD query -S "<keyword>" -l 10
```

### 依赖分析
```bash
$CODEMAP_CMD deps -m "<module-path>"
```

### 影响范围分析
```bash
$CODEMAP_CMD impact -f "<file-path>"
```

### 循环依赖检测
```bash
$CODEMAP_CMD cycles
```

### 复杂度分析
```bash
$CODEMAP_CMD complexity -f "<file-path>"
```

### 统一分析入口（analyze）
```bash
# 符号查找
$CODEMAP_CMD analyze -i find -s "<symbol-name>"

# 代码读取（含上下文）
$CODEMAP_CMD analyze -i read -t "<file-path>" --scope transitive

# 依赖链接分析
$CODEMAP_CMD analyze -i link -t "<module-path>"

# 项目概览展示
$CODEMAP_CMD analyze -i show -t "<path>"

# JSON 输出
$CODEMAP_CMD analyze -i find -s "<symbol>" --json
```

### CI 门禁（ci）
```bash
# 检查提交格式
$CODEMAP_CMD ci check-commits

# 检查文件头
$CODEMAP_CMD ci check-headers

# 评估变更风险
$CODEMAP_CMD ci assess-risk

# 验证输出契约
$CODEMAP_CMD ci check-output-contract
```

### 工作流编排（workflow）
```bash
# 启动工作流
$CODEMAP_CMD workflow start "<task-description>"

# 查看状态
$CODEMAP_CMD workflow status

# 推进到下一阶段
$CODEMAP_CMD workflow proceed

# 可视化工作流
$CODEMAP_CMD workflow visualize
```

## 使用场景

### 场景 1：理解项目结构

当用户询问项目结构或特定模块时：
1. 运行 `$CODEMAP_CMD generate` 生成最新代码地图
2. 阅读 `.mycodemap/AI_MAP.md` 获取项目概览
3. 根据需要使用 `query` 或 `deps` 获取详细信息

### 场景 2：代码变更影响分析

当用户要修改某个文件时：
1. 运行 `$CODEMAP_CMD impact -f "<file-path>" --transitive`
2. 分析输出结果，告知用户受影响的模块和文件

### 场景 3：查找代码定义

当用户询问某个类/函数的位置时：
1. 运行 `$CODEMAP_CMD query -s "<symbol-name>"`
2. 根据结果提供精确的文件路径和行号

## 输出处理

- 直接返回 CLI 输出给用户
- 使用 `-j` 参数获取 JSON 格式便于解析
- 复杂输出可重定向到临时文件分析
```

### 步骤 3：验证配置

```bash
# 在 Kimi CLI 中测试
cat .kimi/skills/codemap/SKILL.md

# 启动对话后询问
"使用 codemap 查询 IntentRouter 类"
```

---

## Claude Code 配置

### 步骤 1：创建 Skill 目录

```bash
mkdir -p .claude/skills/codemap
```

### 步骤 2：创建 Skill 文件

创建 `.claude/skills/codemap/SKILL.md`：

```markdown
# MyCodeMap Code Analysis

## Overview

Use MyCodeMap to analyze TypeScript/JavaScript project structure, query symbols, analyze dependencies, and assess change impact.

## CLI Detection

Detect MyCodeMap CLI availability:

```bash
# Check global installation
if command -v mycodemap &> /dev/null; then
    CODEMAP="mycodemap"
# Check local installation
elif [ -f "./node_modules/.bin/mycodemap" ]; then
    CODEMAP="./node_modules/.bin/mycodemap"
# Fallback to npx
else
    CODEMAP="npx @mycodemap/mycodemap"
fi
```

## Commands

### Generate Code Map
```bash
$CODEMAP generate
```
Generates: `.mycodemap/AI_MAP.md`, `.mycodemap/CONTEXT.md`, `.mycodemap/codemap.json`

### Query Symbol
```bash
$CODEMAP query -s "<symbol-name>"
$CODEMAP query -s "<symbol-name>" -j  # JSON output
```

### Query Module
```bash
$CODEMAP query -m "<module-path>"
```

### Search
```bash
$CODEMAP query -S "<keyword>" -l 10
```

### Dependency Analysis
```bash
$CODEMAP deps -m "<module-path>"
$CODEMAP deps -m "<module-path>" -j
```

### Impact Analysis
```bash
$CODEMAP impact -f "<file-path>"
$CODEMAP impact -f "<file-path>" --transitive
```

### Cycle Detection
```bash
$CODEMAP cycles
```

### Complexity Analysis
```bash
$CODEMAP complexity
$CODEMAP complexity -f "<file-path>"
```

## Workflows

### Understanding Project Structure

1. Generate code map: `$CODEMAP generate`
2. Read `.mycodemap/AI_MAP.md` for overview
3. Query specific modules as needed

### Before Code Changes

1. Run impact analysis: `$CODEMAP impact -f "<file>" --transitive`
2. Review affected files
3. Suggest test cases based on impact

### Finding Code

1. Search symbol: `$CODEMAP query -s "<name>"`
2. If not found, fuzzy search: `$CODEMAP query -S "<name>"`
3. Check module context: `$CODEMAP query -m "<path>"`

## Output Format

- Default: Human-readable text
- JSON: Add `-j` flag for structured data
```

### 步骤 3：验证配置

```bash
# 在 Claude Code 中测试
claude

# 然后询问
"analyze the impact of changing src/cache/index.ts"
```

### 替代配置方式

除了 Skill 配置，还可以使用以下方式：

#### 方式二：CLAUDE.md 指引

在项目根目录创建 `CLAUDE.md`：

```markdown
# 项目 AI 集成

## CodeMap 使用

本项目使用 CodeMap 进行代码分析。

### 常用命令

```bash
# 生成代码地图
mycodemap generate

# 查询符号
mycodemap query -s "SymbolName"

# 分析影响
mycodemap impact -f src/xxx.ts

# 依赖分析
mycodemap deps -m src/parser
```

### 输出文件

- `.mycodemap/AI_MAP.md` - 项目全局概览，AI 首先读取此文件
- `.mycodemap/codemap.json` - 结构化数据
- `.mycodemap/context/` - 各模块详细上下文
```

#### 方式三：AGENTS.md 指引（详细）

在项目根目录创建 `AGENTS.md`，提供更详细的 AI 助手指南：

```markdown
# AGENTS.md - 项目开发指南

> 本文档面向 AI 编程助手，介绍项目结构和开发规范

## 项目概述

[项目简介]

## 技术栈

- TypeScript 5.3+
- Node.js >= 18.0.0

## 代码分析

使用 CodeMap 进行代码分析：

```bash
# 生成代码地图（首次使用）
mycodemap generate

# 查找符号定义
mycodemap query -s "SymbolName"

# 查看模块依赖
mycodemap deps -m "src/module"

# 分析变更影响
mycodemap impact -f "src/file.ts"
```

## 关键文件

- `.mycodemap/config.json` - CodeMap canonical 配置文件
- `.mycodemap/status/init-last.json` - init receipt / managed asset ledger
- `.mycodemap/rules/` - 通用 AI guardrails rules bundle（需手动引用到 `CLAUDE.md` / `AGENTS.md`）
- `.mycodemap/AI_MAP.md` - 项目全局概览

## 开发规范

- 使用 TypeScript Strict Mode
- 所有非测试文件需要 `[META]` 和 `[WHY]` 头注释
- 提交格式：`[TAG] scope: message`
```

#### 方式四：全局 Skill

```bash
# 找到 Claude Code 全局 skills 目录
# macOS: ~/Library/Application Support/Claude/skills/
# Linux: ~/.config/Claude/skills/

mkdir -p "$HOME/.config/Claude/skills/codemap"
# 将上述 SKILL.md 复制进去
```

---

## Cursor 配置

Cursor 支持 `.cursor/rules/` 目录下的规则文件。

### 步骤 1：创建规则目录

```bash
mkdir -p .cursor/rules
```

### 步骤 2：创建规则文件

创建 `.cursor/rules/codemap.md`：

```markdown
## CodeMap

Use CodeMap CLI for code analysis:
- `mycodemap generate` - Generate/update code map
- `mycodemap query -s "symbol"` - Find symbol definition
- `mycodemap query -m "module"` - Get module info
- `mycodemap impact -f "file"` - Analyze change impact
- `mycodemap deps -m "module"` - Show dependency tree

Project structure is documented in `.mycodemap/AI_MAP.md`.
```

---

## Codex CLI 配置

### 步骤 1：创建 Agent 配置

```bash
mkdir -p .agents/skills/codemap
```

### 步骤 2：创建 Skill 文件

创建 `.agents/skills/codemap/SKILL.md`：

```markdown
# MyCodeMap Skill

## Description

Code analysis tool for TypeScript/JavaScript projects. Provides project structure analysis, symbol querying, dependency analysis, and impact assessment.

## CLI Command Detection

```bash
# Priority: global > local > npx
if command -v mycodemap &> /dev/null; then
    CODEMAP_CMD="mycodemap"
elif [ -f "./node_modules/.bin/mycodemap" ]; then
    CODEMAP_CMD="./node_modules/.bin/mycodemap"
else
    CODEMAP_CMD="npx @mycodemap/mycodemap"
fi
```

## Available Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `generate` | Generate code map | `$CODEMAP_CMD generate` |
| `query -s` | Query symbol | `$CODEMAP_CMD query -s "ClassName"` |
| `query -m` | Query module | `$CODEMAP_CMD query -m "src/parser"` |
| `query -S` | Fuzzy search | `$CODEMAP_CMD query -S "keyword"` |
| `deps` | Dependency analysis | `$CODEMAP_CMD deps -m "src/core"` |
| `impact` | Impact analysis | `$CODEMAP_CMD impact -f "src/index.ts"` |
| `cycles` | Cycle detection | `$CODEMAP_CMD cycles` |
| `complexity` | Complexity metrics | `$CODEMAP_CMD complexity` |

## Usage Patterns

### Pattern 1: Project Onboarding
```
User: "Explain this project structure"
Agent:
1. $CODEMAP_CMD generate
2. Read .mycodemap/AI_MAP.md
3. Summarize key components
```

### Pattern 2: Change Impact
```
User: "What happens if I modify X?"
Agent:
1. $CODEMAP_CMD impact -f "<path>" --transitive
2. Analyze output
3. List affected files and suggest tests
```

### Pattern 3: Code Navigation
```
User: "Where is function Y defined?"
Agent:
1. $CODEMAP_CMD query -s "Y"
2. Report location
3. Offer to show code context
```

## Best Practices

- Always generate code map before queries if `.mycodemap/` is stale
- Use `-j` flag for programmatic processing
- Use `--transitive` for complete impact analysis
```

### 步骤 3：验证配置

```bash
codex

# 测试
"what's the project structure?"
```

---

## GitHub Copilot 配置

Copilot 不支持自定义 skill，但可以通过以下方式集成：

### 方法 1：项目级提示词（推荐）

创建 `.github/copilot-instructions.md`：

```markdown
# MyCodeMap Integration

This project uses MyCodeMap for code analysis.

## Available Commands

Before answering questions about project structure, run:
```bash
mycodemap generate
```

Then read `.mycodemap/AI_MAP.md` for context.

## Common Queries

- Find symbol: `mycodemap query -s "<name>"`
- Check dependencies: `mycodemap deps -m "<path>"`
- Impact analysis: `mycodemap impact -f "<path>"`

## When Answering

1. Always check the code map first for structural questions
2. Use impact analysis before suggesting changes
3. Reference specific files and line numbers
```

### 方法 2：VS Code 配置

创建 `.vscode/copilot-instructions.md`：

```markdown
# Code Analysis

## CodeMap

Use CodeMap for code analysis:
- Run `mycodemap generate` to create/update code map
- Query symbols: `mycodemap query -s "SymbolName"`
- Check dependencies: `mycodemap deps -m "module"`
- Analyze impact: `mycodemap impact -f "file.ts"`

## Key Files

- `.mycodemap/AI_MAP.md` - Project overview for AI
```

或在 `.vscode/settings.json`：

```json
{
  "github.copilot.chat.codeGeneration.instructions": [
    {
      "text": "This project uses MyCodeMap. Run 'mycodemap generate' to get project structure from .mycodemap/AI_MAP.md before answering structural questions."
    }
  ]
}
```

---

## 通用提示词模板

### 项目结构理解提示词

```markdown
请帮助我理解这个项目的结构。

步骤：
1. 运行 mycodemap generate 生成代码地图
2. 阅读 .mycodemap/AI_MAP.md 了解项目概览
3. 根据文件内容分析：
   - 项目的主要模块有哪些？
   - 模块之间的关系是什么？
   - 核心功能分布在哪些文件中？
4. 给出清晰的项目结构说明
```

### 代码变更影响提示词

```markdown
我要修改文件 <file-path>，请帮我分析影响范围。

步骤：
1. 运行 mycodemap impact -f "<file-path>" --transitive
2. 分析输出结果中的：
   - 直接依赖的文件
   - 传递依赖的文件
   - 可能受影响的测试
3. 给出修改建议和注意事项
4. 建议需要添加或更新的测试用例
```

### 查找代码提示词

```markdown
帮我找到 <symbol-name> 的定义位置。

步骤：
1. 运行 mycodemap query -s "<symbol-name>"
2. 如果未找到，运行 mycodemap query -S "<symbol-name>" 进行模糊搜索
3. 报告找到的位置（文件路径、行号）
4. 如果需要，展示相关代码片段
```

---

## 高级配置

### 仓库级护栏

当 AI 助手配置文档本身被修改时，建议在提交前执行：

```bash
npm run docs:check
mycodemap ci check-docs-sync
```

### 自定义输出格式

对于需要特定输出格式的场景，创建包装脚本：

```bash
#!/bin/bash
# mycodemap-wrapper.sh

CMD=${1:-generate}
shift

case $CMD in
  "json")
    mycodemap generate -o /tmp/codemap && cat /tmp/codemap/codemap.json
    ;;
  "summary")
    mycodemap generate && head -100 .mycodemap/AI_MAP.md
    ;;
  *)
    mycodemap $CMD "$@"
    ;;
esac
```

### 环境变量配置

```bash
# .envrc (direnv) 或 .bashrc

# 设置 mycodemap 命令别名
alias cm='mycodemap'
alias cmg='mycodemap generate'
alias cmq='mycodemap query'
alias cmi='mycodemap impact'

# 自动检测本地 vs 全局
mycodemap() {
  if [ -f "./node_modules/.bin/mycodemap" ]; then
    ./node_modules/.bin/mycodemap "$@"
  else
    command mycodemap "$@"
  fi
}
```

### CI/CD 中的 AI 助手集成

在 CI 流程中生成代码地图供 AI 使用：

```yaml
# .github/workflows/ai-context.yml
name: Generate AI Context

on:
  push:
    branches: [main]

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - run: npm ci
      
      - run: npx @mycodemap/mycodemap generate
      
      - name: Upload AI context
        uses: actions/upload-artifact@v4
        with:
          name: ai-context
          path: .mycodemap/
```

---

## 故障排除

### Skill 未生效

| 问题 | 解决方案 |
|------|----------|
| Kimi: Skill 未加载 | 检查 `.kimi/skills/codemap/SKILL.md` 是否存在 |
| Claude: Skill 未识别 | 确保文件在 `.claude/skills/codemap/SKILL.md` |
| Codex: Agent 未响应 | 检查 `.agents/skills/codemap/SKILL.md` 权限 |

### CLI 未找到

确保 `mycodemap` 可用：

```bash
# 测试命令
which mycodemap || echo "Not found in PATH"

# 解决方案 1：全局安装
npm install -g @mycodemap/mycodemap

# 解决方案 2：使用 npx
alias mycodemap='npx @mycodemap/mycodemap'

# 解决方案 3：本地安装
npm install --save-dev @mycodemap/mycodemap
```

### 输出解析问题

如果 AI 助手无法正确解析输出：

1. 使用 `-j` 参数获取 JSON 输出
2. 检查编码是否为 UTF-8
3. 确保终端宽度足够（避免截断）

---

## AI CLI 一键安装引导

> 本章节面向 AI CLI 工具（Claude Code、Codex CLI 等），提供结构化安装引导。
> 当用户说"帮我安装 mycodemap"时，AI CLI 应按照以下步骤引导。

### Step 1: 前置条件检查 [CONFIRM]

在开始安装前，确认以下条件：

- Node.js >= 18 是否已安装（`node --version`）
- 当前项目是否有 package.json（`ls package.json`）
- 向用户确认：是项目级别安装还是全局安装

### Step 2: 安装依赖 [CONFIRM]

```bash
# 项目级别安装（推荐）
npm install @mycodemap/mycodemap

# 或全局安装
npm install -g @mycodemap/mycodemap
```

### Step 3: 初始化 [CONFIRM]

```bash
# 先预览配置（不写入文件）
mycodemap init

# 确认后写入
mycodemap init -y
```

### Step 4: 生成代码地图

```bash
mycodemap generate
```

安装完成后会生成：
- `.mycodemap/AI_MAP.md` — 项目全局概览
- `.mycodemap/codemap.json` — 结构化数据
- `.mycodemap/CONTEXT.md` — 上下文入口

### Step 5: 环境健康诊断 [CONFIRM]

运行 `codemap doctor` 验证环境健康状态：

```bash
# 运行全部诊断（安装 / 配置 / 运行时 / Agent）
codemap doctor

# 或按类别诊断
codemap doctor --category install
codemap doctor --category config
codemap doctor --category runtime
codemap doctor --category agent
```

诊断输出为结构化 JSON，包含 `rootCause` + `remediationPlan` + `confidence` + `nextCommand`。修复所有 HIGH 级别问题后再继续。

### Step 6: 查看接口契约 [CONFIRM]

运行 `codemap --schema` 查看完整 CLI 接口契约，供 Agent 自省：

```bash
# 输出完整契约 JSON
codemap --schema

# 或保存到文件供 skill 引用
codemap --schema > .mycodemap/interface-contract.json
```

契约包含所有命令、参数、输出格式的结构化定义，是 MCP Gateway 动态暴露 tools 的单一数据源。

### Step 7: 配置 AI 助手 skill [CONFIRM]

根据使用的 AI 助手，拷贝对应的 skill 文件：

**Claude Code:**
```bash
mkdir -p .claude/skills/codemap
cp node_modules/@mycodemap/mycodemap/examples/claude/codemap-skill.md .claude/skills/codemap/SKILL.md

# 可选：安装架构分析技能（Phase 48 已交付）
mkdir -p .claude/skills/mycodemap-repo-analyzer
cp node_modules/@mycodemap/mycodemap/examples/claude/skills/mycodemap-repo-analyzer/SKILL.md .claude/skills/mycodemap-repo-analyzer/SKILL.md
cp -r node_modules/@mycodemap/mycodemap/examples/claude/skills/mycodemap-repo-analyzer/references .claude/skills/mycodemap-repo-analyzer/
```

**Codex CLI:**
```bash
mkdir -p .agents/skills/codemap
cp node_modules/@mycodemap/mycodemap/examples/codex/codemap-agent.md .agents/skills/codemap/SKILL.md
```

### Step 8: 更新项目 rules [CONFIRM]

在项目的 `CLAUDE.md` 和 `AGENTS.md` 中追加以下内容：

```markdown
## CodeMap Skill

### 何时使用
- 需要理解项目整体结构或模块关系
- 分析代码变更的影响范围
- 查询符号定义、调用关系、依赖链
- 评估代码复杂度或检测循环依赖

### 何时不用
- 简单的单文件修改或调试
- 非代码文件操作（文档、配置等）
- 已有明确上下文的局部改动

### 如何使用
- 参考 .claude/skills/codemap/ 中的 skill 指令
- 使用 mycodemap CLI 命令（generate/query/impact/deps/cycles/complexity）

### 索引维护
- 代码变更后需运行 `mycodemap generate` 更新索引
- 在重大功能开发/重构完成后，主动更新一次
- 如发现 mycodemap 查询结果与代码不一致，先更新索引再使用
```

### Step 9: 验证安装

```bash
# 验证 CLI 可用
mycodemap query --help

# 验证 doctor 可用
codemap doctor --help

# 验证 schema 输出
codemap --schema | head -20

# 验证 skill 文件已就位
ls .claude/skills/codemap/SKILL.md
```

### 可选：MCP 服务器配置

CodeMap v2.0 采用 **CLI-as-MCP 自动网关**：所有 Schema 定义的 CLI 命令自动暴露为 MCP tools，无需手动维护 tool 列表。

```bash
# 安装 MCP 适配器（一次性）
codemap mcp install

# 验证动态 tool 注册（应列出 20+ 个 tools）
codemap mcp list-tools
```

配置完成后，AI 助手可通过 MCP 调用任意 `codemap` 命令（如 `doctor`、`benchmark`、`analyze`、`query` 等），Gateway 会根据 Interface Contract Schema 动态生成 tool 定义。无需再使用实验性的 2-tool 限制模式。

---

## 参考

- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - 人类用户安装指南
- [项目示例配置](../examples/) - 完整的示例配置文件
- [MyCodeMap GitHub](https://github.com/mycodemap/mycodemap)
