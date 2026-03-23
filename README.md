# CodeMap

> TypeScript 代码地图工具 - 为 AI 辅助开发提供结构化上下文

CodeMap 是一个专为 TypeScript/JavaScript/Go 项目设计的代码分析工具。它通过静态分析自动生成项目的结构化代码地图，帮助 AI 编程助手（如 Claude、Copilot）快速理解项目架构、模块关系和代码上下文。

## 特性

- **分层架构 (MVP3)** - 清晰的分层设计：Interface → Infrastructure → Domain → Server → CLI
- **双层解析模式** - 提供 `fast`（快速正则）和 `smart`（TypeScript AST）两种解析模式，按需平衡速度与精度
- **多语言支持** - 支持 TypeScript/JavaScript、Go、Python（可扩展架构）
- **HTTP API 服务器** - 内置 REST API 服务器，支持查询、分析、导出
- **多格式输出** - 自动生成 `AI_MAP.md`（全局概览）、`CONTEXT.md` + `context/`（模块上下文）、`codemap.json`（结构化数据）
- **依赖图可视化** - 生成 Mermaid 格式的模块依赖关系图
- **增量缓存** - 基于文件哈希的 LRU 缓存机制，仅重新分析变更文件
- **Watch 模式** - 监听文件变更并自动增量更新代码地图，支持后台守护进程
- **交互式查询** - 支持按符号、模块、依赖进行精确或模糊查询
- **复杂度分析** - 计算圈复杂度、认知复杂度和可维护性指数
- **调用图分析** - 分析函数/方法间的调用关系
- **工作流编排** - v2.5 新增：6 阶段智能工作流 (reference → impact → risk → implementation → commit → ci)
- **CI 门禁** - v2.5 新增：提交格式检查、风险评估、输出契约验证
- **插件系统** - 可扩展的插件架构，支持自定义分析和输出
- **存储抽象** - 支持文件系统、内存、KùzuDB、Neo4j 多种存储后端

## 安装

```bash
# 使用 npm
npm install @mycodemap/mycodemap

# 使用 yarn
yarn add @mycodemap/mycodemap

# 使用 pnpm
pnpm add @mycodemap/mycodemap

# 全局安装（推荐，可直接使用 CLI）
npm install -g @mycodemap/mycodemap
```

**环境要求**: Node.js >= 18.0.0

**MVP3 新依赖**:
- `hono` - HTTP 服务器框架
- `@hono/node-server` - Node.js 适配器

## 快速开始

```bash
# 1. 在项目根目录初始化配置
mycodemap init

# 2. 生成代码地图
mycodemap generate

# 3. 查看生成的文件
ls .mycodemap/
# AI_MAP.md        - 项目全局概览（供 AI 使用）
# CONTEXT.md       - 上下文入口（跳转到 context/README.md）
# context/         - 各模块的详细上下文
# codemap.json     - 结构化 JSON 数据
# dependency-graph.md - Mermaid 依赖图
```

生成后，将 `.mycodemap/AI_MAP.md` 的内容提供给 AI 助手即可让其快速理解你的项目结构。

## 文档导航

### 人类用户

| 文档 | 目标读者 | 内容 |
|------|----------|------|
| [🧭 文档索引](docs/README.md) | 所有读者 | 文档分层、阅读顺序与迁移状态 |
| [🏗️ 架构总图](ARCHITECTURE.md) | 开发者 | 系统地图、模块边界、主执行流 |
| [📋 MVP3 实施路线图](docs/exec-plans/MVP3-IMPLEMENTATION-ROADMAP.md) | 开发者 | 分层架构重构完整计划与状态 |
| [📖 安装配置指南](docs/SETUP_GUIDE.md) | 人类开发者 | 完整的安装、配置和使用指南 |
| [📁 配置示例](examples/) | 所有用户 | 各平台的现成配置文件 |

### 🤖 AI / Agent 专属文档

