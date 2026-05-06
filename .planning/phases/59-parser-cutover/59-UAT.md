---
status: complete
phase: 59-parser-cutover
source: [59-01-SUMMARY.md, 59-02-SUMMARY.md, 59-03-SUMMARY.md]
started: 2026-05-06T04:55:36Z
updated: 2026-05-06T05:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Registry-backed analyzer parse path
expected: Running `codemap generate` on a TS project uses the single registry-backed parser path (tree-sitter). No hybrid fast/smart mode selection occurs. Parse completes and produces a code map.
result: pass
evidence: `node dist/cli/index.js generate` with tree-sitter config outputs "使用默认 parser 主路径生成代码地图", produces 359 files / 1804 symbols / 82532 lines.

### 2. Deprecated parser mode rejection
expected: Passing a deprecated parser mode (fast, smart, hybrid) via config or CLI option produces a structured DEPRECATED_PARSER_MODE error with a stable error code and remediation guidance (nextCommand field), not a generic runtime crash.
result: pass
evidence: Config with `"mode": "fast"` triggers `[DEPRECATED_PARSER_MODE]` error with Suggestion and Next fields. CLI `--mode fast` also rejected.

### 3. normalizeError preserves known error codes
expected: When a known ErrorCode like DEPRECATED_PARSER_MODE flows through normalizeError(), the code and nextCommand fields survive instead of being collapsed into a generic RUNTIME_ERROR.
result: pass
evidence: Source code in errors.ts preserves known ErrorCodes; 23 error tests pass including DEPRECATED_PARSER_MODE code preservation tests.

### 4. Multi-language file discovery defaults
expected: Analyzer default include pattern covers TS/JS/Python/Go files (`src/**/*.{ts,tsx,js,jsx,py,go}`). A repo containing .py or .go source files under src/ discovers them without custom config.
result: pass
evidence: analyzer.ts includes `src/**/*.{ts,tsx,js,jsx,py,go}` in default discovery pattern.

### 5. Junk directory excludes for Python/Go
expected: Default discovery excludes filter out `.venv/**`, `**/__pycache__/**`, and `vendor/**` so Python virtualenv and Go vendor directories are not analyzed.
result: pass
evidence: file-discovery.ts DEFAULT_DISCOVERY_EXCLUDES contains `.venv/**`, `**/__pycache__/**`, `vendor/**`.

### 6. TypeScript-only type enhancement
expected: TypeScriptTypeEnhancer enriches only .ts/.tsx parse results with type/call-graph/complexity data. Non-TS files (.js, .py, .go) pass through structural-only results without enhancement.
result: pass
evidence: TypeScriptTypeEnhancer.ts only activates for .ts/.tsx extensions; analyzer wires it as post-parse step for TS files only.

### 7. CLI help text reflects single parser path
expected: CLI help (`codemap --help` or `codemap generate --help`) shows tree-sitter as the parser mode and does not present fast/smart/hybrid as valid runtime options.
result: pass
evidence: `generate --help` shows `-m, --mode <mode> Parser 兼容输入；默认使用单一路径 parser，fast/smart/hybrid 将返回废弃错误 (default: "tree-sitter")`.

### 8. Config defaults use tree-sitter and reject deprecated modes
expected: Config loading defaults to tree-sitter parser mode. Specifying fast/smart/hybrid in config file triggers DEPRECATED_PARSER_MODE rejection.
result: pass
evidence: config-loader.ts DEFAULT_CONFIG_MODE = 'tree-sitter'; lines 130-136 check and reject fast/smart/hybrid with DEPRECATED_PARSER_MODE error code. 11 config-loader tests pass.

### 9. generateCommand actionable error formatting
expected: When generateCommand encounters a failure (e.g., deprecated mode), it outputs an actionable formatted error through the error output layer, not a raw stringified error dump.
result: pass
evidence: generate.ts catch block uses `formatError(error, 'human', 'mycodemap generate')`; output shows structured Attempted/Root cause/Suggestion/Next fields.

### 10. Server request types aligned to rejected-compatibility
expected: Server/API request types may still accept deprecated parser mode values for compatibility, but they are rejected at runtime with DEPRECATED_PARSER_MODE, not silently accepted as healthy modes.
result: issue
reported: "AnalyzeRequest type still accepts 'fast'|'smart'|'hybrid' in options.mode, but analyze() throws 501 UnsupportedAnalysisOperationError for ALL requests — deprecated modes are never validated or rejected with DEPRECATED_PARSER_MODE specifically. The type signature implies these are accepted compatibility values but there's no runtime path that processes them."
severity: minor

### 11. Documentation sync with cutover
expected: docs/ai-guide/OUTPUT.md and ARCHITECTURE.md describe the single tree-sitter parser path and do not reference fast/smart/hybrid as active runtime modes.
result: pass
evidence: OUTPUT.md and ARCHITECTURE.md updated to describe tree-sitter only path; no active fast/smart/hybrid references remain.

### 12. Failure-path tests pass
expected: Tests for DEPRECATED_PARSER_MODE (preserving nextCommand + remediation) and WASM fallback contract all pass.
result: pass
evidence: 46/46 tests pass across 3 test files (errors: 23, config-loader: 11, generate: 12).

### 13. TypeScript compilation clean
expected: `tsc --noEmit` produces zero errors — no type regressions from the cutover changes.
result: pass
evidence: `npx tsc --noEmit` → "No errors found"

## Summary

total: 13
passed: 12
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Server request types accept deprecated mode values for compatibility but reject them at runtime with DEPRECATED_PARSER_MODE"
  status: failed
  reason: "AnalyzeRequest type still accepts 'fast'|'smart'|'hybrid' but analyze() throws 501 for ALL requests — no specific DEPRECATED_PARSER_MODE rejection path exists for server-side deprecated modes"
  severity: minor
  test: 10
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
