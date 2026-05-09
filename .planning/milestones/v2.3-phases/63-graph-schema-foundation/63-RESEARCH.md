# Phase 63: Graph Schema Foundation - Research

**Researched:** 2026-05-08
**Domain:** SQLite graph persistence redesign for CodeMap
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Schema shape
- **D-01:** Phase 63 keeps `modules / symbols / dependencies` as the primary graph truth. It does not switch the core domain model to a unified `nodes / edges` primary schema.
- **D-02:** Graph optimization should happen inside the SQLite persistence shape through stronger traversal-oriented structure, indexes, adjacency-friendly storage, or derived/projection layers, as long as the primary domain truth remains `modules / symbols / dependencies`.

### Migration and cutover
- **D-03:** `generate` may rebuild the current repository graph truth directly into the new schema instead of preserving old SQLite graph data.
- **D-04:** Phase 63 does not require a historical graph-data migrator. The important guarantee is that rebuilds succeed cleanly and compatibility failures surface diagnosable evidence rather than silent partial truth.

### Edge confidence semantics
- **D-05:** `EXTRACTED` means the edge is directly proven by parser / AST evidence.
- **D-06:** `INFERRED` means the edge is produced from rules over imports, naming, file structure, or other existing graph heuristics rather than direct parser proof.
- **D-07:** `AMBIGUOUS` means the system sees multiple reasonable targets and cannot uniquely resolve the edge.

### Compatibility boundary
- **D-08:** Existing `generate` / `query` / `deps` / `analyze` success paths must continue to work against the new persisted truth without breaking their stable success envelope.
- **D-09:** Phase 63 should focus on internal truth and persisted semantics first; it should avoid unnecessary outward contract churn while enabling later phases to consume edge confidence directly.

### the agent's Discretion
- Exact SQLite table/index/projection design, as long as it preserves `modules / symbols / dependencies` as the primary truth and improves traversal-oriented behavior.
- Exact rebuild flow and compatibility diagnostics, as long as rebuild-first semantics stay clear and failures are explicit.
- Exact heuristics for producing `INFERRED` edges, as long as they remain distinguishable from `EXTRACTED` and `AMBIGUOUS`.

### Deferred Ideas (OUT OF SCOPE)
- Replacing the primary graph domain model with a unified `nodes / edges` abstraction belongs to a later milestone, if ever needed.
- Historical SQLite graph-data migration tooling is out of scope for Phase 63.
- Broader public output-contract expansion beyond compatibility-safe diagnostics belongs to later graph-capability phases once the new persisted truth is stable.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GRAPH-01 | 持久化到 graph-optimized SQLite schema，而不是继续依赖 governance 导向旧结构 | 推荐保留 `modules/symbols/dependencies` 主真相，新增 traversal projection / adjacency indexes，并把治理镜像降为兼容层 |
| GRAPH-02 | `generate` / `query` / `deps` / `analyze` 成功路径可读取新 schema，且不改成功输出契约 | 研究明确了 CLI direct-execution 仍主要读 `codemap.json`，server/MCP 读 `IStorage`；计划必须双线兼容 |
| GRAPH-03 | persisted edges 包含 `EXTRACTED` / `INFERRED` / `AMBIGUOUS` confidence | 研究确认当前接口只支持 `high|ambiguous`，Phase 63 必须先扩展 interface/domain/generate/storage 再谈查询消费 |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- 所有研究与结论默认使用中文输出，并优先基于检索后的仓库事实而不是记忆。[VERIFIED: codebase grep; AGENTS.md:1-113]
- 代码搜索与影响分析先用 CodeMap CLI；本次已先使用 `query` / `analyze` / `impact`，随后才回退到源码直读补细节。[VERIFIED: codebase grep; AGENTS.md:66-76]
- 变更建议必须保持最小改动面，不应顺手引入与 Phase 63 无关的重构。[VERIFIED: codebase grep; AGENTS.md:78-85]
- 规划必须定义 DoD、至少一个失败场景、并优先最小相关验证再扩大范围。[VERIFIED: codebase grep; AGENTS.md:88-103]
- 真实验证最低阈值是“真实 filesystem + 真实 subprocess 或真实 transport”；Phase 63 规划应优先使用临时目录 + 真实 SQLite 文件验证。[VERIFIED: codebase grep; AGENTS.md:95-103]
- 若 Phase 63 改到输出契约、架构、规则或文档路由，后续实现必须同步对应 live docs。[VERIFIED: codebase grep; AGENTS.md:108-115]
- 当前任务评估为 `L1-监督`：属于内部架构/存储设计收敛，需要人工做架构合规性检查。[VERIFIED: codebase grep; AGENTS.md:33-47]

## Summary