> 如果你是 AI 助手或 Agent，**请优先阅读以下文档**：

| 文档 | 说明 |
|------|------|
| **[📘 AI_GUIDE.md](AI_GUIDE.md)** | **AI 主指南** - 快速参考、命令选择决策树、提示词模板速用 |
| **[🚀 docs/ai-guide/QUICKSTART.md](docs/ai-guide/QUICKSTART.md)** | 快速开始、场景-命令映射表 |
| **[📚 docs/ai-guide/COMMANDS.md](docs/ai-guide/COMMANDS.md)** | 完整 CLI 命令参考 |
| **[📊 docs/ai-guide/OUTPUT.md](docs/ai-guide/OUTPUT.md)** | JSON 输出结构解析 |
| **[🔄 docs/ai-guide/PATTERNS.md](docs/ai-guide/PATTERNS.md)** | 标准工作流模式 |
| **[💬 docs/ai-guide/PROMPTS.md](docs/ai-guide/PROMPTS.md)** | 即用型提示词模板 |
| **[🔧 docs/ai-guide/INTEGRATION.md](docs/ai-guide/INTEGRATION.md)** | 集成指南、错误处理 |
| **[🛡️ AGENTS.md](AGENTS.md)** | 仓库级强约束、任务分级、代码红线 |
| **[⚡ CLAUDE.md](CLAUDE.md)** | AI 执行手册、验收清单 |
| **[🤖 docs/AI_ASSISTANT_SETUP.md](docs/AI_ASSISTANT_SETUP.md)** | AI 助手配置指引 |
| **[🛠️ docs/rules/engineering-with-codex-openai.md](docs/rules/engineering-with-codex-openai.md) | 面向 agent 的工程约束 |

**AI 快速入口**: `.cursorrules` | `.github/copilot-instructions.md`

## CLI 命令

### `mycodemap init`

初始化项目的 CodeMap 配置文件。

```bash
mycodemap init          # 交互式创建配置
mycodemap init -y       # 使用默认配置直接创建

# 别名：codemap init 也可以使用
```

| 选项 | 说明 |
|------|------|
| `-y, --yes` | 跳过交互，使用默认配置 |

执行后会在项目根目录生成 `codemap.config.json` 配置文件。

### `mycodemap generate`

分析项目并生成代码地图文件。

```bash
mycodemap generate                    # 使用默认 hybrid 模式
mycodemap generate -m smart           # 使用 smart 模式（AST 深度分析）
mycodemap generate -o ./docs/codemap  # 指定输出目录

# 别名：codemap generate 也可以使用
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-m, --mode <mode>` | 分析模式：`fast`（正则匹配）、`smart`（TypeScript AST）或 `hybrid`（自动选择） | `hybrid` |
| `-o, --output <dir>` | 输出目录 | `.mycodemap` |
| `--ai-context` | 为每个文件生成描述 | - |

**模式说明：**

| 模式 | 速度 | 精度 | 适用场景 |
|------|------|------|----------|
| `fast` | 极快 | 基本结构 | 日常开发、大型项目快速预览 |
| `smart` | 较慢 | 完整语义 | 深度分析、复杂度评估、类型推导 |
| `hybrid` | 自动 | 自适应 | **推荐** - 文件数<50用fast，≥50用smart |

### `mycodemap watch`

监听文件变更并自动增量更新代码地图。

```bash
mycodemap watch                 # 前台运行
mycodemap watch -d              # 以后台守护进程运行
mycodemap watch -s              # 停止后台守护进程
mycodemap watch -t              # 查看守护进程状态
mycodemap watch -m smart        # 使用 smart 模式监听
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-m, --mode <mode>` | 分析模式 (fast/smart/hybrid) | `hybrid` |
| `-o, --output <dir>` | 输出目录 | `.mycodemap` |
| `-d, --detach` | 以后台守护进程方式运行 | - |
| `-s, --stop` | 停止后台守护进程 | - |
| `-t, --status` | 查看后台守护进程状态 | - |

