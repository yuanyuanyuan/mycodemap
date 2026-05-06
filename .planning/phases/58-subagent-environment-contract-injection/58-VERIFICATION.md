---
phase: 58-subagent-environment-contract-injection
verified: 2026-05-05T09:42:36Z
status: complete
score: 13/13 closure gates satisfied; SDC-05 verified by manual Claude evidence
overrides_applied: 0
re_verification: true
human_verification:
  - test: "Delegate to `.claude/agents/env-contract-verifier.md` in an authenticated Claude Code session and prove that env-contract retrieval happens before substantive work"
    expected: "Transcript saved to `docs/generated/phase-58/subagent-evidence/claude-session.md` plus `claude-subagent.json` with concrete retrieval evidence"
    why_human: "Claude real subagent delegation is interactive and is the required closure gate for SDC-05"
    result: "pass"
  - test: "Optionally run the Codex parity path with `.codex/agents/env-contract-verifier.toml` and record `pass`, `fail`, or `waived`"
    expected: "Codex evidence saved to `codex-session.md` and `codex-subagent.json`, or an exact waiver blocker recorded"
    why_human: "Codex parity is optional for closure but still needs explicit evidence or waiver"
    result: "pass"
---

# Phase 58: Subagent Environment Contract Retrieval Verification Report

**Phase Goal:** Make delegated-agent prompts carry RTK, commit-format, Vitest-entry, and rule-context contract up front; require real Claude/Codex sub-agent verification evidence.
**Verified:** 2026-05-05T00:00:00Z
**Status:** complete
**Re-verification:** Yes -- Phase 58 truth re-baselined and verification fixtures regenerated; manual Claude checkpoint completed

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Phase 57 dependency must be checked before Phase 58 code execution. | VERIFIED | Commit `68e5655` records preflight: Phase 57 not complete, user explicitly overrode dependency gate. Check was performed before code changes. |
| 2 | Retrieval-first contract replaces prompt-snippet injection. | VERIFIED | No `.mycodemap/prompt-snippets/` in source or tests. All assistant assets use `mycodemap env-contract --for <type> --json` retrieval guidance. `discovery.ts` produces structured contract items, not prompt snippets. |
| 3 | Executable facts outrank docs when recommending conflict resolution. | VERIFIED | `discovery.ts:56-76` classifies `.githooks/*`, `package.json`, `vitest*.config.ts` as `executable` authority; `AGENTS.md`, `docs/rules/*` as `governance`. Conflict detection in `detectConflicts()` recommends hook over docs. |
| 4 | Existing Phase 55 seed writer is evolved, not bypassed. | VERIFIED | `env-contract-plan.ts` imports `discoverProjectEnvironmentContract` from Phase 58 discovery engine. `isSeedContract()` detects `env-contract.seed.v1` and deterministically migrates to `env-contract.v1`. No parallel writer created. |
| 5 | MCP exposure starts from the interface contract, but native fallback is allowed when generated tools only return cli_redirect. | VERIFIED | `interface-contract/commands/env-contract.ts` registers `envContractContract`. Native `codemap_env_contract` tool in `server.ts:57-110` calls discovery/filter/check functions directly, returning real contract JSON (not cli_redirect). |
| 6 | Stable MCP lookup name is codemap_env_contract. | VERIFIED | `server.ts:57` registers `codemap_env_contract`. `schema-adapter.ts:256-258` has `normalizeToolNameSegment()` that converts hyphens to underscores. |
| 7 | Retrieval APIs do not generate or inject prompt snippets. | VERIFIED | CLI command (`env-contract.ts`) returns filtered contract items as JSON/human output. MCP tool returns structured contract data. No prompt-snippet generation in any code path. |
| 8 | Generated assistant examples are inactive copy-paste suggestions. | VERIFIED | `assistant-plan.ts:67` includes "This file is a copy-paste suggestion. Do NOT auto-rewrite your CLAUDE.md." All 4 generators produce inactive guidance with explicit copy-paste framing. |
| 9 | Generated examples use retrieval guidance, not duplicated prompt snippets. | VERIFIED | `generateClaudeContext()` line 63: `mycodemap env-contract --for default --json`. `generateCodexAgentExample()` line 137: `codemap_env_contract(agentType="worker")`. No `cat .mycodemap/env-contract.json` in any generated template. |
| 10 | Doctor drift checks are visible through existing doctor severity/exit-code semantics. | VERIFIED | `check-env-contract.ts` returns `DiagnosticResult[]` with `category: 'agent'`. `orchestrator.ts:20` wires `checkEnvContract(rootDir)` into parallel checker execution. Missing contract = warn, drift = error, conflicts = warn. Exit codes: 0=ok, 1=error, 2=warn-only. |
| 11 | Subagent verification must be real or explicitly blocked; no silent downgrade. | VERIFIED | `scripts/verify-subagent-env-contract.mjs` now stages `.claude/agents/env-contract-verifier.md`, `.codex/agents/env-contract-verifier.toml`, `verification-manifest.json`, and manual evidence templates. Blocker-only placeholders no longer count as proof of success. |
| 12 | Negative no-retrieval case is required. | VERIFIED | E2E test `env-contract-retrieval.test.ts:190-225` proves hook rejects `bad message` with `Format: [TAG] scope: message`. Evidence file `negative-no-retrieval.json` records hook rejection. Second E2E test proves `npm run nonexistent-command` fails. |
| 13 | Docs must not revive prompt-snippet injection guidance. | VERIFIED | `grep "cat .mycodemap/env-contract.json"` returns 0 matches in README.md, SETUP_GUIDE.md, AI_ASSISTANT_SETUP.md. AI_ASSISTANT_SETUP.md line 104 explicitly states `.mycodemap/prompt-snippets/` is not generated. |

