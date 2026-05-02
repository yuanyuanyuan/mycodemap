---
phase: 58-subagent-environment-contract-injection
plan: 01
subsystem: cli
tags: [env-contract, discovery, validation, filtering, drift-detection, init]

requires:
  - phase: 55-agent-bootstrap-assets
    provides: manifest-extractors, env-contract seed writer, InitAsset integration
provides:
  - Canonical ProjectEnvironmentContract schema (env-contract.v1)
  - Source discovery engine with authority classification
  - Agent-type filtering for contract items
  - Drift/conflict/validity checks
  - Seed migration from env-contract.seed.v1
affects: [58-02, doctor, init, mcp]

tech-stack:
  added: []
  patterns: [source-authority-classification, sha256-snapshot-drift, agent-category-filtering]

key-files:
  created:
    - src/cli/env-contract/types.ts
    - src/cli/env-contract/validation.ts
    - src/cli/env-contract/discovery.ts
    - src/cli/env-contract/filters.ts
    - src/cli/env-contract/check.ts
    - src/cli/env-contract/index.ts
    - src/cli/env-contract/__tests__/validation.test.ts
    - src/cli/env-contract/__tests__/discovery.test.ts
    - src/cli/env-contract/__tests__/filters.test.ts
    - src/cli/env-contract/__tests__/check.test.ts
  modified:
    - src/cli/init/env-contract-plan.ts
    - src/cli/init/__tests__/env-contract-plan.test.ts

key-decisions:
  - "Executable facts (.githooks/*, package.json) outrank governance docs for conflict resolution"
  - "Seed v1 migration is deterministic: schema upgrade preserves manifest facts and adds discovery items"
  - "Source snapshots use sha256 hashes for drift detection; hash mismatch is error-level in --check"

patterns-established:
  - "Source authority order: executable > governance > generated > example"
  - "Agent category filtering via DEFAULT_AGENT_FILTERS lookup table"
  - "Contract check severity: schema/critical/drift = error, conflicts = warn"

requirements-completed: [SDC-01, SDC-02, SDC-04, ABT-01, ABT-02, VER-03]

duration: 15min
completed: 2026-05-02
---

# Phase 58 Plan 01: Project Environment Contract Model, Discovery, and Seed Migration Summary

**Canonical env-contract.v1 schema with source discovery, agent filtering, drift detection, and seed migration from Phase 55**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-02T15:08:45Z
- **Completed:** 2026-05-02T15:23:33Z
- **Tasks:** 4 executed (Task 02 was pre-complete from commit 134935a)
- **Files modified:** 12

## Accomplishments

- Canonical `ProjectEnvironmentContract` schema in `types.ts` with 5 categories, 4 severities, 4 authority levels
- Source discovery engine extracts 5 critical/high contract items from AGENTS.md, .githooks/commit-msg, package.json, docs/rules/testing.md
- Agent-type filtering covers 7 agent types (explore/plan/edit/worker/review/verify/default) with category-based filtering
- Drift detection via sha256 source snapshots; conflict detection with authority-based recommendations
- Phase 55 seed writer migrated to use discovery engine, schema upgraded from `env-contract.seed.v1` to `env-contract.v1`
- 58 tests pass across all env-contract and init test files; typecheck passes

## Task Commits

Each task was committed atomically:

1. **Task 01: Preflight** - Already complete from commits 68e5655 and 134935a (dependency override + validator-injected migration)
2. **Task 02: Schema and validation** - `134935a` (feat) - Pre-complete before this execution
3. **Task 03: Source discovery** - `bb4404c` (feat) - 9 tests
4. **Task 04: Filters and checks** - `29490fc` (feat) - 10 tests
5. **Task 05: Seed migration** - `ea136be` (feat) - 9 tests

## Files Created/Modified

