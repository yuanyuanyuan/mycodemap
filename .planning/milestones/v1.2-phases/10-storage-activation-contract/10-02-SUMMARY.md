---
phase: 10-storage-activation-contract
plan: 02
subsystem: "runtime-activation"
tags: [storage, generate, export, server]
requirements_completed: [GST-02]
one_liner: "`generate` / `export` / 内部 server/query 路径已接入配置化 storage runtime。"
completed: 2026-03-24
---

# 10-02 Summary

**`generate` / `export` / 内部 server/query 路径已接入配置化 storage runtime。**

## 完成内容

- `src/cli/storage-runtime.ts` 提供统一的 `createConfiguredStorage()` 入口。
- `src/cli/commands/generate.ts` 改为使用 `loadedConfig.config.storage` 保存 CodeGraph，并在 stdout 显示 `MVP3 Storage (...)`。
- `src/cli/commands/export.ts`、`src/cli/commands/server.ts`、`src/cli-new/commands/query.ts` 等路径已接入同一 storage runtime。
- 缺失旧配置文件 / 旧输出目录时仍保留现有迁移提示，不借 storage 接入破坏旧项目路径。

## 验证

- `npx vitest run src/cli/commands/__tests__/generate.test.ts src/cli/__tests__/generate.test.ts`
- `npm run typecheck`

## Failure Rehearsal

- 若 `generate` 继续硬编码 `filesystem`，即使 adapter 完成也永远进不了正式主路径；本计划已把主流程切到配置事实源。

