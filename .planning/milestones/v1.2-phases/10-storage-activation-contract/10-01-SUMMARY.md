---
phase: 10-storage-activation-contract
plan: 01
subsystem: "config-surface"
tags: [storage, config, schema, diagnostics]
requirements_completed: [GST-01]
one_liner: "正式 `storage` 配置面、schema 与 CLI loader 已收口。"
completed: 2026-03-24
---

# 10-01 Summary

**正式 `storage` 配置面、schema 与 CLI loader 已收口。**

## 完成内容

- `src/cli/config-loader.ts` 增加 `storage` 默认值、允许字段、`autoThresholds` 归一化和坏字段报错。
- `src/interface/config/index.ts` 把 `storage` 提升为 `CodemapConfig` 正式字段。
- `mycodemap.config.schema.json` 已暴露 `storage.type`、`outputPath`、`databasePath`、`uri`、`username`、`password`、`autoThresholds`。
- `src/cli/__tests__/config-loader.test.ts` 已覆盖默认值、显式后端配置与未知字段失败路径。

## 验证

- `npx vitest run src/cli/__tests__/config-loader.test.ts`
- `npm run typecheck`

## Failure Rehearsal

- 若 schema 不认识 `storage`，用户会在编辑器里看到假阳性错误，而 CLI 却接受配置；本计划已把 schema / loader / 类型定义同步。

