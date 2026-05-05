---
phase: 58-subagent-environment-contract-injection
plan: 02
subsystem: agent-integration
tags: [cli, mcp, env-contract, subagent, interface-contract, commander]

requires:
  - phase: 58-01
    provides: env-contract types, discovery, filters, check, validation modules
provides:
  - mycodemap env-contract CLI command with JSON/human/check/update/template modes
  - Interface contract registration for env-contract with alias env_contract
  - Normalized MCP tool naming (hyphens to underscores)
  - Native codemap_env_contract MCP tool returning real contract JSON
  - Built CLI subprocess verification tests
affects: [58-03, mcp-gateway, subagent-integration]

tech-stack:
  added: []
  patterns: [native-mcp-tool-for-contract-retrieval, normalized-tool-naming, subprocess-cli-verification]

key-files:
  created:
    - src/cli/commands/env-contract.ts
    - src/cli/commands/__tests__/env-contract-command.test.ts
    - src/cli/interface-contract/commands/env-contract.ts
    - src/server/mcp/__tests__/env-contract-tool.test.ts
  modified:
    - src/cli/index.ts
    - src/cli/interface-contract/commands/index.ts
    - src/cli/interface-contract/index.ts
    - src/server/mcp/schema-adapter.ts
    - src/server/mcp/server.ts
    - src/server/mcp/__tests__/CodeMapMcpServer.test.ts
    - src/server/mcp/__tests__/dynamic-server.test.ts

key-decisions:
  - "Native MCP tool justified because generated contract tools return cli_redirect, not real payload"
  - "Normalized alias collisions skipped rather than renamed to avoid redundant tools"
  - "process.cwd() mocked in MCP tests because Vitest workers dont support process.chdir()"

patterns-established:
  - "Native MCP tool pattern: when generated contract tool returns cli_redirect, register native tool that calls service functions directly"
  - "Tool name normalization: normalizeToolNameSegment() replaces non-alphanumeric chars with underscore"

requirements-completed: [SDC-01, SDC-03, SDC-05, VER-03]

duration: 42min
completed: 2026-05-02
---

# Phase 58 Plan 02: CLI Retrieval Command, Interface Contract, and MCP Tool Summary

**mycodemap env-contract CLI command with agent-type filtering, interface contract registration, and native MCP tool returning real contract JSON for subagent retrieval**

## Performance

- **Duration:** 42 min
- **Started:** 2026-05-02T15:29:28Z
- **Completed:** 2026-05-02T16:11:54Z
- **Tasks:** 5
- **Files modified:** 11

## Accomplishments

- `mycodemap env-contract` CLI command with 8 options: --json, --human, --for, --category, --check, --update, --as-hook-config, --as-codex-agent
- Interface contract registered with alias `env_contract` for MCP normalization
- `normalizeToolNameSegment()` in schema-adapter ensures hyphenated commands produce stable MCP tool names
- Native `codemap_env_contract` MCP tool returns real contract JSON (not cli_redirect) with agent-type filtering and check mode
- 16 new tests (10 CLI subprocess + 6 MCP native tool) all passing, full suite 1293 tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Add mycodemap env-contract command** - `c6660bc` (feat)
2. **Task 2: Register interface contract for env-contract** - `79b2474` (feat)
3. **Task 3: Normalize MCP tool naming** - `6a94e99` (feat)
4. **Task 4: Add native codemap_env_contract MCP tool** - `7317ba9` (feat)
5. **Task 5: Built CLI subprocess verification** - `3701f96` (docs)

## Files Created/Modified

