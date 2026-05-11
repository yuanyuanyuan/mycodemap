# Phase 81 Research: Edge ID Normalization

## Verified Findings

1. `generate.ts` 当前 module / symbol / dependency 都使用 `createGeneratedId(...)`，其中 dependency ID 直接来自随机 UUID；这解释了 repeated runs 的 ID drift。
2. Phase 73 已把 duplicate suppression 的语义键收口到 `Dependency.createKey(...)`，但该键仍然基于 source/target entity identity，不直接生成对外稳定的 edge ID。
3. `SQLiteStorage.normalizeGraph()` 是当前最窄、最安全的 persistence seam：它已经负责 dedup、confidence normalization 和 graph writeback 前的 truth rewrite。
4. 仅在 storage 写入时重写 ID 还不够，因为 generate path 在 `saveCodeGraph()` 之前也会把 graph truth 传给下游；如果这里仍是随机 dependency ID，generation surface 依旧漂移。
5. 仅在新写入时重写 ID 也不够，因为老 SQLite 数据会继续被 query / impact 读到旧 `dep-*` 或随机 ID；初始化时需要一次按现有 graph truth 的 backfill rewrite。

## Implementation Direction

- 在 `Dependency` 领域实体增加 canonical edge ID helper，并保持与已有 dedup key 一样只表达“graph semantics”，不重新引入 line-level uniqueness。
- canonical edge ID 不依赖随机 `moduleId` / `symbolId`，而是依赖：
  - module edge: normalized module path
  - symbol edge: normalized module/file path + symbol name + location line/column
  - optional dependency file path: 继续作为语义键的一部分
- generate path 直接按稳定 entity reference 构造 dependency ID。
- SQLite writeback path 对任意输入 graph 再统一重写 dependency ID，并在初始化时对 legacy rows 做一次无 schema 升级的 backfill。
- 测试不再硬编码 `dep-*`，统一用同一个 canonical helper 生成预期值。

## Non-Goals

- 不改 module / symbol ID 的 public contract
- 不引入 schema migration 或新表
- 不把 line number 加入 canonical edge ID 以制造新的“同语义多 edge” truth
