---
phase: 09-plugin-docs-validation
plan: 01
subsystem: "docs-sync"
tags: [plugins, docs, ai-docs, contract]
requirements_completed: [DOC-03]
one_liner: "README 与 AI 文档已统一收口到插件配置、Plugin Summary 和 pluginReport 契约。"
completed: 2026-03-24
---

# 09-01 Summary

**README 与 AI 文档已统一收口到插件配置、Plugin Summary 和 pluginReport 契约。**

## 完成内容

- `README.md` 已补插件配置表、示例配置和 `pluginReport` / `Plugin Summary` 说明。
- `AI_GUIDE.md` 已增加“需要插件诊断/扩展结果”速查项，并补 `PluginExecutionReport` 结构说明。
- `docs/ai-guide/COMMANDS.md`、`OUTPUT.md`、`QUICKSTART.md`、`INTEGRATION.md` 已同步插件配置入口、输出契约和诊断排查路径。
- 所有文档都统一为 `mycodemap.config.json` 主叙事，并明确 `generate` 不提供独立 `--plugin` flags。

## 验证

- `npm run docs:check`
- `pnpm exec vitest run src/cli/__tests__/validate-docs-script.test.ts src/cli/__tests__/validate-ai-docs-script.test.ts`

## 失败场景预演

- 若 README 再写回 `codemap.config.json`，plugin config 文档将与 `init` / schema 漂移，docs guardrail 会失败。
- 若 OUTPUT guide 丢失 `pluginReport` 字段，AI 将无法稳定消费插件结果；本轮已补专门失败用例锁住。