### `mycodemap query`

查询代码地图中的符号、模块和依赖信息。

```bash
mycodemap query -s "ModuleInfo"        # 精确查询符号
mycodemap query -m "src/parser"        # 查询模块信息
mycodemap query -d "analyzer"          # 查询依赖关系
mycodemap query -S "cache"             # 模糊搜索
mycodemap query -S "parse" -j          # JSON 格式输出
mycodemap query -S "plugin" -l 5       # 限制结果数量

# 别名：codemap query 也可以使用
```

| 选项 | 说明 | 默认值 |
|------|------|------|
| `-s, --symbol <name>` | 精确查询符号 | - |
| `-m, --module <path>` | 查询模块信息 | - |
| `-d, --deps <name>` | 查询依赖关系 | - |
| `-S, --search <word>` | 模糊搜索 | - |
| `-l, --limit <number>` | 限制结果数量 | `50` |
| `-j, --json` | 以 JSON 格式输出 | - |

### `mycodemap deps`

分析并输出模块的依赖关系树。

```bash
mycodemap deps                     # 查看所有模块的依赖统计
mycodemap deps -m "src/parser"    # 查看指定模块的依赖树
mycodemap deps -m "src/parser" -j # JSON 格式输出
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-m, --module <path>` | 查询指定模块的依赖 | - |
| `-j, --json` | 以 JSON 格式输出 | - |

### `mycodemap cycles`

检测项目中的循环依赖。

```bash
mycodemap cycles                  # 检测所有循环依赖
```

### `mycodemap complexity`

分析代码复杂度，输出圈复杂度、认知复杂度和可维护性指数。

```bash
mycodemap complexity              # 分析整个项目的复杂度
mycodemap complexity -f src/cli/index.ts  # 分析指定文件的复杂度
mycodemap complexity -j          # JSON 格式输出
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-f, --file <path>` | 查看指定文件的复杂度 | - |
| `-j, --json` | 以 JSON 格式输出 | - |

### `mycodemap impact`

评估指定文件或模块变更的影响范围。

```bash
mycodemap impact -f src/cli/index.ts         # 分析指定文件的变更影响
mycodemap impact -f src/cli/index.ts --transitive  # 包含传递依赖
mycodemap impact -f src/cli/index.ts -j     # JSON 格式输出
```

| 选项 | 说明 | 默认值 |
|------|------|------|
| `-f, --file <path>` | **必填** 指定要分析的文件 | - |
| `-t, --transitive` | 包含传递依赖（间接影响） | - |
| `-j, --json` | 以 JSON 格式输出 | - |

### `mycodemap report`

生成代码地图分析报告，汇总分析结果和运行日志。

```bash
mycodemap report                   # 生成最近 7 天的报告
mycodemap report -d 14             # 生成最近 14 天的报告
mycodemap report -o ./reports      # 指定输出目录
mycodemap report -v                # 显示详细信息
```

| 选项 | 说明 | 默认值 |
|------|------|------|
| `-o, --output <dir>` | 输出目录 | `.mycodemap` |
| `-d, --days <number>` | 报告覆盖的天数 | `7` |
| `-j, --json` | JSON 格式输出 | - |
| `-v, --verbose` | 显示详细信息 | - |

### `mycodemap logs`

管理代码地图运行时日志（列出、导出、清理）。

```bash
# 列出日志
mycodemap logs list                # 列出最近 10 条日志
mycodemap logs list -l 20          # 列出最近 20 条
mycodemap logs list --level ERROR  # 仅列出错误日志
mycodemap logs list -j             # JSON 格式输出

# 导出日志
mycodemap logs export              # 导出最近 7 天的日志
mycodemap logs export -d 30        # 导出最近 30 天的日志
mycodemap logs export -o ./logs.zip # 指定导出文件
mycodemap logs export --format txt # 导出为文本格式

# 清理日志
mycodemap logs clear -d 30 --confirm  # 清理 30 天前的日志
```