当前 `governance-v3` SQLite schema 同时承担三种职责：规范化当前图真相、保留 `snapshots.graph_json` 镜像、以及把每次保存写入 `history_snapshots/history_relations` 审计流。[VERIFIED: codebase grep; src/infrastructure/storage/sqlite/schema.ts:7-113][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:951-1146] 这解释了它为什么更偏 governance than traversal：保存路径每次全量清空再重写所有行，读取路径也经常按“完整图重建”思路工作，而不是围绕局部邻接查询来组织。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1000-1058][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1174-1227]

Phase 63 最稳的切法不是改写领域模型，而是保持 `modules / symbols / dependencies` 为主真相，在 SQLite 内新增一层 traversal-oriented projection，并把现有治理镜像保留为兼容与诊断材料。[VERIFIED: codebase grep; .planning/phases/63-graph-schema-foundation/63-CONTEXT.md:11-36][VERIFIED: codebase grep; src/domain/entities/CodeGraph.ts:18-80] 这比直接切成统一 `nodes/edges` 主 schema 风险低，因为现有 repository seam 很窄，`CodeGraphRepositoryImpl` 只是在 `CodeGraph` 与 `IStorage` 之间透传聚合根；只要 storage 内部保持装载同样的接口对象，领域层与绝大多数 CLI 输出都不需要一起抖动。[VERIFIED: codebase grep; src/infrastructure/repositories/CodeGraphRepositoryImpl.ts:17-41]

最关键的 planning 约束有两个。第一，`INFERRED` 目前在接口层和领域层都不存在，现有 confidence 仅有 `high | ambiguous`，而 `generate` 只会给 symbol-call 边写入 `high`，module-import 边没有 confidence。[VERIFIED: codebase grep; src/interface/types/index.ts:624-633][VERIFIED: codebase grep; src/domain/entities/Dependency.ts:12-15][VERIFIED: codebase grep; src/cli/commands/generate.ts:482-540] 第二，`query/deps/analyze` 的 direct-execution 成功路径当前主要读 `.mycodemap/codemap.json`，而 server/MCP handler 已直接依赖 `IStorage`；Phase 63 必须同时守住这两条兼容线。[VERIFIED: codebase grep; src/cli/storage-runtime.ts:33-54][VERIFIED: codebase grep; src/server/handlers/QueryHandler.ts:35-220][VERIFIED: codebase grep; src/server/mcp/service.ts:117-223]

**Primary recommendation:** 保留 `modules`、`symbols`、`dependencies` 为写入真相，新增一组专供遍历的派生边表或派生视图，并把 `EXTRACTED/INFERRED/AMBIGUOUS` 做成 first-class persisted enum；不要在 Phase 63 同时改 public envelope 或改成统一 `nodes/edges` 主模型。

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Graph truth persistence | Database / Storage | API / Backend | Phase 63 的主问题是 SQLite schema、索引、装载与保存路径，不是 CLI 展示层。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:951-1227] |
| Rebuild-first cutover | API / Backend | Database / Storage | `generate` 负责把解析结果转换为 `CodeGraph` 并保存；失败语义要在写入边界上显式暴露。[VERIFIED: codebase grep; src/cli/commands/generate.ts:376-540] |
| Query/deps/analyze success envelope stability | API / Backend | Browser / Client | 共享 direct-execution 层与 server/MCP handler 都依赖稳定结果包络，但当前无浏览器端责任。[VERIFIED: codebase grep; src/cli/storage-runtime.ts:33-54][VERIFIED: codebase grep; ARCHITECTURE.md:11-47] |
| Symbol ambiguity / confidence semantics | Database / Storage | API / Backend | confidence 是持久化事实；MCP/service 只消费并转成 envelope 状态。[VERIFIED: codebase grep; src/server/mcp/service.ts:120-259] |
| Traversal optimization for later impact/community phases | Database / Storage | API / Backend | Phase 64/65/66 都依赖更好的邻接访问，不应把遍历复杂度继续堆到 handler 层。[VERIFIED: codebase grep; .planning/ROADMAP.md:13-59] |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `better-sqlite3` | `12.9.0` | SQLite 持久化与 schema 执行 | 仓库当前 SQLite adapter 直接运行在它之上，且本地与 npm registry 版本一致。[VERIFIED: npm registry][VERIFIED: local package] |
| `TypeScript` | `5.9.3` | Phase 63 的接口、领域、storage 变更载体 | 仓库源码与构建都以 TypeScript 为主，schema 变更会跨 interface/domain/infrastructure 三层传播。[VERIFIED: npm registry][VERIFIED: local package] |
| `Vitest` | `1.6.1` | 存储、handler、兼容路径验证 | 当前已有 SQLiteStorage / governance cache / QueryHandler 的真实临时目录测试基线。[VERIFIED: local package][VERIFIED: codebase grep; vitest.config.ts:1-25] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@types/better-sqlite3` | `7.6.13` | adapter 类型约束 | 需要扩展 statement row typing 或增加新 SQL helpers 时继续沿用。[VERIFIED: codebase grep; package.json deps inspection] |
| `Hono` / MCP SDK | repo current | server/MCP 消费持久化图真相 | 仅在验证 QueryHandler / MCP envelope 稳定性时相关；不是 schema 主战场。[VERIFIED: codebase grep; ARCHITECTURE.md:11-47] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 现有 SQLite-only backend | 外部图数据库 / 新 backend | 违反当前 milestone 已锁定的 SQLite-only 收敛方向，并把 Phase 63 从 schema phase 变成 backend phase。[VERIFIED: codebase grep; src/infrastructure/storage/StorageFactory.ts:14-73][VERIFIED: codebase grep; .planning/phases/63-graph-schema-foundation/63-CONTEXT.md:11-36] |
| `modules/symbols/dependencies` 主真相 | 统一 `nodes/edges` 主真相 | 违背 D-01；还会扩大 interface/domain/CLI 兼容面。[VERIFIED: codebase grep; .planning/phases/63-graph-schema-foundation/63-CONTEXT.md:11-36] |

**Installation:**
```bash
npm install
```

**Version verification:** `better-sqlite3@12.9.0` 发布面当前仍为 `12.9.0`，npm registry `modified` 时间是 `2026-04-12T18:23:42.645Z`。[VERIFIED: npm registry] `vitest@1.6.1` 是仓库当前安装版本，但 npm registry 最新版本已是 `4.1.5`，因此本 phase 应按仓库锁定版本规划而不是追新。[VERIFIED: npm registry][VERIFIED: local package] `typescript@5.9.3` 为仓库当前安装版本，而 npm registry 最新版本为 `6.0.3`。[VERIFIED: npm registry][VERIFIED: local package]

## Architecture Patterns

### System Architecture Diagram

```text
Parser / Analyzer output
        |
        v
