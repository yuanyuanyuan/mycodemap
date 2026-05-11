---
phase: 70
slug: python-call-graph-extraction
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-10
---

# Phase 70 — Validation Strategy

> Per-phase validation contract for `PY-07`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `rtk ./node_modules/.bin/vitest run src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts src/core/__tests__/global-index.test.ts src/core/__tests__/analyzer.test.ts` |
| **Full suite command** | `rtk npm test` |
| **Type check** | `rtk npx tsc --noEmit` |
| **Estimated runtime** | ~30-45 seconds |

---

## Sampling Rate

- **After every task commit:** Run that task’s focused automated command first.
- **After the full plan wave:** Run parser + global-index + analyzer focused suites together, then `rtk npx tsc --noEmit`.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 45 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 70-01-01 | 01 | 1 | PY-07 | T-70-01 / T-70-04 | Shared contract exposes proven edges and explicit non-edge outcomes through parser/global-index/analyzer tests | unit+integration | `rtk ./node_modules/.bin/vitest run src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts src/core/__tests__/global-index.test.ts src/core/__tests__/analyzer.test.ts` | ✅ | ⬜ pending |
| 70-01-02 | 01 | 1 | PY-07 | T-70-01 / T-70-02 | Python parser emits high-confidence local call truth and refuses dynamic guessing | unit | `rtk ./node_modules/.bin/vitest run src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` | ✅ | ⬜ pending |
| 70-01-03 | 01 | 1 | PY-07 | T-70-03 / T-70-04 | Imported Python callees resolve only from explicit import evidence and survive analyzer persistence | unit+integration | `rtk ./node_modules/.bin/vitest run src/core/__tests__/global-index.test.ts src/core/__tests__/analyzer.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` exists and is the canonical parser seam
- [x] `src/core/__tests__/global-index.test.ts` exists and is the canonical cross-file resolution seam
- [x] `src/core/__tests__/analyzer.test.ts` exists and is the canonical end-to-end persistence seam

*Existing infrastructure is sufficient; no extra Wave 0 harness work is required.*

---

## Failure-Path Requirement

At least one verification must prove the negative path:

- dynamic Python call shape such as `getattr(... )()` produces explicit `unsupported_dynamic` or equivalent non-edge metadata
- no positive call edge is emitted for that case

This failure-path proof is mandatory for phase sign-off because D-04/D-07 prioritize graph truth cleanliness over coverage.

---

## Manual-Only Verifications

None required if the focused suites and typecheck cover:

- local function/method/static/class calls
- imported callee resolution
- dynamic non-edge classification
- analyzer persistence

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verification
- [x] Sampling continuity preserved
- [x] Wave 0 coverage exists
- [x] A failure-path proof is required explicitly
- [x] No watch-mode flags
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planned 2026-05-10

