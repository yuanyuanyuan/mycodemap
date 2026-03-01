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
- **插件系统** - 可扩展的插件架构，支持自定义分析和输出

## 安装

```bash
# 使用 npm
npm install codemap

# 使用 yarn
yarn add codemap

# 使用 pnpm
pnpm add codemap

# 全局安装（推荐，可直接使用 CLI）
npm install -g codemap
```

**环境要求**: Node.js >= 18.0.0

## 快速开始

```bash
# 1. 在项目根目录初始化配置
codemap init

# 2. 生成代码地图
codemap generate

# 3. 查看生成的文件
ls .codemap/
# AI_MAP.md        - 项目全局概览（供 AI 使用）
# CONTEXT.md       - 上下文入口（跳转到 context/README.md）
# context/         - 各模块的详细上下文
# codemap.json     - 结构化 JSON 数据
# dependency-graph.md - Mermaid 依赖图
```

生成后，将 `.codemap/AI_MAP.md` 的内容提供给 AI 助手即可让其快速理解你的项目结构。

## CLI 命令

### `codemap init`

初始化项目的 CodeMap 配置文件。

```bash
codemap init          # 交互式创建配置
codemap init -y       # 使用默认配置直接创建
```

| 选项 | 说明 |
|------|------|
| `-y, --yes` | 跳过交互，使用默认配置 |

执行后会在项目根目录生成 `codemap.config.json` 配置文件。

### `codemap generate`

分析项目并生成代码地图文件。

```bash
codemap generate                    # 使用默认 hybrid 模式
codemap generate -m smart           # 使用 smart 模式（AST 深度分析）
codemap generate -o ./docs/codemap  # 指定输出目录
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-m, --mode <mode>` | 分析模式：`fast`（正则匹配）、`smart`（TypeScript AST）或 `hybrid`（自动选择） | `hybrid` |
| `-o, --output <dir>` | 输出目录 | `.codemap` |
| `--ai-context` | 为每个文件生成 AI 描述（需要配置 AI Provider） | - |

**模式说明：**

| 模式 | 速度 | 精度 | 适用场景 |
|------|------|------|----------|
| `fast` | 极快 | 基本结构 | 日常开发、大型项目快速预览 |
| `smart` | 较慢 | 完整语义 | 深度分析、复杂度评估、类型推导 |
| `hybrid` | 自动 | 自适应 | **推荐** - 文件数<50用fast，≥50用smart |

### `codemap watch`

监听文件变更并自动增量更新代码地图。

```bash
codemap watch                 # 前台运行
codemap watch -d              # 以后台守护进程运行
codemap watch -s              # 停止后台守护进程
codemap watch -t              # 查看守护进程状态
codemap watch -m smart        # 使用 smart 模式监听
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-m, --mode <mode>` | 分析模式 (fast/smart/hybrid) | `hybrid` |
| `-o, --output <dir>` | 输出目录 | `.codemap` |
| `-d, --detach` | 以后台守护进程方式运行 | - |
| `-s, --stop` | 停止后台守护进程 | - |
| `-t, --status` | 查看后台守护进程状态 | - |

### `codemap query`

查询代码地图中的符号、模块和依赖信息。

```bash
codemap query -s "ModuleInfo"        # 精确查询符号
codemap query -m "src/parser"        # 查询模块信息
codemap query -d "analyzer"          # 查询依赖关系
codemap query -S "cache"             # 模糊搜索
codemap query -S "parse" -j          # JSON 格式输出
codemap query -S "plugin" -l 5       # 限制结果数量
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-s, --symbol <name>` | 精确查询符号 | - |
| `-m, --module <path>` | 查询模块信息 | - |
| `-d, --deps <name>` | 查询依赖关系 | - |
| `-S, --search <word>` | 模糊搜索 | - |
| `-l, --limit <number>` | 限制结果数量 | `20` |
| `-j, --json` | 以 JSON 格式输出 | - |

### `codemap deps`

