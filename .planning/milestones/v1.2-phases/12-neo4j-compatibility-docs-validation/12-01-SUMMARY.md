---
phase: 12-neo4j-compatibility-docs-validation
plan: 01
subsystem: "neo4j-contract"
tags: [neo4j, snapshot, contract, errors]
requirements_completed: [NEO-01, NEO-02, NEO-03]
one_liner: "Neo4j 已达到与 KùzuDB 对齐的 snapshot-backed storage contract，并显式暴露连接失败。"
completed: 2026-03-24
---

# 12-01 Summary

**Neo4j 已达到与 KùzuDB 对齐的 snapshot-backed storage contract，并显式暴露连接失败。**

## 完成内容

- `Neo4jStorage` 已支持 snapshot 保存、读取、模块更新/删除、symbol / dependency / caller / callee 查询与分析接口。
- 初始化阶段通过 `verifyConnectivity()` 提前暴露连接问题，并统一抛出 `StorageError(code=NEO4J_INIT_FAILED)`。
- 适配器继续复用共享 graph helper，避免 Neo4j 与 KùzuDB 行为漂移。

## 验证

- `npx vitest run src/infrastructure/storage/adapters/__tests__/Neo4jStorage.test.ts`
- `npm run typecheck`

## Failure Rehearsal

- 若 Neo4j 连接失败却被静默吞掉，用户会误判为“图数据库已启用但数据为空”；本计划已补连通性失败用例。

