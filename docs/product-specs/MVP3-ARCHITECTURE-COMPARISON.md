# MVP3 架构对比：历史设计目标 vs v1.3 已落地基线

> **状态**: Synced with v1.3 shipped reality  
> **最后同步**: 2026-03-25  
> **适用范围**: 用于区分“历史设计目标”和“当前仓库已落地事实”

---

## 1. 阅读说明

本文档不再把早期 MVP3 设计稿里的所有目标都当成“当前已实现”。

- **Before**: 指 MVP3 重构前的 legacy 形态
- **After**: 指 `v1.3` 收口后的当前仓库基线
- **Deferred**: 指仍保留为未来候选、但尚未作为当前产品事实交付的能力

---

## 2. 总览对比

| 维度 | Before | After (`v1.3`) |
|------|--------|----------------|
| CLI | 多个命令直接碰核心实现 | 公共 CLI 收口为分析优先的命令面，命名边界清晰 |
| Server Layer | 设计概念模糊，易与公共 `server` 命令混淆 | `src/server/` 保留为**内部架构层**；公共 `server` 命令已移除 |
| Storage | 以文件输出为中心，图存储路径不稳定 | `filesystem` / `memory` / `sqlite` / `auto` 为正式 surface；`neo4j` 与 `kuzudb` 已退出正式支持 |
| Parser | 以 TypeScript 逻辑为主，扩展能力弱 | `ParserRegistry` + `TypeScript/JavaScript`、`Go`、`Python` 三类已落地实现 |
| Workflow | 设计上曾试图扩到更多工程阶段 | 当前公开能力仅保留 analysis-only：`find → read → link → show` |
| Docs / CI | 文档与实现容易漂移 | `docs:check` + `ci check-docs-sync` + CI gateway 固定当前契约 |

---

## 3. 架构总览对比

### Before（重构前）

```text
CLI commands
  ├─ 直接调用 analyzer / parser / generator
  ├─ 命令职责与业务逻辑混杂
  └─ 命名边界不稳定

core/*
  ├─ 分析、索引、依赖图构建耦合
  └─ 测试与替换实现成本高

parser/*
  ├─ 以 TypeScript 逻辑为中心
  └─ 新语言扩展成本高
```

### After（`v1.3` 当前基线）

```text
CLI Layer (`src/cli/`)
  ├─ 公共命令面：init / generate / query / deps / cycles
  ├─ analyze / ci / workflow / export / ship
  └─ public `server` / `watch` / `report` / `logs` 已移除

Server Layer (`src/server/`)
  ├─ `CodeMapServer.ts`
  ├─ `handlers/QueryHandler.ts`
  ├─ `handlers/AnalysisHandler.ts`
  ├─ `routes/api.ts`
  └─ internal-only transport / handler boundary

Domain Layer (`src/domain/`)
  ├─ 实体、仓储接口、领域服务
  └─ 面向业务模型，不直接暴露 CLI 细节

Infrastructure Layer (`src/infrastructure/`)
  ├─ storage: FileSystem / SQLite / Memory
  ├─ parser: TypeScript(JS) / Go / Python
  └─ repositories / shared graph helpers

Interface Layer (`src/interface/`)
  ├─ 类型定义
  └─ 配置与接口契约
```

### 当前架构要点

- `Server Layer` 是内部架构层，不等于公共 `mycodemap server`
- 图存储正式产品面已收敛为 `filesystem` / `sqlite` / `memory` / `auto`；旧 `neo4j` / `kuzudb` 配置只保留迁移诊断
- `workflow` 是公开能力，但仅编排分析阶段，不再混入实现/提交/CI 阶段

---

## 4. 存储层对比

### Before：以文件输出为主

```typescript
await fs.writeFile(path.join(outputDir, 'codemap.json'), json);
await fs.writeFile(path.join(outputDir, 'AI_MAP.md'), markdown);
```

特点：

- 文件输出是唯一稳定路径
- 查询能力依赖重新读取本地文件
- 图存储能力即使存在，也没有稳定产品面

### After：存储契约已稳定，但产品面已收敛

```typescript
export type StorageType = 'filesystem' | 'sqlite' | 'memory';

export interface StorageConfig {
  type: StorageType | 'auto';
  outputPath?: string;
  databasePath?: string;
  autoThresholds?: {
    useGraphDBWhenFileCount: number;
    useGraphDBWhenNodeCount: number;
  };
}
```

