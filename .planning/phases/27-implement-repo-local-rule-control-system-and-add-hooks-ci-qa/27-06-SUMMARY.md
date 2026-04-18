---
phase: 27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa
plan: 06
subsystem: testing
tags: [qa, shell, python, workflow, validation]
requires:
  - phase: 27-04
    provides: hook and CI backstop wiring
  - phase: 27-05
    provides: scoped rule helper and workflow injection contract
provides:
  - executable rule-control QA smoke script covering all critical scenarios
  - regression tests for scoped helper, workflow `<rule_context>`, and CI backstop text contract
  - validation docs with copy-paste QA commands
affects: [phase-verification, future-hook-edits, workflow-validation]
tech-stack:
  added: []
  patterns: [bash-smoke-qa, python-unittest-contract-checks, temp-dir-fixtures]
key-files:
  created:
    - scripts/qa-rule-control.sh
    - scripts/tests/test_rule_control_workflow.py
    - .planning/phases/27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa/27-06-SUMMARY.md
  modified:
    - docs/rules/validation.md
key-decisions:
  - "QA scenarios use /tmp fixtures and pure-function validator checks so they never dirty the repo."
  - "The shell smoke script prints RULE_CONTROL_QA: PASS/FAIL to stay grep-friendly for humans and automation."
  - "Regression coverage for rule-control routing lives in Python unittest because it can cheaply inspect both workflow text and helper output."
patterns-established:
  - "QA pattern: shell smoke script for end-to-end contracts plus Python tests for text/JSON invariants."
  - "Disabled soft gate must be proven by zero-byte hook output, not only by documentation."
requirements-completed: [P27-NOW-HOOKS-CI-QA, P27-NOW-WORKFLOW-VALIDATION]
duration: 1 min
completed: 2026-04-19
---

# Phase 27 Plan 06: Rule-control QA Summary

**Executable rule-control QA script plus regression tests for helper scope, workflow injection, and CI backstop**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-19T03:57:27+08:00
- **Completed:** 2026-04-19T03:58:05+08:00
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `bash scripts/qa-rule-control.sh --scenario all` to exercise capability, P0/P1/unavailable validator semantics, disabled soft gate, scoped rule helper, and CI backstop behavior.
- Added `python3 -m unittest scripts/tests/test_rule_control_workflow.py` to lock the helper scope, workflow `<rule_context>` injection, and CI backstop text contract.
- Added a `Rule Control QA` section to `docs/rules/validation.md` with copy-paste commands and purposes.

## Task Commits

Each task was committed atomically:

1. **Task 1: 新增 rule-control QA 脚本覆盖关键场景** - `1dfacba` (`feature`)
2. **Task 2: 为 workflow contract 与 QA 命令补自动化回归与文档** - `b195a06` (`docs`)

## Files Created/Modified
- `scripts/qa-rule-control.sh` - Runs seven rule-control smoke scenarios entirely from `/tmp` fixtures or pure-function checks.
- `scripts/tests/test_rule_control_workflow.py` - Locks scoped helper output, workflow rule-context injection, and CI backstop presence.
- `docs/rules/validation.md` - Documents the rule-control QA commands and keeps validation routing discoverable.
- `.planning/phases/27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa/27-06-SUMMARY.md` - Records execution evidence and handoff context for this plan.

## Decisions Made
- Used `/tmp/codemap-rule-control-*` fixtures for disabled-soft-gate checks so QA never pollutes the main working tree.
- Used `validate-rules.py` pure functions for P0/P1/unavailable exit-code scenarios to keep the QA fast and deterministic.
- Kept the shell script output machine-grep-friendly with a single terminal status line `RULE_CONTROL_QA: PASS/FAIL`.

## Verification
- `bash scripts/qa-rule-control.sh --scenario all` — PASS
- `python3 -m unittest scripts/tests/test_rule_control_workflow.py` — PASS (`3` tests)
- `npm run docs:check` — PASS

## Acceptance Criteria Evidence

### Task 1
- PASS — `scripts/qa-rule-control.sh` contains `--scenario`
- PASS — `scripts/qa-rule-control.sh` contains `p0-block`
- PASS — `scripts/qa-rule-control.sh` contains `disabled-soft-gate`
- PASS — `scripts/qa-rule-control.sh` contains `Rule validation backstop`
- PASS — `bash scripts/qa-rule-control.sh --scenario all` ends with `RULE_CONTROL_QA: PASS`

### Task 2
- PASS — `scripts/tests/test_rule_control_workflow.py` contains `test_rule_context_is_scoped`
- PASS — `scripts/tests/test_rule_control_workflow.py` contains `test_execute_workflows_include_rule_context`
- PASS — `scripts/tests/test_rule_control_workflow.py` contains `test_ci_contains_rule_backstop`
- PASS — `docs/rules/validation.md` contains `Rule Control QA`
- PASS — `docs/rules/validation.md` contains `bash scripts/qa-rule-control.sh --scenario all`
- PASS — `python3 -m unittest scripts/tests/test_rule_control_workflow.py` exited `0`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase verification can now rely on executable QA evidence instead of prose-only claims.
- No blocker remains inside Phase 27’s planned scope.

## Self-Check: PASSED
- Summary file exists at `.planning/phases/27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa/27-06-SUMMARY.md`
- Task commit `1dfacba` exists in git history
- Task commit `b195a06` exists in git history

---
*Phase: 27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa*
*Completed: 2026-04-19*
