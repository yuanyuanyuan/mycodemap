# CodeMap

> TypeScript 代码地图工具 - 为 AI 辅助开发提供结构化上下文

CodeMap 是一个专为 TypeScript/JavaScript 项目设计的代码分析工具。它通过静态分析自动生成项目的结构化代码地图，帮助 AI 编程助手（如 Claude、Copilot）快速理解项目架构、模块关系和代码上下文。

## 特性

- **双层解析模式** - 提供 `fast`（快速正则）和 `smart`（TypeScript AST）两种解析模式，按需平衡速度与精度
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

| 文档 | 目标读者 | 内容 |
|------|----------|------|
| [🧭 文档索引](docs/README.md) | 所有读者 | 文档分层、阅读顺序与迁移状态 |
| [🏗️ 架构总图](ARCHITECTURE.md) | 开发者 / AI | 系统地图、模块边界、主执行流 |
| [📖 安装配置指南](docs/SETUP_GUIDE.md) | 人类开发者 | 完整的安装、配置和使用指南 |
| [🤖 AI 助手集成指南](docs/AI_ASSISTANT_SETUP.md) | AI 用户 | Kimi/Claude/Codex/Copilot 配置指引 |
| [📁 配置示例](examples/) | 所有用户 | 各平台的现成配置文件 |

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
| `-l, --limit <number>` | 限制结果数量 | `20` |
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

## 项目架构

```
src/
  ├── cli/              # CLI 命令入口
  │   ├── index.ts      # Commander 命令注册
  │   └── commands/     # 各子命令实现
  │       ├── analyze.ts    # 统一分析入口（支持多意图路由）
  │       ├── impact.ts     # 影响范围分析
  │       ├── deps.ts       # 依赖分析
  │       ├── complexity.ts # 复杂度分析
  │       ├── workflow.ts   # 工作流编排命令
  │       └── ci.ts        # CI 门禁命令
  ├── core/             # 核心分析引擎
  │   └── analyzer.ts   # 主分析器
  ├── parser/           # 解析器层
  │   ├── interfaces/   # 解析器接口定义 (IParser)
  │   └── implementations/
  │       ├── fast-parser.ts   # 快速正则解析器
  │       └── smart-parser.ts  # TypeScript AST 解析器
  ├── orchestrator/     # 编排层（v2.5 新增）
  │   ├── index.ts              # 统一导出
  │   ├── types.ts              # UnifiedResult 类型定义
  │   ├── confidence.ts         # 置信度计算
  │   ├── result-fusion.ts      # 结果融合
  │   ├── tool-orchestrator.ts  # 工具编排器
  │   ├── intent-router.ts     # 意图路由
  │   ├── test-linker.ts       # 测试关联器
  │   ├── git-analyzer.ts      # Git 分析器
  │   ├── ai-feed-generator.ts # AI 饲料生成器
  │   ├── file-header-scanner.ts   # 文件头扫描器
  │   ├── commit-validator.ts      # 提交验证器
  │   ├── adapters/                 # 工具适配器
  │   │   ├── base-adapter.ts      # 适配器基类
  │   │   ├── codemap-adapter.ts  # CodeMap 适配器
  │   │   └── ast-grep-adapter.ts # AstGrep 适配器
  │   └── workflow/               # 工作流模块
  │       ├── workflow-orchestrator.ts  # 工作流编排器
  │       ├── workflow-persistence.ts    # 工作流持久化
  │       ├── phase-checkpoint.ts       # 阶段检查点
  │       └── config.ts                 # 工作流配置
  ├── generator/        # 输出生成器
  │   ├── index.ts      # AI_MAP / JSON / Mermaid 生成
  │   └── context.ts    # CONTEXT.md 生成
  ├── cache/            # 缓存系统
  │   ├── lru-cache.ts  # LRU 缓存实现
  │   ├── parse-cache.ts    # 解析结果缓存
  │   └── file-hash-cache.ts # 文件哈希缓存
  ├── watcher/          # 文件监听
  │   ├── file-watcher.ts # 文件变更监听
  │   ├── daemon.ts     # 守护进程管理
  │   └── watch-worker.ts # 监听工作线程
  ├── plugins/          # 插件系统
  │   ├── types.ts      # 插件接口定义
  │   ├── plugin-registry.ts # 插件注册中心
  │   ├── plugin-loader.ts   # 插件加载器
  │   └── built-in/     # 内置插件
  │       ├── complexity-analyzer.ts # 复杂度分析
  │       └── call-graph.ts          # 调用图分析
  └── types/            # 类型定义
      └── index.ts      # 核心类型
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

统一分析入口，支持多意图路由：

```bash
mycodemap analyze "分析 tool-orchestrator 的影响范围"
mycodemap analyze --intent impact --file src/cli/index.ts
mycodemap analyze --intent dependency --file src/cli/index.ts
mycodemap analyze --intent search "UnifiedResult"
```

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
