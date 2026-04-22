# ARCHITECTURE.md - CodeMap 系统总图

> 本文档只回答三个问题：系统是什么、主要模块如何协作、详细信息去哪里找。
> 详细设计、规则与计划不在这里展开，统一下沉到 `docs/`。

## 1. 系统定位

CodeMap 是一个面向 TypeScript / JavaScript / Go 项目的 AI-first 代码地图工具，目标是为 AI/Agent 提供结构化、可预测、可机器消费的代码上下文。当前仓库仍处于 brownfield 过渡期：legacy CLI / workflow / release surfaces 与 MVP3 分层架构并存。

- 作为 CLI：以代码地图生成、查询、依赖/影响/复杂度分析、导出、CI 护栏为主要产品面。
- 作为库：通过 `dist/index.js` 暴露分析、解析与生成能力。
- 当前公共 CLI 聚焦核心分析命令、`workflow`、`export` 与 `ship`；`server`、`watch`、`report`、`logs` 已从 public CLI 移除，但相关实现仍留在仓库中。

当前运行时与构建事实：

- 语言与模块：TypeScript + JavaScript + Go
- 编译输出：`dist/`
- CLI 入口：`dist/cli/index.js`
- 目标环境：Node.js >= 18
- 命名边界：`Server Layer` 是内部架构层，不等于公共 `mycodemap server` 命令。

## 2. 分层原则

### 2.1 MVP3 分层架构（2026-03 重构）

CodeMap 已完成 MVP3 架构重构，采用清晰的分层设计：

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Layer                            │
│  命令行接口，注册命令、参数解析、用户交互                      │
├─────────────────────────────────────────────────────────────┤
│                      Server Layer                           │
│  HTTP API 服务器，RESTful 端点，Handler 处理                  │
├─────────────────────────────────────────────────────────────┤
│                       Domain Layer                          │
│  核心业务逻辑，领域实体 (Project/Module/Symbol/Dependency)    │
│  领域服务 (CodeGraphBuilder)，领域事件                        │
├─────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                      │
│  技术实现细节：                                              │
│  ├── Storage (FileSystem/Memory/KùzuDB/Neo4j)              │
│  ├── Parser (TypeScript/Go/Python + Registry)              │
│  └── Repository (CodeGraphRepositoryImpl)                  │
├─────────────────────────────────────────────────────────────┤
│                     Interface Layer                         │
│  类型定义与契约，跨层共享的接口                               │
└─────────────────────────────────────────────────────────────┘
```

**分层依赖规则**（严格自上而下）：
- CLI → Server → Domain → Infrastructure → Interface
- 禁止跨层依赖（如 Domain 层不得导入 CLI 模块）
- 同层内可以相互依赖

**命名边界提醒：**
- `Server Layer` 是内部架构层，不等于公共 `mycodemap server` 命令。
- 本文件描述的是分层事实，不为某个公开 CLI 命令是否保留背书。

### 2.2 原有分层（逐步迁移中）

- 入口层只负责接收用户意图与参数，不承载深层分析逻辑。
- 编排层负责多工具路由、结果融合、CI 护栏与工作流协同。
- 分析层负责文件发现、解析、全局索引、依赖图与项目摘要。
- 生成层负责把分析结果转成 AI 可消费的文档与 JSON。
- 支撑层负责缓存、文件监听、工作线程、插件扩展与共享类型。

## 3. 顶层架构

```text
User / CI / Agent
        │
        ▼
