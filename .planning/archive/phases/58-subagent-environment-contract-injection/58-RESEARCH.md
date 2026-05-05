# Phase 58: Subagent Environment Contract Retrieval - Research

**Researched:** 2026-05-02
**Domain:** CLI environment-contract discovery, init assets, doctor diagnostics, MCP retrieval, real subagent verification
**Confidence:** HIGH for repository integration points; MEDIUM for live Claude/Codex availability during execution

## Summary

Phase 58 should evolve the Phase 55 `.mycodemap/env-contract.json` seed into a first-class Project Environment Contract, not introduce a second writer or a prompt-snippet injection system. The existing repository already has the right seams: `src/cli/init/env-contract-plan.ts` owns the seed asset, `src/cli/init/manifest-extractors.ts` extracts manifest facts, `src/cli/init/assistant-plan.ts` generates assistant guidance, `src/cli/doctor/orchestrator.ts` aggregates agent diagnostics, and `src/server/mcp/server.ts` dynamically registers interface-contract tools.

The technical plan should be retrieval-first:

- `mycodemap init` generates `.mycodemap/env-contract.json` and a source snapshot.
- `mycodemap env-contract --for <agent-type> --json` returns filtered contract items.
- `mycodemap env-contract --check` detects missing critical items, source drift, schema errors, and conflicts.
- `mycodemap doctor` reports env-contract freshness and conflicts inside the existing `agent` category.
- MCP exposes `codemap_env_contract` as a runtime query tool. The interface contract must still include `env-contract`, but the current dynamic MCP contract adapter only returns `cli_redirect`, so a native tool may be required unless the adapter is upgraded to execute the command.

## Phase Requirement Mapping

| Requirement | Research conclusion |
|-------------|---------------------|
| ABT-01 | Preserve and upgrade per-runtime assistant assets; do not replace them with unrelated files. |
| ABT-02 | Keep generated assets under `.mycodemap/assistants/`; update content to retrieval guidance. |
| ABT-03 | Init receipt should continue to report asset status through existing InitAsset flow. |
| VER-03 | Add subprocess tests that invoke `node dist/cli/index.js env-contract`, not only in-process functions. |
| SDC-01 | Define one canonical `.mycodemap/env-contract.json` schema with tagged items, conflicts, and source snapshots. |
| SDC-02 | Discovery must include RTK shell wrapping, `[TAG] scope: message`, Vitest commands/config, CodeMap query priority, and real validation expectations. |
| SDC-03 | Agent-type filtering must cover explore, plan, edit, worker, review, verify, and default/no scoped-rule cases. |
| SDC-04 | Drift and missing critical contract checks must fail through `--check`; conflicts are warn-only unless a critical contract is missing. |
| SDC-05 | Verification must attempt both `claude -p` and `codex exec` real subagent paths and record evidence or environment blockers. |

## Repository Facts

| Fact | Source |
|------|--------|
| Phase 58 depends on Phase 55, 56, and 57 and covers ABT-01/02/03, VER-03, and SDC-01..05. | `.planning/ROADMAP.md:315` |
| Phase 57 is still recorded as `ready_to_plan`, so Phase 58 execution needs a preflight dependency check. | `.planning/STATE.md` |
| Existing env-contract seed writer produces `schemaVersion: 'env-contract.seed.v1'` and tool-owned InitAsset states. | `src/cli/init/env-contract-plan.ts` |
| Manifest extraction already reads package.json, pyproject.toml, go.mod, and Cargo.toml, and records unknown test/build commands. | `src/cli/init/manifest-extractors.ts` |
| Existing assistant assets still tell subagents to `cat .mycodemap/env-contract.json`, which must be upgraded to the CLI/MCP retrieval interface. | `src/cli/init/assistant-plan.ts` |
| Doctor already has an `agent` diagnostic category and computes `0=ok`, `1=errors`, `2=warnings only`. | `src/cli/doctor/types.ts`, `src/cli/doctor/orchestrator.ts` |
| Dynamic MCP registration currently converts each command contract into `codemap_${contract.name}` and returns a `cli_redirect` response. | `src/server/mcp/schema-adapter.ts` |
| Native MCP tools are registered before contract tools and can reserve stable names. | `src/server/mcp/server.ts` |
| `package.json` scripts define `test: vitest run`, `test:e2e`, `build: tsc`, `typecheck`, and `lint`. | `package.json` |
| `.githooks/commit-msg` enforces uppercase tags and `[TAG] scope: message`. | `.githooks/commit-msg` |
| Testing rules require Vitest, real scenario verification, evidence, and at least one failure scenario. | `docs/rules/testing.md` |

