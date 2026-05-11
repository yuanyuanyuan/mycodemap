---
status: complete
phase: 45-failure-to-action-protocol
source: 45-SUMMARY.md
started: 2026-05-01T00:00:00Z
updated: 2026-05-11T03:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. ActionableError 结构化错误输出
expected: 触发一个 codemap 命令错误时，错误输出应包含 attempted、rootCause、remediationPlan、confidence、nextCommand 字段。
result: pass
evidence: `src/cli/output/__tests__/errors.test.ts` 覆盖结构化字段断言；本次定向回归命令 `rtk ./node_modules/.bin/vitest run src/cli/output/__tests__/errors.test.ts src/cli/output/__tests__/apply-suggestion.test.ts src/cli/output/__tests__/wasm-fallback.test.ts src/cli/commands/__tests__/analyze-output.test.ts src/cli/commands/__tests__/query-output.test.ts src/cli/commands/__tests__/deps-output.test.ts` 全量通过。

### 2. JSON 模式错误输出
expected: 使用 `--json` 标志时，错误输出为有效的结构化 JSON，包含 ActionableError 所有字段。
result: pass
evidence: `errors.test.ts`、`analyze-output.test.ts`、`query-output.test.ts`、`deps-output.test.ts` 都对 JSON 输出做了解析与字段断言。

### 3. Human 模式错误输出
expected: 不使用 `--json` 时，错误消息为人类可读格式，包含具体操作上下文。
result: pass
evidence: `errors.test.ts`、`analyze-output.test.ts`、`query-output.test.ts`、`deps-output.test.ts` 都断言了 human 模式中的上下文文案。

### 4. Native 依赖失败自动建议 WASM Fallback
expected: 当 tree-sitter 或 better-sqlite3 加载失败时，错误消息包含 `DEP_NATIVE_MISSING` 和 `--wasm-fallback` 建议。
result: pass
evidence: `errors.test.ts` 覆盖 tree-sitter / better-sqlite3 自动识别；`wasm-fallback.test.ts` 覆盖 `DEP_NATIVE_MISSING`、置信度与 remediation 文案。

### 5. --apply-suggestion 自动修复
expected: 使用 `--apply-suggestion` 标志时，agent 可以尝试执行 `nextCommand` 中的修复建议。
result: pass
evidence: `apply-suggestion.test.ts` 覆盖成功执行、失败执行与尝试日志记录。

### 6. Confidence 阈值保护
expected: 只有 `confidence >= 0.8` 的建议才会被执行；低置信度建议只显示不执行。
result: pass
evidence: `apply-suggestion.test.ts` 包含 low-confidence 分支，断言不会执行命令。

### 7. analyze 命令错误上下文
expected: analyze 命令出错时，`attempted` 字段显示 `codemap analyze` 而非 `unknown operation`。
result: pass
evidence: `src/cli/commands/__tests__/analyze-output.test.ts` 同时断言 JSON 与 human 模式中的 `codemap analyze` 上下文。

### 8. query 命令错误上下文
expected: query 命令出错时，`attempted` 字段显示具体操作上下文。
result: pass
evidence: `src/cli/commands/__tests__/query-output.test.ts` 断言 `codemap query` 被正确透传到输出层。

### 9. deps 命令错误上下文
expected: deps 命令出错时，`attempted` 字段显示具体操作上下文。
result: pass
evidence: `src/cli/commands/__tests__/deps-output.test.ts` 断言 `codemap deps` 在 JSON 与 human 输出中都存在。

### 10. 单元测试通过
expected: 运行聚焦测试命令，关键错误输出、fallback、apply-suggestion 与命令上下文测试全部通过。
result: pass
evidence: `rtk ./node_modules/.bin/vitest run src/cli/output/__tests__/errors.test.ts src/cli/output/__tests__/apply-suggestion.test.ts src/cli/output/__tests__/wasm-fallback.test.ts src/cli/commands/__tests__/analyze-output.test.ts src/cli/commands/__tests__/query-output.test.ts src/cli/commands/__tests__/deps-output.test.ts` => `Test Files 6 passed (6)`，`Tests 66 passed (66)`。

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