`generate` builds `CodeMap` JSON-compatible structure
        |
        +--> writes `.mycodemap/codemap.json` for direct-execution tools
        |
        +--> `convertToCodeGraph()` -> `CodeGraphRepositoryImpl.save()`
                                      |
                                      v
                                `SQLiteStorage.saveCodeGraph()`
                                      |
                +---------------------+----------------------+
                |                                            |
                v                                            v
   primary truth tables (`projects/modules/symbols/dependencies`)   compatibility/governance mirrors
                |                                            |
                +---------------------+----------------------+
                                      |
                                      v
                 traversal projection / indexes for impact/community
                                      |
                +---------------------+----------------------+
                |                                            |
                v                                            v
     server/MCP handlers via `IStorage`             future graph-native phases 64/65/66
```

### Recommended Project Structure
```text
src/
├── infrastructure/storage/sqlite/   # schema constants, projection SQL, cache/runtime helpers
├── infrastructure/storage/adapters/ # SQLiteStorage read/write orchestration
├── interface/types/                 # persisted graph contract and confidence enums
├── domain/entities/                 # Dependency / CodeGraph truth objects
├── cli/commands/                    # generate compatibility seam
└── server/handlers/                 # storage-consuming compatibility surfaces
```

### Pattern 1: Primary Truth + Derived Traversal Projection
**What:** `modules`、`symbols`、`dependencies` 继续作为唯一写入真相；新增只从这三张表派生的 traversal-oriented 结构，例如 `graph_edges` / `module_adjacency` / `symbol_call_adjacency`。[VERIFIED: codebase grep; .planning/phases/63-graph-schema-foundation/63-CONTEXT.md:11-36]

**When to use:** 当 planner 需要满足 GRAPH-01 但又不能扩大 public contract churn 时。[VERIFIED: codebase grep; .planning/REQUIREMENTS.md:8-12]

**Example:**
```typescript
// Source: repo pattern adapted from src/infrastructure/storage/adapters/SQLiteStorage.ts
// 主真相仍从 dependency rows 写入，再同步派生投影
for (const dependency of normalizedGraph.dependencies) {
  insertDependency.run(/* primary truth row */);
  insertGraphEdge.run(/* derived traversal row */);
}
```

### Pattern 2: Rebuild-First, Fail-Closed Schema Cutover
**What:** 对旧 graph DB 不做历史迁移器；若检测到旧 schema 与新 traversal projection 不兼容，则返回明确 remediation，要求重新 `generate`。[VERIFIED: codebase grep; .planning/phases/63-graph-schema-foundation/63-CONTEXT.md:17-24]

**When to use:** 当初始化发现 `schema_version` 旧于 Phase 63 且缺少新 projection 表 / 索引时。[VERIFIED: codebase grep; src/infrastructure/storage/sqlite/schema.ts:7-15][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:920-949]

**Example:**
```typescript
// Source: repo pattern adapted from backfill / metadata guards
if (storedSchemaVersion !== CURRENT_SQLITE_SCHEMA_VERSION) {
  throw new StorageError(
    'Graph schema is outdated. Run `mycodemap generate` to rebuild the SQLite graph.',
    'GRAPH_SCHEMA_REBUILD_REQUIRED'
  );
}
```

### Pattern 3: Confidence as Persisted Enum, Not Side Metadata
**What:** confidence 直接跟着 edge row 持久化，而不是另挂到 `metadata_json` 或只存在 MCP envelope。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1044-1057][VERIFIED: codebase grep; src/server/mcp/service.ts:120-223]

**When to use:** 所有 `dependencies` 主表及其派生 traversal projection 都需要同一 confidence 语义，以供 Phase 64/65/66 复用。[VERIFIED: codebase grep; .planning/ROADMAP.md:13-59]

**Example:**
```typescript
// Source: repo pattern adapted from src/domain/entities/Dependency.ts
type DependencyConfidence = 'EXTRACTED' | 'INFERRED' | 'AMBIGUOUS';
```

### Anti-Patterns to Avoid
- **全新主模型切换:** 直接把领域层切到统一 `nodes/edges` 会违反 D-01，并扩大所有读写兼容面。[VERIFIED: codebase grep; .planning/phases/63-graph-schema-foundation/63-CONTEXT.md:11-36]
- **只改 SQLite，不改 confidence 类型:** 当前 interface/domain 只有 `high|ambiguous`；只改表字段会让编译期和运行期语义分裂。[VERIFIED: codebase grep; src/interface/types/index.ts:624-633][VERIFIED: codebase grep; src/domain/entities/Dependency.ts:12-15]
- **继续把遍历建立在“完整图装载到内存”上:** `GovernanceGraphCache` 当前只缓存 modules+dependencies，并在阈值超限时回落到 sqlite-direct；这不是后续 symbol/community phase 的稳态方案。[VERIFIED: codebase grep; src/infrastructure/storage/sqlite/GovernanceGraphCache.ts:107-177][VERIFIED: codebase grep; src/infrastructure/storage/sqlite/GovernanceGraphCache.ts:198-320]

## Current Schema Assessment

### Where the Current Shape Is Governance-Oriented

| Observation | Why It Is Governance-Oriented | Planning Impact |
|-------------|-------------------------------|-----------------|
| 同时维护 `snapshots.graph_json` 镜像与规范化表 | 这是“保留完整快照 + 回填 legacy bootstrap”的治理/兼容设计，不是最小遍历形状。[VERIFIED: codebase grep; src/infrastructure/storage/sqlite/schema.ts:88-93][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:920-949][VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1060-1065] | Phase 63 可保留镜像作 fallback/diagnostics，但不应继续把它视为主查询面。 |
| 每次 `saveCodeGraph()` 都 `DELETE` 全表后重写 | 当前写入优化的是“一致性与镜像同步”，不是局部邻接维护。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1000-1058] | 这与 Phase 64 增量更新天然冲突，所以 Phase 63 设计应避免把 projection 也做成更难拆的全量-only 结构。 |
| `QueryHandler` 多处先做点查，再 `loadCodeGraph()` 全量补路径/符号 | 说明现有查询接口并不完全信任局部关系表，仍依赖整图重建辅助展示。[VERIFIED: codebase grep; src/server/handlers/QueryHandler.ts:81-185] | 新 schema 需要减少这类“查一点、又全量读一遍”的混合模式。 |
| `GovernanceGraphCache` 的 hydrated graph 不装载 symbols | 该缓存为模块级依赖/impact 优化，而不是通用图遍历层。[VERIFIED: codebase grep; src/infrastructure/storage/sqlite/GovernanceGraphCache.ts:107-177] | Phase 63 若要为后续 symbol/community phase 打底，不能只继续增强 module-only cache。 |
| `dependencies` 索引只有 `(source_id, dependency_type)` 与 `(target_id, dependency_type)` | 对 `source_entity_type`、`target_entity_type`、`confidence` 没有专门索引，后续 symbol traversal / confidence-filtered traversal 受限。[VERIFIED: codebase grep; src/infrastructure/storage/sqlite/schema.ts:103-106] | Phase 63 应至少补齐实体类型与 confidence 相关的访问路径。 |

### Minimal Schema Redesign Options

| Option | Shape | Pros | Cons | Fit |
|-------|-------|------|------|-----|
| A. Keep truth tables, add derived `graph_edges` projection | `modules/symbols/dependencies` 不变；新增统一 traversal row，列出 `edge_id/source_id/source_kind/target_id/target_kind/edge_type/confidence/file_path/line` 与索引 | 改动集中在 storage 层；最利于后续 impact/community 直接遍历；不强迫 domain 改主模型 | 写入时多一次 projection 同步；需要定义 projection 一致性测试 | **Recommended** |
| B. Keep only current tables, add stronger composite indexes and views | 不增新表，只增 view/index，例如 symbol-call view、module-import view、confidence indexes | 改动最小；更容易维持现有 load/save | 对 community/recursive traversal 的表达能力较弱；很多 SQL 仍要 join + discriminate entity types | Acceptable fallback |
| C. Replace primary truth with unified nodes/edges | 主写表切到统一图模型 | 对图算法最直观 | 违反 D-01；兼容面过大 | Out of scope |

**Recommendation detail:** 选 A，但让 projection 严格从 `dependencies` 派生，不让它成为第二份业务真相。[VERIFIED: codebase grep; .planning/phases/63-graph-schema-foundation/63-CONTEXT.md:11-36]

### Confidence Semantics Recommendation

| Semantic | Persistence Rule | Producer Rule | Consumer Rule |
|----------|------------------|---------------|---------------|
| `EXTRACTED` | 直接写入 edge row 与 projection row | 仅 parser / AST / 明确 resolved call/import 证据可写入 | 默认最高可信度；后续 impact/community 可无降级过滤 |
| `INFERRED` | 直接写入 edge row 与 projection row | 由现有 imports、命名、文件结构、re-export 规则推得，但非 parser 直接证明 | 默认参与遍历，但应可在后续 phase 中单独统计/过滤 |
| `AMBIGUOUS` | 直接写入 edge row 与 projection row | 存在多个合理 target 时写入，而不是静默丢弃 | consumer 应保留 ambiguity surfaced diagnostics |

当前仓库还没法表达这三态，因为 interface/domain 只支持 `high | ambiguous`，generate 只产出 `high` symbol-call 边。[VERIFIED: codebase grep; src/interface/types/index.ts:624-633][VERIFIED: codebase grep; src/domain/entities/Dependency.ts:12-15][VERIFIED: codebase grep; src/cli/commands/generate.ts:505-540]

### SQLite Features Worth Using

- 复合索引和按访问模式建索引是 SQLite 原生支持能力，适合把 Phase 63 的 traversal 加速保留在同一 SQLite backend 内。[CITED: https://www.sqlite.org/partialindex.html]
- `WITH RECURSIVE` 是 SQLite 原生特性，后续 Phase 65 做 recursive impact 时可以直接依赖它；Phase 63 只需要把邻接访问准备好。[CITED: https://www.sqlite.org/lang_with.html]
- `WITHOUT ROWID` 适合某些以主键为主访问的窄表，但本 phase 是否值得使用应谨慎；如果 planner 追求最小风险，先不上它也成立。[CITED: https://www.sqlite.org/withoutrowid.html]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 新 backend 迁移器 | 自定义历史 graph DB 双向迁移工具 | rebuild-first cutover + explicit diagnostics | D-03/D-04 已经允许重建优先，历史迁移只会扩大失败面。[VERIFIED: codebase grep; .planning/phases/63-graph-schema-foundation/63-CONTEXT.md:17-24] |
| 第二份业务真相 | 自己维护一份独立 graph domain snapshot | 从 `dependencies` 派生 traversal projection | 双真相最容易造成 `codemap.json`、SQLite truth、MCP 结果漂移。 |
| 自定义 in-memory graph engine | 全新运行时图对象层 | 先用 SQLite projection + 现有 handler/runtime seam | 当前 repo 已有 narrow storage seam，不值得在 foundation phase 新开一套 runtime abstraction。[VERIFIED: codebase grep; src/infrastructure/repositories/CodeGraphRepositoryImpl.ts:17-41] |
| 外部图数据库 | Kùzu/Neo4j 恢复引入 | 保持 SQLite-only | milestone 与 StorageFactory 都已锁死 SQLite family。[VERIFIED: codebase grep; src/infrastructure/storage/StorageFactory.ts:14-73] |

**Key insight:** Phase 63 的难点不是“图数据库能力不够”，而是“当前 SQLite shape 同时背着治理、镜像、兼容三种责任”；最小成功路径是拆访问模式，不是换 backend。

## Common Pitfalls

### Pitfall 1: 只扩表，不扩类型
**What goes wrong:** 数据库里新增 `INFERRED`，但 TypeScript interface/domain 仍是 `high|ambiguous`，编译和运行出现不一致。[VERIFIED: codebase grep; src/interface/types/index.ts:624-633][VERIFIED: codebase grep; src/domain/entities/Dependency.ts:12-15]
**Why it happens:** 当前 confidence 语义分散在 interface、domain、generate、storage 四层。
**How to avoid:** 先改 shared type，再改 domain entity，再改 generate 与 storage read/write。
**Warning signs:** `as Dependency['confidence']` 之类强转增多，或者测试只断言 DB 行而不 round-trip 断言对象。

### Pitfall 2: 继续依赖整图重建辅助简单查询
**What goes wrong:** schema 变“更图化”了，但 handler 还是频繁 `loadCodeGraph()`，导致性能和复杂度都没改善。[VERIFIED: codebase grep; src/server/handlers/QueryHandler.ts:81-185]
**Why it happens:** 旧实现把局部点查与完整图补充混在一起。
**How to avoid:** 规划时把“module detail / symbol detail / impact path resolution”拆成可直接由 projection 支撑的查询。
**Warning signs:** 新测试仍大量依赖 `storage.loadCodeGraph()` 来拼装展示字段。

### Pitfall 3: module-only 优化误当 graph foundation
**What goes wrong:** 只强化 module import traversal，却没给 symbol-call / confidence / ambiguity 打基础。
**Why it happens:** 当前 `GovernanceGraphCache` 就是 module-biased，容易沿着老路继续扩。[VERIFIED: codebase grep; src/infrastructure/storage/sqlite/GovernanceGraphCache.ts:107-177]
**How to avoid:** 明确 projection 至少要覆盖 `module->module` 与 `symbol->symbol`，并可区分实体类型。
**Warning signs:** 新表没有 `source_kind/target_kind` 或没有 symbol-call 测试。

### Pitfall 4: cutover 时静默接受旧 schema
**What goes wrong:** 旧库缺 projection 或 confidence 枚举不一致时，系统仍返回看似成功但内容残缺的结果。
**Why it happens:** 过度追求“兼容旧库”而不是“兼容成功包络”。
**How to avoid:** 明确 schema gate；旧 DB 要么 backfill 可证明安全，要么 fail-closed 提示 rebuild。
**Warning signs:** `loadGraphMetadata()` 还能返回 generatedAt，但 traversal 查询结果明显为空。

## Code Examples

Verified patterns from official sources and current repo:

### Current Full-Rewrite Save Path
```typescript
// Source: src/infrastructure/storage/adapters/SQLiteStorage.ts:1000-1058
database.prepare('DELETE FROM dependencies').run();
database.prepare('DELETE FROM symbols').run();
database.prepare('DELETE FROM modules').run();

