# MyCodeMap AI 集成配置指南

> 归档时间：2026-03-15
> 归档原因：旧版 AI 集成指南，已被当前仓库的统一 AI 助手接入说明替代。
> 当前依据：`docs/AI_ASSISTANT_SETUP.md`
> 状态：仅供历史对照，不作为当前执行依据。


> 让 AI 大模型（如 Claude、Copilot、Cursor）更好地理解和使用 CodeMap

## 目录

1. [快速开始](#快速开始)
2. [CLI 安装](#cli-安装)
3. [AI 助手集成](#ai-助手集成)
   - [Claude Code](#claude-code-集成)
   - [VS Code + Copilot](#vs-code--copilot-集成)
   - [Cursor](#cursor-集成)
   - [Kimi / 通义千问](#kimi--通义千问-集成)
4. [配置文件说明](#配置文件说明)
5. [Git Hooks 配置](#git-hooks-配置)
6. [常见问题](#常见问题)

---

## 快速开始

```bash
# 1. 全局安装
npm install -g @mycodemap/mycodemap

# 2. 初始化项目
cd your-project
codemap init

# 3. 生成代码地图
codemap generate
```

---

## CLI 安装

### 本地安装（项目内）

```bash
npm install @mycodemap/mycodemap --save-dev

# 使用 npx
npx codemap generate
```

### 全局安装（推荐）

```bash
npm install -g @mycodemap/mycodemap

# 验证安装
codemap --version
```

---

## AI 助手集成

### Claude Code 集成

#### 方式一：复制 Skill 文件（推荐）

在目标项目的 `.claude/skills/` 目录下创建 codemap skill：

```bash
# 在你的项目根目录
mkdir -p .claude/skills/codemap
```

创建 `.claude/skills/codemap/SKILL.md`：

```markdown
---
name: codemap
description: 项目级代码分析技能，用于 TypeScript/JavaScript 项目的结构化分析
---

# CodeMap 技能

本项目使用 CodeMap 进行代码分析。

## 常用命令

| 命令 | 说明 |
|------|------|
| `codemap generate` | 生成代码地图 |
| `codemap query -s "符号"` | 查询符号定义 |
| `codemap query -m "模块"` | 查询模块信息 |
| `codemap query -S "关键词"` | 模糊搜索 |
| `codemap deps -m "模块"` | 依赖分析 |
| `codemap impact -f "文件"` | 变更影响分析 |
| `codemap complexity -f "文件"` | 复杂度分析 |
| `codemap cycles` | 检测循环依赖 |

## 输出文件

- `.codemap/AI_MAP.md` - 项目全局概览
- `.codemap/codemap.json` - 结构化数据
- `.codemap/dependency-graph.md` - Mermaid 依赖图
```

#### 方式二：添加 CLAUDE.md 指引

在项目根目录创建/更新 `CLAUDE.md`：

```markdown
# 项目 AI 集成

## CodeMap 使用

本项目使用 CodeMap 进行代码分析。

### 常用命令

```bash
# 生成代码地图
codemap generate

# 查询符号
codemap query -s "SymbolName"

# 分析影响
codemap impact -f src/xxx.ts

# 依赖分析
codemap deps -m src/parser
```

### 输出文件

- `.codemap/AI_MAP.md` - 项目全局概览，AI 首先读取此文件
- `.codemap/codemap.json` - 结构化数据
- `.codemap/context/` - 各模块详细上下文
```

#### 方式三：添加 AGENTS.md 指引（详细）

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
codemap generate

# 查找符号定义
codemap query -s "SymbolName"

# 查看模块依赖
codemap deps -m "src/module"

# 分析变更影响
codemap impact -f "src/file.ts"
```

## 关键文件

- `codemap.config.json` - CodeMap 配置文件
- `.codemap/AI_MAP.md` - 项目全局概览

## 开发规范

- 使用 TypeScript Strict Mode
- 所有非测试文件需要 `[META]` 和 `[WHY]` 头注释
- 提交格式：`[TAG] scope: message`
```

### 全局 Skill（所有项目可用）

```bash
# 找到 Claude Code 全局 skills 目录
# macOS: ~/Library/Application Support/Claude/skills/
# Linux: ~/.config/Claude/skills/

mkdir -p "$HOME/.config/Claude/skills/codemap"
# 将上述 SKILL.md 复制进去
```

---

### VS Code + Copilot 集成

在项目根目录创建 `.vscode/copilot-instructions.md`：

```markdown
# Code Analysis

## CodeMap

Use CodeMap for code analysis:
- Run `codemap generate` to create/update code map
- Query symbols: `codemap query -s "SymbolName"`
- Check dependencies: `codemap deps -m "module"`
- Analyze impact: `codemap impact -f "file.ts"`

## Key Files

- `.codemap/AI_MAP.md` - Project overview for AI
```

或在 `.vscode/extensions.json` 中推荐：

```json
{
  "recommendations": ["ms-azuretools.vscode-docker"]
}
```

---

### Cursor 集成

创建 `.cursor/rules/codemap.md`：

```markdown
## CodeMap

Use CodeMap CLI for code analysis:
- `codemap generate` - Generate/update code map
- `codemap query -s "symbol"` - Find symbol definition
- `codemap query -m "module"` - Get module info
- `codemap impact -f "file"` - Analyze change impact
- `codemap deps -m "module"` - Show dependency tree

Project structure is documented in `.codemap/AI_MAP.md`.
```

---

### Kimi / 通义千问 集成

在 `README.md` 中添加"AI 助手使用说明"章节：

```markdown
## AI 助手使用说明

本项目使用 CodeMap 生成代码地图。AI 助手可通过以下方式理解项目：

### 快速开始

```bash
# 安装
npm install -g @mycodemap/mycodemap

# 生成代码地图
codemap generate
```

### 常用命令

| 命令 | 说明 |
|------|------|
| `codemap query -s "符号"` | 查找符号定义 |
| `codemap query -m "模块"` | 查看模块信息 |
| `codemap deps -m "模块"` | 查看依赖树 |
| `codemap impact -f "文件"` | 分析变更影响 |

### 关键文件

- `.codemap/AI_MAP.md` - 项目全局概览，AI 应首先读取此文件
- `.codemap/codemap.json` - 结构化数据
```

---

## 配置文件说明

### codemap.config.json

```json
{
  "mode": "hybrid",
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules/**", "dist/**"],
  "output": ".codemap"
}
```

### 输出文件

| 文件 | 说明 | AI 读取优先级 |
|------|------|--------------|
| `AI_MAP.md` | 项目全局概览 | ⭐⭐⭐ 最高 |
| `codemap.json` | 结构化数据 | ⭐⭐ |
| `CONTEXT.md` | 上下文入口 | ⭐⭐ |
| `context/` | 模块详细上下文 | ⭐ |
| `dependency-graph.md` | Mermaid 依赖图 | ⭐ |

---

## Git Hooks 配置

### 手动配置

```bash
# 创建 .githooks 目录
mkdir -p .githooks

# 创建 pre-commit hook
cat > .githooks/pre-commit << 'EOF'
#!/bin/sh
# CodeMap pre-commit check

if ! command -v codemap &> /dev/null; then
    exit 0
fi

# 可选：运行测试
# npm test

# 可选：检查文件头
# codemap ci check-headers

exit 0
EOF

chmod +x .githooks/pre-commit

# 配置 git
git config core.hookspath .githooks
```

---

## 常见问题

### Q: codemap 命令找不到

```bash
# 确认安装
npm list -g codemap

# 确认路径
which codemap

# 重新安装
npm uninstall -g @mycodemap/mycodemap
npm install -g @mycodemap/mycodemap
```

### Q: 如何让 AI 理解项目结构？

```bash
# 1. 生成代码地图
codemap generate

# 2. 告诉 AI 读取 .codemap/AI_MAP.md
# 或直接粘贴该文件内容给 AI
```

### Q: 可以在 CI 中使用吗？

```yaml
# .github/workflows/codemap.yml
- name: CodeMap Analysis
  run: |
    npm install -g @mycodemap/mycodemap
    codemap generate
    codemap ci check-commits --range origin/main..HEAD
```

---

## 相关链接

- [CodeMap GitHub](https://github.com/stark020/codemap)
- [CodeMap npm](https://www.npmjs.com/package/@mycodemap/mycodemap)
- [完整 CLI 文档](../../README.md)
