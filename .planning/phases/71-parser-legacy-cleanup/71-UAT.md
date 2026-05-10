---
status: complete
phase: 71-parser-legacy-cleanup
source:
  - 71-01-SUMMARY.md
  - 71-02-SUMMARY.md
  - 71-03-SUMMARY.md
started: 2026-05-10T01:40:00+08:00
updated: 2026-05-10T07:10:44+08:00
---

## Current Test

[testing complete]

## Tests

### 1. TypeScript Project Analysis (Regression)
expected: 在一个 TypeScript 项目上运行 `mycodemap generate` 时，输出应包含模块列表、imports、exports、symbols；不应出现 `actualMode` 字段，也不应出现 `Mode: Fast/Smart` banner；在适用时应有 `callGraph` 和 `complexity`；只有 native tree-sitter 不可用时才出现 WASM fallback warning。
result: pass

### 2. Python Project Analysis (Regression)
expected: 在一个 Python 项目上运行 `mycodemap generate` 时，`.py` 文件会被发现并解析；registry 会把 `.py` 路由到 Python parser；不会出现 `.py` 的 parser-not-found warning。
result: pass

### 3. Go Project Analysis (Regression)
expected: 在一个 Go 项目上运行 `mycodemap generate` 时，`.go` 文件会被发现并解析；registry 会把 `.go` 路由到 Go parser。
result: pass

### 4. Deprecated Mode Rejection (Regression)
expected: 运行 `mycodemap generate -m fast` 会返回 `DEPRECATED_PARSER_MODE` 错误，包含 `rootCause`、`remediationPlan`、`nextCommand: 'mycodemap doctor'`，且退出码非零。
result: pass

### 5. TreeSitterParser is Registered
expected: 运行 `mycodemap query -s "TreeSitterParser" -j` 时，结果应指向 `src/infrastructure/parser/implementations/TreeSitterParser.ts`，不应再指向 `src/parser/implementations/tree-sitter-parser.ts`。
result: pass

### 6. No Adapter Functions in Runtime
expected: 运行 `rtk rg "convertRegistryResultToLegacyResult|toLegacyParseResult" src/core/ src/parser/` 时，active runtime 文件中不应有匹配。
result: pass

### 7. No Core→Infrastructure Direct Import
expected: 运行 `rtk rg "import.*createDefaultParserRegistry" src/core/` 时，不应有匹配。
result: pass

### 8. TypeScriptTypeEnhancer in Infrastructure
expected: 运行 `rtk rg "from.*parser/enhancers/TypeScriptTypeEnhancer" src/core/ src/cli/commands/generate.ts` 时，内部导入应指向 `src/infrastructure/parser/enhancers/`，不应再指向旧路径。
result: pass

### 9. Multi-language Mixed Repo
expected: 在一个同时包含 `.ts`、`.py`、`.go` 的仓库上运行 `mycodemap generate` 时，三种语言都应出现在输出中，且不会出现 `No parser registered for ...` warning。
result: pass

### 10. Type Check and Test Suite
expected: 运行 `npx tsc --noEmit`、`./node_modules/.bin/vitest run src/core/__tests__/analyzer.test.ts`、`./node_modules/.bin/vitest run src/infrastructure/parser/__tests__` 时应全部通过。
result: pass

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
