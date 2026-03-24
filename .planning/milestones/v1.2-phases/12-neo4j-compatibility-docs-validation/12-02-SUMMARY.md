---
phase: 12-neo4j-compatibility-docs-validation
plan: 02
subsystem: "docs-guardrail"
tags: [docs, ai-docs, schema, guardrails, storage]
requirements_completed: [DOC-05]
one_liner: "graph storage 的配置、边界与失败语义已同步进入 README / AI docs / setup / rules / schema / guardrail。"
completed: 2026-03-24
---

# 12-02 Summary

**graph storage 的配置、边界与失败语义已同步进入 README / AI docs / setup / rules / schema / guardrail。**

## 完成内容

- `README.md`、`AI_GUIDE.md`、`docs/ai-guide/COMMANDS.md`、`QUICKSTART.md`、`PATTERNS.md`、`INTEGRATION.md`、`docs/SETUP_GUIDE.md`、`docs/AI_ASSISTANT_SETUP.md`、`docs/rules/validation.md` 已同步 graph storage 叙事。
- `mycodemap.config.schema.json` 现在正式暴露 `storage` 配置。
- `scripts/validate-docs.js` 与 `src/cli/__tests__/validate-docs-script.test.ts` 已把 graph storage 文档事实写成脚本级 guardrail。

## 验证

- `npm run docs:check`
- `node dist/cli/index.js ci check-docs-sync`
- `npx vitest run src/cli/__tests__/validate-docs-script.test.ts`

## Failure Rehearsal

- 若 README 丢掉 `storage.type` 契约，docs fixture test 会失败；这条失败用例已补齐。

