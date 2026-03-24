# CodeMap MVP3 架构重构技术需求文档（Tech-PRD，v1.3 同步版）

> **版本**: v1.3-sync  
> **状态**: Shipped baseline / technical sync  
> **日期**: 2026-03-25  
> **负责人**: Architecture Team

---

## 1. 文档作用

本文档描述当前仓库在 `v1.3` 收口后的**技术基线**，而不是继续把早期草案中的未交付方案写成当前现实。

---

## 2. 当前目录结构

```text
src/
├── interface/
│   ├── types/
│   └── config/
│
├── infrastructure/
│   ├── storage/
│   │   ├── adapters/
│   │   │   ├── FileSystemStorage.ts
│   │   │   ├── KuzuDBStorage.ts
│   │   │   └── MemoryStorage.ts
│   │   ├── interfaces/StorageBase.ts
│   │   ├── StorageFactory.ts
│   │   ├── graph-helpers.ts
│   │   └── index.ts
│   │
│   ├── parser/
│   │   ├── implementations/
│   │   │   ├── TypeScriptParser.ts
│   │   │   ├── GoParser.ts
│   │   │   └── PythonParser.ts
│   │   ├── interfaces/ParserBase.ts
│   │   ├── registry/ParserRegistry.ts
│   │   └── index.ts
│   │
│   └── repositories/
│
├── domain/
│   ├── entities/
│   ├── services/
│   └── repositories/
│
├── server/
│   ├── CodeMapServer.ts
│   ├── handlers/
│   ├── routes/
│   ├── types/
│   └── index.ts
│
└── cli/
    ├── commands/
    ├── utils/
    ├── runtime-logger.ts
    └── index.ts
```

### 2.1 关键说明

- `server/` 当前不是 `usecases/` + `dto/` 的独立应用层树，而是内部 transport / handler 组织
- `cli/` 当前没有公开 `viz` / `tui` 子系统
- `infrastructure/parser/` 当前只有 3 个 shipped parser 实现

---

## 3. 分层职责

| 层级 | 主要职责 | 当前约束 |
|------|----------|----------|
| CLI | 公共命令面、参数解析、输出编排 | 不重新公开 `server` / `watch` / `report` / `logs` |
| Server | 内部 HTTP transport / handler / route | internal-only，不等于公共产品面 |
| Domain | 业务实体、领域服务、仓储接口 | 不依赖 CLI |
| Infrastructure | storage、parser、repository 等技术实现 | 通过 interface/types 契约对齐 |
| Interface | 类型定义与配置契约 | 不承载运行时副作用 |

---

## 4. 存储契约与当前实现

### 4.1 当前类型契约

```typescript
export type StorageType = 'filesystem' | 'kuzudb' | 'memory';

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

### 4.2 当前实现矩阵

| 类型 | 实现 | 当前状态 |
|------|------|----------|
| `filesystem` | `FileSystemStorage` | shipped |
| `memory` | `MemoryStorage` | shipped |
| `kuzudb` | `KuzuDBStorage` | shipped |
| `auto` | `StorageFactory.determineStorageType()` | shipped surface，但当前保守返回 `filesystem` |

### 4.3 已移除的正式产品面

`neo4j` 已不再是正式支持 backend。

当前技术语义：

- 旧配置若出现 `neo4j`，`StorageFactory` 会抛出 `UNSUPPORTED_STORAGE_TYPE`
- 文档和实现都不再承诺 Neo4j runtime surface

### 4.4 `auto` 的真实状态

`autoThresholds` 仍保留在契约里，但当前 `StorageFactory` 的保守行为是：

```typescript
const thresholds = config.autoThresholds ?? {
  useGraphDBWhenFileCount: 1000,
  useGraphDBWhenNodeCount: 10000,
};

