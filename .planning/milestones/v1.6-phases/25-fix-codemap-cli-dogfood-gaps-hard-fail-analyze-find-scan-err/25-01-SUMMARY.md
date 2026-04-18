---
phase: 25-fix-codemap-cli-dogfood-gaps-hard-fail-analyze-find-scan-err
plan: 01
subsystem: cli
tags: [analyze, diagnostics, ast-grep, fallback, dogfood]

requires:
  - phase: 25-fix-codemap-cli-dogfood-gaps-hard-fail-analyze-find-scan-err
    provides: re-discussed Phase 25 context and P0 dogfood failure scope
provides:
  - stdout-visible `CodemapOutput.diagnostics` contract for analyze
  - config-aware `AstGrepAdapter` target discovery with strict failure mode
  - `analyze -i find` text fallback that distinguishes success, partialFailure, and failure
affects: [analyze-cli, orchestrator-types, ast-grep-adapter, ai-guide-output-docs]

tech-stack:
  added: []
  patterns:
    - additive machine-readable diagnostics on CLI JSON output
    - config-aware fallback discovery via `loadCodemapConfig` and `discoverProjectFiles`

key-files:
  created:
    - .planning/milestones/v1.6-phases/25-fix-codemap-cli-dogfood-gaps-hard-fail-analyze-find-scan-err/25-01-SUMMARY.md
  modified:
    - src/orchestrator/types.ts
    - src/orchestrator/adapters/ast-grep-adapter.ts
    - src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts
    - src/cli/commands/analyze.ts
    - src/cli/commands/__tests__/analyze-command.test.ts
    - src/orchestrator/__tests__/types.test.ts

key-decisions:
  - "`diagnostics.status` is additive on `CodemapOutput` and uses `success | partialFailure | failure`."
  - "`AstGrepAdapter` keeps default compatibility by returning `[]`, while `failOnScanError` makes scanner/discovery/parse errors throw typed errors."
  - "`analyze -i find` probes strict scan when orchestrated output is empty so true zero-hit and scanner failure no longer collapse into the same JSON shape."

patterns-established:
  - "Strict-probe pattern: use a strict adapter probe only for ambiguous empty find output, then fallback if scanner failure is confirmed."
  - "Fallback truth pattern: stdout JSON carries the degradation truth instead of relying on stderr-only warnings."

requirements-completed:
  - P25-SC1
  - P25-SC2
  - P25-SC3

duration: 10min
completed: 2026-04-18
---

# Phase 25 Plan 01: Analyze Find Diagnostics Summary

**`analyze -i find` now exposes scanner degradation through stdout diagnostics and config-aware fallback results**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-17T17:48:00Z
- **Completed:** 2026-04-17T17:58:00Z
- **Tasks:** 3
- **Files modified:** 6 source/test files plus this summary

## Accomplishments

- Added `AnalyzeDiagnostics` to `CodemapOutput`, including `success`, `partialFailure`, and `failure`.
- Reworked `AstGrepAdapter` discovery to use `loadCodemapConfig()` plus `discoverProjectFiles()` instead of hardcoded `src/**/*.ts/js/tsx/jsx`.
- Added strict adapter failure mode with typed `file-discovery-failed`, `scan-failed`, and `parse-failed` errors.
- Updated `analyze -i find` so ambiguous empty scanner output is strict-probed, degraded to config-aware text fallback on scanner failure, and marked as `partialFailure` in stdout JSON.
- Added regression coverage for fallback hits, fallback failure, true zero-hit success, and explicit path target anchoring.

## Task Commits

No commits were created in this Codex run because the active developer instruction says not to commit unless explicitly requested.

1. **Task 1: 定义 analyze diagnostics 输出契约** — completed, uncommitted
2. **Task 2: 让 AstGrepAdapter 复用 config-aware discovery 并支持 strict failure** — completed, uncommitted
3. **Task 3: 在 AnalyzeCommand 中上浮 find failure 并实现 config-aware text fallback** — completed, uncommitted

## Files Created/Modified

- `src/orchestrator/types.ts` - Adds diagnostics types, `CodemapOutput.diagnostics`, and optional diagnostics validation in `isCodemapOutput()`.
- `src/orchestrator/adapters/ast-grep-adapter.ts` - Uses config-aware file discovery and adds strict typed failure mode.
- `src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts` - Covers config-aware discovery, default compatibility, and strict failure codes.
- `src/cli/commands/analyze.ts` - Adds find strict probe, config-aware text fallback, partial/failure diagnostics, and machine-mode failure exit code.
- `src/cli/commands/__tests__/analyze-command.test.ts` - Covers scanner degradation, fallback failure, true zero-hit success, and explicit path anchoring.
- `src/orchestrator/__tests__/types.test.ts` - Extends source union test for `codemap-fallback`.

## Decisions Made

- Kept `diagnostics` additive and optional to preserve existing JSON consumers.
- Kept default `AstGrepAdapter` behavior compatible by returning `[]`; strict behavior is opt-in via `failOnScanError`.
- Used a strict probe after empty orchestrated `find` output to avoid treating true zero-hit as failure.
- Used `process.exitCode = 1` only when both scanner and config-aware fallback fail in machine/json mode.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Commit protocol skipped under higher-priority runtime instruction**
- **Found during:** Summary creation
- **Issue:** GSD execute-plan normally commits task and metadata changes, but Codex developer instructions prohibit commits unless explicitly requested.
- **Fix:** Left changes uncommitted and documented the deviation.
- **Files modified:** `.planning/milestones/v1.6-phases/25-fix-codemap-cli-dogfood-gaps-hard-fail-analyze-find-scan-err/25-01-SUMMARY.md`
- **Verification:** `rtk git status --short` shows changes are present but uncommitted.
- **Committed in:** Not committed

---

**Total deviations:** 1 documented runtime-protocol deviation.
**Impact on plan:** Implementation and verification are complete; only the commit step is intentionally deferred.

## Verification

- `rtk pnpm exec vitest run src/cli/commands/__tests__/analyze-command.test.ts src/orchestrator/adapters/__tests__/ast-grep-adapter.test.ts` — passed, 52 tests.
- `rtk npm run typecheck` — passed.
- `rtk npm run build` — passed.
- `rtk node dist/cli/index.js analyze -i find -k SourceLocation --json --structured` — stdout JSON parsed with `tool: codemap-find-fallback`, `diagnostics.status: partialFailure`, `resultCount: 8`, and `degradedTools: ["ast-grep"]`.
- `rtk node dist/cli/index.js query --search SourceLocation --limit 10 --json --structured` — passed with `resultCount: 1`, `hasSourceLocation: true`.

## Issues Encountered

- The live dogfood command still emits verbose `ast-grep` syntax output on stderr before JSON parsing. This is acceptable for Plan 01 because the required machine truth now exists on stdout, but Plan 03 should document stdout-vs-stderr expectations clearly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 02 can now address adjacent CLI contract gaps (`complexity -f`, `ci assess-risk --json`, `workflow start --json`) with the diagnostics pattern established here.

---
*Phase: 25-fix-codemap-cli-dogfood-gaps-hard-fail-analyze-find-scan-err*
*Completed: 2026-04-18*