| 选项 | 说明 | 默认值 |
|------|------|------|
| `-l, --limit <number>` | 限制显示数量 | `10` |
| `--level <level>` | 按级别过滤 (`INFO`/`WARN`/`ERROR`/`DEBUG`) | - |
| `-j, --json` | JSON 格式输出 | - |
| `-o, --output <file>` | 导出文件路径 | - |
| `-d, --days <number>` | 天数 | 视子命令而定 |
| `--format <format>` | 导出格式 (`json`/`txt`) | `json` |
| `-c, --confirm` | 确认清理操作 | - |

### `mycodemap server` (MVP3)

启动 CodeMap HTTP API 服务器。

```bash
mycodemap server                   # 启动服务器 (默认端口 3000)
mycodemap server -p 8080           # 指定端口
mycodemap server -p 3000 --open    # 自动打开浏览器
mycodemap server --cors            # 启用 CORS
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-p, --port <number>` | 服务器端口 | `3000` |
| `-h, --host <string>` | 服务器主机 | `0.0.0.0` |
| `--cors` | 启用 CORS | `false` |
| `--open` | 自动打开浏览器 | `false` |

**API 端点：**
- `GET /api/v1/health` - 健康检查
- `GET /api/v1/stats` - 项目统计
- `GET /api/v1/search/symbols?q=` - 符号搜索
- `GET /api/v1/modules/:id` - 模块详情
- `POST /api/v1/analysis/impact` - 影响分析
- `GET /api/v1/export/:format` - 导出数据

### `mycodemap export` (MVP3)

导出代码图到各种格式。

```bash
mycodemap export json              # 导出为 JSON
mycodemap export graphml           # 导出为 GraphML (Gephi 兼容)
mycodemap export dot               # 导出为 DOT (Graphviz)
mycodemap export mermaid           # 导出为 Mermaid 语法
mycodemap export json -o ./out     # 指定输出路径
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-o, --output <path>` | 输出文件路径 | 自动根据格式生成 |

## 工作流编排 (v2.5)

CodeMap v2.5 引入智能工作流编排系统，将复杂任务分解为 6 个有序阶段，每个阶段自动分析并传递上下文。

### 工作流阶段

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  reference  │ → │   impact    │ → │    risk     │
│  参考搜索    │    │  影响分析    │    │  风险评估    │
└─────────────┘    └─────────────┘    └─────────────┘
                                              ↓
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│     ci      │ ← │   commit    │ ← │implementation│
│  CI验证     │    │  提交验证    │    │  代码实现    │
└─────────────┘    └─────────────┘    └─────────────┘
```

| 阶段 | 说明 | 自动分析 | 交付物 |
|------|------|----------|--------|
| **reference** | 参考搜索：查找相关代码和文档 | 符号搜索、依赖分析 | 相关文件列表 |
| **impact** | 影响分析：评估变更影响范围 | 依赖图分析、传递依赖 | 影响文件清单 |
| **risk** | 风险评估：基于 Git 历史评估风险 | 文件热度、修改频率、风险评分 | 风险报告 |
| **implementation** | 代码实现：执行具体修改 | - | 代码变更 |
| **commit** | 提交验证：验证提交格式 | Commit 格式检查 | 验证报告 |
| **ci** | CI验证：运行测试和检查 | 单元测试、类型检查、契约验证 | CI 报告 |

### 工作流 CLI 命令

```bash
# 启动工作流
mycodemap workflow start "实现用户认证模块"
# 启动工作流并指定模板（会直接影响阶段推进顺序）
mycodemap workflow start "修复登录接口 500" --template bugfix

# 查看当前工作流状态
mycodemap workflow status

# 可视化当前工作流（支持 --timeline / --results）
mycodemap workflow visualize

