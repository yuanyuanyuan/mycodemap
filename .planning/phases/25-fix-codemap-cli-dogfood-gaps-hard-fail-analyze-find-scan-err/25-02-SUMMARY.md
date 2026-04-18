---
phase: 25-fix-codemap-cli-dogfood-gaps-hard-fail-analyze-find-scan-err
plan: 02
subsystem: cli
tags: [complexity, ci, workflow, json-contract, dogfood]

requires:
  - phase: 25-fix-codemap-cli-dogfood-gaps-hard-fail-analyze-find-scan-err
    provides: Plan 01 diagnostics pattern for machine-readable CLI truth
provides:
  - file-scoped `complexity -f <file> --json` output
  - `ci assess-risk --json` with `passed | failed | skipped` status
  - additive `workflow start --json` machine surface
affects: [ai-guide-commands, ai-guide-output, cli-dogfood]

tech-stack:
  added: []
  patterns:
    - additive JSON mode for existing human-first commands
    - explicit status field for agent-consumed CI checks

key-files:
  created:
    - src/cli/commands/__tests__/complexity-command.test.ts
    - .planning/phases/25-fix-codemap-cli-dogfood-gaps-hard-fail-analyze-find-scan-err/25-02-SUMMARY.md
  modified:
    - src/cli/commands/complexity.ts
    - src/cli/commands/ci.ts
    - src/cli/commands/__tests__/ci-command-risk.test.ts
    - src/cli/commands/workflow.ts
    - src/cli/commands/__tests__/workflow.test.ts

key-decisions:
  - "`complexity -f --json` now keeps the target module populated and emits a single `file` object."
  - "`ci assess-risk --json` uses `process.exitCode = 1` for failed JSON output instead of prose-first `process.exit(1)`."
  - "`workflow start --json` is intentionally additive and limited to id/currentPhase/template/nextSteps."

patterns-established:
  - "Machine status contract: CLI JSON consumed by agents should expose a top-level status instead of requiring prose parsing."
  - "Human output compatibility: add JSON branches without rewriting existing prose output."

requirements-completed:
  - P25-DOGFOOD-COMPLEXITY
  - P25-DOGFOOD-CI-RISK
  - P25-DOGFOOD-WORKFLOW

duration: 7min
completed: 2026-04-18
---

# Phase 25 Plan 02: Adjacent CLI Contract Gaps Summary

**Complexity, CI risk, and workflow start now expose bounded JSON shapes for agent dogfood flows**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-17T17:58:00Z
- **Completed:** 2026-04-17T18:05:00Z
- **Tasks:** 3
- **Files modified:** 5 source/test files plus one new test and this summary

## Accomplishments

- Fixed `complexity -f <file> --json` so file mode has a target complexity entry and emits a single `file` object, not a project-wide `modules` list.
- Added `ci assess-risk --json` with top-level `status`, `files`, `threshold`, `risk`, `diagnostics`, and `message`.
- Added JSON skipped, failed, and passed regression tests for `ci assess-risk`.
- Added `workflow start --json` as pure JSON with workflow id, current phase, template recommendation/selection, and next steps.
- Preserved existing human/prose command behavior for all three commands.

## Task Commits

No commits were created in this Codex run because the active developer instruction says not to commit unless explicitly requested.

1. **Task 1: 修复 complexity file mode 的 JSON 输出范围** — completed, uncommitted
2. **Task 2: 为 ci assess-risk 添加 JSON status contract** — completed, uncommitted
3. **Task 3: 为 workflow start 添加最小 JSON 输出** — completed, uncommitted

## Files Created/Modified

- `src/cli/commands/complexity.ts` - Adds target module complexity to file mode before formatting.
- `src/cli/commands/__tests__/complexity-command.test.ts` - Adds file-scoped JSON contract test.
- `src/cli/commands/ci.ts` - Adds `AssessRiskCommandOutput` and `--json` option for `assess-risk`.
- `src/cli/commands/__tests__/ci-command-risk.test.ts` - Covers skipped, failed, and passed JSON status paths.
- `src/cli/commands/workflow.ts` - Adds pure JSON output for `workflow start --json`.
- `src/cli/commands/__tests__/workflow.test.ts` - Covers parseable workflow start JSON and absence of `[WORKFLOW STARTED]`.

## Decisions Made

- Used `process.exitCode = 1` for failed `ci assess-risk --json` so stdout remains parseable JSON.
- Did not modify `check`, because the Phase 25 plan confirms its existing default JSON already includes `passed` and `summary`.
- Kept workflow JSON limited to existing analysis-only workflow context and did not add new workflow product semantics.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Commit protocol skipped under higher-priority runtime instruction**
- **Found during:** Summary creation
- **Issue:** GSD execute-plan normally commits task and metadata changes, but Codex developer instructions prohibit commits unless explicitly requested.
- **Fix:** Left changes uncommitted and documented the deviation.
- **Files modified:** `.planning/phases/25-fix-codemap-cli-dogfood-gaps-hard-fail-analyze-find-scan-err/25-02-SUMMARY.md`
- **Verification:** `rtk git status --short` shows changes are present but uncommitted.
- **Committed in:** Not committed

---

**Total deviations:** 1 documented runtime-protocol deviation.
**Impact on plan:** Implementation and verification are complete; only the commit step is intentionally deferred.

## Verification

- `rtk pnpm exec vitest run src/cli/commands/__tests__/complexity-command.test.ts` — passed.
- `rtk pnpm exec vitest run src/cli/commands/__tests__/ci-command-risk.test.ts` — passed.
- `rtk pnpm exec vitest run src/cli/commands/__tests__/workflow.test.ts` — passed.
- `rtk pnpm exec vitest run src/cli/commands/__tests__/complexity-command.test.ts src/cli/commands/__tests__/ci-command-risk.test.ts src/cli/commands/__tests__/workflow.test.ts` — passed, 34 tests.
- `rtk npm run typecheck` — passed.
- `rtk npm run build` — passed.
- `rtk node dist/cli/index.js complexity -f src/cli/commands/analyze.ts --json` — stdout parsed with `hasFile: true`, `hasModules: false`, `relativePath: src/cli/commands/analyze.ts`.
- `rtk node dist/cli/index.js ci assess-risk --files src/cli/commands/analyze.ts --json` — stdout parsed with `status: passed` and `diagnostics.status: ok`.
- `rtk node dist/cli/index.js workflow start "inspect analyze find" --json` — stdout parsed as pure JSON with `status: started`, workflow id, `currentPhase: find`, `recommended: refactoring`, and 4 next steps.

## Issues Encountered

- None beyond the commit-protocol deviation required by the Codex runtime instruction.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 03 can now document the new stdout contracts and add/adjust guardrails so AI-facing docs match the implemented CLI behavior.

---
*Phase: 25-fix-codemap-cli-dogfood-gaps-hard-fail-analyze-find-scan-err*
*Completed: 2026-04-18*
