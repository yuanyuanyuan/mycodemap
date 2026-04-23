---
phase: 27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa
plan: 05
subsystem: infra
tags: [rules, subagents, workflows, hooks, claude, codex]
requires:
  - phase: 27-02
    provides: repo-local validator exit-code contract
  - phase: 27-03
    provides: path-based rule routing defaults and shortened docs truth
provides:
  - scoped rule-context helper for prompt and json output
  - advisory-only Claude Write/Edit hook for matched repo rules
  - explicit `<rule_context>` injection steps in Codex and Claude execute/quick workflows
affects: [27-06, qa, quick-workflows, execute-phase, hooks]
tech-stack:
  added: []
  patterns: [scoped-rule-routing, advisory-hook-context, workflow-prompt-injection]
key-files:
  created:
    - scripts/rule-context.mjs
    - .claude/hooks/rule-route-advisory.js
    - .planning/milestones/v1.7-phases/27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa/27-05-SUMMARY.md
  modified:
    - .claude/settings.json
    - .codex/get-shit-done/workflows/execute-phase.md
    - .codex/get-shit-done/workflows/quick.md
    - .claude/get-shit-done/workflows/execute-phase.md
    - .claude/get-shit-done/workflows/quick.md
key-decisions:
  - "rule-context helper caps output at matched 1-2 rule docs instead of falling back to the full rules directory."
  - "Advisory hook exits silently when config is disabled so soft gate remains non-blocking."
  - "Workflow prompts must inject explicit `<rule_context>` text rather than relying on parent-agent memory."
patterns-established:
  - "Workflow pattern: derive RULE_CONTEXT from files_modified before each executor/quick spawn."
  - "Hook pattern: PreToolUse enriches additionalContext without blocking the edit itself."
requirements-completed: [P27-NOW-SOFT-GATE-DEFAULTS, P27-NOW-SUBAGENT-RULE-INJECTION, P27-NOW-WORKFLOW-VALIDATION]
duration: 1 min
completed: 2026-04-19
---

# Phase 27 Plan 05: Scoped rule injection Summary

**Scoped rule helper, advisory hook, and workflow-level `<rule_context>` injection for Claude and Codex subagents**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-19T03:51:45+08:00
- **Completed:** 2026-04-19T03:52:23+08:00
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Added `scripts/rule-context.mjs` to map edited files to the minimum relevant rule docs and a shared post-edit verify command.
- Added `.claude/hooks/rule-route-advisory.js` plus `.claude/settings.json` registration so Write/Edit operations receive advisory-only scoped rule context.
- Updated both Codex and Claude `execute-phase` / `quick` workflows to derive and inject `<rule_context>` before spawning subagents.

## Task Commits

Each task was committed atomically:

1. **Task 1: 实现 scoped rule-context helper 与 advisory hook** - `e526f81` (`feature`)
2. **Task 2: 在 execute/quick workflow 注入 subagent rule context** - `aa0260d` (`docs`)

## Files Created/Modified
- `scripts/rule-context.mjs` - Maps file paths to scoped rules and emits either JSON or prompt-ready context.
- `.claude/hooks/rule-route-advisory.js` - Adds advisory-only PreToolUse context for Write/Edit operations.
- `.claude/settings.json` - Registers the new advisory hook.
- `.codex/get-shit-done/workflows/execute-phase.md` - Adds RULE_CONTEXT derivation and `<rule_context>` injection for executor spawns.
- `.codex/get-shit-done/workflows/quick.md` - Adds RULE_CONTEXT derivation and `<rule_context>` injection for quick tasks.
- `.claude/get-shit-done/workflows/execute-phase.md` - Mirrors the scoped rule injection flow on the Claude side.
- `.claude/get-shit-done/workflows/quick.md` - Mirrors the scoped rule injection flow on the Claude side.
- `.planning/milestones/v1.7-phases/27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa/27-05-SUMMARY.md` - Records execution evidence and handoff context for this plan.

## Decisions Made
- Kept the helper output bounded to the first matched 1-2 rule docs so prompts stay scoped and do not regress into full-rules injection.
- Used `additionalContext` in the hook response to preserve advisory-only behavior while still surfacing the exact verify command.
- Made `No scoped rules inferred` an explicit workflow fallback so missing file lists never cause hidden full-context expansion.

## Verification
- `node scripts/rule-context.mjs --files src/cli/index.ts --format json` — PASS
- `node scripts/rule-context.mjs --files docs/rules/validation.md --format json` — PASS
- `node scripts/rule-context.mjs --files src/cli/index.ts docs/rules/validation.md --format prompt` — PASS
- `node .claude/hooks/rule-route-advisory.js` with disabled temp config — PASS (`0` bytes output, no advisory)
- `grep -n "rule-context.mjs --files" ...execute-phase.md ...quick.md` — PASS
- `npm run docs:check` — PASS

## Acceptance Criteria Evidence

### Task 1
- PASS — `scripts/rule-context.mjs` includes `json|prompt` parsing
- PASS — `scripts/rule-context.mjs` includes `docs/rules/code-quality-redlines.md`
- PASS — `scripts/rule-context.mjs` includes `docs/rules/engineering-with-codex-openai.md`
- PASS — `.claude/settings.json` includes `rule-route-advisory.js`
- PASS — `.claude/hooks/rule-route-advisory.js` includes `python3 scripts/validate-rules.py code --report-only`
- PASS — `node scripts/rule-context.mjs --files src/cli/index.ts --format json` returns `code-quality-redlines.md`

### Task 2
- PASS — `.codex/get-shit-done/workflows/execute-phase.md` includes `rule-context.mjs --files`
- PASS — `.codex/get-shit-done/workflows/quick.md` includes `<rule_context>`
- PASS — `.claude/get-shit-done/workflows/execute-phase.md` includes `No scoped rules inferred`
- PASS — `.claude/get-shit-done/workflows/quick.md` includes `Only inject matched rules`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- The delegated executor used an incorrect `rtk grep` invocation for acceptance review, so the orchestrator completed the final verification inline with fresh commands.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 27 QA can now assert scoped rule routing, advisory-only disabled behavior, and workflow-level rule injection against real code.
- No blocker found for the final QA plan.

## Self-Check: PASSED
- Summary file exists at `.planning/milestones/v1.7-phases/27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa/27-05-SUMMARY.md`
- Task commit `e526f81` exists in git history
- Task commit `aa0260d` exists in git history

---
*Phase: 27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa*
*Completed: 2026-04-19*