# 推进到下一阶段
mycodemap workflow proceed

# 恢复当前活动工作流（可选传 workflow-id）
mycodemap workflow resume
mycodemap workflow resume <workflow-id>

# 创建检查点
mycodemap workflow checkpoint

# 列出所有工作流
mycodemap workflow list

# 删除工作流
mycodemap workflow delete <workflow-id>

# 模板管理
mycodemap workflow template list --all
mycodemap workflow template info bugfix
mycodemap workflow template apply bugfix
mycodemap workflow template recommend "紧急修复支付超时"
```

### 工作流使用示例

```bash
# 示例：实现新功能
$ mycodemap workflow start "添加缓存过期机制"
🚀 启动工作流: 添加缓存过期机制
📍 当前阶段: reference

# 系统会自动分析相关代码，生成参考搜索结果
# 确认后进入下一阶段
$ mycodemap workflow proceed
📍 进入阶段: impact
📊 影响范围: 3 个文件
   - src/cache/lru-cache.ts
   - src/cache/index.ts
   - src/cli/commands/query.ts

# 继续推进
$ mycodemap workflow proceed
📍 进入阶段: risk
⚠️ 风险等级: medium
   - src/cache/lru-cache.ts: 近期频繁修改 (5次/30天)

# 实现代码后
$ mycodemap workflow proceed
📍 进入阶段: implementation
✅ 代码实现完成

# 提交前验证
$ mycodemap workflow proceed
📍 进入阶段: commit
✅ Commit 格式验证通过

# CI 验证
$ mycodemap workflow proceed
📍 进入阶段: ci
✅ 所有检查通过
🎉 工作流完成！

# 示例：模板会改变阶段推进顺序
$ mycodemap workflow start "修复线上缓存失效" --template bugfix
$ mycodemap workflow proceed --force
📍 下一阶段: implementation   # bugfix 模板: reference -> implementation

# 示例：对当前活动工作流应用模板
$ mycodemap workflow template apply bugfix
Applied template: bugfix
Current phase: reference
```

## CI 门禁 (v2.5)

CodeMap 提供 CI 阶段自动检查，确保代码质量。

```bash
# 检查 README / docs / CLI 示例是否与仓库事实同步
npm run docs:check

# 通过统一 CLI 护栏入口复用同一检查
mycodemap ci check-docs-sync

# 检查提交格式 ([TAG] scope: message)
mycodemap ci check-commits

# 检查文件头注释 ([META], [WHY])
mycodemap ci check-headers

# 评估变更风险
mycodemap ci assess-risk -f src/cache/lru-cache.ts

