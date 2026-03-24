---
phase: 07-plugin-contract-config-surface
plan: 02
subsystem: "generate-entry"
tags: [plugins, cli, precedence, docs-guardrail]
requirements_completed: [PLG-03]
one_liner: "`generate` 已切到真实配置入口，并在进入主流程前拒绝坏插件配置。"
completed: 2026-03-24
---

# 07-02 Summary

**`generate` 已切到真实配置入口，并在进入主流程前拒绝坏插件配置。**

## 完成内容

- `src/cli/commands/generate.ts` 已切到“先读 normalized config、再进入主流程”的入口模式，不再继续忽略磁盘配置文件。
- `src/cli/index.ts` 通过 `getOptionValueSource()` 锁定 precedence：只有用户显式传入的 CLI flags 才能覆盖 config defaults，避免 commander 默认值伪装成显式输入。
- `generate` 入口现在会在分析前硬拒绝非法插件配置，并保留旧配置文件名警告，防止 legacy 回退再次变成静默路径。
- `scripts/validate-docs.js` 与 `src/cli/__tests__/validate-docs-script.test.ts` 已补最小插件配置 guardrail，防止 canonical config example 再次漂移。

## 验证

- `pnpm exec vitest run src/cli/commands/__tests__/generate.test.ts src/cli/__tests__/generate.test.ts src/cli/__tests__/config-loader.test.ts src/cli/__tests__/validate-docs-script.test.ts`
- `node dist/cli/index.js generate`（无效插件配置 fixture，确认入口硬失败）
- `npm run docs:check`
- `npm run typecheck`
- `npm run build`

## 失败场景预演

- 若 `generate` 继续忽略配置文件，`should use config file defaults when CLI flags are omitted` 会失败。
- 若 commander 默认值继续冒充显式输入，`should let explicit CLI flags override config file defaults` 将无法稳定区分“配置默认值”和“用户覆盖值”。
- 若 README 再次写回 `codemap.config.json`，docs guardrail 会直接失败。

## 剩余风险

- 运行时插件执行、诊断输出和 `pluginReport` 尚未在本 plan 中对用户可见，这部分依旧留给 Phase 08/09。
