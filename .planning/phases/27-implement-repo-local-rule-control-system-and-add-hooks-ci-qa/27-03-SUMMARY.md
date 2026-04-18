---
phase: 27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa
plan: 03
subsystem: infra
tags: [rules, docs, claude, validation, routing]
requires: []
provides:
  - repo-local rule-system default config with path-based routing and report-only hard gate defaults
  - shortened execution docs for CLAUDE and docs/rules entry points
  - validation guide aligned with docs guardrail snippets plus validator exit-code truth
affects: [hooks, ci-gateway, subagent-rule-injection, qa, phase-27-04, phase-27-05, phase-27-06]
tech-stack:
  added: []
  patterns: [short-routable-docs, path-based-rule-contract, report-only-default-gate]
key-files:
  created:
    - .claude/rule-system.config.json
    - .planning/phases/27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa/27-03-SUMMARY.md
  modified:
    - CLAUDE.md
    - docs/rules/README.md
    - docs/rules/code-quality-redlines.md
    - docs/rules/architecture-guardrails.md
    - docs/rules/validation.md
key-decisions:
  - "Rule routing is anchored on edited file paths, not on whether the agent remembered to load a long checklist."
  - "Hard gate remains report-only by default so Phase 27 can land safely before hooks and CI enforce it."
patterns-established:
  - "Entry docs stay short and point to 1-2 relevant rule files instead of duplicating full policy."
  - "Validation docs must preserve exact guardrail snippets expected by docs:check even after compression."
requirements-completed: [P27-NOW-SOFT-GATE-DEFAULTS, P27-NOW-WORKFLOW-VALIDATION]
duration: 1 min
completed: 2026-04-19
---

# Phase 27 Plan 03: Rule entry contract Summary

**Repo-local rule entry contract with path-based routing, report-only hard gate defaults, and compressed validation docs**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-19T03:40:46+08:00
- **Completed:** 2026-04-19T03:41:04+08:00
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Added `.claude/rule-system.config.json` with `enabled: true`, `route_by_edit_path: true`, `soft_gate.change_analyzer: true`, and `hard_gate.mode: "report-only"`.
- Reworked `CLAUDE.md` into a short execution router with explicit post-edit command `python3 scripts/validate-rules.py code --report-only` and file-path rule routing.
- Compressed `docs/rules/*` into command-first tables while preserving the exact high-signal snippets required by `npm run docs:check`.

## Task Commits

Each task was committed atomically:

1. **Task 1: 新增默认 rule-system config 并写清入口契约** - `3e4ec18` (`config`)
2. **Task 2: 把 rules 文档压缩为可执行表格与索引** - `9015f32` (`docs`)

## Files Created/Modified
- `.claude/rule-system.config.json` - Defines the repo-local rule-system defaults for path routing and report-only hard gating.
- `CLAUDE.md` - Adds the post-edit validator command and the file-path routing table used by Claude-facing workflows.
- `docs/rules/README.md` - Converts the rules directory entry point into a scenario-to-command index.
- `docs/rules/code-quality-redlines.md` - Reduces the redline policy to a command/threshold/failure/recovery table.
- `docs/rules/architecture-guardrails.md` - Reduces architecture rules to the MVP3 path map plus a short enforcement table.
- `docs/rules/validation.md` - Keeps validation rules short while preserving design/risk/storage/doc guardrail truths required by docs checks.
- `.planning/phases/27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa/27-03-SUMMARY.md` - Records execution evidence and handoff context for this plan.

## Decisions Made
- Kept `hard_gate.mode` at `report-only` so the repo gains a truthful default contract before Phase 27 wires that contract into hooks and CI.
- Put the path-routing table in `CLAUDE.md` because it is the smallest durable place both humans and agents can reliably discover before deeper reads.
- Preserved the exact `docs:check` snippets in `docs/rules/validation.md` instead of inventing new wording that would drift from the guardrail scripts.

## Verification
- `grep -n "python3 scripts/validate-rules.py code --report-only" CLAUDE.md` — PASS
- `grep -n "\"enabled\": true" .claude/rule-system.config.json` — PASS
- `npm run docs:check` — PASS

## Acceptance Criteria Evidence

### Task 1
- PASS — `.claude/rule-system.config.json` contains `"enabled": true`
- PASS — `.claude/rule-system.config.json` contains `"route_by_edit_path": true`
- PASS — `.claude/rule-system.config.json` contains `"mode": "report-only"`
- PASS — `CLAUDE.md` contains `python3 scripts/validate-rules.py code --report-only`
- PASS — `CLAUDE.md` contains `.githooks/*`
- PASS — `CLAUDE.md` contains `.github/workflows/*`

### Task 2
- PASS — `docs/rules/README.md` contains `code-quality-redlines.md`
- PASS — `docs/rules/README.md` contains `validation.md`
- PASS — `docs/rules/validation.md` contains `1` / `P0`
- PASS — `docs/rules/validation.md` contains `4` / `unavailable`
- PASS — `docs/rules/code-quality-redlines.md` contains `命令`
- PASS — `docs/rules/architecture-guardrails.md` contains `失败后果`
- PASS — `npm run docs:check` exited `0`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Initial whole-file patch attempt failed because the current docs had drifted from the subagent’s cached patch context; inline re-application with fresh file reads resolved it without widening scope.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Hooks and CI can now read a stable repo-local config surface instead of relying on implicit defaults.
- Subagent rule injection now has a durable path-routing contract to target in the next plan.

## Self-Check: PASSED
- Summary file exists at `.planning/phases/27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa/27-03-SUMMARY.md`
- Task commit `3e4ec18` exists in git history
- Task commit `9015f32` exists in git history

---
*Phase: 27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa*
*Completed: 2026-04-19*
