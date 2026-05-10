---
phase: 68
slug: multi-language-parser-switching
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-10
---

# Phase 68 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `./node_modules/.bin/vitest run src/cli/__tests__/wasm-fallback.test.ts src/cli/commands/__tests__/doctor-native-deps.test.ts src/parser/__tests__/tree-sitter-parser.test.ts src/infrastructure/parser/__tests__/ParserRegistry.test.ts src/infrastructure/parser/__tests__/TypeScriptParser.test.ts src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts src/core/__tests__/analyzer.test.ts` |
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
| 68-01-01 | 01 | 1 | PY-03 / PY-04 | T-68-01-2 | Shared loader exposes TS + Python grammars under one native/WASM contract | unit | `./node_modules/.bin/vitest run src/cli/__tests__/wasm-fallback.test.ts src/cli/commands/__tests__/doctor-native-deps.test.ts` | ✅ | ✅ green |
| 68-01-02 | 01 | 1 | PY-03 | T-68-01-1 | Shared `TreeSitterParser` switches grammar by extension and emits one parser identity across `.ts` and `.py` | unit | `./node_modules/.bin/vitest run src/parser/__tests__/tree-sitter-parser.test.ts` | ✅ | ✅ green |
| 68-01-03 | 01 | 1 | PY-03 / PY-04 | T-68-01-3 | TS/JS and Python main-path routing both use the shared Tree-sitter capability while Python still fails closed | integration | `./node_modules/.bin/vitest run src/infrastructure/parser/__tests__/ParserRegistry.test.ts src/infrastructure/parser/__tests__/TypeScriptParser.test.ts src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` | ✅ | ✅ green |
| 68-02-01 | 02 | 2 | PY-03 | T-68-02-1 | One shared parser implementation is directly proven on both `.ts` and `.py` inputs | unit | `./node_modules/.bin/vitest run src/parser/__tests__/tree-sitter-parser.test.ts` | ✅ | ✅ green |
| 68-02-02 | 02 | 2 | PY-03 | T-68-02-3 | Registry and analyzer tests detect real TS/JS main-path cutover instead of regex assumptions | integration | `./node_modules/.bin/vitest run src/infrastructure/parser/__tests__/ParserRegistry.test.ts src/infrastructure/parser/__tests__/TypeScriptParser.test.ts src/core/__tests__/analyzer.test.ts` | ✅ | ✅ green |
| 68-02-03 | 02 | 2 | PY-04 | T-68-02-2 | Python grammar-unavailable path fails explicitly and does not silently drop to regex | unit | `./node_modules/.bin/vitest run src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` | ✅ | ✅ green |

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

