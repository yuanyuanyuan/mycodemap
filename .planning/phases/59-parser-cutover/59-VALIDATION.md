---
phase: 59
slug: parser-cutover
status: completed
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-06
---

# Phase 59 - Validation Strategy

> Per-phase validation contract for the parser cutover closeout.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `rtk ./node_modules/.bin/vitest run src/core/__tests__/analyzer.test.ts src/cli/output/__tests__/errors.test.ts src/cli/__tests__/config-loader.test.ts src/cli/commands/__tests__/generate.test.ts` |
| **Failure-path command** | `rtk ./node_modules/.bin/vitest run src/cli/output/__tests__/errors.test.ts src/cli/output/__tests__/wasm-fallback.test.ts src/server/handlers/__tests__/AnalysisHandler.test.ts src/server/routes/__tests__/api-analysis-routes.test.ts` |
| **Type gate** | `rtk tsc --noEmit` |
| **Real-path check** | `node dist/cli/index.js generate` with tree-sitter main path and deprecated-mode rejection proof captured in `59-UAT.md` |

## Validation Sign-Off

- [x] Automated commands cover main-path parser orchestration, config rejection, output contract, and server compatibility rejection.
- [x] At least one failure-path command verifies `DEPRECATED_PARSER_MODE` and WASM fallback behavior.
- [x] Real CLI/UAT evidence exists for the single parser path and deprecated-mode rejection.
- [x] `rtk tsc --noEmit` remains part of the phase gate.
- [x] No watch-mode or mock-only closeout gate is used.
- [x] `nyquist_compliant: true` is explicitly set.

**Approval:** passed 2026-05-06