**Score:** 13/13 closure gates satisfied; manual Claude and Codex evidence are recorded.

### ROADMAP Success Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Single canonical Project Environment Contract with tagged items, source traceability, conflict detection | VERIFIED | `types.ts` defines schema. `discovery.ts` produces items with 5 categories, 4 severities, 4 authority levels. `sourceSnapshots` with sha256 hashes. `ContractConflict` with recommendations. |
| 2 | Agent-type-sensitive retrieval: explore=retrieval+validation, edit/worker=execution+commit+style+validation, plan=validation+retrieval, verify=execution+validation | VERIFIED | `filters.ts:11-19` defines `DEFAULT_AGENT_FILTERS` with exact category sets. `filterContractForAgent()` filters by agent type. Unknown types fall back to `default`. |
| 3 | Claude/Codex/generic assets receive retrieval guidance, no `.mycodemap/prompt-snippets/` | VERIFIED | `assistant-plan.ts` 4 generators all use `mycodemap env-contract --for <type> --json` guidance. Docs explicitly state prompt-snippets not generated. |
| 4 | `--as-hook-config` generates SubagentStart hook; `--as-codex-agent` generates developer_instructions | VERIFIED | `env-contract.ts:53-91` `buildHookConfigOutput()` and `buildCodexAgentOutput()` produce correct templates. Spot-check: `--as-hook-config` outputs SubagentStart JSON, `--as-codex-agent` outputs TOML with developer_instructions. |
| 5 | Doctor detects drift/conflicts (warn-only); init generates contract assets | VERIFIED | `check-env-contract.ts` wired into `orchestrator.ts`. Drift=error, conflicts=warn. `reconciler.ts:565` calls `createEnvContractPlan()`, `641` calls `applyEnvContractPlan()`. |
| 6 | MCP exposes `codemap_env_contract` tool | VERIFIED | `server.ts:57` registers native `codemap_env_contract` with agentType/category/check inputs. Returns real contract JSON via discovery+filter functions. |
| 7 | Tests cover discovery, filtering, conflict detection, drift detection, missing-critical failure | VERIFIED | 72 tests pass across env-contract, init, doctor, MCP modules. Discovery: 9 tests. Filters: 6 tests. Check: 8 tests. Validation: 8 tests. CLI: 10 tests. MCP: 6 tests. |
| 8 | Real sub-agent verification through the repo-local verifier agents | VERIFIED | `58-HUMAN-UAT.md` defines the manual protocol. `verification-manifest.json` plus the agent fixture files are prepared. `claude-session.md` and `claude-subagent.json` prove retrieval-before-work. |
| 9 | Negative case: sub-agent without retrieval fails | VERIFIED | E2E test proves hook rejects bad commit format. Evidence file records `Format: [TAG] scope: message` rejection. |
| 10 | Test evidence includes command transcript, query artifact, and explicit verdict state | VERIFIED | `claude-session.md`, `codex-session.md`, `claude-subagent.json`, and `codex-subagent.json` are populated with transcript evidence, retrieval output, verdict state, and blocker/notes fields. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/cli/env-contract/types.ts` | Canonical schema types | VERIFIED | 67 lines. ContractCategory, ContractSeverity, SourceAuthority, AgentType, ContractItem, ProjectEnvironmentContract interfaces. |
| `src/cli/env-contract/validation.ts` | Schema validation functions | VERIFIED | 153 lines. `validateContractItem()`, `validateProjectEnvironmentContract()`, `assertProjectEnvironmentContract()`. |
| `src/cli/env-contract/discovery.ts` | Source discovery engine | VERIFIED | 298 lines. Discovers 5 critical/high items from AGENTS.md, .githooks, package.json, docs/rules. sha256 snapshots. Authority classification. |
| `src/cli/env-contract/filters.ts` | Agent-type filtering | VERIFIED | 41 lines. `DEFAULT_AGENT_FILTERS` for 7 agent types. `filterContractForAgent()` with fallback to default. |
| `src/cli/env-contract/check.ts` | Drift/conflict/validity checks | VERIFIED | 146 lines. Schema validation, critical item presence, source snapshot freshness, conflict detection. |
| `src/cli/env-contract/index.ts` | Public exports | VERIFIED | 9 lines. Re-exports all modules. |
| `src/cli/commands/env-contract.ts` | CLI command | VERIFIED | 233 lines. 8 options (--json, --human, --for, --category, --check, --update, --as-hook-config, --as-codex-agent). Registered in `cli/index.ts:242`. |
| `src/cli/interface-contract/commands/env-contract.ts` | Interface contract | VERIFIED | 169 lines. Full CommandContract with output shape, error codes, examples. Registered in `commands/index.ts`. |
| `src/server/mcp/server.ts` | Native MCP tool | VERIFIED | `codemap_env_contract` registered at line 57. Calls discovery/filter/check directly. Returns real contract JSON. |
| `src/server/mcp/schema-adapter.ts` | Tool name normalization | VERIFIED | `normalizeToolNameSegment()` at line 258. Used at lines 336, 348 for tool name generation. |
| `src/cli/doctor/check-env-contract.ts` | Doctor checker | VERIFIED | 109 lines. Missing, schema-invalid, critical-missing, source-drift, conflict, fresh diagnostics. Wired into `orchestrator.ts:20`. |
| `src/cli/init/env-contract-plan.ts` | Init plan with seed migration | VERIFIED | 217 lines. Uses discovery engine. Seed v1 migration. States: installed, skipped, already-synced, conflict. Wired into `reconciler.ts:565`. |
| `src/cli/init/assistant-plan.ts` | Assistant guidance | VERIFIED | 243 lines. 4 generators with retrieval guidance. No `cat .mycodemap/env-contract.json`. |
| `tests/e2e/env-contract-retrieval.test.ts` | E2E tests | VERIFIED | 247 lines. 6 tests: init+retrieval, --check, doctor, drift, hook rejection, wrong command. Real temp repos. |
| `scripts/verify-subagent-env-contract.mjs` | Preparation workflow | VERIFIED | Rebuilds `dist/cli/index.js`, regenerates helper snippets, writes verifier agent fixtures, writes `verification-manifest.json`, and stages the manual evidence templates. It no longer attempts `claude -p` or `codex exec --agent`. |
| `.claude/agents/env-contract-verifier.md` | Claude verification-only agent fixture | VERIFIED | Requires `mycodemap env-contract --for explore --json` before substantive work, with `codemap_env_contract(agentType="explore")` as fallback. |
| `.codex/agents/env-contract-verifier.toml` | Codex verification-only agent fixture | VERIFIED | Requires `mycodemap env-contract --for worker --json` or `codemap_env_contract(agentType="worker")` before substantive work. |
| `docs/generated/phase-58/subagent-evidence/verification-manifest.json` | Manual checkpoint manifest | VERIFIED | Declares `phase: "58"`, `claudeRequired: true`, `codexOptional: true`, and the required artifact list. |
| `docs/generated/phase-58/subagent-evidence/claude-session.md` / `codex-session.md` | Transcript placeholders | PREPARED | Human-owned files for pasting the real Claude/Codex transcripts. |
| `docs/generated/phase-58/subagent-evidence/claude-subagent.json` / `codex-subagent.json` | Evidence verdict templates | PREPARED | Include `platform`, `attempted`, `available`, `commandTranscriptPath`, `retrievalEvidence`, `verdict`, `blocker`, and `notes`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `cli/index.ts` | `commands/env-contract.ts` | `import + addCommand` | WIRED | Line 26 import, line 242 addCommand |
| `commands/env-contract.ts` | `env-contract/index.ts` | `import discovery/filter/check` | WIRED | Lines 8-14 import all functions |
| `interface-contract/commands/index.ts` | `env-contract.ts` | `import + export` | WIRED | Line 11 import, line 21 export |
| `server/mcp/server.ts` | `env-contract/index.ts` | `import discovery/filter/check` | WIRED | Line 19 imports |
| `doctor/orchestrator.ts` | `check-env-contract.ts` | `import + call` | WIRED | Line 8 import, line 20 call |
| `init/reconciler.ts` | `env-contract-plan.ts` | `import + call createEnvContractPlan` | WIRED | Line 10 import, line 565 call |
| `init/reconciler.ts` | `assistant-plan.ts` | `import + call createAssistantPlan` | WIRED | Existing wiring from Phase 55 |
| `schema-adapter.ts` | `normalizeToolNameSegment` | function definition + usage | WIRED | Lines 258, 336, 348 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `discovery.ts` | `items` | Real file reads (AGENTS.md, .githooks, package.json, docs/rules) | Yes - sha256 hashes, actual content | FLOWING |
| `filters.ts` | filtered items | `contract.items` from discovery | Yes - category-based filtering | FLOWING |
| `check.ts` | diagnostics | Contract validation + file hash comparison | Yes - real drift detection | FLOWING |
| `server.ts` codemap_env_contract | structuredContent | `discoverProjectEnvironmentContract(cwd())` | Yes - live discovery | FLOWING |
| `env-contract.ts` CLI | stdout JSON | `filterContractForAgent(contract, agentType)` | Yes - filtered items | FLOWING |
| `check-env-contract.ts` | DiagnosticResult[] | `checkProjectEnvironmentContract(contract, rootDir)` | Yes - real check results | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| env-contract --for worker --json returns valid filtered JSON | `node dist/cli/index.js env-contract --for worker --json` | schemaVersion=env-contract.v1, agentType=worker, items contain execution/commit categories, no retrieval | PASS |
| --as-hook-config produces SubagentStart hook | `node dist/cli/index.js env-contract --as-hook-config` | Valid JSON with SubagentStart hook and additionalContext | PASS |
| --as-codex-agent produces developer_instructions | `node dist/cli/index.js env-contract --as-codex-agent` | TOML with developer_instructions and codemap_env_contract reference | PASS |
| --check returns valid status | `node dist/cli/index.js env-contract --check --json` | status=warn, ok=True, 3 diagnostics | PASS |
| Test suite passes | `npx vitest run src/cli/env-contract src/cli/commands/__tests__/env-contract-command.test.ts src/cli/doctor/__tests__/check-env-contract.test.ts src/server/mcp/__tests__/env-contract-tool.test.ts src/cli/init/__tests__/env-contract-plan.test.ts` | 72 tests pass, 0 fail | PASS |
| Build succeeds | `npm run build` | tsc compiles cleanly | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-----------|-------------|--------|----------|
| SDC-01 | 58-01, 58-02 | Single canonical Project Environment Contract | SATISFIED | `types.ts` schema, `discovery.ts` engine, `.mycodemap/env-contract.json` generation |
| SDC-02 | 58-01, 58-03 | Contract includes RTK, commit format, Vitest, CodeMap priority, real validation | SATISFIED | `discovery.ts` produces shell-rtk-wrapper, commit-format, test-entry-vitest, codemap-query-priority, real-scenario-validation items |
| SDC-03 | 58-02, 58-04 | Contract injection covers edit/review/verification paths, no scoped rules fallback | SATISFIED | `filters.ts` covers 7 agent types. `default` type gets all categories. CLI `--for` and MCP `agentType` both filter. |
| SDC-04 | 58-01, 58-03, 58-04 | Drift/missing critical checks fail; conflicts warn-only | SATISFIED | `check.ts` CRITICAL_ITEM_IDS = ['commit-format', 'test-entry-vitest']. Drift = error. Conflicts = warn. Doctor checker maps to severity. |
| SDC-05 | 58-02, 58-04, 58-05 | Real Claude/Codex subagent verification with evidence | SATISFIED | Manual evidence set is complete: `docs/generated/phase-58/subagent-evidence/claude-session.md`, `claude-subagent.json`, `codex-session.md`, `codex-subagent.json`, and `verification-manifest.json`. Claude is required; Codex is optional with explicit waiver. |
| ABT-01 | 58-01, 58-03 | Init generates per-runtime assistant guidance | SATISFIED | `assistant-plan.ts` generates claude-context.md, agents-context.md, claude-hook-example.json, codex-agent-example.toml |
| ABT-02 | 58-01, 58-03 | Assets written to `.mycodemap/assistants/` | SATISFIED | `assistant-plan.ts:184` writes to `.mycodemap/assistants/` |
| ABT-03 | 58-03, 58-04 | Init receipt reports agent context connection status | SATISFIED | `receipt.ts` classifies assets into main-agent/subagent/infrastructure. Reports installed/already-synced/conflict statuses. Team file sync detection for CLAUDE.md/AGENTS.md. |
| VER-03 | 58-01, 58-02, 58-04 | Verification path through built CLI subprocess | SATISFIED | E2E test `env-contract-retrieval.test.ts` invokes `node dist/cli/index.js`. CLI command tests use subprocess. Evidence harness uses subprocess. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No anti-patterns detected |

No TODO/FIXME/PLACEHOLDER comments. No empty returns flowing to user output. No hardcoded empty data. No `cat .mycodemap/env-contract.json` in source. No `.mycodemap/prompt-snippets/` references in production code.

### Human Verification Required

See `58-HUMAN-UAT.md` for the authoritative manual protocol.

- `Claude required`
  - Use `.claude/agents/env-contract-verifier.md`.
  - Save the transcript to `docs/generated/phase-58/subagent-evidence/claude-session.md`.
  - Update `docs/generated/phase-58/subagent-evidence/claude-subagent.json`.
  - Treat Claude as `pass` only if a retrieval call exists before substantive work.
- `Codex optional`
  - Use `.codex/agents/env-contract-verifier.toml` only if a real parity run is available.
  - Save the transcript to `docs/generated/phase-58/subagent-evidence/codex-session.md`.
  - Update `docs/generated/phase-58/subagent-evidence/codex-subagent.json` with `pass`, `fail`, or `waived`.

### Gaps Summary

Code-level delivery is still valid. The closure gate is closed:

| Gap | Current state | Closure condition |
|-----|---------------|------------------|
| Claude real subagent verification | Complete | `claude-session.md` and `claude-subagent.json` prove retrieval-before-work |
| Codex optional parity | Complete | `codex-subagent.json` records `pass` with retrieval evidence |
| Verification rollup | Complete | `58-UAT.md`, `58-VERIFICATION.md`, and `.planning/STATE.md` updated from the real evidence files |

---

_Verified: 2026-05-05T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
_Docs Review Updated: 2026-05-05T00:00:00Z_
