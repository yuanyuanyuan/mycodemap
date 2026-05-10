---
phase: 71
slug: parser-legacy-cleanup
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-10
---

# Phase 71 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `./node_modules/.bin/vitest run src/core/__tests__/analyzer.test.ts src/cli/commands/__tests__/generate.test.ts src/cli/commands/__tests__/watch-foreground.test.ts src/parser/__tests__/tree-sitter-parser.test.ts src/infrastructure/parser/__tests__/ParserRegistry.test.ts src/infrastructure/parser/__tests__/TypeScriptParser.test.ts src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds quick / repo suite depends on host |

---

## Sampling Rate

- **After every task commit:** Run the quick run command above
- **After every plan wave:** Run `npm test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 71-01-01 | 01 | 1 | PAR-09 | T-71-01 | Core consumes registry `ParseResult` directly and no longer depends on legacy adapter shims | unit | `./node_modules/.bin/vitest run src/core/__tests__/analyzer.test.ts` | ✅ | ✅ green |
| 71-01-02 | 01 | 1 | PAR-09 | T-71-04 | Compatibility parser entry no longer reintroduces `toLegacyParseResult` while preserving deprecated external flow | unit | `./node_modules/.bin/vitest run src/parser/__tests__/tree-sitter-parser.test.ts src/infrastructure/parser/__tests__/TypeScriptParser.test.ts` | ✅ | ✅ green |
| 71-01-03 | 01 | 1 | PAR-09 | T-71-04 | Legacy parser contracts remain compatibility-only and active runtime stays on interface-layer types | unit | `./node_modules/.bin/vitest run src/core/__tests__/analyzer.test.ts` | ✅ | ✅ green |
| 71-02-01 | 02 | 1 | PAR-10 | T-71-02 | Infrastructure-owned `TreeSitterParser` parses TS/JS and preserves shared AST behavior | unit | `./node_modules/.bin/vitest run src/parser/__tests__/tree-sitter-parser.test.ts src/infrastructure/parser/__tests__/TypeScriptParser.test.ts` | ✅ | ✅ green |
| 71-02-02 | 02 | 1 | PAR-10 | T-71-02 | Default registry routes TS/JS to `TreeSitterParser` and PY to `PythonTreeSitterParser` on the active path | unit | `./node_modules/.bin/vitest run src/infrastructure/parser/__tests__/ParserRegistry.test.ts src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` | ✅ | ✅ green |
| 71-02-03 | 02 | 1 | PAR-10 | T-71-02 | Legacy `src/parser/implementations/tree-sitter-parser.ts` is no longer the active internal path | integration | `./node_modules/.bin/vitest run src/parser/__tests__/tree-sitter-parser.test.ts src/infrastructure/parser/__tests__/ParserRegistry.test.ts` | ✅ | ✅ green |
| 71-03-01 | 03 | 2 | PAR-11 | T-71-01 | Interface-layer analysis options accept injected parser resolver abstractions without Core factory imports | unit | `./node_modules/.bin/vitest run src/core/__tests__/analyzer.test.ts` | ✅ | ✅ green |
| 71-03-02 | 03 | 2 | PAR-11 | T-71-01 | Analyzer fails closed on parse skips and still reports partial graph state instead of silently succeeding | unit | `./node_modules/.bin/vitest run src/core/__tests__/analyzer.test.ts` | ✅ | ✅ green |
| 71-03-03 | 03 | 2 | PAR-11 | T-71-01 | Internal imports use infrastructure `TypeScriptTypeEnhancer` path and keep Python enhancement contract intact | unit | `./node_modules/.bin/vitest run src/core/__tests__/analyzer.test.ts src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` | ✅ | ✅ green |
| 71-03-04 | 03 | 2 | PAR-11 | T-71-03 | CLI `generate` and `watch-foreground` both operate through the injected composition root without reviving deprecated runtime modes | unit | `./node_modules/.bin/vitest run src/cli/commands/__tests__/generate.test.ts src/cli/commands/__tests__/watch-foreground.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-10