# 检查输出契约
mycodemap ci check-output-contract
```

## 配置说明

通过 `codemap init` 生成的 `codemap.config.json` 配置文件支持以下选项：

```jsonc
{
  // JSON Schema（可选，提供编辑器智能提示）
  "$schema": "https://codemap.dev/schema.json",

  // 分析模式："fast" 或 "smart"
  "mode": "fast",

  // 包含的文件 glob 模式
  "include": [
    "src/**/*.ts"
  ],

  // 排除的文件 glob 模式
  "exclude": [
    "node_modules/**",
    "dist/**",
    "build/**",
    "*.test.ts",
    "*.spec.ts"
  ],

  // 输出目录
  "output": ".mycodemap"
}
```

| 配置项 | 类型 | 说明 | 默认值 |
|--------|------|------|--------|
| `mode` | `"fast" \| "smart"` | 分析模式 | `"fast"` |
| `include` | `string[]` | 包含的文件 glob 模式 | `["src/**/*.ts"]` |
| `exclude` | `string[]` | 排除的文件 glob 模式 | `["node_modules/**", "dist/**", ...]` |
| `output` | `string` | 输出目录路径 | `".mycodemap"` |

## 输出文件说明

运行 `mycodemap generate` 后，会在输出目录（默认 `.mycodemap/`）中生成以下文件：

### `AI_MAP.md`

项目全局概览文件，专为 AI 助手设计，包含：
- 项目基本信息（文件数、代码行数、模块数等）
- 入口点列表
- 模块组织表（导出数、依赖数、类型）
- Mermaid 格式的依赖关系图
- 类型摘要和导出统计

### `CONTEXT.md` 与 `context/`

`CONTEXT.md` 是上下文入口文件，详细模块内容位于 `context/` 目录，包含：
- 模块概述（类型、代码行数）
- 导出列表（名称、类型、是否默认导出）
- 导入列表（来源、引入的符号）
- 符号列表（函数、类、接口等）
- 依赖和被依赖关系

### `codemap.json`

完整的结构化 JSON 数据，包含所有分析结果，适用于程序化消费。数据结构包括：
- `project` - 项目基本信息
- `summary` - 统计摘要
- `modules` - 模块详情数组（符号、导入、导出、复杂度等）
- `dependencies` - 依赖图（节点和边）

### `dependency-graph.md`

独立的 Mermaid 依赖关系图文件，可在支持 Mermaid 的 Markdown 渲染器中直接预览。

## MVP3 分层架构

CodeMap 采用清晰的分层架构设计（MVP3），各层职责明确：

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Layer                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │   server    │ │   export    │ │ 原有命令(generate..)│   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                      Server Layer                           │
│  HTTP API / QueryHandler / AnalysisHandler                  │
├─────────────────────────────────────────────────────────────┤
│                       Domain Layer                          │
│  Project / Module / Symbol / Dependency / CodeGraph         │
├─────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                      │
│  ┌──────────────────┐ ┌──────────────────┐                 │
│  │ Storage          │ │ Parser           │                 │
│  │ - FileSystem     │ │ - TypeScript     │                 │
│  │ - Memory         │ │ - Go             │                 │
│  │ - KùzuDB         │ │ - Python         │                 │
│  │ - Neo4j          │ │ - Registry       │                 │
│  └──────────────────┘ └──────────────────┘                 │
│  ┌──────────────────┐                                      │
│  │ Repository       │  CodeGraphRepositoryImpl             │
│  └──────────────────┘                                      │
├─────────────────────────────────────────────────────────────┤
│                     Interface Layer                         │
│  类型定义与契约 (Types, ILanguageParser, IStorage)          │
└─────────────────────────────────────────────────────────────┘
```

### 架构层说明

| 层级 | 路径 | 职责 | 关键组件 |
|------|------|------|----------|
| **CLI** | `src/cli/` | 命令行接口 | `server`, `export`, `generate` 命令 |
| **Server** | `src/server/` | HTTP API | `CodeMapServer`, `QueryHandler` |
| **Domain** | `src/domain/` | 核心业务逻辑 | `Project`, `Module`, `CodeGraph` |
| **Infrastructure** | `src/infrastructure/` | 技术实现 | `Storage`, `Parser`, `Repository` |
| **Interface** | `src/interface/` | 类型契约 | `types/`, `config/` |

### 项目目录结构