for (const dependency of normalizedGraph.dependencies) {
  insertDependency.run(
    dependency.id,
    dependency.sourceId,
    sourceEntityType,
    dependency.targetId,
    targetEntityType,
    dependency.type,
    dependency.filePath ?? null,
    dependency.line ?? null,
    dependency.confidence ?? null
  );
}
```

### Current CLI Compatibility Boundary
```typescript
// Source: src/cli/storage-runtime.ts:33-54
const raw = await readFile(dataPath, 'utf-8');
return {
  rootDir,
  dataPath,
  codeMap: JSON.parse(raw) as CodeMap,
};
```

### Recommended Projection Write Pattern
```typescript
// Source: research recommendation derived from existing SQLiteStorage write path
for (const dependency of normalizedGraph.dependencies) {
  insertDependency.run(/* primary truth */);
  insertGraphEdge.run(
    dependency.id,
    dependency.sourceId,
    dependency.sourceEntityType ?? inferSourceKind(dependency),
    dependency.targetId,
    dependency.targetEntityType ?? inferTargetKind(dependency),
    dependency.type,
    dependency.confidence ?? 'EXTRACTED',
    dependency.filePath ?? null,
    dependency.line ?? null
  );
}
```

## Likely File Touchpoints

| File | Why It Likely Changes | Risk |
|------|-----------------------|------|
| `src/infrastructure/storage/sqlite/schema.ts` | 新 schema version、projection 表/view、索引定义 | High |
| `src/infrastructure/storage/adapters/SQLiteStorage.ts` | initialize/save/load/query/cutover diagnostics 全在这里 | High |
| `src/infrastructure/storage/sqlite/GovernanceGraphCache.ts` | 若继续保留 cache，需要决定是否读取新 projection、是否继续 module-only | High |
| `src/interface/types/index.ts` | `Dependency.confidence` 需扩展到三态 enum | High |
| `src/domain/entities/Dependency.ts` | 领域 confidence 类型与 validation 需同步 | High |
| `src/cli/commands/generate.ts` | 需要产出 `EXTRACTED/INFERRED/AMBIGUOUS`，并继续保存稳定 `codemap.json` | High |
| `src/server/handlers/QueryHandler.ts` | 需要减少对 `loadCodeGraph()` 全量补充的依赖，或至少验证兼容 | Medium |
| `src/server/mcp/service.ts` | ambiguity/confidence envelope 需要确认与新 persisted semantics 对齐 | Medium |
| `src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` | schema、round-trip、legacy/rebuild failure 测试主落点 | High |
| `src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts` | cache/direct parity 需要覆盖新 projection | Medium |
| `src/server/handlers/__tests__/QueryHandler.test.ts` | success envelope parity 与 sqlite-direct/memory-eager parity | Medium |

## Sequencing Constraints

1. 先冻结 confidence 语义与 enum 名字，再改 schema。
   原因：如果先改表、后改类型，编译和运行时会分裂。[VERIFIED: codebase grep; src/interface/types/index.ts:624-633][VERIFIED: codebase grep; src/domain/entities/Dependency.ts:12-15]
2. 先建立 new schema version + cutover diagnostics，再改 save path。
   原因：rebuild-first 模式要求旧库失败能诊断，而不是半升级半兼容。[VERIFIED: codebase grep; .planning/phases/63-graph-schema-foundation/63-CONTEXT.md:17-24]
3. `generate` 的 SQLite 写入与 `codemap.json` 输出要一起回归。
   原因：direct-execution tools 仍主要读 JSON runtime。[VERIFIED: codebase grep; src/cli/storage-runtime.ts:33-54]
4. cache/parity 测试在 schema 落地后立刻补齐，不要等到 Phase 64。
   原因：当前已有 memory-eager vs sqlite-direct parity 基线，适合立即捕捉回归。[VERIFIED: codebase grep; src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts:60-136][VERIFIED: codebase grep; src/server/handlers/__tests__/QueryHandler.test.ts:65-113]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `bootstrap-v1` 只靠 `snapshots.graph_json` | `governance-v3` 同时持久化规范化表、快照镜像、历史关系 | 已在当前 repo 落地 | 提供了治理兼容，但也让 schema 更偏审计而不是遍历。[VERIFIED: codebase grep; src/infrastructure/storage/__tests__/SQLiteStorage.test.ts:236-275][VERIFIED: codebase grep; src/infrastructure/storage/sqlite/schema.ts:7-113] |
| 模块级图缓存作为小中图加速 | threshold-gated `GovernanceGraphCache`，超阈值回退 sqlite-direct | 已在当前 repo 落地 | 证明 repo 接受“一份 SQLite 真相 + 多种查询路径”，因此 Phase 63 可以用 projection/索引演进而不是换 backend。[VERIFIED: codebase grep; src/infrastructure/storage/sqlite/GovernanceGraphCache.ts:198-320] |

**Deprecated/outdated:**
- `high | ambiguous` confidence 语义：不足以满足 GRAPH-03，需要被 `EXTRACTED | INFERRED | AMBIGUOUS` 替代。[VERIFIED: codebase grep; src/interface/types/index.ts:624-633]
- 以全量 `DELETE` + 重写所有 rows 作为长期基础：对 Phase 63 可接受，对 Phase 64 增量更新则是已知限制。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:1000-1058]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `graph_edges` 派生表会比“只加索引不加表”更适合后续 impact/community phase | Minimal Schema Redesign Options | 如果实际后续 phase 只需 module-level traversal，这会导致 Phase 63 过度设计 |
| A2 | `INFERRED` 初期可由现有 imports、命名、文件结构 heuristics 产生，而不需要 parser 新能力 | Confidence Semantics Recommendation | 如果没有足够可靠的现有 heuristics，planner 需要把 `INFERRED` 范围缩得更小 |
| A3 | `WITHOUT ROWID` 不是 Phase 63 的必要条件 | SQLite Features Worth Using | 如果数据量与主键访问模式证明它收益明显，当前建议会保守 |

## Resolved Planning Decisions

1. **[RESOLVED] Phase 63 不做 QueryHandler 全面 query refactor，只允许最小的局部读法调整。**
   - What we know: `QueryHandler` 当前多处点查后又全量加载整图。[VERIFIED: codebase grep; src/server/handlers/QueryHandler.ts:81-185]
   - Decision: 仅当新 projection 能直接覆盖现有热点且无需扩展 public envelope 时，才允许最小局部调整；其余保持现状并用兼容测试锁住成功包络。
   - Why resolved: 这满足 D-08/D-09，同时避免把 schema foundation 扩成 query refactor phase。

2. **[RESOLVED] 旧 `governance-v3` 图库对 Phase 63 采用显式 rebuild required，而不是新增自动升级器。**
   - What we know: 现有实现会对更早的 `bootstrap-v1` 快照做 backfill。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:920-949]
   - Decision: 保留现有 `bootstrap-v1` backfill，不新增 `governance-v3 -> phase-63` 自动迁移；Phase 63 新 schema 缺口一律 fail-closed 并提示重新运行 `mycodemap generate`。
   - Why resolved: 这与 D-03/D-04 一致，也能让失败路径更可诊断。

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | TypeScript build, tests, CLI runtime | ✓ | `v24.14.0` | — |
| npm | package scripts, registry verification | ✓ | `11.9.0` | — |
| `better-sqlite3` local install | real SQLite adapter tests | ✓ | `12.9.0` | 无；缺失会阻塞 storage 验证 |
| Vitest local install | phase tests | ✓ | `1.6.1` | `npm test` wrapper |

**Missing dependencies with no fallback:**
- None.[VERIFIED: local runtime probe]

**Missing dependencies with fallback:**
- None.[VERIFIED: local runtime probe]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `Vitest 1.6.1` |
| Config file | `vitest.config.ts` |
| Quick run command | `./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts src/server/handlers/__tests__/QueryHandler.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GRAPH-01 | graph-optimized schema persisted and readable | integration | `./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` | ✅ |
| GRAPH-02 | server/query compatibility across new persisted truth | integration | `./node_modules/.bin/vitest run src/server/handlers/__tests__/QueryHandler.test.ts` | ✅ |
| GRAPH-03 | confidence 三态 round-trip + query semantics | integration | `./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` | ✅ but needs expansion |

