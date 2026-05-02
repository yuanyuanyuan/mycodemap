---
phase: 58-subagent-environment-contract-injection
plan: 03
subsystem: cli
tags: [env-contract, doctor, init, assistant-bootstrap, subagent-retrieval]

# Dependency graph
requires:
  - phase: 58-01
    provides: env-contract discovery engine, types, check, validation, CLI command
  - phase: 58-02
    provides: env-contract interface contract and MCP tool registration
provides:
  - Retrieval-guidance assistant assets replacing raw file-reading examples
  - env-contract wired into init reconciler as InitAsset
  - Doctor env-contract checker (schema/freshness/conflict/drift)
  - Real filesystem tests for doctor and init integration
affects: [59, init, doctor, env-contract]

# Tech tracking
tech-stack:
  added: []
  patterns: [doctor-checker-pattern, init-asset-wiring]

key-files:
  created:
    - src/cli/doctor/check-env-contract.ts
    - src/cli/doctor/__tests__/check-env-contract.test.ts
  modified:
    - src/cli/init/assistant-plan.ts
    - src/cli/init/__tests__/init-assistant.test.ts
    - src/cli/init/reconciler.ts
    - src/cli/commands/__tests__/init-command.test.ts
    - src/cli/doctor/orchestrator.ts
    - src/cli/commands/__tests__/doctor-integration.test.ts

key-decisions:
  - "Wired env-contract-plan into init reconciler as Rule 3 deviation (acceptance criteria required it)"
  - "Doctor env-contract checker maps missing contract to warn (not error) since init may not have been run"

patterns-established:
  - "Doctor checker pattern: standalone function returning DiagnosticResult[], wired into orchestrator via Promise.resolve()"
  - "Init asset wiring pattern: import plan module, call in createInitPlan, spread assets, call apply in applyInitPlan"

requirements-completed: [ABT-01, ABT-02, ABT-03, SDC-02, SDC-04]

# Metrics
duration: 15min
completed: 2026-05-02
---

# Phase 58 Plan 03: Init Assistant Guidance and Doctor Drift Diagnostics Summary

**Retrieval-guidance assistant assets (CLI/MCP), env-contract init wiring, and doctor drift/conflict diagnostics**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-02T16:15:58Z
- **Completed:** 2026-05-02T16:30:59Z
- **Tasks:** 4
- **Files modified:** 8

## Accomplishments

- Replaced all `cat .mycodemap/env-contract.json` raw file-reading patterns in assistant assets with `mycodemap env-contract --for <type> --json` CLI/MCP retrieval guidance
- Wired env-contract plan into init reconciler so `.mycodemap/env-contract.json` appears as an InitAsset in init receipts
- Created doctor env-contract checker that detects missing contract, schema invalidity, missing critical items, source drift, and conflicts
- Added real filesystem tests verifying generated assistant files from disk contain retrieval guidance

## Task Commits

Each task was committed atomically:

1. **Task 58-03-01: Upgrade assistant asset retrieval guidance** - `2a0f48f` (feat)
2. **Task 58-03-02: Preserve init asset status and receipt behavior** - `6036788` (feat)
3. **Task 58-03-03: Add env-contract doctor checker** - `4ed9229` (feat)
4. **Task 58-03-04: Add doctor and init real filesystem tests** - `64f9642` (feat)

## Files Created/Modified

- `src/cli/init/assistant-plan.ts` - Updated 4 generator functions to use retrieval guidance instead of raw file reading
- `src/cli/init/__tests__/init-assistant.test.ts` - Updated assertions and added no-raw-cat + retrieval guidance tests
- `src/cli/init/reconciler.ts` - Imported and wired env-contract-plan into createInitPlan/applyInitPlan
- `src/cli/commands/__tests__/init-command.test.ts` - Added env-contract InitAsset check and generated file content verification
- `src/cli/doctor/check-env-contract.ts` - New checker: missing, schema-invalid, critical-missing, source-drift, conflict, fresh
- `src/cli/doctor/__tests__/check-env-contract.test.ts` - 6 tests covering all diagnostic paths with real temp directories
- `src/cli/doctor/orchestrator.ts` - Added checkEnvContract to parallel checker execution
- `src/cli/commands/__tests__/doctor-integration.test.ts` - Updated mock to include env-contract checker (5 checkers)

## Decisions Made

- Wired env-contract-plan into init reconciler as Rule 3 deviation: the plan's acceptance criteria for Task 2 required `Init tests show .mycodemap/env-contract.json as an InitAsset`, which was unreachable without wiring the plan into the reconciler
- Missing contract produces `warn` severity in doctor (not `error`) because init may not have been run yet; this keeps doctor non-blocking for new projects

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Wired env-contract-plan into init reconciler**
- **Found during:** Task 58-03-02 (Preserve init asset status and receipt behavior)
- **Issue:** The reconciler (`src/cli/init/reconciler.ts`) did not import or call `createEnvContractPlan`/`applyEnvContractPlan`, so the env-contract asset never appeared in init receipts despite the plan's acceptance criteria requiring it
- **Fix:** Added import, called `createEnvContractPlan` in `createInitPlan`, spread assets into receipt, and called `applyEnvContractPlan` in `applyInitPlan`
- **Files modified:** `src/cli/init/reconciler.ts`, `src/cli/commands/__tests__/init-command.test.ts`
- **Verification:** All 128 tests pass in `src/cli/init`, `src/cli/doctor`, `src/cli/env-contract`
- **Committed in:** `6036788` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 blocking)
**Impact on plan:** Deviation was necessary to satisfy Task 2 acceptance criteria. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Assistant assets now guide subagents to use `mycodemap env-contract --for <type> --json` or MCP `codemap_env_contract(agentType="<type>")` for project rule retrieval
- Doctor now reports env-contract freshness/conflicts under the existing `agent` category
- Init flow generates and applies env-contract as part of the standard init pipeline
- Requirements ABT-01, ABT-02, ABT-03, SDC-02, SDC-04 are covered

---
*Phase: 58-subagent-environment-contract-injection*
*Completed: 2026-05-02*

## Self-Check: PASSED

All 8 created/modified files verified present. All 4 task commit hashes verified in git log.