return 'filesystem';
```

因此：

- `auto` 是稳定配置面
- 但“按规模自动切到图数据库”的更强启发式仍是未来候选，而不是当前完成能力

---

## 5. Parser 契约与当前实现

### 5.1 接口层现状

`LanguageId` 联合类型仍保留未来扩展位，但**当前 shipped parser 实现并不等于联合类型的全部成员**。

### 5.2 当前默认注册

```typescript
export function createDefaultParserRegistry(): ParserRegistry {
  const registry = new ParserRegistry();
  registry.register(new TypeScriptParser());
  registry.register(new GoParser());
  registry.register(new PythonParser());
  return registry;
}
```

### 5.3 当前 shipped parser

| 实现 | 覆盖范围 |
|------|----------|
| `TypeScriptParser` | `ts` / `tsx` / `js` / `jsx` / `mjs` / `cjs` |
| `GoParser` | `go` |
| `PythonParser` | `py` |

### 5.4 Deferred

以下语言仍属于未来扩展空间，而非当前 shipped reality：

- Java
- Rust
- C/C++
- C#
- Ruby
- PHP
- Swift
- Kotlin
- Dart
- Perl

---

## 6. Server Layer 当前实现

### 6.1 当前结构

Server Layer 当前围绕以下组件组织：

- `CodeMapServer`
- `QueryHandler`
- `AnalysisHandler`
- `createApiRoutes`
- `server/types/*`

### 6.2 当前能力边界

当前 `Server Layer` 的真实状态不是“完整公共 API 产品面”，而是：

| 类别 | 当前状态 |
|------|----------|
| query / search / detail / callers / callees 等查询路由 | 已保留 |
| validate / export | 已保留 |
| analyze / refresh / incremental update 作为公共能力 | 明确返回 `501` unsupported |

### 6.3 关键原则

- `Server Layer` 仍是内部架构层
- 公共 CLI 的 `server` 命令已移除
- 文档不能把 `src/server/` 的存在误写成“公共 HTTP API 已开放”

---

## 7. Public CLI 与 workflow 当前基线

### 7.1 公共命令面

```text
init / generate / query / deps / cycles / complexity / impact
analyze / ci / workflow / export / ship
```

### 7.2 已移除命令

以下命令已从 public CLI 移除，并保留迁移提示：

- `server`
- `watch`
- `report`
- `logs`

### 7.3 `workflow` 的当前边界

`workflow` 当前是 analysis-only 能力：

```text
find → read → link → show
```

它不再承担：

- 代码实现 phase 编排
- commit / CI / release 流程编排
- 更通用的工程代理 orchestrator 产品面

---

## 8. 测试与验证基线

当前与架构边界直接相关的验证链路包括：

| 命令 | 目的 |
|------|------|
| `npm run docs:check` | 文档与 AI 文档护栏 |
| `npm run typecheck` | TypeScript 契约验证 |
| `npm run lint` | 代码质量检查（当前允许 warning baseline） |
| `npm test` | 单元/集成测试 |
| `npm run build` | 构建验证 |
| `node dist/cli/index.js ci check-docs-sync` | docs guardrail + analyze docs sync |

`v1.3` 里程碑审计结果：

- requirements: `12/12`
- phases: `4/4`
- integration: `4/4`
- flows: `4/4`

---

## 9. 当前技术债与 Deferred

### 9.1 非阻断技术债

| 项目 | 当前状态 |
|------|----------|
| repo-wide ESLint warnings baseline | 仍存在，但不阻断当前里程碑 |

### 9.2 Deferred 技术项

| 项目 | 说明 |
|------|------|
| 更强的 auto storage heuristic | 当前仍保守返回 `filesystem` |
| 更多 parser 实现 | 接口预留，当前未交付 |
| 公共 HTTP API 产品化 | 当前不在范围内 |
| `viz` / `tui` / 更强交互可视化 | 当前不在公共 CLI 基线中 |
| Kùzu-native 深度查询优化 | 后续候选，不属于 `v1.3` 已交付事实 |

---

## 10. 迁移与兼容性结论

### 10.1 已稳定的迁移规则

- 配置文件主入口为 `mycodemap.config.json`
- 旧 `codemap.config.json` 仍可被识别，但应迁移到新名称
- 旧 `neo4j` 配置会收到显式迁移错误

### 10.2 当前不应再继续传播的旧说法

以下表述已不准确：

- “MVP3 当前已支持 14 种语言”
- “`viz` / `tui` 是当前 public CLI 的一部分”
- “`src/server/` 等同于公共 `mycodemap server` 产品面”
- “`auto` 已完成智能切换图存储”
- “Neo4j 仍是正式支持 backend”

---

## 11. 参考文档

- `docs/product-specs/MVP3-ARCHITECTURE-COMPARISON.md`
- `docs/product-specs/MVP3-ARCHITECTURE-REDESIGN-PRD.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/v1.3-MILESTONE-AUDIT.md`
