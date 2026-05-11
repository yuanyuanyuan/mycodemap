# Phase 81 Context: Edge ID Normalization

## Goal

把 graph edge ID 从“生成时随机 / 历史残留文本”收口为一个稳定的 canonical 形式，让 generation、SQLite persistence、query、impact 与 governance cache 看到的都是同一份 edge identity truth。

## Locked Scope

- 只处理 dependency / graph edge ID 的 canonicalization。
- 不改 module ID / symbol ID 生成策略。
- 不做 schema 版本升级；继续复用现有 `dependencies` / `graph_edges` 表。
- 不扩展新的 query surface，只修正现有 persisted truth 与读路径一致性。

## Must Stay True

- `POL-03`：edge ID 使用稳定的 lowercase / underscore-safe 规范化格式。
- repeated save / generate / read 对同一 graph semantics 产出同一个 edge ID。
- 迁移旧 SQLite 图时不能丢 dependency semantics，也不能制造新的 duplicate artifact。

## Relevant Code Facts

- `src/cli/commands/generate.ts` 当前给 dependency 使用 `createGeneratedId('dep')`，ID 来自随机 UUID，天然跨运行不稳定。
- `src/domain/entities/Dependency.ts` 已有 topology-safe dedup key，但还没有 canonical edge ID helper。
- `src/infrastructure/storage/adapters/SQLiteStorage.ts` 当前 `normalizeGraph()` 只做 dedup，不会重写 dependency ID。
- `graph_edges.dependency_id` 与 `dependencies.id` 都直接复用输入 dependency ID，query / impact / governance cache 读回时也直接返回该值。
- `moduleId` / `symbolId` 在 generate path 里同样是随机生成，因此 canonical edge ID 不能继续依赖实体随机 ID，必须改用 path / symbol location 这类更稳定的 graph truth。

## Success Criteria

1. edge IDs normalize with one canonical lowercase / underscore-safe rule
2. repeated generation and read paths produce stable IDs for the same graph truth
3. existing consumers do not lose graph semantics or create duplicate artifacts during migration
