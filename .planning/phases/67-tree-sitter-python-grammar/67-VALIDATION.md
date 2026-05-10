---
phase: 67
slug: tree-sitter-python-grammar
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-10
---

# Phase 67 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `./node_modules/.bin/vitest run src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~2 seconds quick / repo suite depends on host |

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
| 67-T1 | TREE-SITTER-PYTHON | 1 | PY-01 | supply-chain / runtime-availability | `tree-sitter-python@0.23.4` is installed and locked into the workspace dependency graph | integration | `npm ls tree-sitter-python && npx tsc --noEmit` | ✅ | ✅ green |
| 67-T2 | TREE-SITTER-PYTHON | 1 | PY-01 | breaking-change | `ParseResult` exposes optional `parserUsed` without breaking existing parsers | unit | `npx tsc --noEmit` | ✅ | ✅ green |
| 67-T3 | TREE-SITTER-PYTHON | 2 | PY-01 | runtime-availability | `PythonTreeSitterParser` initializes with native-first / WASM fallback and fails explicitly when grammar is unavailable | unit | `./node_modules/.bin/vitest run src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` | ✅ | ✅ green |
| 67-T4 | TREE-SITTER-PYTHON | 3 | PY-02 | — | Python fixtures cover nested definitions, multiline imports, decorators, async, and multiple inheritance | unit | `./node_modules/.bin/vitest run src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` | ✅ | ✅ green |
| 67-T5 | TREE-SITTER-PYTHON | 3 | PY-02 | — | Dedicated parser tests prove AST extraction beats regex on nested structures | unit | `./node_modules/.bin/vitest run src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` | ✅ | ✅ green |
| 67-T6 | TREE-SITTER-PYTHON | 4 | PY-01 / PY-02 | runtime-availability | Parser registry routes `.py` to `PythonTreeSitterParser` instead of the regex parser | unit | `./node_modules/.bin/vitest run src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` | ✅ | ✅ green |
| 67-T7 | TREE-SITTER-PYTHON | 4 | PY-01 / PY-02 | — | Phase-wide typecheck and parser regression proof stay green after registry cutover | integration | `npx tsc --noEmit && ./node_modules/.bin/vitest run src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` | ✅ | ✅ green |

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

