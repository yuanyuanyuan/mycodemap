---
phase: 27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa
plan: 02
subsystem: infra
tags: [python, validation, hooks, ci, exit-codes]
requires: []
provides:
  - repo-local validator CLI for code, arch, and all targets
  - stable gate/report-only exit-code contract for downstream hooks and CI
  - Python unittest coverage for pass, P0, P1, P2, unavailable, and report-only semantics
affects: [hooks, ci-gateway, qa, phase-27-04, phase-27-06]
tech-stack:
  added: []
  patterns: [python-standard-library-cli, machine-json-plus-stderr-summary, exit-code-contract-tests]
key-files:
  created:
    - scripts/validate-rules.py
    - scripts/tests/test_validate_rules.py
    - .planning/milestones/v1.7-phases/27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa/27-02-SUMMARY.md
  modified: []
key-decisions:
  - "Gate mode gives unavailable precedence over P0/P1/P2 so missing dependencies never look green."
  - "Validator stdout stays canonical JSON while stderr prints a compact operator summary."
patterns-established:
  - "Validator CLI pattern: stdout is machine-readable JSON with checks[] and summary."
  - "Exit-code policy is locked by pure-function unit tests instead of shell-only smoke."
requirements-completed: [P27-NOW-VALIDATE-RULES]
duration: 15 min
completed: 2026-04-18
---

# Phase 27 Plan 02: Repo-local validator contract Summary

**Repo-local validator CLI with stable report-only and gate exit semantics for code and architecture checks**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-18T19:07:54Z
- **Completed:** 2026-04-18T19:22:54Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `python3 scripts/validate-rules.py [code|arch|all] [--report-only]` with repo-local command checks for typecheck, tests, lint, and architecture deps.
- Ensured `--report-only` always exits `0`, while gate mode resolves exactly to `0/1/2/3/4` for pass, P0, P1, P2, and unavailable.
- Locked the contract with Python `unittest` coverage for all exit-code branches and runtime-only status values.

## Task Commits

Each task was committed atomically:

1. **Task 1: 新建 repo-local validate-rules 脚本** - `dc299fd` (`feat`)
2. **Task 2: 为 validator 锁定 exit-code 与 unavailable 语义** - `97d4d25` (`test`)

## Files Created/Modified
- `scripts/validate-rules.py` - Implements the repo-local validator, check execution, JSON report generation, and gate/report-only exit mapping.
- `scripts/tests/test_validate_rules.py` - Verifies exit-code precedence, report-only behavior, runtime status vocabulary, and missing-dist unavailable behavior.
- `.planning/milestones/v1.7-phases/27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa/27-02-SUMMARY.md` - Captures execution evidence, decisions, and handoff state for this plan.

## Decisions Made
- Used the repository’s existing commands exactly as required: `npm run typecheck`, `npm test`, and `npm run lint`.
- Treated missing command executables and missing `dist/cli/index.js` as `unavailable`, not `passed`, to protect downstream hooks and CI from false green results.
- Printed the canonical report as JSON with top-level `checks` and emitted a compact summary line separately so humans and automation both get stable output.

## Verification
- `python3 -m py_compile scripts/validate-rules.py scripts/tests/test_validate_rules.py` — PASS
- `python3 -m unittest scripts/tests/test_validate_rules.py` — PASS (`8` tests)
- `python3 scripts/validate-rules.py code --report-only` — PASS (exit `0`, emitted JSON `checks[]`, and stderr summary with `P0/P1/P2/unavailable`)

## Acceptance Criteria Evidence

### Task 1
- PASS — `scripts/validate-rules.py` contains `status: unavailable`
- PASS — `scripts/validate-rules.py` contains `sys.exit(4)`
- PASS — `scripts/validate-rules.py` contains `npm run typecheck`
- PASS — `scripts/validate-rules.py` contains `npm test`
- PASS — `scripts/validate-rules.py` contains `npm run lint`
- PASS — `python3 scripts/validate-rules.py code --report-only` exited `0`

### Task 2
- PASS — `scripts/tests/test_validate_rules.py` contains `test_exit_code_for_p0`
- PASS — `scripts/tests/test_validate_rules.py` contains `test_exit_code_for_p1`
- PASS — `scripts/tests/test_validate_rules.py` contains `test_exit_code_for_unavailable`
- PASS — `scripts/tests/test_validate_rules.py` contains `test_report_only_exits_zero`
- PASS — `python3 -m unittest scripts/tests/test_validate_rules.py` exited `0`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added literal command strings for plan-level grep verification**
- **Found during:** Task 1 (新建 repo-local validate-rules 脚本)
- **Issue:** Initial implementation used argv arrays only, so acceptance greps could not prove the required repo-local commands were present as explicit strings.
- **Fix:** Added command-string constants for `npm run typecheck`, `npm test`, `npm run lint`, and the architecture command, then derived argv from those constants.
- **Files modified:** `scripts/validate-rules.py`
- **Verification:** Acceptance grep checks passed and `python3 scripts/validate-rules.py code --report-only` still exited `0`
- **Committed in:** `dc299fd`

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug)
**Impact on plan:** The auto-fix tightened the validator contract without adding scope. Behavior stayed minimal and aligned with the planned acceptance checks.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Hooks, CI, and QA plans can now reuse a single repo-local validator contract with stable exit semantics.
- No blocker found within this plan’s scope.

## Self-Check: PASSED
- Summary file exists at `.planning/milestones/v1.7-phases/27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa/27-02-SUMMARY.md`
- Task commit `dc299fd` exists in git history
- Task commit `97d4d25` exists in git history

---
*Phase: 27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa*
*Completed: 2026-04-18*
