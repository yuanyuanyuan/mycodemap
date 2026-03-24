# 06-03 Summary

## 完成内容

- `scripts/validate-docs.js` 新增 workflow / discovery / ci-ship 边界检查，防止 README、AI docs、规则文档再次漂移。
- `src/cli/__tests__/validate-docs-script.test.ts` 新增“README 回退到非递归 exclude”“AI commands guide 丢失 workflow 四阶段边界”等失败用例。
- 完成 workflow / ship / ci / scanner / docs guardrail 的最终回归，并确认 `docs:check`、`check-docs-sync`、`build`、`lint` 均可通过。

## 验证

- `pnpm exec vitest run src/cli/__tests__/validate-docs-script.test.ts src/cli/commands/__tests__/ci-docs-sync.test.ts`
- `pnpm exec vitest run src/orchestrator/workflow/__tests__ src/orchestrator/__tests__/file-header-scanner.test.ts src/cli/commands/__tests__/ci-gate-checks.test.ts src/cli/commands/ship/__tests__/quality-rules.test.ts src/cli/commands/ship/__tests__/pipeline.test.ts`
- `npm run docs:check`
- `node dist/cli/index.js ci check-docs-sync`
- `npm run lint`
- `npm run build`

## 失败场景预演

- README 把 `**/*.test.ts` 改回 `*.test.ts` → docs guardrail 失败。
- `docs/ai-guide/COMMANDS.md` 丢失 workflow 四阶段边界 → docs guardrail 失败。

## 剩余风险

- milestone 已完成；剩余风险主要是历史文档与 archive 内容未纳入本轮 guardrail，属于后续整理范畴。
