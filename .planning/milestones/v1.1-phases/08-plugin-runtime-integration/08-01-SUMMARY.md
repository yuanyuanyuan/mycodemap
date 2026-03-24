---
phase: 08-plugin-runtime-integration
plan: 01
subsystem: "plugin-runtime"
tags: [plugins, runtime, generate, output-contract]
requirements_completed: [PLG-04, PLG-05]
one_liner: "`generate` 已正式接入插件生命周期，插件结果会进入正式输出契约。"
completed: 2026-03-24
---

# 08-01 Summary

**`generate` 已正式接入插件生命周期，插件结果会进入正式输出契约。**

## 完成内容

- `src/cli/commands/generate.ts` 已真正接入 `PluginSystem`，并在显式 `plugins` 配置下执行 `initialize → analyze → generate → dispose` 生命周期。
- 插件分析返回的 `additionalEdges` 会合并回主依赖图，插件生成结果会写回正式输出目录。
- `src/interface/types/index.ts` 新增 `PluginDiagnostic` 与 `PluginExecutionReport`，`codemap.json` 首次拥有稳定的插件结果契约。
- `src/generator/index.ts` 已为 `AI_MAP.md` 增加 `Plugin Summary`，让 built-in plugin 结果对用户直接可见。

## 验证

- `pnpm exec vitest run src/cli/commands/__tests__/generate.test.ts`
- `npm run typecheck`

## 失败场景预演

- 若 `generate` 虽然读取了配置但没有真正跑 runtime，`should surface built-in plugin metrics when explicitly enabled` 会失败。
- 若插件分析产生的边没有并入主依赖图，后续 `pluginReport.metrics` / `additionalEdges` 结果会和主输出脱节。