- `src/cli/commands/env-contract.ts` - CLI command implementation with all modes
- `src/cli/commands/__tests__/env-contract-command.test.ts` - 10 subprocess tests for CLI command
- `src/cli/interface-contract/commands/env-contract.ts` - Interface contract definition with 8 flags
- `src/cli/interface-contract/commands/index.ts` - Registered envContractContract in commandContracts
- `src/cli/interface-contract/index.ts` - Exported envContractContract from public API
- `src/cli/index.ts` - Registered envContractCommand in commander
- `src/server/mcp/schema-adapter.ts` - Added normalizeToolNameSegment() for hyphen-to-underscore
- `src/server/mcp/server.ts` - Added native codemap_env_contract tool, improved alias collision handling
- `src/server/mcp/__tests__/env-contract-tool.test.ts` - 6 tests for native MCP tool
- `src/server/mcp/__tests__/CodeMapMcpServer.test.ts` - Updated expected tool list
- `src/server/mcp/__tests__/dynamic-server.test.ts` - Added normalization assertions

## Decisions Made

- **Native MCP tool justified:** Generated contract tools return `cli_redirect` (not real payload). A native tool calling discovery/filter/check functions directly is the only way to serve contract JSON via MCP. This satisfies D-08 from CONTEXT.
- **Normalized alias collisions skipped:** When `env-contract` and `env_contract` both normalize to `env_contract`, the alias definition is skipped rather than renamed to `codemap_env_contract_contract`. This avoids redundant tools.
- **process.cwd() mocked in MCP tests:** Vitest workers do not support `process.chdir()`. The MCP test mocks `node:process` cwd to return the temp directory.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] First-run guide printing to stdout in subprocess tests**
- **Found during:** Task 1 (env-contract command tests)
- **Issue:** `runFirstRunGuide()` prints welcome banner to stdout when `.mycodemap/` directory is missing, corrupting JSON output in subprocess tests
- **Fix:** Created `.mycodemap/.first-run-done` marker file in test fixture
- **Files modified:** src/cli/commands/__tests__/env-contract-command.test.ts
- **Verification:** All 10 CLI tests pass with clean JSON parsing
- **Committed in:** c6660bc (Task 1 commit)

**2. [Rule 1 - Bug] CodeMapMcpServer test hardcoded tool list**
- **Found during:** Task 2 (interface contract registration)
- **Issue:** Pre-commit hook caught that adding env-contract to interface contract changed the MCP tool list
- **Fix:** Updated expected tool list in CodeMapMcpServer.test.ts
- **Files modified:** src/server/mcp/__tests__/CodeMapMcpServer.test.ts
- **Verification:** Test passes with updated expected list
- **Committed in:** 79b2474 (Task 2 commit)

**3. [Rule 1 - Bug] MCP alias collision producing redundant tools**
- **Found during:** Task 3 (MCP tool naming normalization)
- **Issue:** Both `env-contract` and `env_contract` normalize to `env_contract`, causing the alias to be registered as `codemap_env_contract_contract`
- **Fix:** Added logic to skip normalized alias collisions vs native tool conflicts
- **Files modified:** src/server/mcp/server.ts
- **Verification:** Only `codemap_env_contract` appears in tool list, no redundant `_contract` suffix
- **Committed in:** 6a94e99 (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (3 bugs)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep.

## Issues Encountered

- `process.chdir()` not supported in Vitest workers required mocking `node:process` cwd function in MCP tests
- Commit message format required `[TAG] scope: message` format (first attempt used conventional commits)

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all data sources are wired to real discovery functions.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: cli-subprocess | src/cli/commands/env-contract.ts | Command reads from filesystem and executes in subprocess context. Read-only by default; --update writes .mycodemap/env-contract.json. |

## Next Phase Readiness

- CLI command, interface contract, and MCP tool all operational
- Ready for Phase 58-03 (doctor integration for env-contract diagnostics)
- D-02 (platform adaptation), D-03 (retrieval guidance format), D-08 (MCP naming), D-09 (subagent verification) all covered

---
*Phase: 58-subagent-environment-contract-injection*
*Completed: 2026-05-02*

## Self-Check: PASSED

- All 9 key files verified present
- All 5 commit hashes verified in git log
- Full test suite: 1293 tests pass, 0 failures
