# CodeMap

> AI-first 代码地图工具 - 为 AI/Agent 提供结构化、可预测的代码上下文

CodeMap 是一个面向 TypeScript/JavaScript/Go 项目的 AI-first 代码地图工具。它通过静态分析生成稳定的项目地图、依赖关系和结构化结果，帮助 AI/Agent 更快理解代码结构、定位影响范围，并把分析结果交给人类开发者继续判断与维护。

## 特性

- **AI-first 代码地图** - 生成 `AI_MAP.md`、`CONTEXT.md`、`codemap.json` 等 AI/Agent 可直接消费的上下文
- **核心分析命令** - 提供 `generate`、`query`、`deps`、`impact`、`complexity`、`cycles`、`analyze`、`design`、`export`、`ci`
- **机器可读优先** - 结构化输出是产品基线；当前 CLI 过渡期仍主要通过 `--json` 暴露机器可读结果
- **分层架构 (MVP3)** - 保持 `Interface → Infrastructure → Domain → Server → CLI` 的明确边界
- **双层解析模式** - 提供 `fast`（快速正则）和 `smart`（TypeScript AST）两种解析模式
- **多语言支持** - 支持 TypeScript/JavaScript、Go、Python（可扩展架构）
- **依赖/影响/复杂度分析** - 适合变更影响评估、重构盘点和架构回溯
- **CI 门禁与文档护栏** - 提供提交格式、文件头、风险评估、文档/输出契约检查
- **多格式导出与存储抽象** - 支持导出图数据，并保留文件系统/内存/图数据库后端接口

## 产品定位

| 维度 | 当前基线 |
|------|----------|
| 产品是谁 | `CodeMap` 是 AI-first 代码地图工具，而不是泛化的实现/发布/HTTP 工具箱 |
| 主要消费者 | `AI/Agent 是主要消费者`；人类开发者负责配置、维护与按需阅读输出 |
| 输出契约 | 目标是机器可读优先；`当前 CLI 现实` 是多数命令通过 `--json` 提供结构化结果，`analyze` 额外支持 `--output-mode machine|human` |
| 架构边界 | `Server Layer` 是内部架构层，不等于公共 `mycodemap server` 命令 |

当前公共 CLI 聚焦 `init`、`generate`、`query`、`deps`、`cycles`、`complexity`、`impact`、`analyze`、`design`、`ci`、`workflow`、`export`、`ship`；`server`、`watch`、`report`、`logs` 已从 public CLI 移除，并在调用时给出迁移提示。

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

```bash
# 4. 当前 CLI 过渡现实：给 AI/Agent 时优先请求机器可读结果
mycodemap impact -f src/cli/index.ts -j

# analyze 额外支持显式 machine/human 模式
mycodemap analyze -i read -t src/cli/index.ts --output-mode human

# 人类设计先落成 design contract，再交给 AI/Agent 消费
cp docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md mycodemap.design.md
mycodemap design validate mycodemap.design.md --json
mycodemap design map mycodemap.design.md --json
mycodemap design handoff mycodemap.design.md --json
mycodemap design verify mycodemap.design.md --json
```

生成后，将 `.mycodemap/AI_MAP.md` 的内容提供给 AI 助手即可让其快速理解你的项目结构；需要结构化结果继续处理时，优先使用 JSON / machine 模式。

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
| **[🛠️ docs/rules/engineering-with-codex-openai.md](docs/rules/engineering-with-codex-openai.md)** | 面向 agent 的工程约束 |

**AI 快速入口**: `.cursorrules` | `.github/copilot-instructions.md`

## CLI 命令

> 说明：以下章节记录当前公开的公共命令面。`workflow` 是公开的 analysis-only 工作流能力，`ship` 仍是过渡能力；`server`、`watch`、`report`、`logs` 已从 public CLI 移除，并在调用时输出迁移提示。

### `mycodemap init`

初始化项目的 CodeMap 配置文件。

```bash
mycodemap init          # 创建默认配置文件
mycodemap init -y       # 使用默认配置直接创建

# 别名：codemap init 也可以使用
```

| 选项 | 说明 |
|------|------|
| `-y, --yes` | 使用默认配置 |

执行后会在项目根目录生成 `mycodemap.config.json` 配置文件。

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

### 已移除的公共 CLI 命令

以下命令已从 public CLI 移除；直接调用时，CLI 会显式失败并给出迁移提示，而不是继续执行旧功能。

