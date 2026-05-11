# Phase 83 Context: Query Path Performance Optimization

## Goal

在不改变 SQLite truth、返回排序契约、错误语义和 fallback 行为的前提下，为高频 graph read path 补一层最小可验证的性能优化：让 eager governance cache 复用内存邻接索引，并让 query impact surface 直接消费已算好的 traversal truth，避免重复全图扫描。

## Locked Scope

- 只处理 `src/infrastructure/storage/{graph-helpers,sqlite/GovernanceGraphCache,adapters/SQLiteStorage}`、`src/server/handlers/QueryHandler.ts` 及其最相关测试。
- 优先覆盖 `findDependencies`、`findDependents`、`calculateImpact`、`QueryHandler.analyzeImpact` 这条热点路径。
- 不改 SQLite schema，不引入新依赖，不新增独立 daemon / background cache。
- 不扩展到新的 product surface；MCP / CLI 只有在复用现有 storage truth 时才顺带受益。

## Must Stay True

- `PERF-01`：重复的多跳 query / impact / graph-read path 会复用有界缓存和内存邻接表加速，但不会改变既有 graph truth、error semantics 或 SQLite-only baseline。
- governance graph cache 超阈值时仍然回退到 `sqlite-direct`，不能假装 cache 命中。
- eager/cache path 与 sqlite-direct path 对同一 graph truth 的结果必须保持一致。

## Relevant Code Facts

- `GovernanceGraphCache` 当前只决定“是否把 graph 读进内存”，但 `findDependencies` / `findDependents` / `calculateImpact` 仍会继续扫 `graph.dependencies` 或在 impact 时重建 reverse adjacency。
- `graph-helpers.ts` 已经有稳定的 `buildModuleReverseAdjacency` / `buildSymbolReverseAdjacency` 语义实现，但这些索引是每次调用临时重建，不会跨查询复用。
- `SQLiteStorage.calculateImpact()` 在 eager 模式下能拿到 shared impact truth，但 `QueryHandler.analyzeImpact()` 仍然再次 `loadCodeGraph()` 并手写 BFS，形成第二次图遍历。
- 现有 `SQLiteGovernanceGraph.test.ts` 与 `QueryHandler.test.ts` 已经把 `memory-eager` vs `sqlite-direct` parity 作为契约测试门，适合承接本 phase 的 focused regression。

## Success Criteria

1. repeated query/impact-style read paths measurably reuse bounded cache or adjacency acceleration
2. optimization does not change returned graph truth, ordering contract, or failure semantics
3. degraded or cache-miss paths still fall back safely to SQLite truth instead of serving stale data
