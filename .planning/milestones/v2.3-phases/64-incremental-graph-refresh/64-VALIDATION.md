---
phase: 64
slug: incremental-graph-refresh
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-08
updated: 2026-05-08
---

# Phase 64 — Validation Strategy

> Per-phase validation contract for incremental graph refresh. This phase validates changed-file sourcing, conservative invalidation, transactional slice writeback, direct-execution truth sync, and fail-closed downgrade behavior. It must not silently widen scope or degrade into hidden full regeneration.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | existing Vitest + `tsc` + built CLI subprocess e2e |
| **Quick run command** | `rtk ./node_modules/.bin/vitest run src/cli/commands/__tests__/generate.test.ts src/cli/commands/__tests__/query-output.test.ts src/cli/commands/__tests__/deps-output.test.ts src/cli/commands/__tests__/analyze-command.test.ts src/infrastructure/storage/__tests__/graph-helpers.test.ts src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` |
| **Build command** | `rtk npm run build` |
| **E2E command** | `rtk ./node_modules/.bin/vitest run tests/e2e/graph-schema-foundation.test.ts --config vitest.e2e.config.ts` |
| **Diff hygiene** | `rtk git diff --check` |
| **Estimated runtime** | ~60-180 seconds |

---

## Sampling Rate

- **After Task 64-01-01 lands:** run targeted CLI contract tests for changed-file precedence, diagnostics codes, and direct-execution truth sync.
- **After Task 64-01-02 lands:** run targeted helper/storage tests for `2-hop` invalidation, snapshot retention, partial/failed metadata, and writeback parity.
- **Wave 0 before full e2e:** run `tsc --noEmit` and the targeted Vitest subsets first; do not jump straight to the subprocess gate.
- **Before phase close:** run built CLI e2e, then `git diff --check`.
- **Max feedback latency:** 180 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Failure Scene Required | Status |
|---------|------|------|-------------|-----------|-------------------|------------------------|--------|
| 64-01-01 | 01 | 1 | INCR-01, INCR-02 | CLI contract | `rtk ./node_modules/.bin/vitest run src/cli/commands/__tests__/generate.test.ts src/cli/commands/__tests__/query-output.test.ts src/cli/commands/__tests__/deps-output.test.ts src/cli/commands/__tests__/analyze-command.test.ts` | changed-files override, empty/unreliable scope | ✅ green |
| 64-01-02 | 01 | 1 | INCR-01, INCR-02 | helper/storage | `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/graph-helpers.test.ts src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` | unresolved boundary, partial slice failure, writeback failure, snapshot replacement | ✅ green |
| 64-01-03a | 01 | 1 | INCR-01, INCR-02 | e2e success | `rtk npm run build && rtk ./node_modules/.bin/vitest run tests/e2e/graph-schema-foundation.test.ts --config vitest.e2e.config.ts` | no | ✅ green |
| 64-01-03b | 01 | 1 | INCR-02 | e2e partial | `rtk npm run build && rtk ./node_modules/.bin/vitest run tests/e2e/graph-schema-foundation.test.ts --config vitest.e2e.config.ts` | partial refresh | ✅ green |
| 64-01-03c | 01 | 1 | INCR-01, INCR-02 | e2e failed | `rtk npm run build && rtk ./node_modules/.bin/vitest run tests/e2e/graph-schema-foundation.test.ts --config vitest.e2e.config.ts` | unreliable scope / high-risk downgrade | ✅ green |
| 64-01-04 | 01 | 1 | INCR-01, INCR-02 | type gate | `rtk tsc --noEmit` | no | ✅ green |
| 64-01-05 | 01 | 1 | INCR-01, INCR-02 | diff hygiene | `rtk git diff --check` | no | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Preconditions

- Shared contract types for incremental refresh status/diagnostics must exist before storage and CLI tests can converge.
- Direct-execution truth sync must be explicit in the implementation; otherwise e2e can pass on SQLite while `query/deps/analyze` still read stale `codemap.json`.
- Built CLI must remain the verification entrypoint for shipped behavior; source-only mocks are insufficient.

---

## Failure Rehearsals

- Explicit `--changed-files` with invalid path or out-of-scope path returns fail-closed diagnostics instead of hidden full regenerate.
- Ambiguous or unresolved invalidation boundary returns `failed` with full generate remediation.
- Partial refresh leaves explicit stale/failed metadata and does not claim clean success.
- Direct-execution regression check proves `codemap.json` changed after refresh and `query/deps/analyze` read the refreshed truth.

---

## Manual-Only Verifications

- Confirm the plan does not silently open public server incremental APIs while `AnalysisHandler` remains intentionally unsupported.
- Confirm refresh diagnostics remain thin enough for CLI humans while still preserving machine-readable fields in structured output.

---

## Validation Sign-Off

- [x] All planned tasks have automated verify steps
- [x] At least one failure rehearsal is required for every major fix path
- [x] Real filesystem + real subprocess coverage is planned for success, partial, and failed states
- [x] Direct-execution truth sync is explicitly covered
- [x] `wave_0_complete` flips to `true` only after targeted task gates are green
- [x] `status` flips to `approved` only after all rows turn green
