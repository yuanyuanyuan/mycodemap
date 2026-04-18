---
phase: 25-fix-codemap-cli-dogfood-gaps-hard-fail-analyze-find-scan-err
plan: 03
subsystem: docs
tags: [ai-docs, diagnostics, guardrails, dogfood, validation]

requires:
  - phase: 25-fix-codemap-cli-dogfood-gaps-hard-fail-analyze-find-scan-err
    provides: Plan 01 analyze diagnostics and Plan 02 adjacent CLI JSON contracts
provides:
  - AI-facing docs for analyze diagnostics/status semantics
  - command reference entries for complexity, CI risk, and workflow JSON modes
  - docs guardrail coverage for Phase 25 dogfood contracts
  - final dogfood-shaped verification evidence
affects: [AI_GUIDE, docs-ai-guide, docs-guardrails, phase-25-completion]

tech-stack:
  added: []
  patterns:
    - docs guardrails for additive CLI JSON contracts
    - generated docs source update before docs sync validation

key-files:
  created:
    - .planning/milestones/v1.6-phases/25-fix-codemap-cli-dogfood-gaps-hard-fail-analyze-find-scan-err/25-03-SUMMARY.md
  modified:
    - AI_GUIDE.md
    - CLAUDE.md
    - docs/ai-guide/COMMANDS.md
    - docs/ai-guide/OUTPUT.md
    - docs/rules/engineering-with-codex-openai.md
    - scripts/sync-analyze-docs.js
    - scripts/validate-ai-docs.js
    - src/cli/__tests__/validate-docs-script.test.ts

key-decisions:
  - "General code search guidance keeps `query -S` as the default stable path while documenting `analyze find` diagnostics semantics."
  - "`rtk` is documented only as an execution wrapper, not as a CodeMap product feature."
  - "Full CLI surface unification remains deferred; Phase 25 only closes dogfood-blocking JSON gaps."

patterns-established:
  - "Docs-first generated block updates: update `scripts/sync-analyze-docs.js`, then sync generated docs before running guardrails."
  - "Guardrail-required snippets for CLI contracts that agents parse directly."

requirements-completed:
  - P25-SC4
  - P25-SC5
  - P25-DOCS

duration: 7min
completed: 2026-04-18
---

# Phase 25 Plan 03: Docs Guardrails and Dogfood Closure Summary

**AI-facing docs and guardrails now describe Phase 25 diagnostics/status contracts and final dogfood evidence**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-17T18:05:00Z
- **Completed:** 2026-04-17T18:12:00Z
- **Tasks:** 3
- **Files modified:** 8 docs/script/test files plus this summary

## Accomplishments

- Updated `AI_GUIDE.md` to preserve `query -S "XXX" -j` as the general search recommendation while documenting `analyze find` stdout diagnostics.
- Updated `docs/ai-guide/COMMANDS.md` with `analyze find --json --structured`, `complexity -f ... -j`, `ci assess-risk --json`, `workflow start --json`, and `check` default JSON notes.
- Updated `docs/ai-guide/OUTPUT.md` with `AnalyzeDiagnostics`, `AnalyzeDiagnostic`, and success/partialFailure/failure semantics.
- Updated `scripts/sync-analyze-docs.js` so generated analyze examples include the repaired `find` JSON path.
- Added `scripts/validate-ai-docs.js` guardrails for Phase 25 diagnostics/status docs and workflow analysis-only boundary.
- Added a regression test proving AI docs fail when the analyze diagnostics contract is removed.
- Synchronized `CLAUDE.md` and `docs/rules/engineering-with-codex-openai.md` with the new CLI contract expectations required by repository policy.

## Task Commits

No commits were created in this Codex run because the active developer instruction says not to commit unless explicitly requested.

1. **Task 1: 更新 AI guide 与 command reference** — completed, uncommitted
2. **Task 2: 更新 OUTPUT schema 与 docs guardrails** — completed, uncommitted
3. **Task 3: 执行 dogfood-shaped 回归验证并记录 Phase 25 总结** — completed, uncommitted

## Files Created/Modified