```
src/
  ├── cli/                    # CLI 命令入口 (原有 + MVP3 新增)
  │   ├── commands/
  │   │   ├── server.ts       # MVP3: HTTP API 服务器
  │   │   ├── export.ts       # MVP3: 导出命令
  │   │   ├── generate.ts     # 生成代码地图
  │   │   ├── query.ts        # 查询命令
  │   │   └── ...             # 其他命令
  │   └── index.ts
  ├── server/                 # MVP3: HTTP API 服务器层
  │   ├── CodeMapServer.ts    # 主服务器类
  │   ├── handlers/           # QueryHandler, AnalysisHandler
  │   └── routes/             # API 路由
  ├── domain/                 # MVP3: 领域层
  │   ├── entities/           # Project, Module, Symbol, Dependency
  │   ├── services/           # CodeGraphBuilder
  │   ├── events/             # DomainEvent
  │   └── repositories/       # 仓库接口
  ├── infrastructure/         # MVP3: 基础设施层
  │   ├── storage/            # 存储适配器
  │   │   ├── adapters/       # FileSystem, Memory, KùzuDB, Neo4j
  │   │   └── StorageFactory.ts
  │   ├── parser/             # 解析器
  │   │   ├── interfaces/     # ParserBase
  │   │   ├── implementations/# TypeScript, Go, Python
  │   │   └── registry/       # ParserRegistry
  │   └── repositories/       # 仓库实现
  ├── interface/              # MVP3: 接口层
  │   ├── types/              # 核心类型定义
  │   └── config/             # 配置类型
  ├── core/                   # 核心分析引擎 (原有)
  ├── parser/                 # 原有解析器 (逐步迁移到 infrastructure/parser)
  ├── orchestrator/           # 编排层 (v2.5)
  └── ...
```

## AI 助手集成

MyCodeMap 可与多种 AI 编程助手深度集成，提供智能代码分析能力：

| AI 助手 | 配置方式 | 支持功能 |
|---------|----------|----------|
| **Kimi CLI** | Skill 配置 | 完整命令支持 |
| **Claude Code** | Skill 配置 | 完整命令支持 |
| **Codex CLI** | Agent 配置 | 完整命令支持 |
| **GitHub Copilot** | 提示词配置 | 基础查询支持 |

### 快速配置

```bash
# Kimi CLI
mkdir -p .kimi/skills/codemap
cp examples/kimi/codemap-skill.md .kimi/skills/codemap/SKILL.md

# Claude Code
mkdir -p .claude/skills/codemap
cp examples/claude/codemap-skill.md .claude/skills/codemap/SKILL.md

# Codex CLI
mkdir -p .agents/skills/codemap
cp examples/codex/codemap-agent.md .agents/skills/codemap/SKILL.md
```

详细配置请参考 [AI_ASSISTANT_SETUP.md](docs/AI_ASSISTANT_SETUP.md)，设计与规则入口请先看 [docs/README.md](docs/README.md)。

## 新增 CLI 命令

### `mycodemap analyze`

统一分析入口，支持多意图路由和结构化输出：

```bash
# 影响分析（查看文件变更影响范围）
mycodemap analyze -i impact -t src/cli/index.ts
mycodemap analyze -i impact -t src/cli/index.ts --scope transitive
mycodemap analyze -i impact -t src/cli/index.ts --include-tests

# 依赖分析
mycodemap analyze -i dependency -t src/cli/index.ts

# 项目概览
mycodemap analyze -i overview -t src/orchestrator

# 复杂度分析
mycodemap analyze -i complexity -t src/domain

# 搜索分析
mycodemap analyze -i search -k UnifiedResult

# 重构建议
mycodemap analyze -i refactor -t src/cache

# 引用查找
mycodemap analyze -i reference -t src/interface/types

# 文档生成
mycodemap analyze -i documentation -t src/domain/services

# 机器可读输出（JSON）
mycodemap analyze -i impact -t src/index.ts --json
mycodemap analyze -i impact -t src/index.ts --structured --json
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-i, --intent <type>` | 分析类型：`impact`/`dependency`/`search`/`documentation`/`complexity`/`overview`/`refactor`/`reference` | `impact` |
| `-t, --targets <paths...>` | 目标文件/模块路径（必填） | - |
| `-k, --keywords <words...>` | 搜索关键词（用于 search/documentation 意图） | - |
| `-s, --scope <scope>` | 范围：`direct`（直接）/`transitive`（传递） | `direct` |
| `-n, --topK <number>` | 返回结果数量 | `8` |
| `--include-tests` | 包含测试文件关联 | - |
| `--include-git-history` | 包含 Git 历史分析 | - |
| `--json` | JSON 格式输出 | - |
| `--structured` | 纯结构化输出（移除自然语言字段，配合 `--json` 使用） | - |
| `--output-mode <mode>` | 输出模式：`machine`/`human` | `human` |

