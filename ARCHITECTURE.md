# ARCHITECTURE.md - CodeMap 系统总图

> 本文档只回答四个问题：系统是什么、哪些是公共产品面、主要模块如何协作、详细规则去哪里找。
> 详细设计、测试规则、执行计划与历史档案统一下沉到 `docs/`。

## 1. 系统定位

CodeMap 是一个面向 TypeScript / JavaScript / Go 项目的 AI-first 代码地图与架构契约治理工具。当前仓库不是单纯的“代码搜索 CLI”，而是两条产品面并行：

| 产品面 | 目标 | 公开入口 |
|--------|------|----------|
| Code Map | 生成、查询、分析结构化代码上下文 | `generate` / `query` / `deps` / `cycles` / `complexity` / `impact` / `analyze` / `export` |
| Governance | 把 design contract 变成 CI 可执行的治理规则 | `design` / `check` / `history` / `ci` |

- 作为 CLI：当前公共命令面定义在 `src/cli/index.ts`，由 `dist/cli/index.js` 发布。  
- 作为库：包导出在 `dist/index.js`。  
- 作为内部运行时：仍保留 `Server Layer`、legacy core/parser/generator/orchestrator 与实验性 scaffold，但这些不等于重新开放公共 HTTP 产品面。  

## 2. 当前运行时事实

| 维度 | 当前事实 |
|------|----------|
| 包名 | `@mycodemap/mycodemap` |
| 发布版本 | `0.5.0` |
| CLI bin | `mycodemap` / `codemap` → `dist/cli/index.js` |
| Node 要求 | `>=20.0.0` |
| 编译输出 | `dist/` |
| 默认存储 | `filesystem` |
| 正式存储后端 | `filesystem` / `sqlite` / `memory` / `auto` |

**命名边界提醒：**
- `Server Layer` 是内部架构层，不等于公共 `mycodemap server` 命令。
- `server`、`watch`、`report`、`logs` 已从 public CLI 移除，调用时只返回迁移提示。
- `neo4j` 与 `kuzudb` 已不是正式支持的存储后端；旧配置会返回显式迁移错误。

## 3. 分层原则

### 3.1 MVP3 主分层

CodeMap 的稳定分层仍是：

```text
CLI → Server → Domain → Infrastructure → Interface
```

| 层级 | 路径 | 主要职责 |
|------|------|----------|
| CLI | `src/cli/` | 注册公共命令、参数解析、运行前检查、输出渲染 |
| Server | `src/server/` | 内部 HTTP transport、handlers、routes |
| Domain | `src/domain/` | 领域实体、服务、事件、仓库接口 |
| Infrastructure | `src/infrastructure/` | SQLite / filesystem / memory 存储、解析器、仓库实现 |
| Interface | `src/interface/` | 跨层共享类型、配置与输出契约 |

**依赖规则：**
- 只允许自上而下依赖。
- Domain 不得导入 CLI。
- Interface 负责 shared contract；CLI、CI、history risk、contract check 共用同一套类型真相。

### 3.2 与 legacy 模块的关系

仓库仍处于 brownfield 过渡期，下列模块继续存在并参与运行时：

| 模块 | 状态 | 说明 |
|------|------|------|
| `src/core` | active legacy | 主分析流程、文件发现、依赖图 |
| `src/parser` | active legacy | `fast` / `smart` / `hybrid` 解析 |
| `src/generator` | active legacy | `AI_MAP.md` / `CONTEXT.md` / `codemap.json` 输出 |
| `src/orchestrator` | active legacy | `analyze` 编排、history risk、CI / workflow 服务 |
| `src/plugins` | active | 插件 runtime 与扩展分析 |
| `src/cli-new` | experimental scaffold | 试验性新 CLI 壳，不是当前 public CLI truth |

## 4. 顶层执行拓扑

```text
User / CI / Agent
        │
        ▼
src/cli/index.ts
  ├─ generate/query/deps/cycles/complexity/impact/analyze/export
  ├─ design/check/history/ci
  ├─ workflow/ship
  ├─ runtime-logger / platform-check / tree-sitter-check
  │
  ├──────────────► src/orchestrator/*
  │                 analyze 编排 / history risk / CI checks / workflow state
  │
  ├──────────────► src/core/* + src/parser/*
  │                 文件发现 / 解析 / 索引 / 依赖图
  │
  ├──────────────► src/infrastructure/storage/*
  │                 filesystem / sqlite / memory / auto
  │
  └──────────────► src/generator/* + src/plugins/*
                    AI 地图 / JSON / 导出 / pluginReport
```

## 5. 关键模块职责

### 5.1 当前 public CLI 相关模块