- `AI_GUIDE.md` - Adds diagnostics status guidance, keeps `query -S`, and scopes `rtk` as wrapper-only.
- `CLAUDE.md` - Adds Phase 25 CLI dogfood truth notes for agent execution.
- `docs/ai-guide/COMMANDS.md` - Adds command examples for `analyze find`, `complexity`, `ci assess-risk`, and `workflow start` JSON modes.
- `docs/ai-guide/OUTPUT.md` - Adds `AnalyzeDiagnostics` contract and failure semantics.
- `docs/rules/engineering-with-codex-openai.md` - Adds verification expectations for the new CLI JSON contracts.
- `scripts/sync-analyze-docs.js` - Adds generated `analyze -i find -k "SourceLocation" --json --structured` example.
- `scripts/validate-ai-docs.js` - Adds Phase 25 dogfood contract guardrails.
- `src/cli/__tests__/validate-docs-script.test.ts` - Adds fixture coverage for AI docs diagnostics guardrail.

## Decisions Made

- **Docs sync: updated** — Code docs, generated analyze docs, and AI guardrails now match the implemented CLI contracts.
- **rtk scope: wrapper only** — `rtk` is documented only as an execution/token-saving wrapper for this repository, not as CodeMap product scope.
- **Deferred: full CLI surface unification** — Phase 25 intentionally fixes dogfood-blocking JSON contracts without promising every CLI command has identical flags or schemas.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Commit protocol skipped under higher-priority runtime instruction**
- **Found during:** Summary creation
- **Issue:** GSD execute-plan normally commits task and metadata changes, but Codex developer instructions prohibit commits unless explicitly requested.
- **Fix:** Left changes uncommitted and documented the deviation.
- **Files modified:** `.planning/milestones/v1.6-phases/25-fix-codemap-cli-dogfood-gaps-hard-fail-analyze-find-scan-err/25-03-SUMMARY.md`
- **Verification:** `rtk git status --short` shows changes are present but uncommitted.
- **Committed in:** Not committed

---

**Total deviations:** 1 documented runtime-protocol deviation.
**Impact on plan:** Implementation and verification are complete; only the commit step is intentionally deferred.

## Verification

- `rtk grep "partialFailure|diagnostics|query -S|ci assess-risk.*--json|workflow start.*--json|complexity -f|rtk" AI_GUIDE.md docs/ai-guide/COMMANDS.md` — passed.
- `rtk grep "interface AnalyzeDiagnostics|partialFailure|diagnostics.status" docs/ai-guide/OUTPUT.md scripts/validate-ai-docs.js src/cli/__tests__/validate-docs-script.test.ts` — passed.
- `rtk pnpm exec vitest run src/cli/__tests__/validate-docs-script.test.ts` — passed, 23 tests.
- `rtk npm run docs:check` — passed.
- `rtk npm run docs:check` — passed again after synchronizing `CLAUDE.md` and `docs/rules/engineering-with-codex-openai.md`.
- `rtk pnpm exec vitest run src/cli/commands/__tests__/analyze-command.test.ts src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts src/cli/commands/__tests__/complexity-command.test.ts src/cli/commands/__tests__/ci-command-risk.test.ts src/cli/commands/__tests__/workflow.test.ts src/cli/__tests__/validate-docs-script.test.ts` — passed, 109 tests.
- `rtk npm run typecheck` — passed.
- `rtk npm run build` — passed.
- `rtk node dist/cli/index.js analyze -i find -k SourceLocation --json --structured` — stdout JSON parsed with `diagnostics.status: partialFailure`, `tool: codemap-find-fallback`, `resultCount: 8`; no longer a no-diagnostics low-confidence empty result.
- `rtk node dist/cli/index.js query --search SourceLocation --limit 10 --json --structured` — stdout JSON parsed with `resultCount: 1`, `hasSourceLocation: true`.
- `rtk node dist/cli/index.js complexity -f src/cli/commands/analyze.ts --json` — stdout JSON parsed with `hasFile: true`, `hasModules: false`, `relativePath: src/cli/commands/analyze.ts`.
- `rtk node dist/cli/index.js ci assess-risk --files src/cli/commands/analyze.ts --json` — stdout JSON parsed with `status: passed`, `diagnostics.status: ok`.
- `rtk node dist/cli/index.js workflow start "inspect analyze find" --json` — stdout parsed as pure JSON with `status: started`, workflow id, `currentPhase: find`, `recommended: refactoring`, and 4 next steps.

## Issues Encountered

- `analyze -i find` still emits verbose `ast-grep` syntax failure detail on stderr in the dogfood failure path. This does not break machine consumers because stdout now carries `diagnostics.status`; any stderr quieting can be handled separately if it becomes a UX priority.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 25 has summaries for all three plans and is ready for phase-level completion/update after final state and roadmap reconciliation.

---
*Phase: 25-fix-codemap-cli-dogfood-gaps-hard-fail-analyze-find-scan-err*
*Completed: 2026-04-18*
