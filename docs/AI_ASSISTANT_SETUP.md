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

- `.codemap/AI_MAP.md` - 项目全局概览，AI 首先读取此文件
- `.codemap/codemap.json` - 结构化数据
- `.codemap/context/` - 各模块详细上下文
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

- `codemap.config.json` - CodeMap 配置文件
- `.codemap/AI_MAP.md` - 项目全局概览

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

Project structure is documented in `.codemap/AI_MAP.md`.
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

- `.codemap/AI_MAP.md` - Project overview for AI
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

## 参考

- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - 人类用户安装指南
- [项目示例配置](../examples/) - 完整的示例配置文件
- [MyCodeMap GitHub](https://github.com/mycodemap/mycodemap)
