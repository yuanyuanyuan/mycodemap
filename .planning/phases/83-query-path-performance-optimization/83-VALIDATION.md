---
phase: 83
slug: query-path-performance-optimization
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-11
---

# Phase 83 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/graph-helpers.test.ts src/server/handlers/__tests__/QueryHandler.test.ts` |
| **Full suite command** | `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/graph-helpers.test.ts src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts src/server/handlers/__tests__/QueryHandler.test.ts src/infrastructure/storage/__tests__/SQLiteStorage.test.ts && rtk npx tsc --noEmit` |
| **Estimated runtime** | Quick: ~6-10s; full: ~12-20s |

## Sampling Rate

- **After every task commit:** Run the helper/handler quick smoke above.
- **After every plan wave:** Run the full suite command plus typecheck.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 20 seconds.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 83-01-01 | 01 | 1 | PERF-01 | T-83-01 | dependency lookup and impact traversal can reuse one prebuilt read index without changing default graph truth semantics | unit | `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/graph-helpers.test.ts` | ✅ extend existing | ✅ green |
| 83-01-02 | 01 | 1 | PERF-01 | T-83-02 / T-83-03 | eager cache reuses bounded impact results, returns cloned data, and falls back to sqlite-direct when thresholds are exceeded | integration | `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` | ✅ extend existing | ✅ green |
| 83-01-03 | 01 | 1 | PERF-01 | T-83-04 | `QueryHandler.analyzeImpact()` projects directly from storage-returned layered truth instead of reloading the graph and doing a second BFS | unit + integration | `rtk ./node_modules/.bin/vitest run src/server/handlers/__tests__/QueryHandler.test.ts src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts` | ✅ extend existing | ✅ green |
| 83-01-04 | 01 | 1 | PERF-01 | T-83-01 / T-83-02 / T-83-04 | eager/direct parity, mutation safety, bounded-cache behavior, and no-second-walk regressions remain green together | integration | `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/graph-helpers.test.ts src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts src/server/handlers/__tests__/QueryHandler.test.ts src/infrastructure/storage/__tests__/SQLiteStorage.test.ts && rtk npx tsc --noEmit` | ✅ extend existing | ✅ green |

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
- `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/graph-helpers.test.ts`
- `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts`
- `rtk ./node_modules/.bin/vitest run src/server/handlers/__tests__/QueryHandler.test.ts`
- `rtk ./node_modules/.bin/vitest run src/infrastructure/storage/__tests__/SQLiteStorage.test.ts`
- `rtk npx tsc --noEmit`

Notes:
- This phase already had `83-UAT.md` and `83-SECURITY.md`; this validation file closes the missing Nyquist layer so performance work is covered by both user-path and automated regression evidence.

## Validation Sign-Off

- [x] All tasks have `<automated>` verify coverage.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 coverage exists inside existing test seams; no extra harness is required.
- [x] No watch-mode flags in validation commands.
- [x] Feedback latency < 20s.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** verified 2026-05-11
