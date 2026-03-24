---
phase: 09-plugin-docs-validation
plan: 02
subsystem: "guardrail-e2e"
tags: [plugins, guardrail, validation, e2e]
requirements_completed: [DOC-04, VAL-01]
one_liner: "插件产品面已被 docs guardrail 与真实 CLI built-in/user plugin 双场景证据锁定。"
completed: 2026-03-24
---

# 09-02 Summary

**插件产品面已被 docs guardrail 与真实 CLI built-in/user plugin 双场景证据锁定。**

## 完成内容

- `scripts/validate-docs.js` 已新增插件相关断言：配置文件名、配置表示例、Plugin Summary、`pluginReport` 契约与 diagnostics 说明都进入脚本级护栏。
- `src/cli/__tests__/validate-docs-script.test.ts` 已补插件文档漂移失败用例，防止 README / OUTPUT guide 再次背离实现。
- 完成 built-in plugin 与 user plugin 的真实 CLI 双场景验证，证明插件不只是 mock 测试里可用。

## 验证

- `pnpm exec vitest run src/cli/__tests__/validate-docs-script.test.ts src/cli/__tests__/validate-ai-docs-script.test.ts src/cli/commands/__tests__/generate.test.ts`
- `npm run docs:check`
- `npm run typecheck`
- `npm run build`
- 真实 CLI built-in / user plugin fixture 双场景验证

## 失败场景预演

- README 回退旧配置文件名 → docs guardrail 失败。
- OUTPUT guide 改掉 `pluginReport` 字段名 → docs guardrail 失败。
- user plugin 如果真实 CLI 下加载失败 → `good.txt` 不会出现，`USER_LOADED` 断言会直接失败。