### Sampling Rate
- **Per task commit:** `./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts`
- **Per wave merge:** `./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts src/server/handlers/__tests__/QueryHandler.test.ts`
- **Phase gate:** `npm test`

### Wave 0 Gaps
- [ ] `src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` — 增加 new schema version / projection row / rebuild-required failure scenario
- [ ] `src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts` — 增加 symbol-level or projection parity，不只 module-level parity
- [ ] `src/server/handlers/__tests__/QueryHandler.test.ts` — 增加新 schema 下 `getModuleDetail` / `getDependencyGraph` success envelope 覆盖
- [ ] 需要一条 `generate -> SQLite -> codemap.json -> query/deps/analyze` 端到端兼容测试；当前 direct-execution 层更多依赖 JSON runtime，尚未覆盖 schema cutover

**Current verification evidence:** 上述 3 个现有相关测试文件在 2026-05-08 本地运行通过，合计 `3 files / 10 tests`。[VERIFIED: vitest run]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | 本 phase 无认证面 |
| V3 Session Management | no | 本 phase 无会话面 |
| V4 Access Control | no | 本 phase 无授权面 |
| V5 Input Validation | yes | 对 schema version、confidence enum、metadata value 做显式验证；不要信任旧 DB 行内容 |
| V6 Cryptography | no | 本 phase 无密码学需求 |

