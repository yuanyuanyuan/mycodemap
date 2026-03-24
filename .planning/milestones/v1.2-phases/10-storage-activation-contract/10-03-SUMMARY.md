---
phase: 10-storage-activation-contract
plan: 03
subsystem: "shared-contract"
tags: [storage, helpers, contract-tests]
requirements_completed: [GST-03]
one_liner: "共享 graph helper 与 contract tests 已成为 graph backend 的单一行为基线。"
completed: 2026-03-24
---

# 10-03 Summary

**共享 graph helper 与 contract tests 已成为 graph backend 的单一行为基线。**

## 完成内容

- 新增 `src/infrastructure/storage/graph-helpers.ts`，统一 `createEmptyCodeGraph`、snapshot serialize/deserialize、module upsert/delete、dependency/caller/cycle/impact/statistics 行为。
- 新增 `src/infrastructure/storage/__tests__/graph-helpers.test.ts`，锁住最小一致 contract。
- KùzuDB / Neo4j 后续阶段直接复用这层 helper，而不是继续维护 TODO/fallback 分叉。

## 验证

- `npx vitest run src/infrastructure/storage/__tests__/graph-helpers.test.ts`
- `npm run typecheck`

## Failure Rehearsal

- 若后端各自复制 callers/cycles/impact 逻辑，后续极易再次出现 contract 漂移；共享 helper 就是本阶段的根因修复。

