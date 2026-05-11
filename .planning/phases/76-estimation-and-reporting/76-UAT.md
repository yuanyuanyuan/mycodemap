---
status: complete
phase: 76-estimation-and-reporting
source:
  - 76-01-SUMMARY.md
started: 2026-05-10T00:00:00Z
updated: 2026-05-10T09:43:00Z
---

## Current Test

number: complete
name: All tests complete
expected: |
  Phase 76 的 4 个 UAT 检查点均已通过，包括 human report 布局、grouped JSON summary、bare root 兼容，以及 explicit report 的 no-run 错误行为。
awaiting: none

## Tests

### 1. Human Report Layout
expected: `codemap agent-metrics report --human` 应显示 summary + grouped table + raw row table
result: pass

### 2. Grouped JSON Summary
expected: `codemap agent-metrics report --json` 应包含 `queryTypeSummaries`，并保留 `rows`、`totals`、`schemaVersion`
result: pass

### 3. Bare Root Auto-Run Compatibility
expected: bare `codemap agent-metrics --json` 仍应闭合到 report 输出，不破坏原有便捷入口
result: pass

### 4. Explicit Report No-Run Error
expected: 在没有 persisted run 的目录里执行 `codemap agent-metrics report --json` 应返回明确错误和 remediation，而不是静默自动测量
result: pass

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0

## Gaps

none yet
