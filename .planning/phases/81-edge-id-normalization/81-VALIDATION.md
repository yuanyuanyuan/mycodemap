---
phase: 81
slug: edge-id-normalization
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-11
---

# Phase 81 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `rtk ./node_modules/.bin/vitest run src/domain/entities/__tests__/Dependency.test.ts src/cli/__tests__/generate.test.ts src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` |
| **Full suite command** | `rtk ./node_modules/.bin/vitest run src/domain/entities/__tests__/Dependency.test.ts src/cli/__tests__/generate.test.ts src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts src/server/handlers/__tests__/QueryHandler.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts && rtk npx tsc --noEmit` |
| **Estimated runtime** | Quick: ~8-12s; full: ~20-35s |

## Sampling Rate

- **After every task commit:** Run the task-local verify command from `81-01-PLAN.md`; default quick smoke is the quick run command above.
- **After every plan wave:** Run the full suite command plus typecheck.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 35 seconds.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 81-01-01 | 01 | 1 | POL-03 | T-81-01 | canonical helper emits lowercase / underscore-safe stable IDs and collapses formatting-only input drift before storage or query layers consume it | unit | `rtk ./node_modules/.bin/vitest run src/domain/entities/__tests__/Dependency.test.ts src/cli/__tests__/generate.test.ts` | ✅ created | ✅ green |
| 81-01-02 | 01 | 1 | POL-03 | T-81-02 | generate path and SQLite writeback use the same canonical IDs so saved graph truth matches persisted dependency rows | unit + integration | `rtk ./node_modules/.bin/vitest run src/cli/__tests__/generate.test.ts src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts` | ✅ extend existing | ✅ green |
| 81-01-03 | 01 | 1 | POL-03 | T-81-03 | initialize-time backfill rewrites legacy snapshot / edge IDs and fails closed on stale or invalid persisted truth | integration | `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/server/handlers/__tests__/QueryHandler.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts` | ✅ extend existing | ✅ green |
| 81-01-04 | 01 | 1 | POL-03 | T-81-04 | query, MCP, governance cache, and migration/failure paths all surface canonical IDs without silent parity drift | integration | `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts src/server/handlers/__tests__/QueryHandler.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts` | ✅ extend existing | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

## Manual-Only Verifications

All phase behaviors have automated verification.

## Validation Audit 2026-05-11

| Metric | Count |
|--------|-------|
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |

Audit evidence:
- Added direct canonical-helper seam coverage in `src/domain/entities/__tests__/Dependency.test.ts`.
- Existing storage backfill and failure-mode coverage already proved legacy snapshot rewrite, edge-ID rewrite, projection drift rejection, and invalid confidence fail-closed behavior.
- Existing query/MCP coverage already proved canonical IDs survive user-facing reads and stale persisted truth rejects initialization.

Notes:
- The only Nyquist gap was missing direct unit coverage for the canonical helper seam in `Dependency.ts`; previously this behavior was only asserted indirectly via generate/storage/query tests.
- Failure scenario explicitly sampled: stale or drifting persisted SQLite truth must fail closed with rebuild guidance rather than return partial success.

## Validation Sign-Off

- [x] All tasks have `<automated>` verify coverage.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 coverage exists inside existing test seams; no extra harness is required.
- [x] No watch-mode flags in validation commands.
- [x] Feedback latency < 35s.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** verified 2026-05-11
