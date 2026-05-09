---
phase: 65
slug: recursive-impact-analysis
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-08
updated: 2026-05-08
---

# Phase 65 — Validation Strategy

> Per-phase validation contract for recursive impact analysis. This phase validates shared file/symbol entrypoint resolution, graph-native recursive traversal, direct-vs-transitive layering, CLI/MCP contract alignment, and fail-closed degraded-state behavior.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | existing Vitest + `tsc` + built CLI subprocess + MCP stdio transport |
| **Quick run command** | `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/graph-helpers.test.ts src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts src/cli/commands/__tests__/impact-command.test.ts` |
| **Build command** | `rtk npm run build` |
| **E2E command** | `rtk ./node_modules/.bin/vitest run tests/e2e/graph-impact-analysis.test.ts --config vitest.e2e.config.ts` |
| **Type gate** | `rtk tsc --noEmit` |
| **Diff hygiene** | `rtk git diff --check` |
| **Estimated runtime** | ~60-180 seconds |

---

## Sampling Rate

- **After Task 65-01-01 lands:** run targeted type + helper tests for shared contract, direct-vs-transitive grouping, and representative-path behavior.
- **After Task 65-01-02 lands:** run CLI/MCP tests for shared resolver truth, degraded-state semantics, and structured envelopes.
- **Wave 0 before e2e:** run `tsc --noEmit` plus targeted Vitest subsets first.
- **Before phase close:** run built CLI/MCP real-path verification, then `git diff --check`.
- **Max feedback latency:** 180 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Failure Scene Required | Status |
|---------|------|------|-------------|-----------|-------------------|------------------------|--------|
| 65-01-01 | 01 | 1 | IMPT-01, IMPT-02 | helper/storage | `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/graph-helpers.test.ts src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` | unresolved file/symbol entrypoint, truncation, layer partition mistakes | ✅ green |
| 65-01-02 | 01 | 1 | IMPT-01, IMPT-02 | CLI + MCP contract | `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/CodeMapMcpServer.test.ts src/cli/commands/__tests__/impact-command.test.ts` | GRAPH_NOT_FOUND, SYMBOL_NOT_FOUND, ambiguous symbol, partial graph warnings | ✅ green |
| 65-01-03a | 01 | 1 | IMPT-01, IMPT-02 | e2e success | `rtk npm run build && rtk ./node_modules/.bin/vitest run tests/e2e/graph-impact-analysis.test.ts --config vitest.e2e.config.ts` | no | ✅ green |
| 65-01-03b | 01 | 1 | IMPT-01, IMPT-02 | e2e degraded | `rtk npm run build && rtk ./node_modules/.bin/vitest run tests/e2e/graph-impact-analysis.test.ts --config vitest.e2e.config.ts` | partial graph / missing graph / truncated traversal | ✅ green |
| 65-01-04 | 01 | 1 | IMPT-01, IMPT-02 | type gate | `rtk tsc --noEmit` | no | ✅ green |
| 65-01-05 | 01 | 1 | IMPT-01, IMPT-02 | diff hygiene | `rtk git diff --check` | no | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Preconditions

- shared impact result contract must exist before CLI/MCP outputs can converge.
- file/symbol resolver truth must live below adapters; otherwise CLI/MCP will drift immediately.
- degraded-state semantics must be encoded in structured results, not only console prose.
- built CLI or real MCP transport must be part of the proof; source-only mocks are insufficient.

---

## Failure Rehearsals

- file entrypoint missing returns explicit remediation instead of empty success.
- symbol entrypoint ambiguity returns candidate details instead of silent narrowing.
- graph truth missing returns `unavailable` and regenerate guidance.
- partial graph truth returns reduced-confidence warnings rather than pretending completeness.
- traversal limit/depth truncation returns explicit `truncated` evidence and summary warning.

---

## Manual-Only Verifications

- Confirm the plan does not introduce a second public impact command family when evolving the current `impact` surface would suffice.
- Confirm HTTP `/analysis/impact` remains reuse-only and does not silently become a broader server redesign.

---

## Validation Sign-Off

- [x] All planned tasks have automated verify steps
- [x] At least one failure rehearsal is required for every major fix path
- [x] Real filesystem + real subprocess/transport coverage is planned
- [x] CLI and MCP alignment is explicitly covered
- [x] `wave_0_complete` flips to `true` only after targeted task gates are green
- [x] `status` flips to `approved` only after all rows turn green
