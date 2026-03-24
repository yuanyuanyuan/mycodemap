# Phase 11: KùzuDB Persistence & Query Parity - Context

**Gathered:** 2026-03-24  
**Status:** Completed

## Phase Boundary

本阶段只解决 KùzuDB：
1. 真实初始化 schema / snapshot 持久化；
2. 满足 `IStorage` 的加载、更新、删除、查询与分析合同；
3. 用成功路径与失败路径测试证明 KùzuDB 不再是 TODO 占位。

## Decisions

- 不做 DB-native 图查询优化，先用 snapshot-backed persistence 闭环产品面。
- 调用关系、循环、影响分析统一复用共享 graph helper。
- 初始化失败必须抛 `KUZU_INIT_FAILED`，不允许悄悄退回 `filesystem`。

## Canonical References

- `.planning/REQUIREMENTS.md` — `KUZ-01` ~ `KUZ-03`
- `.planning/ROADMAP.md` — Phase 11 / plans `11-01` ~ `11-03`
- `src/infrastructure/storage/adapters/KuzuDBStorage.ts`
- `src/infrastructure/storage/adapters/__tests__/KuzuDBStorage.test.ts`
- `src/infrastructure/storage/graph-helpers.ts`