当前事实：

- **正式支持**：`filesystem`、`memory`、`sqlite`、`auto`
- **不再正式支持**：`neo4j`、`kuzudb`
- **迁移语义**：旧 `neo4j` / `kuzudb` 配置会返回显式错误，不会静默 fallback
- **`auto` 现状**：配置面存在，当前优先选择 `sqlite`；仅当 SQLite 运行时不可用时 warning 后回退 `filesystem`
- **SQLite runtime**：显式 `sqlite` 需要 `better-sqlite3` + Node.js `>=20`；否则返回 `SQLITE_NOT_AVAILABLE`

---

## 5. 语言支持对比

### Before：TypeScript 中心化实现

- 解析路径主要围绕 TypeScript/JavaScript 展开
- Go 能力存在，但注册与扩展策略不统一
- Python/更多语言更多停留在设计愿景

### After：可扩展契约已建立，当前落地 3 类实现

```typescript
export function createDefaultParserRegistry(): ParserRegistry {
  const registry = new ParserRegistry();
  registry.register(new TypeScriptParser()); // ts/tsx/js/jsx/mjs/cjs
  registry.register(new GoParser());         // go
  registry.register(new PythonParser());     // py
  return registry;
}
```

当前事实：

- **当前已落地实现**：TypeScript/JavaScript、Go、Python
- **接口仍预留未来语言 ID**：Java、Rust、C/C++ 等仍属于未来扩展空间
- **当前文档不再把“14 种语言”描述为已交付事实**

---

## 6. CLI 对比

### Before：命令面宽、边界混

```bash
mycodemap generate
mycodemap query
mycodemap deps
```

问题：

- CLI 直接携带业务逻辑
- 命令与内部能力命名边界不稳定
- 容易把工具误解成 watcher / report / server 工具箱

### After：分析优先的公共 CLI

```bash
mycodemap generate
mycodemap analyze find --keywords storage
mycodemap workflow start "trace auth dependency"
mycodemap export json
mycodemap ci check-docs-sync
```

当前事实：

- `workflow` 是**analysis-only** 工作流能力，只保留 `find → read → link → show`
- `server`、`watch`、`report`、`logs` 已从 public CLI 移除，并提供迁移提示
- 文档不再把 `viz`、`tui` 等未落地命令写成当前产品事实

---

## 7. 测试与验证对比

### Before

- 很多能力只能通过端到端地操作真实文件验证
- 文档与实现边界更容易漂移

### After

- `StorageFactory`、parser、plugin loader、server handlers/routes 都有定点测试
- `docs:check` 与 `ci check-docs-sync` 进入 must-pass / CI 路径
- `v1.3` 里程碑审计确认：`12/12` requirements、`4/4` phases、`4/4` integration、`4/4` flows

---

## 8. 当前未交付 / Deferred

以下能力属于历史设计目标或未来候选，不应再被理解为当前产品事实：

| 能力 | 当前状态 |
|------|----------|
| `neo4j` 正式支持 | 已移除出正式产品面 |
| 更丰富的自动后端切换启发式 | 仍 deferred；`auto` 当前优先选择 `sqlite`，仅在 SQLite 不可用时回退 `filesystem` |
| Java / Rust / C/C++ 等更多 parser 实现 | 接口预留，未作为当前 shipped reality |
| `viz` / `tui` / CLI 可视化套件 | 未作为当前 public CLI 基线交付 |
| 公共 HTTP API / `mycodemap server` 产品面 | 未开放；`Server Layer` 仍是 internal-only |

---

## 9. 总结

`MVP3` 的核心价值已经从“理想化设计图”收口成了当前可验证的产品基线：

- 5 层架构已在目录结构与职责边界上落地
- 存储面已稳定为 `filesystem` / `sqlite` / `memory` / `auto` 四态 surface
- 解析器已具备可扩展注册机制，并落地 3 类实现
- 公共 CLI 已回到分析优先的可维护命令面
- 文档、测试与 CI 已能共同约束这些边界

后续若要重新打开更多语言、公共 API、可视化或更激进的自动切换逻辑，应以**新 milestone** 的形式推进，而不是继续把设计愿景伪装成当前现实。
