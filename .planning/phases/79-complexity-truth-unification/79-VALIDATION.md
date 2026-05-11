---
phase: 79
slug: complexity-truth-unification
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-11
---

# Phase 79 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `rtk ./node_modules/.bin/vitest run src/core/__tests__/ast-complexity-analyzer.test.ts src/core/__tests__/analyzer.test.ts src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts src/infrastructure/parser/__tests__/GoParser.test.ts` |
| **Full suite command** | `rtk ./node_modules/.bin/vitest run src/core/__tests__/ast-complexity-analyzer.test.ts src/core/__tests__/analyzer.test.ts src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts src/infrastructure/parser/__tests__/GoParser.test.ts src/cli/commands/__tests__/complexity-command.test.ts src/parser/__tests__/smart-parser.test.ts && rtk npx tsc --noEmit` |
| **Estimated runtime** | Quick: ~6-8s; full: ~10-15s |

## Sampling Rate

- **After every task commit:** Run the task-local verify command from `79-01-PLAN.md`; default quick smoke is the parser/analyzer subset command above.
- **After every plan wave:** Run the full suite command plus typecheck.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 15 seconds.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 79-01-01 | 01 | 1 | POL-01 | T-79-01 | canonical analyzer API covers TS/JS/Python/Go content paths and blocks silent drift at the test seam | unit | `rtk ./node_modules/.bin/vitest run src/core/__tests__/ast-complexity-analyzer.test.ts src/core/__tests__/analyzer.test.ts src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts src/infrastructure/parser/__tests__/GoParser.test.ts src/cli/commands/__tests__/complexity-command.test.ts src/parser/__tests__/smart-parser.test.ts` | ✅ extend existing | ✅ green |
| 79-01-02 | 01 | 1 | POL-01 | T-79-01 / T-79-04 | active TS/JS/Python/Go parser adapters all delegate complexity production through the canonical analyzer without reopening parser-routing scope | unit | `rtk ./node_modules/.bin/vitest run src/core/__tests__/ast-complexity-analyzer.test.ts src/core/__tests__/analyzer.test.ts src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts src/infrastructure/parser/__tests__/GoParser.test.ts` | ✅ extend existing | ✅ green |
| 79-01-03 | 01 | 1 | POL-01 | T-79-02 / T-79-03 | CLI default path stops emitting silent non-canonical values and deprecated smart-parser no longer drifts silently from canonical truth | unit + command | `rtk ./node_modules/.bin/vitest run src/cli/commands/__tests__/complexity-command.test.ts src/parser/__tests__/smart-parser.test.ts src/core/__tests__/analyzer.test.ts && rtk npx tsc --noEmit` | ✅ extend existing | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

## Manual-Only Verifications

All phase behaviors have automated verification.

## Validation Audit 2026-05-11

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Audit evidence:
- `rtk ./node_modules/.bin/vitest run src/core/__tests__/ast-complexity-analyzer.test.ts src/core/__tests__/analyzer.test.ts src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts src/infrastructure/parser/__tests__/GoParser.test.ts src/cli/commands/__tests__/complexity-command.test.ts src/parser/__tests__/smart-parser.test.ts`
- `rtk ./node_modules/.bin/vitest run src/core/__tests__/ast-complexity-analyzer.test.ts src/core/__tests__/analyzer.test.ts src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts src/infrastructure/parser/__tests__/GoParser.test.ts`
- `rtk ./node_modules/.bin/vitest run src/cli/commands/__tests__/complexity-command.test.ts src/parser/__tests__/smart-parser.test.ts src/core/__tests__/analyzer.test.ts && rtk npx tsc --noEmit`

Notes:
- Python-related runs used the existing WASM fallback path because native tree-sitter was unavailable in this environment; tests still passed on the supported fallback surface.
- Some test fixtures intentionally emit non-existent-file warnings or simulated parse-skip warnings; these are expected assertions, not validation failures.

## Validation Sign-Off

- [x] All tasks have `<automated>` verify coverage.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 coverage exists inside existing test seams; no extra harness is required.
- [x] No watch-mode flags in validation commands.
- [x] Feedback latency < 15s.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** verified 2026-05-11
