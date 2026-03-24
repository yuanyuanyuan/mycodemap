---
phase: 07-plugin-contract-config-surface
plan: 01
subsystem: "config-contract"
tags: [plugins, config, schema, cli]
requirements_completed: [PLG-01, PLG-02]
one_liner: "插件系统现在拥有正式配置契约、schema 与 CLI 侧单一配置事实源。"
completed: 2026-03-24
---

# 07-01 Summary

**插件系统现在拥有正式配置契约、schema 与 CLI 侧单一配置事实源。**

## 完成内容

- 在 `src/interface/config/index.ts` 中为 `CodemapConfig` 新增正式 `plugins` 配置类型，并让 `mode` 正式支持 `hybrid`，避免插件配置继续停留在非正式 shape。
- 新增 `src/cli/config-loader.ts`，统一承担配置文件读取、默认值生成、字段归一化和插件配置 hard-fail 校验职责。
- `mycodemap.config.schema.json` 与 `src/cli/commands/init.ts` 已改为复用统一默认配置事实源，`mycodemap.config.json` 不再只是文档名义入口。
- `PluginLoadOptions` 已直接复用 interface 层插件配置契约，降低后续 runtime 接入时的 shape drift 风险。

## 验证

- `pnpm exec vitest run src/cli/__tests__/config-loader.test.ts`
- `npm run docs:check`
- `npm run typecheck`
- `npm run build`

## 失败场景预演

- 当配置写成 `plugins: "broken-plugin-config"` 时，`loadCodemapConfig()` 会直接报错 `"plugins" 必须是对象`，而不是静默吞掉坏值。
- 当用户误写 `plugins.enabled` 这类未支持字段时，config loader 会显式拒绝，避免“配置看似生效、实际被忽略”的伪成功。

## 剩余风险

- 本 plan 只解决配置契约和 CLI 读取 seam；插件真正执行、结果暴露和失败隔离仍需在 Phase 08 收口。