## Architecture

### Target Flow

```text
source files
  package.json
  .githooks/commit-msg
  AGENTS.md
  docs/rules/*.md
  .mycodemap/rules/*.md
  vitest*.config.ts
      |
      v
env-contract discovery engine
      |
      +--> .mycodemap/env-contract.json
      +--> .mycodemap/status/env-contract-last.json
      |
      v
retrieval APIs
  mycodemap env-contract --for worker --json
  mycodemap env-contract --check
  codemap_env_contract MCP tool
      |
      v
assistant examples
  Claude SubagentStart hook guidance
  Codex developer_instructions retrieval guidance
  generic AGENTS/CLAUDE copy-paste snippets
```

### Source Authority

Use a deterministic recommendation order for conflicts:

1. Executable facts: `.githooks/*`, `package.json` scripts, `vitest*.config.ts`
2. Repository governance: `AGENTS.md`, `docs/rules/*.md`, `.mycodemap/rules/*.md`
3. Generated helper docs: `.mycodemap/assistants/*`
4. Examples and archived/brainstorm documents

Conflicts should be reported with both sources and the recommended source. Conflict presence alone is warning-level; missing critical facts or source drift for critical facts is error-level for `--check`.

## Data Model Recommendation

Keep the schema small and explicit:

```typescript
export type ContractCategory = 'execution' | 'commit' | 'retrieval' | 'validation' | 'style';
export type ContractSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ContractSource {
  file: string;
  line?: number;
  hash: string;
  authority: 'executable' | 'governance' | 'generated' | 'example';
}

export interface ContractItem {
  id: string;
  category: ContractCategory;
  severity: ContractSeverity;
  content: string;
  metadata?: Record<string, unknown>;
  sources: ContractSource[];
}

export interface ContractConflict {
  id: string;
  severity: ContractSeverity;
  description: string;
  sources: Array<{ file: string; value: string }>;
  recommendation: string;
}

export interface ProjectEnvironmentContract {
  schemaVersion: 'env-contract.v1';
  generatedAt: string;
  projectProfile: {
    name: string;
    source: string;
    confidence: 'high' | 'medium' | 'low' | 'none';
  };
  items: ContractItem[];
  conflicts: ContractConflict[];
  sourceSnapshots: Array<{ file: string; hash: string; lastModified: string }>;
}
```

Compatibility rule: if an existing `env-contract.seed.v1` file is present, execution must preserve manifest-derived facts and migrate them into `env-contract.v1` instead of discarding them.

## CLI and MCP Approach

### CLI

Create `mycodemap env-contract` with these minimum flags:

- `--json`: force JSON output.
- `--human`: force human-readable output.
- `--for <agentType>`: filter items by agent type.
- `--category <category>`: optional category filter.
- `--check`: validate contract freshness and critical coverage.
- `--update`: regenerate `.mycodemap/env-contract.json`.
- `--as-hook-config`: print Claude Code `SubagentStart` hook example.
- `--as-codex-agent`: print Codex agent TOML retrieval prompt.

Recommended agent filters:

| Agent type | Categories |
|------------|------------|
| explore | retrieval, validation |
| plan | retrieval, validation |
| edit | execution, commit, style, validation |
| worker | execution, commit, style, validation |
| review | retrieval, validation, style |
| verify | execution, validation |
| default | execution, commit, retrieval, validation, style |

### MCP

