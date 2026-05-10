---
phase: 74-env-contract-reminder-hook
plan: 01
subsystem: cli
tags: [env-contract, hooks, codex, claude, delegated-start]

requires:
  - phase: 58-subagent-environment-contract-injection
    provides: shipped env-contract CLI and MCP retrieval surfaces
provides:
  - delegated-start seam probe for Codex plus normalized Claude/Codex reminder adapters
  - shared first-remind-then-silent reminder engine with parent-session-by-role ledger
  - updated env-contract hook/bootstrap templates that invoke the reminder runner instead of hidden fallback text
affects: [env-contract, assistant-bootstrap, delegated-hooks, mcp-env-contract]

tech-stack:
  added: []
  patterns: [shared reminder decision engine, temp session-role silence ledger, visible warn-and-continue hook output]

key-files:
  created:
    - .planning/phases/74-env-contract-reminder-hook/74-01-SUMMARY.md
    - src/cli/env-contract/reminder-engine.ts
    - src/cli/env-contract/reminder-ledger.ts
    - src/cli/env-contract/__tests__/reminder-engine.test.ts
  modified:
    - src/cli/env-contract/reminder-hook-runner.ts
    - src/cli/env-contract/__tests__/reminder-hook-runner.test.ts
    - src/cli/commands/env-contract.ts
    - src/cli/commands/__tests__/env-contract-command.test.ts
    - src/cli/commands/__tests__/init-command.test.ts
    - src/cli/init/assistant-plan.ts
    - src/cli/init/__tests__/init-assistant.test.ts

key-decisions:
  - "Codex delegated-start proof accepts SessionStart and UserPromptSubmit at the seam, but only emits reminders when a usable session-plus-role payload is present."
  - "Reminder silence is keyed only by parent session × role through temp marker files, avoiding runtime-specific or cross-session memory."
  - "Retrieval failure remains visible and non-blocking, with exact env-contract remediation commands and no hidden fallback prompt text."

patterns-established:
  - "Runtime hook adapters should normalize host payloads first, then defer policy decisions to a shared TypeScript engine."
  - "Hook reminders that must stay silent across processes should use atomic temp markers instead of process-local memory."

requirements-completed: [HOOK-02]

duration: 22min
completed: 2026-05-10
---

# Phase 74 Plan 01: Env-contract Reminder Hook Summary

**Delegated-start hooks now remind once per parent session × role to retrieve env-contract, stay silent on later starts, and surface retrieval failures visibly without blocking Codex or Claude delegated work**

## Performance

- **Duration:** 22 min
- **Started:** 2026-05-10T07:30:00Z
- **Completed:** 2026-05-10T07:52:38Z
- **Tasks:** 2 completed + 1 human verification gate approved
- **Files modified:** 10

## Accomplishments

- Added a Codex seam probe and Claude normalizer so delegated-start payloads are captured and mapped before reminder policy runs.
- Implemented a shared reminder engine plus temp ledger that enforces first-remind-then-silent by parent session × role.
- Rewired env-contract hook/bootstrap outputs to call the shared reminder runner instead of embedding duplicated reminder text.
- Verified the live gate with human approval after confirming event mapping, silence behavior, and failure warning semantics.

## Task Commits

1. **Task 1: Prove the Codex delegated-start seam** - `2171e22` (`feat`)
2. **Task 2: Build the shared reminder engine and runtime adapters** - `f824647` (`feat`)

## Files Created/Modified

- `src/cli/env-contract/reminder-engine.ts` - shared reminder decision logic and visible remediation messaging
- `src/cli/env-contract/reminder-ledger.ts` - atomic temp marker ledger keyed by parent session × role
- `src/cli/env-contract/reminder-hook-runner.ts` - Codex seam probe, Claude/Codex runtime adapters, stdin hook runner
- `src/cli/env-contract/__tests__/reminder-engine.test.ts` - first remind, same-role silence, cross-role remind, warning-continue proofs
- `src/cli/env-contract/__tests__/reminder-hook-runner.test.ts` - Codex seam proof, Claude adapter proof, failure transport proof
- `src/cli/commands/env-contract.ts` - reminder hook command surface and updated Claude/Codex template outputs
- `src/cli/commands/__tests__/env-contract-command.test.ts` - regression checks for new hook/template outputs
- `src/cli/commands/__tests__/init-command.test.ts` - bootstrap regression updated for reminder-hook examples
- `src/cli/init/assistant-plan.ts` - assistant bootstrap assets now point to runtime reminder hooks plus explicit retrieval commands
- `src/cli/init/__tests__/init-assistant.test.ts` - assistant asset output assertions for reminder-hook wiring

## Decisions Made

- Kept Phase 74 narrow: no new contract model, no new hook governance plane, only reminder/ledger/adapter behavior.
- Used `mycodemap env-contract --for <role> --json` and `codemap_env_contract(agentType="<role>")` as the only retrieval targets.
- Left retrieval failure as visible warn-and-continue output instead of hard-blocking delegated execution.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Rebuilt `dist` before CLI subprocess regression tests**
- **Found during:** Task 2
- **Issue:** `env-contract-command` tests execute `dist/cli/index.js`, so source changes were invisible until the build output was refreshed.
- **Fix:** Ran `rtk npm run build` before the full Task 2 verification loop.
- **Files modified:** `dist` build output in workspace only, not committed
- **Verification:** Task 2 vitest command passed after rebuild
- **Committed in:** `f824647`

**2. [Rule 1 - Bug] Narrowed Codex hook event typing in the final runner path**
- **Found during:** Task 2 build verification
- **Issue:** TypeScript rejected the final Codex render path because the broader normalized event union could leak `SubagentStart`.
- **Fix:** Render now uses the seam-probed Codex event name after explicit narrowing.
- **Files modified:** `src/cli/env-contract/reminder-hook-runner.ts`
- **Verification:** `rtk npm run build`
- **Committed in:** `f824647`

**3. [Rule 3 - Blocking] Updated adjacent init bootstrap regression to match the new reminder-hook example**
- **Found during:** Task 2 pre-commit related test run
- **Issue:** `init-command.test.ts` still expected the old inline `--for` hook example and blocked the commit.
- **Fix:** Adjusted the adjacent regression to assert the new reminder-hook command while preserving direct retrieval guidance checks.
- **Files modified:** `src/cli/commands/__tests__/init-command.test.ts`
- **Verification:** `rtk ./node_modules/.bin/vitest run src/cli/commands/__tests__/init-command.test.ts src/cli/commands/__tests__/env-contract-command.test.ts src/cli/init/__tests__/init-assistant.test.ts`
- **Committed in:** `f824647`

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All deviations were direct consequences of the Phase 74 wiring and stayed within the declared file/test boundary.

## Issues Encountered

- The repo-local pre-commit hook requires uppercase commit tags and enforces a 10-file commit limit, so Task 2 had to stay within that staging boundary.

## User Setup Required

None.

## Next Phase Readiness

- Phase 74 is functionally complete and manually approved.
- Any future hook work should reuse `reminder-hook-runner` and `reminder-engine` rather than duplicating runtime-specific reminder text.

## Self-Check: PASSED

- Confirmed summary file exists at `.planning/phases/74-env-contract-reminder-hook/74-01-SUMMARY.md`
- Confirmed task commits exist in git: `2171e22`, `f824647`

---
*Phase: 74-env-contract-reminder-hook*
*Completed: 2026-05-10*