| 已移除命令 | 当前迁移方式 |
|------------|--------------|
| `watch` | 改用一次性的 `mycodemap generate` 刷新代码地图 |
| `report` | 直接读取 `.mycodemap/AI_MAP.md`，或使用 `mycodemap export <format>` 导出结果 |
| `logs` | 直接读取 `.mycodemap/logs/` 下的日志文件 |
| `server` | 公共 CLI 已移除；`Server Layer` 仍是内部架构层，不等于公开 `mycodemap server` 命令 |

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

## 工作流编排（分析型 workflow）

`workflow` 是公开的 analysis-only 工作流能力，只编排分析阶段：`find → read → link → show`。  
代码实现、commit 检查和 CI 运行不再属于 workflow phase；这些职责分别回到常规开发流程、`mycodemap ci` 与 `mycodemap ship`。

### 工作流阶段

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    find     │ → │    read     │ → │    link     │ → │    show     │
│ 查找代码线索 │    │ 阅读影响范围 │    │ 关联依赖引用 │    │ 展示概览结果 │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

| 阶段 | 对应意图 | 说明 | 典型产物 |
|------|----------|------|----------|
| **find** | `analyze --intent find` | 查找符号、关键词与候选文件 | 相关文件 / 符号列表 |
| **read** | `analyze --intent read` | 阅读影响范围、复杂度与上下文 | 影响与复杂度摘要 |
| **link** | `analyze --intent link` | 汇总依赖、引用与关联关系 | 依赖 / 引用结果 |
| **show** | `analyze --intent show` | 生成模块概览与展示型摘要 | overview / summary 输出 |

> 内置模板（`refactoring` / `bugfix` / `feature` / `hotfix`）共享同一 4 阶段顺序，只通过不同的阶段阈值和适用场景调整体验。

## 设计契约输入面

`design` 是给“人类负责设计、AI 负责执行”协作链路准备的正式输入面。
先把设计写成 `mycodemap.design.md`，再用 CLI 校验必填 sections、空段、重复 heading 和未知 heading。

```bash
# 从 canonical template 起步
cp docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md mycodemap.design.md

# 使用默认文件名校验
mycodemap design validate mycodemap.design.md --json

# 校验通过后生成 candidate scope
mycodemap design map mycodemap.design.md --json

# 把 scope 打包成 handoff artifact，供 reviewer / AI agent 消费
mycodemap design handoff mycodemap.design.md --json

# 基于 reviewed handoff truth 做 verification / drift 检查
mycodemap design verify mycodemap.design.md --json

# 也可以显式传入其他路径
mycodemap design validate docs/designs/login.design.md
```

必填 sections：
- `## Goal`
- `## Constraints`
- `## Acceptance Criteria`
- `## Non-Goals`

> 建议最小工作流：`design validate → design map → design handoff → design verify`。`design map --json` 会返回 `summary`、`candidates`、`diagnostics` 与 `unknowns`；`design handoff --json` 会继续返回 `readyForExecution`、`approvals`、`assumptions` 与 `openQuestions`，默认 artifact 路径为 `.mycodemap/handoffs/{stem}.handoff.md|json`；`design verify --json` 会返回 `checklist`、`drift`、`diagnostics` 与 `readyForExecution`，其中 review-needed 不会直接变成非零退出，只有 blocker diagnostics 才会阻断。

### 工作流 CLI 命令