### Known Threat Patterns for SQLite persistence

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 旧 schema 被静默当成新 schema 读取 | Tampering | schema gate + explicit rebuild remediation |
| confidence 非法值进入 persisted truth | Tampering | TypeScript enum + runtime row validation + round-trip tests |
| 部分写入导致 graph 与 projection 不一致 | Tampering | 单事务写入 primary truth + projection + metadata |
| 拼接 SQL 带来注入风险 | Tampering | 继续使用 prepared statements；当前实现已广泛采用参数化查询。[VERIFIED: codebase grep; src/infrastructure/storage/adapters/SQLiteStorage.ts:417-530] |

## Sources

### Primary (HIGH confidence)
- `src/infrastructure/storage/sqlite/schema.ts` - 当前 SQLite schema version、表结构、索引
- `src/infrastructure/storage/adapters/SQLiteStorage.ts` - 初始化、legacy backfill、save/load、点查、symbol impact、事务写入
- `src/infrastructure/storage/sqlite/GovernanceGraphCache.ts` - memory-eager/sqlite-direct 双路径、当前仅模块级 hydrated graph
- `src/cli/commands/generate.ts` - `CodeMap -> CodeGraph` 转换与当前 confidence 生成方式
- `src/cli/storage-runtime.ts` - direct-execution 仍读取 `codemap.json`
- `src/server/handlers/QueryHandler.ts` - server 侧对 SQLite truth 的直接消费方式
- `src/server/mcp/service.ts` - MCP symbol query / ambiguity envelope
- `src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` - 当前 schema/backfill/history 真实测试
- `src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts` - cache parity 基线
- `src/server/handlers/__tests__/QueryHandler.test.ts` - handler parity 基线
- `.planning/phases/63-graph-schema-foundation/63-CONTEXT.md` - locked decisions
- `.planning/REQUIREMENTS.md` - GRAPH-01..03
- `.planning/ROADMAP.md` - phase goal and success criteria

### Secondary (MEDIUM confidence)
- `https://www.sqlite.org/partialindex.html` - SQLite 索引策略可作为 traversal 优化手段
- `https://www.sqlite.org/lang_with.html` - recursive CTE 为后续 impact traversal 提供原生能力
- `https://www.sqlite.org/withoutrowid.html` - 可选紧凑表形态，但本 phase 非必需

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 版本来自本地安装、package 依赖与 npm registry 双重验证
- Architecture: MEDIUM - 当前代码边界和兼容面很清楚，但推荐 projection 设计尚未实现
- Pitfalls: HIGH - 直接由当前类型缺口、save/load 形状、现有 handler 行为推导

**Research date:** 2026-05-08
**Valid until:** 2026-06-07