The preferred path is still interface-contract registration, but current dynamic MCP handlers return `cli_redirect` instead of the contract payload. Plan 58 should therefore include this decision point:

1. Add an `env-contract` command contract.
2. Normalize hyphenated tool names so the stable name is `codemap_env_contract`.
3. If the contract-generated tool still cannot return the actual contract payload, register a native `codemap_env_contract` tool that calls the same env-contract service used by the CLI.
4. Preserve the interface contract entry for schema discovery even if the native tool owns the stable MCP name.

This satisfies D-08 because the native tool is only justified by the output-shape limitation, not by preference.

## Testing Strategy

Use Vitest and real filesystem/subprocess verification.

### Unit Tests

- Discovery: extracts package scripts, commit hook format/tags, AGENTS retrieval priority, testing rules, and Vitest config.
- Filtering: exact category sets for explore, plan, edit, worker, review, verify, default, and unknown agent fallback.
- Schema validation: rejects invalid category/severity/content and preserves source traceability.
- Conflict detection: reports hook-vs-doc mismatch with executable source recommendation.
- Drift detection: detects source hash changes after contract generation.

### Integration Tests

- Temp repo + `mycodemap init --yes --profile nodejs` writes `.mycodemap/env-contract.json`.
- `node dist/cli/index.js env-contract --for worker --json` returns filtered JSON from a built CLI subprocess.
- `node dist/cli/index.js env-contract --check` exits non-zero for missing critical contract or stale source hash.
- MCP client `listTools()` includes `codemap_env_contract`, and `callTool()` returns contract JSON, not only `cli_redirect`.
- `mycodemap doctor --json` reports env-contract freshness and conflicts under `category: agent`.

### Real Subagent Evidence

Execution should create an evidence transcript under a generated evidence directory, for example:

```text
docs/generated/phase-58/subagent-evidence/
  claude-subagent.json
  codex-subagent.json
  negative-no-retrieval.json
```

The harness should:

- Run in an isolated temp repo.
- Use the built CLI where possible.
- Attempt `claude -p` and `codex exec`.
- Record command, exit code, stdout/stderr excerpt, and whether the subagent retrieved via CLI or MCP.
- Record an explicit environment blocker if either binary/auth path is unavailable.

## Validation Architecture

### Fast Feedback

```bash
npx vitest run src/cli/env-contract src/cli/init src/cli/doctor src/server/mcp src/cli/interface-contract
```

### Built CLI / Subprocess Feedback

```bash
npm run build
node dist/cli/index.js env-contract --for worker --json
node dist/cli/index.js env-contract --check
```

### Full Feedback

```bash
npm run typecheck
npm run lint
npx vitest run
npm run build
```

### Failure Scenario

Construct a temp repo with a valid generated contract, mutate `.githooks/commit-msg` or `docs/rules/testing.md`, then run:

```bash
node dist/cli/index.js env-contract --check
```

Expected result: non-zero exit and JSON/human output that names the stale source file.

## AI-SPEC Note

This phase involves AI assistant integration, but there is no `58-AI-SPEC.md` in the phase directory. Planning can continue because the AI behavior is retrieval and verification infrastructure, not a new model/eval product surface. Plans should still include concrete Claude/Codex evidence requirements.

## Open Risks

| Risk | Mitigation |
|------|------------|
| Phase 57 dependency is not completed in STATE.md | Add a Wave 0 preflight task that stops execution if Phase 57 remains incomplete. |
| Current untracked `src/cli/env-contract/validator-injected.ts` exists | Executor must read it first, migrate useful validation constants, and avoid blind overwrite. |
| MCP dynamic contract tools only return `cli_redirect` | Add native tool only after proving generated tool cannot satisfy runtime retrieval. |
| Claude/Codex binaries or auth are unavailable | Record blocker evidence, but do not silently count it as SDC-05 success. |
| Prompt-snippet injection design creeps back in | Plans must explicitly prohibit `.mycodemap/prompt-snippets/` generation. |

## RESEARCH COMPLETE