src/cli/index.ts
  ├─ commands/*        命令入口与参数解析
  ├─ runtime-logger    运行日志
  ├─ platform-check    平台校验
  └─ tree-sitter-check 特定命令前置检查
        │
        ├──────────────► src/orchestrator/*
        │                 多工具编排 / CI 护栏 / 工作流
        │
        └──────────────► src/core/* + src/parser/*
                          文件发现 / 解析 / 全局索引 / 依赖图
                                   │
                                   ▼
                       src/generator/* + src/plugins/*
                          输出生成 / 扩展分析
                                   │
                     ┌─────────────┴─────────────┐
                     ▼                           ▼
              .mycodemap/*                CLI 屏幕输出 / 导出产物
```

## 4. 顶层模块职责

### 4.1 MVP3 新架构模块

| 模块 | 层级 | 主要职责 | 关键入口 |
|------|------|----------|----------|
| `src/interface` | Interface | 类型定义中心，存储/解析器/配置契约 | `src/interface/types/`, `src/interface/config/` |
| `src/infrastructure/storage` | Infrastructure | 存储适配器：FileSystem, Memory, KùzuDB, Neo4j | `src/infrastructure/storage/index.ts` |
| `src/infrastructure/parser` | Infrastructure | 多语言解析器：TypeScript, Go, Python | `src/infrastructure/parser/index.ts` |
| `src/infrastructure/repositories` | Infrastructure | 仓库实现，连接 Domain 与 Infrastructure | `src/infrastructure/repositories/index.ts` |
| `src/domain/entities` | Domain | 领域实体：Project, Module, Symbol, Dependency | `src/domain/entities/` |
| `src/domain/services` | Domain | 领域服务：CodeGraphBuilder | `src/domain/services/` |
| `src/domain/repositories` | Domain | 仓库接口定义 | `src/domain/repositories/` |
| `src/server` | Server | 内部 Server Layer / HTTP transport | `src/server/CodeMapServer.ts` |
| `src/cli-new` | CLI | 过渡 CLI surface（含 server/export/query） | `src/cli-new/index.ts` |

### 4.2 原有模块（逐步迁移中）

| 模块 | 主要职责 | 关键入口 |
|------|----------|----------|
| `src/cli` | 注册命令、参数解析、首次运行引导、日志与平台检查 | `src/cli/index.ts` |
| `src/orchestrator` | analyze 统一入口、多工具适配、置信度、结果融合、CI/工作流 | `src/orchestrator/index.ts` |
| `src/core` | 主分析流程、文件发现、依赖图、摘要、全局索引 | `src/core/analyzer.ts` |
| `src/parser` | `fast` / `smart` / `hybrid` 解析与符号抽取 | `src/parser/index.ts` |
| `src/generator` | 生成 `AI_MAP.md`、`CONTEXT.md`、JSON、依赖图等输出 | `src/generator/index.ts` |
| `src/plugins` | 内置/扩展分析能力，如复杂度与调用图 | `src/plugins/index.ts` |
| `src/cache` | LRU、文件哈希与解析缓存 | `src/cache/index.ts` |
| `src/watcher` | watch 模式、守护进程、增量更新 | `src/watcher/file-watcher.ts` |
| `src/worker` | 并行解析与工作线程封装 | `src/worker/index.ts` |
| `src/types` | 跨层共享类型与输出契约 | `src/types/index.ts` |

## 5. 核心执行流

### 5.1 生成 / 分析流

1. CLI 接收命令并完成平台与运行前检查。
2. `src/core/analyzer.ts` 发现待分析文件。
3. 根据模式选择解析器：`fast` / `smart` / `hybrid`。
4. `smart` 模式下额外构建全局符号索引与跨文件调用信息。
5. 生成依赖图、项目摘要与模块信息。
6. `src/generator/*` 输出 AI 地图、上下文、JSON 与报告。

### 5.2 查询流

1. CLI 命令层接收 `query` / `deps` / `impact` / `complexity` / `cycles` / `export`。
2. 命令层读取 CodeMap 输出或直接分析源码。
3. 返回结构化结果给用户、脚本或上层 agent。

### 5.3 编排与 CI 流

1. `analyze` 命令进入 `src/orchestrator/*`。
2. 编排层根据意图选择工具、计算置信度并融合结果。
3. CI 子命令执行提交格式、文件头、风险评估、输出契约检查。
4. 工作流模块管理阶段、检查点与持久化状态。

## 6. 当前关键约束

- CLI 与库发布统一基于 `dist/`，不要把 `build/` 当作当前事实。
- 代码采用 ESM、严格模式、ES2022。
- `hybrid` 模式会根据文件规模在 `fast` 与 `smart` 之间切换。
- `smart` 解析失败时，分析器会回退到基础解析路径，而不是整体中断。
- 部分 CLI 命令在执行前需要通过 tree-sitter 可用性检查。
- `src/cli/index.ts` 是高影响入口，修改它会放大到多数命令与模块。

## 7. 文档信息架构

- `AGENTS.md`：仓库级执行协议与证据规范。
- `CLAUDE.md`：Claude / Codex 入口路由。
- `ARCHITECTURE.md`：本文件，系统地图与模块边界。
- `docs/rules/`：开发、测试、验证、发布规则。
- `docs/design-docs/`：设计意图、权衡、验证状态。
- `docs/exec-plans/`：执行计划、复盘、技术债。
- `docs/generated/`：生成物说明与归档规范。
- `docs/product-specs/`：产品规格与验收边界。
- `docs/references/`：外部参考与工具链资料。

## 8. 迁移说明

- 主要设计文档现已迁入 `docs/design-docs/`，如 `docs/design-docs/REFACTOR_ARCHITECTURE_OVERVIEW.md`、`docs/design-docs/REFACTOR_ORCHESTRATOR_DESIGN.md`、`docs/design-docs/CI_GATEWAY_DESIGN.md`。
- 计划文档现已迁入 `docs/exec-plans/`；`docs/archive/` 仍保留历史归档内容。
- 查“细节设计”优先看 `docs/design-docs/`，查“需求边界”看 `docs/product-specs/`，查“新信息架构边界”看各目录 `README.md`。
- 新增文档优先落到新目录，不再继续把新知识堆到 `docs/` 根层。
