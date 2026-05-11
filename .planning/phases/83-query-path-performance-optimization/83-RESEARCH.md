# Phase 83 Research: Query Path Performance Optimization

## Verified Findings

1. `GovernanceGraphCache.findDependencies()` / `findDependents()` 当前只是把 `graph` 交给 `findDependenciesInGraph()` / `findDependentsInGraph()`，每次命中 eager cache 仍然会线性扫描全部 `dependencies`。
2. `calculateImpactInGraph()` 虽然使用了 reverse adjacency BFS，但 adjacency 是调用时通过 `buildModuleReverseAdjacency(graph)` 即席构建的；重复 impact 查询会重复付出同样的建图成本。
3. `QueryHandler.analyzeImpact()` 已经先调用 `storage.calculateImpact()`，随后又 `loadCodeGraph()` 并根据 `graph.dependencies` 再做一遍 BFS；这条二次遍历完全可以用 `ImpactResult.direct/transitiveLayers` 直接投影。
4. 当前 `memory-eager` / `sqlite-direct` parity 测试已经覆盖 dependency、impact 与 oversized fallback，所以这轮最安全的实现方式是“复用同一套 helper 语义，只把索引预建并缓存起来”。

## Implementation Direction

- 在 `graph-helpers.ts` 增加可复用的 `GraphReadIndex` / `createGraphReadIndex(...)`，把 source/target dependency lookup、module reverse adjacency、symbol reverse adjacency 和 module/symbol map 统一预建。
- 让 `findDependenciesInGraph`、`findDependentsInGraph`、`analyzeImpactInGraph`、`calculateImpactInGraph`、`calculateSymbolImpactInGraph` 支持可选预建索引，默认行为保持不变。
- `GovernanceGraphCache` hydrate 成功后保存这份索引，并加入一个小型 bounded impact-result cache，专门复用重复的 `moduleId + depth` 查询。
- `QueryHandler.analyzeImpact()` 直接把 `ImpactResult` 的 direct/transitive layers 投影成旧 response shape，删除额外的 `loadCodeGraph()+BFS`。

## Non-Goals

- 不改 graph truth 的来源，不把 SQLite 之外的缓存变成新的 truth source。
- 不在本 phase 引入 benchmark 基准框架或新 telemetry surface。
- 不顺手重构 callers/callees/community 以外的其他读路径，除非被本实现直接阻塞。
