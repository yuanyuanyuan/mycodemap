# Phase 11: KùzuDB Persistence & Query Parity - Validation

## Must Verify

1. `kuzudb` backend 能持久化并重新加载完整 snapshot。
2. `updateModule` / `deleteModule` / 查询 / 分析方法不再返回空实现。
3. 初始化失败会抛明确 `StorageError(code=KUZU_INIT_FAILED)`。

## Commands

- `npx vitest run src/infrastructure/storage/adapters/__tests__/KuzuDBStorage.test.ts`
- `npm run typecheck`

## Failure Rehearsal

- 若 Kùzu 原生 binding 不可用却被静默 fallback，用户会误以为已经写入图数据库；本阶段用 init 失败测试锁死该风险。

