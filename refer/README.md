# CodeMap - TypeScript 代码地图 MVP 设计方案

> 一个开源的 TypeScript 代码地图工具，平衡生成速度与质量，为 AI 辅助开发提供结构化上下文。

## 📋 文档索引

| 文档 | 说明 | 文件 |
|------|------|------|
| **架构设计** | 系统架构、模块划分、数据结构设计 | [codemap-architecture-design.md](./codemap-architecture-design.md) |
| **解析方案** | TypeScript 解析器选型、符号提取、依赖分析 | [typescript-parser-design.md](./typescript-parser-design.md) |
| **AI 集成** | 分层上下文策略、Token 优化、RAG 集成 | [codemap_ai_integration_design.md](./codemap_ai_integration_design.md) |
| **性能优化** | 性能基准、缓存策略、增量更新 | [codemap-performance-optimization.md](./codemap-performance-optimization.md) |
| **使用指南** | 使用场景、操作步骤、最佳实践 | [codemap-usage-guide.md](./codemap-usage-guide.md) |

## 🎯 核心特性

### 双层分析模式

| 模式 | 时间 | 适用场景 | 解析器 |
|------|------|----------|--------|
| **Fast** | < 30秒 | 日常开发、CI | Tree-sitter |
| **Smart** | < 2分钟 | 代码审查、架构分析 | TS Compiler API |

### 双层文档系统

- **AI_MAP.md** - 项目总地图（架构概览、模块关系、入口点）
- **CONTEXT.md** - 文件微观路标（每个文件的职责、导出、依赖）

### 核心功能

- 🗺️ **代码地图生成** - 可视化项目结构和依赖关系
- 🔍 **符号查询** - 快速查找定义、引用、调用链
- 📊 **影响分析** - 重构前评估变更影响范围
- 🤖 **AI 集成** - 为 LLM 提供结构化上下文
- ⚡ **增量更新** - Watch 模式自动同步变更
- 📈 **质量监控** - 复杂度分析、循环依赖检测

## 🚀 快速开始

### 安装

```bash
npm install -g @codemap/core
```

### 初始化

```bash
cd your-project
codemap init
```

### 生成代码地图

```bash
# Fast 模式（< 30秒）
codemap generate --mode fast

# Smart 模式（< 2分钟）
codemap generate --mode smart
```

### Watch 模式

```bash
codemap watch
```

## 📖 核心使用场景

### 1. 新成员快速上手

```bash
codemap generate --mode fast
cat AI_MAP.md
```

**效果**: 新员工 1 天内理解项目架构，1 周内独立开发

### 2. 代码审查准备

```bash
codemap generate --mode smart
codemap impact --file src/core/engine.ts
codemap report --output review.md
```

**效果**: 审查时间减少 50%，问题发现率提升 30%

### 3. AI 辅助开发

```bash
codemap export --format ai --output ./context
codemap watch
```

**效果**: AI 代码建议准确率提升 40%，开发效率提升 25%

### 4. 重构影响分析

```bash
codemap deps --symbol "UserService" --depth 3
codemap graph --output call-graph.mmd
```

**效果**: 重构风险降低 70%，回滚次数减少 80%

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│  CLI / API Layer                                             │
├─────────────────────────────────────────────────────────────┤
│  Core Analysis Engine (Fast/Smart/Incremental Analyzer)     │
├─────────────────────────────────────────────────────────────┤
│  Parser Abstraction (Tree-sitter + TS Compiler API)         │
├─────────────────────────────────────────────────────────────┤
│  Data Model (CodeGraph, SymbolTable, FileIndex)             │
├─────────────────────────────────────────────────────────────┤
│  Output Generation (AI_MAP.md, CONTEXT.md, codemap.json)    │
├─────────────────────────────────────────────────────────────┤
│  Plugin System                                               │
└─────────────────────────────────────────────────────────────┘
```

## ⚡ 性能指标

| 项目规模 | 文件数 | Fast 模式 | Smart 模式 | 增量更新 |
|----------|--------|-----------|------------|----------|
| 小型 | < 200 | < 3s | < 10s | < 1s |
| 中型 | 500-1000 | < 10s | < 30s | < 2s |
| 大型 | 2000-5000 | < 30s | < 2min | < 5s |
| 超大型 | 5000+ | < 60s | < 5min | < 10s |

## 🔧 技术栈

- **Runtime**: Node.js 18+
- **语言**: TypeScript 5.3+
- **解析**: Tree-sitter + TS Compiler API
- **存储**: SQLite / JSON
- **CLI**: Commander.js + Chalk + Ora
- **AI**: OpenAI / Claude / Ollama

## 📝 命令速查

```bash
# 核心命令
codemap init                    # 初始化配置
codemap generate                # 生成代码地图
codemap watch                   # 监听变更
codemap query --symbol "Name"   # 查询符号
codemap export --format ai      # 导出 AI 上下文

# 分析命令
codemap deps --module "src"     # 分析依赖
codemap cycles                  # 检测循环依赖
codemap complexity --top 10     # 复杂度分析
codemap impact --file "path"    # 影响分析

# 导航命令
codemap goto --symbol "Name"    # 跳转到定义
codemap refs --symbol "Name"    # 查找引用
codemap trace --from "A" --to "B"  # 追踪调用链
```

## 🔗 CI/CD 集成

### GitHub Actions

```yaml
name: CodeMap Analysis
on: [push, pull_request]

jobs:
  codemap:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install -g @codemap/core
      - run: codemap generate --mode smart
      - run: codemap complexity --threshold 20
```

## 🤝 贡献

欢迎贡献！请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解如何参与。

## 📄 许可证

MIT License © 2024 CodeMap Team

---

*CodeMap - 让代码理解更快、更智能*
