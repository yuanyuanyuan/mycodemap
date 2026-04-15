---
status: complete
phase: 18-design-to-code-mapping
source:
  - 18-01-SUMMARY.md
  - 18-02-SUMMARY.md
  - 18-03-SUMMARY.md
started: 2026-03-25T09:55:27Z
updated: 2026-03-25T09:55:27Z
---

## Current Test

[testing complete]

## Tests

### 1. Design Map Help Surface
expected: 运行 `node dist/cli/index.js design map --help` 时，帮助文本明确显示 `design map [file]`、`--json` 机器输出模式，以及该命令用于把 design contract 映射到 candidate code scope。
result: pass

### 2. Human Mapping Output
expected: 运行 `node dist/cli/index.js design map tests/fixtures/design-contracts/mapping-basic.design.md` 时，CLI 会返回可读的 mapping 结果，包含 `Design mapping ready`、candidate 列表、每个 candidate 的 `Reasons`、`Risk`、`Confidence`、`Unknowns` 与 `Diagnostics` 摘要。
result: pass

### 3. JSON Mapping Contract
expected: 运行 `node dist/cli/index.js design map tests/fixtures/design-contracts/mapping-basic.design.md --json` 时，命令退出码为 `0`，返回结构化 JSON；至少包含 1 个 candidate，且每个 candidate 都带有 `reasons`、`dependencies`、`testImpact`、`risk`、`confidence` 与 `unknowns` 字段，`diagnostics` 为空。
result: pass

### 4. No Candidates Blocker
expected: 运行 `node dist/cli/index.js design map tests/fixtures/design-contracts/no-match.design.md --json` 时，命令以非零退出码失败，且 `diagnostics[0].code` 为 `no-candidates`，明确要求人类补充设计而不是继续假装可规划。
result: pass

### 5. Over-Broad Blocker
expected: 运行 `node dist/cli/index.js design map tests/fixtures/design-contracts/over-broad.design.md --json` 时，命令以非零退出码失败，且 `diagnostics[0].code` 为 `over-broad-scope`，明确阻断过宽的设计范围。
result: pass

### 6. High-Risk Blocker
expected: 运行 `node dist/cli/index.js design map tests/fixtures/design-contracts/high-risk.design.md --json` 时，命令以非零退出码失败，且 `diagnostics[0].code` 为 `high-risk-scope`，不会在高风险 blast radius 下继续给出误导性的执行范围。
result: pass

### 7. Docs Surface And Guardrail
expected: 运行 `npm run docs:check:human` 后文档护栏通过；同时在 `README.md` / `AI_GUIDE.md` / `docs/ai-guide/*` / `docs/rules/*` 中能找到 `design validate → design map` 最小工作流，以及 `design map --json`、`candidates`、`unknowns`、`diagnostics` 的正式入口。
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