### `mycodemap ci`

CI Gateway - 代码质量门禁工具：

```bash
# 验证提交格式（[TAG] scope: message）
mycodemap ci check-commits
mycodemap ci check-commits -c 5
mycodemap ci check-commits -r origin/main..HEAD

# 验证文件头注释（[META], [WHY]）
mycodemap ci check-headers
mycodemap ci check-headers -d src/domain
mycodemap ci check-headers -f "src/index.ts,src/cli/index.ts"

# 评估变更风险
mycodemap ci assess-risk
mycodemap ci assess-risk -t 0.5

# 验证文档同步
mycodemap ci check-docs-sync

# 验证输出契约
mycodemap ci check-output-contract

# 检查提交文件数量（限制 10 个文件）
mycodemap ci check-commit-size
mycodemap ci check-commit-size -m 15
```

支持的提交 TAG 类型：`[REFACTOR]`, `[TEST]`, `[DOCS]`, `[FEAT]`, `[FIX]`, `[CHORE]`, `[PERF]`, `[SECURITY]`, `[BREAKING]`, `[HOTFIX]`, `[MIGRATION]`, `[WIP]`

## 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发环境搭建

```bash
# 克隆仓库
git clone <repo-url>
cd codemap

# 安装依赖
npm install

# 编译
npm run build

# 开发模式（监听编译）
npm run dev

# 运行测试
npm test                  # 功能测试（src/**/*.test.ts）
npm run benchmark         # 性能基准测试（refer/benchmark-quality.test.ts）
npm run test:all          # 功能 + 基准（串联执行）

# 文档 / CLI 示例护栏
npm run docs:check
node dist/cli/index.js ci check-docs-sync

# 类型检查
npm run typecheck

# 代码检查
npm run lint
```

### 提交规范

请遵循以下 commit message 格式：

```
[TAG] scope: message

BUGFIX   Bug 修复
FEATURE  新功能
REFACTOR 代码重构
CONFIG   配置/构建变更
DOCS     文档变更
DELETE   删除代码/文件
```

示例：`[FEATURE] cli: add new command`

### 文件规范

所有 TypeScript 源文件（除测试文件和类型定义外）头部必须包含以下注释：

```typescript
// [META] since:YYYY-MM | owner:team | stable:false
// [WHY]  说明该文件存在的原因和业务价值
```

- `[META]`：元数据注释，包含创建时间、负责团队、稳定性状态
- `[WHY]`：解释文件存在的业务理由，帮助 AI 理解上下文

### 开发注意事项

- 项目使用 ESM 模块格式（`"type": "module"`）
- TypeScript 严格模式
- 使用 Vitest 作为测试框架
- **提交前会自动运行与变更相关的测试，失败将阻断提交**
- **提交前会检查文件头注释规范（[META]/[WHY]）**
- 新增功能请同步补充测试和文档

### 运行日志（调试追踪）

- CLI 运行日志默认写入 `.mycodemap/logs/codemap-YYYY-MM-DD.log`
- 默认保留 14 天、最多保留 30 个日志文件（自动清理）
- 可通过环境变量调整：
  - `CODEMAP_RUNTIME_LOG_ENABLED=false`：关闭运行日志
  - `CODEMAP_RUNTIME_LOG_DIR=<dir>`：自定义日志目录
  - `CODEMAP_RUNTIME_LOG_RETENTION_DAYS=<days>`：设置保留天数
  - `CODEMAP_RUNTIME_LOG_MAX_FILES=<n>`：设置最大保留文件数
  - `CODEMAP_RUNTIME_LOG_MAX_SIZE_MB=<mb>`：单个日志文件大小上限（超限后自动轮转并 gzip）

## 许可证

[MIT](LICENSE)
