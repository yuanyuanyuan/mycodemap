---
phase: 27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa
plan: 04
subsystem: infra
tags: [hooks, ci, rule-validation, git-hooks, github-actions]
requires:
  - phase: 27-01
    provides: capability report baseline for local rule-control tooling
  - phase: 27-02
    provides: validate-rules exit-code contract and report-only mode
  - phase: 27-03
    provides: rule-system docs truth and no-verify semantics baseline
provides:
  - pre-commit hard_gate.mode routing for report-only vs enforce rule validation
  - commit-msg narrowed to commit message format enforcement only
  - CI rule validation backstop that blocks only on validator exit codes 1 and 4
  - engineering docs that state no-verify cannot bypass CI backstop
affects: [27-05, 27-06, hooks, ci, workflow-validation]
tech-stack:
  added: []
  patterns: [hook exit-code routing, ci backstop parity, split hook responsibilities]
key-files:
  created:
    - .planning/milestones/v1.7-phases/27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa/27-04-SUMMARY.md
  modified:
    - .githooks/pre-commit
    - .githooks/commit-msg
    - .github/workflows/ci-gateway.yml
    - docs/rules/engineering-with-codex-openai.md
key-decisions:
  - "pre-commit directly reads .claude/rule-system.config.json hard_gate.mode so local hook behavior matches repo config"
  - "commit-msg keeps only [TAG] scope: message validation; file-count enforcement remains in pre-commit and CI surfaces"
  - "CI Rule validation backstop mirrors validator exit semantics: 1/4 fail, 2/3 warn-only"
patterns-established:
  - "Hook parity: local pre-commit and CI both call validate-rules.py with explicit exit-code handling"
  - "Bypass truth: git commit --no-verify only skips local hooks; CI still enforces Rule validation backstop"
requirements-completed: [P27-NOW-HOOKS-CI-QA, P27-NOW-NO-VERIFY-BACKSTOP]
duration: 3 min
completed: 2026-04-18
---

# Phase 27 Plan 04: Hooks and CI hard backstop Summary

**Repo-local rule validation now runs in pre-commit and CI with explicit report-only, warn-only, and blocking exit-code behavior**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-18T19:44:04Z
- **Completed:** 2026-04-18T19:48:02Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added `hard_gate.mode` routing to `.githooks/pre-commit` so `report-only` and `enforce` behave differently without duplicating validator logic.
- Removed commit-size enforcement from `.githooks/commit-msg`, leaving it responsible only for `[TAG] scope: message`.
- Added a fixed-name `Rule validation backstop` CI step and documented that `git commit --no-verify` cannot bypass it.

## Task Commits

Each task was committed atomically:

1. **Task 1: 接入 pre-commit 并清理 commit-msg 职责漂移** - `5ddfc46` (fix)
2. **Task 2: 在 CI gateway 增加 no-verify backstop 并同步工程文档** - `1de8b2a` (fix)

## Files Created/Modified
- `.githooks/pre-commit` - adds `validate-rules.py code` routing based on `hard_gate.mode`
- `.githooks/commit-msg` - removes file-count enforcement and keeps message-format validation only
- `.github/workflows/ci-gateway.yml` - adds `Rule validation backstop` with `1/4` fail and `2/3` warn-only handling
- `docs/rules/engineering-with-codex-openai.md` - documents hook responsibility split and CI backstop for `--no-verify`
- `.planning/milestones/v1.7-phases/27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa/27-04-SUMMARY.md` - records plan execution, verification, and readiness

## Decisions Made
- Pre-commit reads `.claude/rule-system.config.json` directly instead of hardcoding mode in the hook, so config remains the single source of truth.
- `commit-msg` no longer enforces file-count limits, preventing duplicate or conflicting failures with `pre-commit` and CI.
- CI treats validator exit codes `2/3` as warn-only and `1/4` as blocking, matching the planned backstop contract for `--no-verify`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for `27-05`; local hooks and CI now share the same validator exit-code truth for hard backstop behavior.
- No blocker introduced for follow-up soft-gate and workflow validation work.

## Self-Check: PASSED

- Found `.planning/milestones/v1.7-phases/27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa/27-04-SUMMARY.md` on disk.
- Verified task commits `5ddfc46` and `1de8b2a` exist in git history.

---
*Phase: 27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa*
*Completed: 2026-04-18*
