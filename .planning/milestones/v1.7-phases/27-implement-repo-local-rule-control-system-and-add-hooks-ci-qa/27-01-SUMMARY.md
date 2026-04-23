---
phase: 27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa
plan: 01
subsystem: infra
tags: [python, capability-report, validation, hooks, ci, qa]
requires: []
provides:
  - repo-local capability baseline reporter with explicit required/optional/strategy status semantics
  - JSON contract capturing environment availability plus duration baselines for downstream gate placement
  - Python unittest coverage for required-fail, optional-disabled, and output-file writing behavior
affects: [hooks, ci-gateway, qa, phase-27-02, phase-27-04, phase-27-06]
tech-stack:
  added: []
  patterns: [python-standard-library-cli, machine-readable-capability-report, strategy-duration-baseline]
key-files:
  created:
    - scripts/capability-report.py
    - scripts/tests/test_capability_report.py
    - .planning/milestones/v1.7-phases/27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa/27-01-SUMMARY.md
  modified: []
key-decisions:
  - "Required capabilities use PASS vs REQUIRED_FAIL so missing local prerequisites never look green."
  - "Validator probing is optional and reports OPTIONAL_DISABLED when the validator is unavailable instead of inventing a pass."
patterns-established:
  - "Capability report pattern: stdout JSON mirrors /tmp output and records duration_ms per check."
  - "Capability baselines describe environment facts only and never gate hooks or CI directly."
requirements-completed: [P27-NOW-CAPABILITY-REPORT]
duration: 2 min
completed: 2026-04-19
---

# Phase 27 Plan 01: Capability baseline Summary

**Repo-local capability baseline reporter capturing required, optional, and strategy checks with explicit JSON status truth**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-19T03:22:02+08:00
- **Completed:** 2026-04-19T03:24:16+08:00
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `python3 scripts/capability-report.py --output <path>` to emit a structured capability baseline covering Python, Node, git hooks, typecheck, tests, lint, CLI, and validator availability.
- Locked explicit status semantics so required checks report `PASS` or `REQUIRED_FAIL`, optional checks report `PASS` or `OPTIONAL_DISABLED`, and strategy checks report `STRATEGY_PASS` or `STRATEGY_FAIL`.
- Added Python `unittest` coverage for required failure, optional disablement, and output-file creation so later hook and QA plans can trust the contract.

## Task Commits

Each task was committed atomically:

1. **Task 1: 新建 capability report 脚本与 JSON contract** - `ca2a42b` (`feat`)
2. **Task 2: 为 capability report 添加 Python 单测** - `65d5df0` (`test`)

## Files Created/Modified
- `scripts/capability-report.py` - Implements capability discovery, explicit status classification, duration measurement, and JSON report writing.
- `scripts/tests/test_capability_report.py` - Verifies required failure, optional disablement, and `--output` file generation behavior.
- `.planning/milestones/v1.7-phases/27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa/27-01-SUMMARY.md` - Captures execution evidence and handoff context for this plan.

## Decisions Made
- Treating git hooks as a required capability but allowing `.githooks/` to satisfy the check when `core.hooksPath` is unset keeps the baseline factual without hard-coding one local setup.
- Measuring `duration_ms` for strategy checks preserves real timing data needed before later plans decide where hard gates belong.
- Keeping validator probing optional avoids a false dependency cycle when `scripts/validate-rules.py` is not yet present.

## Verification
- `python3 -m py_compile scripts/capability-report.py scripts/tests/test_capability_report.py` — PASS
- `python3 -m unittest scripts/tests/test_capability_report.py` — PASS (`3` tests)
- `python3 scripts/capability-report.py --output /tmp/codemap-capability-report.json` — PASS (exit `0`, wrote JSON with `summary` and `items`)

## Acceptance Criteria Evidence

### Task 1
- PASS — `scripts/capability-report.py` contains `REQUIRED_FAIL`
- PASS — `scripts/capability-report.py` contains `OPTIONAL_DISABLED`
- PASS — `python3 scripts/capability-report.py --output /tmp/codemap-capability-report.json` created `/tmp/codemap-capability-report.json`
- PASS — `/tmp/codemap-capability-report.json` contains `summary`
- PASS — `/tmp/codemap-capability-report.json` contains `items`
- PASS — `/tmp/codemap-capability-report.json` contains `python3` and `node` items

### Task 2
- PASS — `scripts/tests/test_capability_report.py` contains `test_required_fail_status`
- PASS — `scripts/tests/test_capability_report.py` contains `test_optional_disabled_status`
- PASS — `scripts/tests/test_capability_report.py` contains `test_output_file_written`
- PASS — `python3 -m unittest scripts/tests/test_capability_report.py` exited `0`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The validator, hooks, and QA plans now have a concrete capability baseline and real command timings to build on.
- No blocker found within this plan’s scope.

## Self-Check: PASSED
- Summary file exists at `.planning/milestones/v1.7-phases/27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa/27-01-SUMMARY.md`
- Task commit `ca2a42b` exists in git history
- Task commit `65d5df0` exists in git history

---
*Phase: 27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa*
*Completed: 2026-04-19*