```bash
# 启动工作流
mycodemap workflow start "实现用户认证模块"
# 启动工作流并指定模板（会保留 4 阶段顺序）
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
# 示例：围绕一个模块逐步收敛上下文
$ mycodemap workflow start "梳理缓存模块上下文"
[WORKFLOW STARTED]
Task: 梳理缓存模块上下文
Phase: find

# 查看当前分析阶段与进度
$ mycodemap workflow status
Phase: find

# 可视化 4 阶段分析流水线
$ mycodemap workflow visualize
▶ 🔍 【Find】
  ↓
○ 📖 Read
  ↓
○ 🔗 Link
  ↓
○ 🧭 Show

# 当前阶段完成后推进到下一阶段
$ mycodemap workflow proceed
Next phase: read

# 示例：对当前活动工作流应用模板（阶段顺序不变）
$ mycodemap workflow template apply bugfix
Applied template: bugfix
Phases: find → read → link → show
Current phase: find
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

> `ci assess-risk` 现在输出 `status/confidence/freshness/source` 与统一 risk level；若 Git history 不可用，会显式打印 `unavailable` / warning，并说明阈值未被应用。

## 配置说明

通过 `mycodemap init` 生成的 `mycodemap.config.json` 配置文件支持以下选项：

```jsonc
{
  // JSON Schema（可选，提供编辑器智能提示）
  "$schema": "https://mycodemap.dev/schema/config.json",

  // 分析模式："fast"、"smart" 或 "hybrid"
  "mode": "hybrid",

  // 包含的文件 glob 模式
  "include": [
    "src/**/*.ts"
  ],

  // 排除的文件 glob 模式
  "exclude": [
    "node_modules/**",
    "dist/**",
    "build/**",
    "coverage/**",
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/*.d.ts"
  ],

  // 输出目录
  "output": ".mycodemap",

  // 监听模式预留配置
  "watch": false,

  // 图存储后端配置
  "storage": {
    "type": "filesystem",
    "outputPath": ".codemap/storage"
  },

  // 插件加载配置
  "plugins": {
    "builtInPlugins": true,
    "plugins": [],
    "debug": false
  }
}
```

| 配置项 | 类型 | 说明 | 默认值 |
|--------|------|------|--------|
| `mode` | `"fast" \| "smart" \| "hybrid"` | 分析模式 | `"hybrid"` |
| `include` | `string[]` | 包含的文件 glob 模式 | `["src/**/*.ts"]` |
| `exclude` | `string[]` | 排除的文件 glob 模式 | `["node_modules/**", "dist/**", ...]` |
| `output` | `string` | 输出目录路径 | `".mycodemap"` |
| `watch` | `boolean` | 监听模式预留配置 | `false` |
| `storage.type` | `"filesystem" \| "sqlite" \| "memory" \| "auto"` | 图存储后端类型 | `"filesystem"` |
| `storage.outputPath` | `string` | 文件系统存储目录 | `".codemap/storage"` |
| `storage.databasePath` | `string` | SQLite 数据目录（相对项目根目录） | `".codemap/governance.sqlite"` |
| `storage.autoThresholds` | `object` | `auto` 后端选择阈值 | - |
| `plugins.builtInPlugins` | `boolean` | 是否启用内置插件 | `true` |
| `plugins.pluginDir` | `string` | 额外插件目录 | - |
| `plugins.plugins` | `string[]` | 显式加载的插件名称列表 | `[]` |
| `plugins.debug` | `boolean` | 是否输出插件调试日志 | `false` |

### 图存储后端说明

```jsonc
{
  "storage": {
    "type": "sqlite",
    "databasePath": ".codemap/governance.sqlite"
  }
}
```

- `generate` 会把 CodeGraph 写入配置的 `storage` 后端，`export` 与内部 `Server Layer` handler 会读取同一份后端数据。
- `neo4j` 与 `kuzudb` 已不再是正式支持的 backend；旧配置会返回显式迁移错误，不会静默 fallback 到 `filesystem`。
- 显式选择 `sqlite` 且运行时缺少 `better-sqlite3` 或 Node.js `<20` 时，会返回显式错误。
- `storage.type = "auto"` 当前优先选择 `sqlite`；若运行时缺少 `better-sqlite3` 或 Node.js `<20` 导致 SQLite 不可用，则 warning 后回退到 `filesystem`。
- 图存储后端生产化不等于重新开放公共 HTTP API 产品面；`Server Layer` 仍是内部架构层。

### 插件运行时说明

```jsonc
{
  "plugins": {
    "builtInPlugins": false,
    "pluginDir": "./codemap-plugins",
    "plugins": ["complexity-analyzer", "my-local-plugin"],
    "debug": true
  }
}
```

- 只有**显式声明了** `plugins` 段时，`generate` 才会启用插件 runtime；没有该段的旧项目保持原有行为。
- 插件加载结果、诊断信息和插件生成文件会写入 `AI_MAP.md` 的 `Plugin Summary` 与 `codemap.json` 的 `pluginReport`。
- 非法插件配置、插件初始化失败、generate hook 失败都会被收口为结构化 diagnostics，而不是静默忽略。

> 文件发现契约：`generate`、`analyze` 与 `ci check-headers -d` 等扫描类命令共享同一套 `.gitignore` 感知排除规则；若仓库没有 `.gitignore`，则回退到默认 `exclude`（即 `node_modules/dist/build/coverage/**` 与 `**/*.test.ts` / `**/*.spec.ts` / `**/*.d.ts`），并在 Git worktree 场景下避免误扫描 `.git` 目录。

## 输出文件说明

运行 `mycodemap generate` 后，会在输出目录（默认 `.mycodemap/`）中生成以下文件：

### `AI_MAP.md`

项目全局概览文件，专为 AI 助手设计，包含：
- 项目基本信息（文件数、代码行数、模块数等）
- 已加载插件、插件生成文件数量与插件诊断摘要（仅当显式启用 plugins runtime）
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
- `pluginReport` - 插件运行摘要（`loadedPlugins`、`generatedFiles`、`metrics`、`diagnostics`）

### `dependency-graph.md`

独立的 Mermaid 依赖关系图文件，可在支持 Mermaid 的 Markdown 渲染器中直接预览。

## MVP3 分层架构

CodeMap 采用清晰的分层架构设计（MVP3），各层职责明确：

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Layer                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │workflow/ship│ │   export    │ │ 原有命令(generate..)│   │
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
│  │ - Auto Select    │ │ - Registry       │                 │
│  └──────────────────┘ └──────────────────┘                 │
│  ┌──────────────────┐                                      │
│  │ Repository       │  CodeGraphRepositoryImpl             │
│  └──────────────────┘                                      │
├─────────────────────────────────────────────────────────────┤
│                     Interface Layer                         │
│  类型定义与契约 (Types, ILanguageParser, IStorage)          │
└─────────────────────────────────────────────────────────────┘
```

> 命名边界：`Server Layer` 是内部架构层，不等于公共 `mycodemap server` 命令。

### 架构层说明

| 层级 | 路径 | 职责 | 关键组件 |
|------|------|------|----------|
| **CLI** | `src/cli/` | 命令行接口（核心分析命令 + `workflow` / `ship` 扩展 surface） | `generate`, `query`, `impact`, `export` |
| **Server** | `src/server/` | 内部 Server Layer / HTTP transport | `CodeMapServer`, `QueryHandler` |
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
  │   │   ├── adapters/       # FileSystem, Memory, KùzuDB
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

### `mycodemap design`

校验、映射并验证 human-authored design contract，默认读取仓库根目录的 `mycodemap.design.md`。

```bash
# validate: 使用默认路径校验
mycodemap design validate mycodemap.design.md --json

# validate: 显式指定文件
mycodemap design validate docs/designs/login.design.md

# map: 生成 candidate code scope
mycodemap design map mycodemap.design.md --json

# handoff: 生成 reviewer + agent 共用的 handoff package
mycodemap design handoff mycodemap.design.md --json

# verify: 基于 reviewed handoff truth 做 checklist / drift 校验
mycodemap design verify mycodemap.design.md --json
```

| 选项 | 说明 |
|------|------|
| `-j, --json` | 输出纯 JSON diagnostics，适合 AI/CI 消费 |

> canonical 模板位于 `docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md`。
> 缺失必填 section、重复 section、空 section 或未知 heading 时，CLI 会返回结构化 diagnostics，而不是继续猜测设计意图。
> `design map` 会基于 design contract 返回 `candidates`、`diagnostics` 与 `unknowns`；若命中 `no-candidates`、`over-broad-scope` 或 `high-risk-scope`，命令会直接阻断。
> `design handoff` 会基于 validated design contract + mapping truth 返回 `readyForExecution`、`approvals`、`assumptions`、`openQuestions`；human mode 默认写出 `.mycodemap/handoffs/{stem}.handoff.md|json`。
> `design verify` 会把 `Acceptance Criteria` 固定映射为 `checklist`，并输出 `drift` / `diagnostics`；当结果只是 `needs-review` 时保持零退出码，只有 `ok=false` 或 blocker diagnostics 才返回非零 exit code。

### `mycodemap check`

执行 design contract contract gate，默认输出机器可读 JSON。

```bash
# 默认 full scan
mycodemap check --contract mycodemap.design.md --against src

# GitHub PR annotations
mycodemap check --contract mycodemap.design.md --against src --base origin/main --annotation-format github

# GitLab code quality artifact
mycodemap check --contract mycodemap.design.md --against src --base origin/main --annotation-format gitlab --annotation-file gl-code-quality-report.json

# 校准当前仓库是否允许默认 hard gate
node scripts/calibrate-contract-gate.mjs --max-changed-files 10 --max-false-positive-rate 0.10
```

> PR 默认 hard gate 只在 calibration 通过且 `changed files <= 10` 时开启；超窗、`diff-scope-fallback` 或 `false-positive rate >10%` 时必须显式切回 `warn-only / fallback`。

### `mycodemap history`

符号级 Git history / risk 查询：

```bash
# 默认输出 machine-first JSON
mycodemap history --symbol createCheckCommand

# 查询某个符号的历史轨迹与风险摘要
mycodemap history --symbol createCheckCommand

# 人类可读摘要
mycodemap history --symbol createCheckCommand --human
```

### `mycodemap analyze`

统一分析入口，当前公共契约只暴露四个 intent，并统一返回结构化输出：

> 当前 public analyze contract 为 `find` / `read` / `link` / `show`；兼容期内 legacy intent 会在输出中通过 `warnings[]` 提示迁移，其中 `refactor` 已不再接受。

<!-- BEGIN GENERATED: analyze-readme-examples -->
```bash
# 查找符号 / 文本
mycodemap analyze -i find -k SourceLocation
mycodemap analyze -i find -t src/orchestrator -k IntentRouter --json

# 阅读文件（影响 + 复杂度聚合）
mycodemap analyze -i read -t src/cli/index.ts
mycodemap analyze -i read -t src/cli/index.ts --scope transitive
mycodemap analyze -i read -t src/cli/index.ts --include-tests --json

# 关联关系（依赖 + 引用聚合）
mycodemap analyze -i link -t src/cli/index.ts
mycodemap analyze -i link -t src/interface/types.ts --json

# 展示模块概览 / 文档
mycodemap analyze -i show -t src/orchestrator
mycodemap analyze -i show -t src/domain/services --output-mode human

# 机器可读输出（JSON / structured）
mycodemap analyze -i read -t src/index.ts --json
mycodemap analyze -i link -t src/index.ts --structured --json
```
<!-- END GENERATED: analyze-readme-examples -->

<!-- BEGIN GENERATED: analyze-readme-options -->
| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-i, --intent <type>` | 分析类型：`find`/`read`/`link`/`show`（必填） | - |
| `-t, --targets <paths...>` | 目标路径（`read`/`link`/`show` 必填，`find` 可选） | - |
| `-k, --keywords <words...>` | 搜索关键词（主要用于 `find`） | - |
| `-s, --scope <scope>` | 范围：`direct`（直接）/`transitive`（传递） | `direct` |
| `-n, --topK <number>` | 返回结果数量 | `8` |
| `--include-tests` | 包含测试文件关联 | - |
| `--include-git-history` | 包含 Git 历史分析 | - |
| `--json` | JSON 格式输出 | - |
| `--structured` | 纯结构化输出（移除自然语言字段，配合 `--json` 使用） | - |
| `--output-mode <mode>` | 输出模式：`machine`/`human` | `human` |
<!-- END GENERATED: analyze-readme-options -->

> 产品目标是机器可读优先；当前实现仍以显式 `--json` / `--output-mode` 作为主要入口。
>
> legacy 兼容映射：`search → find`、`impact/complexity → read`、`dependency/reference → link`、`overview/documentation → show`；`refactor` 会返回 `E0001_INVALID_INTENT`。
>
> `--include-git-history` 现在只会在 `read` intent 上附加统一的 Git history enrichment；其他 intent 会显式给出 warning，而不是 silent noop。


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
# `ci check-docs-sync` 会额外校验 analyze generated block
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
### `mycodemap ci`

CI Gateway - 代码质量门禁工具：

```bash
# 验证工作区是否干净（ship 的发布前检查也复用这条规则）
mycodemap ci check-working-tree

# 验证当前分支是否允许执行发布前检查
mycodemap ci check-branch
mycodemap ci check-branch --allow main,release/*

# 运行发布前脚本集合（docs/typecheck/lint/test/build/pack）
mycodemap ci check-scripts

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

# 验证文档同步（含 analyze generated block 校验）
mycodemap ci check-docs-sync

# 验证输出契约
mycodemap ci check-output-contract

# 检查提交文件数量（限制 10 个文件）
mycodemap ci check-commit-size
mycodemap ci check-commit-size -m 15
```

> `mycodemap ship` 的 CHECK 阶段现在复用 `ci check-working-tree`、`ci check-branch`、`ci check-scripts` 作为 must-pass 事实源，而不是重复实现这些检查。
> `mycodemap ci check-headers -d <dir>` 与 `generate` / `analyze` 共享同一套 `.gitignore` 感知排除模块；若仓库没有 `.gitignore`，则回退到默认 `exclude` 列表。

支持的提交 TAG 类型：`[REFACTOR]`, `[TEST]`, `[DOCS]`, `[FEAT]`, `[FIX]`, `[CHORE]`, `[PERF]`, `[SECURITY]`, `[BREAKING]`, `[HOTFIX]`, `[MIGRATION]`, `[WIP]`
