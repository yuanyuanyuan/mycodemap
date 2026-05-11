---
status: complete
phase: 78-intelligence-layer-trends-and-distribution
source:
  - 78-01-SUMMARY.md
started: 2026-05-11T10:49:00+08:00
updated: 2026-05-11T10:59:00+08:00
---

## Current Test

[testing complete]

## Tests

### 1. Multi-Run JSON Intelligence Surface
expected: 在至少两个 persisted runs 存在时，`codemap agent-metrics report --json` 应返回 additive intelligence 字段：`queryTypeTrends`、`highestCostQueryTypes`、`highestCostRows`，以及 `queryTypeSummaries[*].historicalSampleCount` / `p50EstimatedTotalTokens` / `p95EstimatedTotalTokens`。
result: pass

### 2. Single-Run Missing-Baseline Honesty
expected: 当只保留一个 persisted run 时，`codemap agent-metrics report --human` 的趋势段必须打印 `Baseline unavailable for comparison.`，而不是伪造 previous/delta。
result: pass

### 3. Gate Semantics Unchanged on Fail Path
expected: 运行 `codemap agent-metrics report --max-tokens-per-query 150 --json` 时，Phase 78 只能增加 advisory 字段，不能改变 Phase 77 的 gate 语义；命令仍应返回 `gate.verdict=fail` 且退出码非零。
result: pass

### 4. Equality Threshold Pass and Readable Advisory Copy
expected: 运行 `codemap agent-metrics report --max-tokens-per-query 1140 --json` 时，worst row equality 不应误判失败；同时 human 输出的 `Highest cost query types:` 与 `Highest cost samples:` 应包含可读的 `riskNote` 文案，而不是第二套 pass/fail policy。
result: pass

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

none