| 模块 | 关键文件 | 作用 |
|------|----------|------|
| `src/cli/index.ts` | `src/cli/index.ts` | 注册 public CLI 命令与 removed-command 提示 |
| `src/cli/commands/design.ts` | `validate` / `map` / `handoff` / `verify` | 设计契约输入面 |
| `src/cli/commands/check.ts` | `check --contract` | diff-aware contract gate、annotation 输出 |
| `src/cli/commands/history.ts` | `history --symbol` | 符号级 Git history / risk 查询 |
| `src/cli/commands/ci.ts` | `ci assess-risk` 等 | CI 护栏、docs sync、output contract |
| `src/cli/contract-gate-thresholds.ts` | hard-gate thresholds | shared hard-gate window、false-positive 阈值 |

### 5.2 共享契约与治理类型

| 路径 | 契约 | 用途 |
|------|------|------|
| `src/interface/types/design-check.ts` | `ContractCheckResult` / `ContractViolation` | `check` CLI、CI gate、annotation renderer 共用 |
| `src/interface/types/history-risk.ts` | `HistoryCommandResult` 相关底层类型 | `history` / `ci assess-risk` / risk enrichment 共用 |
| `src/cli/storage-runtime.ts` | configured storage loader | 让 CLI 命令统一遵守 `mycodemap.config.json.storage` |

### 5.3 存储与运行时

| 模块 | 当前事实 | 说明 |
|------|----------|------|
| `src/infrastructure/storage/StorageFactory.ts` | 正式后端只有 `filesystem` / `memory` / `sqlite` / `auto` | `auto` 优先 SQLite，不可用时回退 `filesystem` |
| `src/infrastructure/storage/adapters/SQLiteStorage.ts` | governance storage 主线 | 支撑治理查询与 history materialization |
| `src/server/CodeMapServer.ts` | 内部 Hono server | 保留内部 transport，不代表 public `server` 命令恢复 |

## 6. 核心执行流

### 6.1 Code Map 流

1. CLI 接收 `generate` / `query` / `deps` / `impact` / `analyze` 等命令。
2. `src/core/*` 和 `src/parser/*` 负责文件发现、AST/regex 解析、依赖图与摘要。
3. `src/generator/*` 生成 `AI_MAP.md`、`CONTEXT.md`、`codemap.json`、依赖图等产物。
4. 若显式配置 plugins，运行结果会进入 `pluginReport` 与 `Plugin Summary`。

### 6.2 Governance 流

1. 人类先编写 `mycodemap.design.md`。
2. `design validate → map → handoff → verify` 生成可执行 design truth。
3. `check --contract` 把 frontmatter rules 执行到代码上，默认输出 JSON。
4. `history --symbol` 与 `ci assess-risk` 通过统一 history risk service 提供时间维度风险。
5. `.github/workflows/ci-gateway.yml` 根据 calibration 结果与 diff window 决定 PR 是 hard-gate 还是 warn-only / fallback。

### 6.3 存储选择流

1. CLI 命令通过 `src/cli/storage-runtime.ts` 加载 `mycodemap.config.json`。
2. `StorageFactory` 根据 `storage.type` 创建后端。
3. 显式 `sqlite` 需要 `better-sqlite3` 和 Node.js `>=20`；否则返回显式错误。
4. `auto` 优先选择 SQLite，失败时 warning 后回退到 `filesystem`。

## 7. 当前关键约束

- 发布与运行统一基于 `dist/`，不要把 `build/` 当作真实输出目录。
- Node 版本下限是 `20`，这是 SQLite runtime 的硬条件之一。
- `check --contract` 默认输出 JSON；`--human` 与 `--annotation-format` 只改变渲染，不改变底层 truth。
- PR 默认 hard gate 只在 calibration 通过且 `changed files <= 10` 时启用；否则必须降级到 `warn-only / fallback`。
- `history` / `ci assess-risk` / `check` / `analyze --include-git-history` 共享同一套 history risk truth。

## 8. 文档信息架构

| 文档 | 作用 |
|------|------|
| `AGENTS.md` | 仓库级执行协议、证据规范、任务分级 |
| `CLAUDE.md` | Codex / Claude 最小执行手册 |
| `README.md` | 人类开发者主入口 |
| `AI_GUIDE.md` | AI 主指南 |
| `ARCHITECTURE.md` | 本文件，系统地图与模块边界 |
| `docs/rules/` | 开发、测试、验证、发布规则 |
| `docs/exec-plans/` | 计划、复盘、技术债、阶段 artifacts |

## 9. 到哪里看细节

| 需求 | 先看哪里 |
|------|----------|
| 命令参数与示例 | `docs/ai-guide/COMMANDS.md` |
| 输出 JSON 契约 | `docs/ai-guide/OUTPUT.md` |
| docs gate / CI gate | `docs/rules/validation.md` |
| product positioning / quick start | `README.md` |
| 设计计划与 milestone 真相 | `docs/exec-plans/` 与 `.planning/` |