- `src/cli/env-contract/types.ts` - Canonical schema types (ContractCategory, ContractSeverity, SourceAuthority, AgentType, ContractItem, ProjectEnvironmentContract)
- `src/cli/env-contract/validation.ts` - validateContractItem() and validateProjectEnvironmentContract() with source validation
- `src/cli/env-contract/discovery.ts` - discoverProjectEnvironmentContract() scanning AGENTS.md, .githooks, package.json, docs/rules
- `src/cli/env-contract/filters.ts` - DEFAULT_AGENT_FILTERS and filterContractForAgent() by agent type
- `src/cli/env-contract/check.ts` - checkProjectEnvironmentContract() for schema, critical items, drift, conflicts
- `src/cli/env-contract/index.ts` - Public exports for all modules
- `src/cli/init/env-contract-plan.ts` - Migrated to use discovery engine, schema v1, seed migration support
- `src/cli/env-contract/__tests__/validation.test.ts` - 8 tests for schema validation
- `src/cli/env-contract/__tests__/discovery.test.ts` - 9 tests for source discovery
- `src/cli/env-contract/__tests__/filters.test.ts` - 6 tests for agent filtering
- `src/cli/env-contract/__tests__/check.test.ts` - 8 tests for drift/conflict checks
- `src/cli/init/__tests__/env-contract-plan.test.ts` - 9 tests for init plan with seed migration

## Decisions Made

- **Executable authority outranks governance:** `.githooks/*` and `package.json` are classified as `executable` authority; `AGENTS.md` and `docs/rules/` are `governance`. Conflict recommendations prefer executable sources.
- **Deterministic seed migration:** When existing `env-contract.json` has `schemaVersion: "env-contract.seed.v1"`, the plan deterministically upgrades to `env-contract.v1` with full discovery output instead of requiring manual review.
- **Critical items are `commit-format` and `test-entry-vitest`:** These two items cause `--check` to fail with error status when missing. Other items (shell-rtk-wrapper, codemap-query-priority, real-scenario-validation) are present but not critical for check.
- **Conflicts are warn-only:** Mismatched values between sources produce `ContractConflict` entries that surface as warnings, not errors, unless a critical item is missing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed dynamic await import in check.test.ts**
- **Found during:** Task 04 commit (pre-commit hook rejection)
- **Issue:** `await import('node:crypto')` inside non-async function caused transform error
- **Fix:** Changed to top-level `import { createHash } from 'node:crypto'`
- **Files modified:** `src/cli/env-contract/__tests__/check.test.ts`
- **Verification:** Tests pass after fix
- **Committed in:** 29490fc (part of Task 04 commit)

**2. [Rule 3 - Blocking] Added generatedAt option to createEnvContractPlan**
- **Found during:** Task 05 (seed migration tests)
- **Issue:** Already-synced test was non-deterministic because `new Date().toISOString()` changed between calls
- **Fix:** Added optional `generatedAt` parameter to `createEnvContractPlan()` for deterministic timestamp control
- **Files modified:** `src/cli/init/env-contract-plan.ts`
- **Verification:** All 9 env-contract-plan tests pass
- **Committed in:** ea136be (part of Task 05 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for correctness and test determinism. No scope creep.

## Issues Encountered

- Pre-commit hook rejected first Task 04 commit due to lowercase tag format (`feat` instead of `[FEATURE]`). Fixed commit message to use `[TAG]` format required by `.githooks/commit-msg`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `src/cli/env-contract/` module is complete with types, validation, discovery, filters, and check
- Ready for CLI command registration (`mycodemap env-contract`) and MCP tool exposure
- Ready for doctor integration (env-contract freshness/conflict diagnostics)
- Ready for assistant example updates (retrieval guidance instead of raw file reading)

## Known Stubs

None - all contract items are wired to real source file discovery. No hardcoded empty values or placeholder text.

## Self-Check

- [x] All 12 created/modified files exist
- [x] All 4 task commits exist (134935a, bb4404c, 29490fc, ea136be)
- [x] 58 tests pass across env-contract and init modules
- [x] Typecheck passes

---
*Phase: 58-subagent-environment-contract-injection*
*Completed: 2026-05-02*
