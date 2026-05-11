---
phase: 78-intelligence-layer-trends-and-distribution
plan: 01
subsystem: agent-metrics
tags: [agent-metrics, trends, percentiles, advisory, sqlite, vitest]
requires:
  - phase: 77-ci-gate-threshold-enforcement
    provides: stable report/root gate contract and persisted latest-run semantics
provides:
  - additive query-type trend and percentile intelligence on the existing report path
  - human and JSON advisory surfaces for highest-cost query types and samples
  - rebuilt dist CLI artifacts so runtime output matches Phase 78 source truth
affects: [agent-metrics, interface-contract, storage, dist-build]
tech-stack:
  added: []
  patterns: [service-owned intelligence truth, additive contract evolution, advisory-only reporting]
key-files:
  created:
    - .planning/phases/78-intelligence-layer-trends-and-distribution/78-01-SUMMARY.md
  modified:
    - src/interface/types/storage.ts
    - src/infrastructure/storage/adapters/SQLiteStorage.ts
    - src/infrastructure/storage/__tests__/SQLiteStorage.test.ts
    - src/orchestrator/agent-metrics-service.ts
    - src/orchestrator/__tests__/agent-metrics-service.test.ts
    - src/cli/interface-contract/commands/agent-metrics.ts
    - src/cli/interface-contract/__tests__/interface-contract.test.ts
    - src/cli/commands/agent-metrics/human.ts
    - src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts
key-decisions:
  - "Phase 78 stays additive on the existing report/root surface and does not create a second analytics command family."
  - "Trend comparison remains latest run versus previous run only; missing baselines stay explicit instead of silently widening scope."
  - "Distribution depth and ranked cost signals stay advisory-only and must not change Phase 77 gate verdict or exit-code behavior."
requirements-completed: [TOKEN-03, TOKEN-04, TOKEN-05]
duration: 1h
completed: 2026-05-11
---

# Phase 78: Intelligence Layer - Trends and Distribution Summary

**`agent-metrics report` 现在会输出 latest-vs-previous 趋势、按 queryType 的 `p50/p95/max` 分布深度，以及可读的最高成本 advisory，同时保持 Phase 77 gate 语义不变。**

## Performance

- **Duration:** about 1h
- **Completed:** 2026-05-11T10:59:00+08:00
- **Tasks:** 3
- **Files modified:** 9 source/test files plus rebuilt `dist/` CLI artifacts

## Accomplishments

- 为 agent-metrics storage/service 增加 recent-run 与 historical query-type row 读取能力，在 service 层统一计算趋势、分位数和高成本 advisory。
- 扩展 report JSON contract 与 human renderer，新增 `queryTypeTrends`、`highestCostQueryTypes`、`highestCostRows` 以及 grouped summary 的 `historicalSampleCount` / `p50EstimatedTotalTokens` / `p95EstimatedTotalTokens`。
- 保持 gate 仍只基于 row-level `estimatedTotalTokens` 判定；Phase 78 输出仅做 additive intelligence，不改变 warn/pass/fail 或 CLI exit-code 规则。
- 通过 `npm run build` 重建 `dist/`，修复源码已实现但打包产物仍缺少 Phase 78 字段的 runtime drift。

## Task Commits

None. This execution run did not create git commits.

## Verification

- `rtk ./node_modules/.bin/vitest run src/orchestrator/__tests__/agent-metrics-service.test.ts src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/cli/interface-contract/__tests__/interface-contract.test.ts src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts`
- `rtk npm run typecheck`
- `rtk node dist/cli/index.js ci check-docs-sync`
- `rtk node dist/cli/index.js agent-metrics report --json`
- `rtk node dist/cli/index.js agent-metrics report --human`
- `rtk node dist/cli/index.js agent-metrics report --max-tokens-per-query 150 --json` → non-zero exit with unchanged gate fail semantics
- `rtk node dist/cli/index.js agent-metrics report --max-tokens-per-query 1140 --json` → exit `0`, equality with worst row passes
- temporary single-run workspace under `/tmp/phase78-verify-built-2MNpHt`:
  `node /data/codemap/dist/cli/index.js agent-metrics report --human`
  verified `Baseline unavailable for comparison.`

## Issues Encountered

- Runtime verification initially exposed a packaging drift: source and tests already contained Phase 78 intelligence fields, but prebuilt `dist/cli` output still omitted them. Rebuilding `dist/` brought runtime output back in sync with source truth.
- `rtk npm run docs:check` still fails on the pre-existing AI-doc guardrail issue: `AGENTS.md must contain AI-friendly doc requirements`. This failure is unrelated to Phase 78 agent-metrics behavior.

## User Setup Required

None.

## Next Phase Readiness

- All four `v2.7` phases now have completed plan execution artifacts.
- The next workflow step is milestone closeout rather than another phase execution.
- Recommended next command: `$gsd-complete-milestone`

---
*Phase: 78-intelligence-layer-trends-and-distribution*
*Completed: 2026-05-11*
