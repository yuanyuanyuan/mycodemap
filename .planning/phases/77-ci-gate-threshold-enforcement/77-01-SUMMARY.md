---
phase: 77-ci-gate-threshold-enforcement
plan: 01
subsystem: cli
tags: [agent-metrics, ci-gate, commander, vitest, interface-contract]
requires:
  - phase: 76-estimation-and-reporting
    provides: persisted agent-metrics report truth and fixed-sample measurement flow
provides:
  - row-level agent-metrics gate verdicts on report/root paths
  - human and JSON gate visibility for warn/pass/fail states
  - CLI-edge threshold parsing and non-zero exit on explicit gate failure
affects: [agent-metrics, ci, mcp-contract, validation]
tech-stack:
  added: []
  patterns: [shared report gate truth, CLI-edge exit semantics, row-level blocking policy]
key-files:
  created: []
  modified:
    - src/orchestrator/agent-metrics-service.ts
    - src/orchestrator/__tests__/agent-metrics-service.test.ts
    - src/cli/commands/agent-metrics/index.ts
    - src/cli/commands/agent-metrics/human.ts
    - src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts
    - src/cli/interface-contract/commands/agent-metrics.ts
    - src/cli/interface-contract/index.ts
    - src/cli/interface-contract/__tests__/interface-contract.test.ts
key-decisions:
  - "Gate truth stays attached to AgentMetricsReportResult and is always derived from rows[*].estimatedTotalTokens."
  - "No explicit threshold remains warn-only; no default numeric baseline is invented before calibration."
  - "Only CLI report/root paths decide exitCode=1 after rendering; service and renderer stay pure."
patterns-established:
  - "Commander subcommands that reuse a parent flag name must read optsWithGlobals() to see inherited values."
  - "Interface contract updates for existing command families extend the current shape instead of creating parallel envelopes."
requirements-completed: [CI-01, CI-02, CI-03]
duration: 1h
completed: 2026-05-10
---

# Phase 77: CI Gate Threshold Enforcement Summary

**`agent-metrics` report/root 路径现在支持显式单行 token 阈值门禁，并在 human/JSON 输出中共享同一份 warn/pass/fail gate contract。**

## Performance

- **Duration:** about 1h
- **Started:** 2026-05-10T21:49:00+08:00
- **Completed:** 2026-05-10T22:00:00+08:00
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- 在服务层为 report truth 增加 canonical `gate` block，默认无阈值时输出 warn-only 结果和 worst-row 上下文。
- 在 CLI 的 bare/report 路径接入 `--max-tokens-per-query`，显式阈值失败时仅在命令边界设置 `process.exitCode = 1`。
- 扩展 `agent-metrics` 的 human/JSON/contract/test 覆盖面，固定 gate 字段命名、warn/fail 展示和缺失 persisted run 的现有修复提示。

## Task Commits

None. This execution run did not create git commits.

## Files Created/Modified

- `src/orchestrator/agent-metrics-service.ts` - report truth 附加 row-level gate verdict
- `src/orchestrator/__tests__/agent-metrics-service.test.ts` - pin warn/pass/fail semantics and latest-run/root behavior
- `src/cli/commands/agent-metrics/index.ts` - threshold parsing, report/root gating, CLI-edge exit handling
- `src/cli/commands/agent-metrics/human.ts` - human gate summary block for warn/fail/pass
- `src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts` - JSON/human parity, threshold routing, exit-code regressions
- `src/cli/interface-contract/commands/agent-metrics.ts` - gate output contract and threshold flag metadata
- `src/cli/interface-contract/index.ts` - export `agentMetricsContract` through the public barrel
- `src/cli/interface-contract/__tests__/interface-contract.test.ts` - guard contract gate fields and threshold flag presence

## Decisions Made

- Kept `token` as pure measurement and excluded threshold behavior from its handler.
- Reused `AgentMetricsService.withGate(...)` at the CLI edge instead of recomputing verdicts in the renderer.
- Accepted the existing repo-wide lint warnings as pre-existing noise because Phase 77 introduced no new lint errors.

## Deviations from Plan

### Auto-fixed Issues

**1. Commander inherited-option visibility**

- **Found during:** Task 77-01-03
- **Issue:** `report` subcommand reused the parent threshold flag name, and `opts()` hid the inherited value.
- **Fix:** Read `optsWithGlobals()` for bare/report handlers while leaving `token` on local-only `opts()`.
- **Files modified:** `src/cli/commands/agent-metrics/index.ts`
- **Verification:** `src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts`

**2. Report payload typing drift**

- **Found during:** Task 77-01-03 verification
- **Issue:** `AgentMetricsReportResult` now requires `gate`, but the internal pre-gated report object passed into `withGate()` did not satisfy the stricter type.
- **Fix:** Introduced a pre-gated payload type for `withGate()` input.
- **Files modified:** `src/orchestrator/agent-metrics-service.ts`
- **Verification:** `rtk npm run typecheck`

---

**Total deviations:** 2 auto-fixed
**Impact on plan:** All fixes were required for correctness and stayed within the Phase 77 file boundary.

## Issues Encountered

- `rtk npm test` still fails on an unrelated existing test: `src/cli/__tests__/validate-ai-docs-script.test.ts`, where `scripts/validate-ai-docs.js` reports `AGENTS.md must contain AI-friendly doc requirements`. This was not introduced by the `agent-metrics` changes.

## User Setup Required

None.

## Next Phase Readiness

- Phase 77 implementation is ready for the blocking human verification checkpoint defined in the plan.
- Before marking the phase complete, human verification should confirm:
  - no-threshold root/report output stays warn-only with exit code 0
  - explicit threshold fail exits non-zero and names offending rows
  - equality with the worst row passes
  - `token` path remains gate-free
- Full repo test green is currently blocked by the unrelated AI-doc validation failure above.

---
*Phase: 77-ci-gate-threshold-enforcement*
*Completed: 2026-05-10*
