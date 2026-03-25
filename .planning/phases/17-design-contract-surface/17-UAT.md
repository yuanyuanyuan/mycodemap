---
status: complete
phase: 17-design-contract-surface
source:
  - 17-01-SUMMARY.md
  - 17-02-SUMMARY.md
  - 17-03-SUMMARY.md
started: 2026-03-24T19:57:46Z
updated: 2026-03-25T02:34:38Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: 在全新 shell 中直接运行 `node dist/cli/index.js --help`，随后运行 `node dist/cli/index.js design validate tests/fixtures/design-contracts/valid-basic.design.md --json`。CLI 能冷启动成功，不出现入口或模块错误；顶层帮助可看到 `design`；第二条命令返回结构化 JSON 且整体流程可从零启动完成。
result: pass

### 2. Design Contract Template Discoverability
expected: 在 `README.md` 或 AI 文档中能找到 `mycodemap.design.md` 与 `mycodemap design validate mycodemap.design.md --json` 的正式入口，并能定位到 canonical 模板 `docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md`。
result: pass

### 3. Design Validate Help Surface
expected: 运行 `node dist/cli/index.js design validate --help` 时，帮助文本明确显示 `validate` 的用途、可选 `[file]` 参数，以及 `--json` 机器输出模式。
result: pass

### 4. Valid Contract Returns JSON Success
expected: 运行 `node dist/cli/index.js design validate tests/fixtures/design-contracts/valid-basic.design.md --json` 时，命令退出码为 `0`，返回结构化 JSON，且能明确看出校验成功而不是人类描述文本。
result: pass

### 5. Missing Acceptance Returns Diagnostics
expected: 运行 `node dist/cli/index.js design validate tests/fixtures/design-contracts/missing-acceptance.design.md --json` 时，命令退出码非 `0`，JSON 中明确指出缺失必填 `Acceptance` section 的 diagnostics。
result: pass

### 6. Docs Guardrail Surface
expected: 运行 `npm run docs:check` 与 `node dist/cli/index.js ci check-docs-sync` 时，文档校验通过，不再把 workflow 错写成 `commit/ci` 六阶段，也不会遗漏 `design validate` surface。
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
