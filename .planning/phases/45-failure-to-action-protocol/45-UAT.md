---
status: testing
phase: 45-failure-to-action-protocol
source: 45-SUMMARY.md
started: 2026-05-01T00:00:00Z
updated: 2026-05-01T00:00:00Z
---

## Current Test

number: 1
name: ActionableError 结构化错误输出
expected: |
  触发一个 codemap 命令错误（例如在不存在的目录上运行 `codemap analyze` 或传入无效参数），错误输出应包含 attempted、rootCause、remediationPlan、confidence、nextCommand 字段。
awaiting: user response

## Tests

### 1. ActionableError 结构化错误输出
expected: 错误输出包含 attempted、rootCause、remediationPlan、confidence、nextCommand 字段
result: [pending]

### 2. JSON 模式错误输出
expected: 使用 --json 标志时，错误输出为有效的结构化 JSON，包含 ActionableError 所有字段
result: [pending]

### 3. Human 模式错误输出
expected: 不使用 --json 时，错误消息为人类可读格式，包含具体操作上下文（如 "codemap analyze" 而非 "unknown operation"）
result: [pending]

### 4. Native 依赖失败自动建议 WASM Fallback
expected: 当 tree-sitter 或 better-sqlite3 加载失败时，错误消息包含 DEP_NATIVE_MISSING 代码和 --wasm-fallback 建议
result: [pending]

### 5. --apply-suggestion 自动修复
expected: 使用 --apply-suggestion 标志时，agent 可以尝试执行 nextCommand 中的修复建议
result: [pending]

### 6. Confidence 阈值保护
expected: 只有 confidence >= 0.8 的建议才会被执行；低 confidence 建议只显示不执行
result: [pending]

### 7. analyze 命令错误上下文
expected: analyze 命令出错时，attempted 字段显示 "codemap analyze" 而非 "unknown operation"
result: [pending]

### 8. query 命令错误上下文
expected: query 命令出错时，attempted 字段显示具体操作上下文
result: [pending]

### 9. deps 命令错误上下文
expected: deps 命令出错时，attempted 字段显示具体操作上下文
result: [pending]

### 10. 单元测试通过
expected: 运行测试命令，所有测试通过（关键：apply-suggestion 6 个、wasm-fallback 6 个、errors 21 个）
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0

## Gaps

[none yet]