分析并输出模块的依赖关系树。

```bash
codemap deps                     # 查看所有模块的依赖统计
codemap deps -m "src/parser"    # 查看指定模块的依赖树
codemap deps -m "src/parser" -j # JSON 格式输出
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-m, --module <path>` | 查询指定模块的依赖 | - |
| `-j, --json` | 以 JSON 格式输出 | - |

### `codemap cycles`

检测项目中的循环依赖。

```bash
codemap cycles                  # 检测所有循环依赖
```

### `codemap complexity`

分析代码复杂度，输出圈复杂度、认知复杂度和可维护性指数。

```bash
codemap complexity              # 分析整个项目的复杂度
codemap complexity -f src/cli/index.ts  # 分析指定文件的复杂度
codemap complexity -j          # JSON 格式输出
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-f, --file <path>` | 查看指定文件的复杂度 | - |
| `-j, --json` | 以 JSON 格式输出 | - |

### `codemap impact`

评估指定文件或模块变更的影响范围。

```bash
codemap impact -f src/cli/index.ts         # 分析指定文件的变更影响
codemap impact -f src/cli/index.ts --transitive  # 包含传递依赖
codemap impact -f src/cli/index.ts -j     # JSON 格式输出
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-f, --file <path>` | **必填** 指定要分析的文件 | - |
| `-t, --transitive` | 包含传递依赖（间接影响） | - |
| `-j, --json` | 以 JSON 格式输出 | - |

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
  "output": ".codemap"
}
```

| 配置项 | 类型 | 说明 | 默认值 |
|--------|------|------|--------|
| `mode` | `"fast" \| "smart"` | 分析模式 | `"fast"` |
| `include` | `string[]` | 包含的文件 glob 模式 | `["src/**/*.ts"]` |
| `exclude` | `string[]` | 排除的文件 glob 模式 | `["node_modules/**", "dist/**", ...]` |
| `output` | `string` | 输出目录路径 | `".codemap"` |

## 输出文件说明

运行 `codemap generate` 后，会在输出目录（默认 `.codemap/`）中生成以下文件：

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
  ├── ai/               # AI 集成层
  │   ├── provider.ts   # AI Provider 抽象
  │   ├── claude.ts     # Claude 适配器
  │   └── codex.ts      # Codex 适配器
  └── types/            # 类型定义
      └── index.ts      # 核心类型
```

## 新增 CLI 命令

### `codemap analyze`

统一分析入口，支持多意图路由：

```bash
codemap analyze "分析 tool-orchestrator 的影响范围"
codemap analyze --intent impact --file src/cli/index.ts
codemap analyze --intent dependency --file src/cli/index.ts
codemap analyze --intent search "UnifiedResult"
```

### `codemap workflow`

工作流编排命令：

```bash
codemap workflow start              # 启动工作流
codemap workflow status             # 查看状态
codemap workflow proceed           # 推进下一阶段
codemap workflow resume            # 恢复工作流
codemap workflow checkpoint        # 创建检查点
codemap workflow list              # 列出所有工作流
codemap workflow delete            # 删除工作流
```

### `codemap ci`

CI 门禁命令：

```bash
codemap ci check-commits           # 检查提交格式
codemap ci check-headers           # 检查文件头注释
codemap ci assess-risk             # 评估变更风险
codemap ci check-output-contract   # 检查输出契约
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
npm test

# 类型检查
npm run typecheck

# 代码检查
npm run lint
```

### 提交规范

请遵循以下 commit message 格式：

```
<type>(<scope>): <subject>

feat:     新功能
fix:      Bug 修复
docs:     文档变更
refactor: 代码重构
test:     测试相关
chore:    构建/工具变更
```

### 开发注意事项

- 项目使用 ESM 模块格式（`"type": "module"`）
- TypeScript 严格模式
- 使用 Vitest 作为测试框架
- 新增功能请同步补充测试和文档

## 许可证

[MIT](LICENSE)
