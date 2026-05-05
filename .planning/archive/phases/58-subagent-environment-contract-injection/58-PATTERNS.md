# Phase 58 Pattern Map: Subagent Environment Contract Retrieval

**Mapped:** 2026-05-02
**Scope:** env-contract discovery, CLI command, interface contract, MCP retrieval, init assistant assets, doctor diagnostics, verification harness

## Pattern Summary

Phase 58 should reuse existing CodeMap CLI infrastructure instead of creating a parallel subsystem:

- Init-generated files should remain `InitAsset` families with `installed`, `already-synced`, `conflict`, and `skipped` states.
- Public CLI commands need both commander registration and interface-contract registration.
- MCP dynamic registration comes from the interface contract, but native MCP tools are acceptable when runtime behavior must return actual structured content.
- Doctor checks should be small functions returning `DiagnosticResult[]`; the orchestrator owns aggregate exit codes.
- Tests should use Vitest with temp directories and subprocesses when validating CLI behavior.

## File Pattern Map

| Planned file | Role | Closest analog | Pattern to copy |
|--------------|------|----------------|-----------------|
| `src/cli/env-contract/types.ts` | Shared schema/types for contract items, conflicts, source snapshots | `src/cli/interface-contract/types.ts` | Small exported TypeScript interfaces, no runtime side effects, explicit union types. |
| `src/cli/env-contract/discovery.ts` | Reads repository facts and builds contract | `src/cli/init/manifest-extractors.ts` | `existsSync` + `readFileSync`, skip missing optional files, typed item collection. |
| `src/cli/env-contract/validation.ts` | Schema/semantic validation for contract items | Existing untracked `src/cli/env-contract/validator-injected.ts`, `src/cli/interface-contract/schema.ts` | Preserve category/severity whitelist; use zod only where runtime schema validation is needed. |
| `src/cli/env-contract/filters.ts` | Agent-type/category filtering | `src/cli/init/assistant-plan.ts` asset runtime filtering | Deterministic map and no filesystem I/O. |
| `src/cli/env-contract/storage.ts` | Load/write `.mycodemap/env-contract.json` and status snapshot | `src/cli/init/env-contract-plan.ts`, `src/cli/init/rules.ts` | Tool-owned file writes under `.mycodemap/`, conflict-safe behavior. |
| `src/cli/env-contract/check.ts` | Drift/conflict/missing-critical status | `src/cli/doctor/check-agent.ts` | Return structured result arrays; leave formatting to command/doctor layer. |
| `src/cli/commands/env-contract.ts` | Commander command implementation | `src/cli/commands/doctor.ts`, `src/cli/commands/preview.ts` | Resolve output mode, print JSON/human, set `process.exitCode` without direct `process.exit()`. |
| `src/cli/interface-contract/commands/env-contract.ts` | Command contract for schema/MCP discovery | `src/cli/interface-contract/commands/preview.ts` | Describe flags, output shape, error codes, and examples. |
| `src/cli/interface-contract/commands/index.ts` | Register env-contract contract | Current `commandContracts` registry | Import and append contract; export it. |
| `src/cli/index.ts` | Register public CLI command | Existing `doctorCommand` / `previewCommand` registration | `program.addCommand(envContractCommand)`. |
| `src/server/mcp/server.ts` | Register native `codemap_env_contract` if contract redirect is insufficient | Native `codemap_query` / `codemap_impact` tools | Reserve native name before contract tools; handler returns `structuredContent`. |
| `src/server/mcp/schema-adapter.ts` | Normalize generated tool names | `convertContractToMcpTools()` | Centralize normalization so hyphenated CLI command names become underscore MCP names. |
| `src/cli/doctor/check-env-contract.ts` | Env-contract diagnostics | `src/cli/doctor/check-agent.ts` | Return `DiagnosticResult[]` with `category: 'agent'`. |
| `src/cli/doctor/orchestrator.ts` | Add checker to aggregate | Current Promise.all checker pattern | Add one Promise branch, flatten results, keep exit-code logic unchanged. |
| `src/cli/init/env-contract-plan.ts` | Upgrade seed writer to full contract | Existing same file | Preserve InitAsset states and migrate `env-contract.seed.v1`. |
| `src/cli/init/assistant-plan.ts` | Update generated assistant examples | Existing `generateClaudeHookExample` / `generateCodexAgentExample` | Keep generated files inactive by default; replace `cat` with retrieval CLI/MCP guidance. |
| `scripts/verify-subagent-env-contract.mjs` | Real Claude/Codex evidence harness | Existing `scripts/pre-release-check.js`, test subprocess patterns | Node script with explicit command transcript JSON; no hidden mutation outside temp dirs. |
| `docs/AI_ASSISTANT_SETUP.md` | User-facing assistant setup docs | Phase 56 doc sync pattern | Update only relevant setup sections; mention retrieval guidance, not injection snippets. |
| `docs/SETUP_GUIDE.md` | Setup flow docs | Phase 56 doc sync pattern | Document `init -> env-contract -> doctor` checks. |
| `README.md` | Quick-start surface | Phase 56 doc sync pattern | Keep concise; link deeper docs. |

## Concrete Patterns

### Public CLI Command

Use the command module style from `src/cli/commands/doctor.ts`:

```typescript
export const envContractCommand = new Command('env-contract')
  .description('Query the Project Environment Contract')
  .option('-j, --json', 'Output as JSON')
  .option('--human', 'Force human-readable output')
  .option('--for <agentType>', 'Filter contract items for an agent type')
  .option('--category <category>', 'Filter by contract category')
  .option('--check', 'Check contract freshness and critical coverage')
  .option('--update', 'Regenerate .mycodemap/env-contract.json')
  .option('--as-hook-config', 'Print Claude Code SubagentStart hook example')
  .option('--as-codex-agent', 'Print Codex agent developer_instructions example')
  .action(envContractAction);
```

### Init Asset State

Keep Phase 55's state model:

- Missing + apply mode -> `installed` with write action.
- Missing + preview mode -> `skipped`.
- Same content -> `already-synced`.
- Different content -> `conflict`, unless the existing file is a recognized seed that can be migrated safely.

### Doctor Checker

Use the existing `DiagnosticResult` shape:

```typescript
{
  category: 'agent',
  severity: 'warn',
  id: 'env-contract-conflict',
  message: 'Project Environment Contract has 1 conflict',
  remediation: 'Review .mycodemap/env-contract.json and source files named in the conflict.',
}
```

Critical missing facts and stale source snapshots should be `error`; conflicts should be `warn` unless they remove a critical item.

### MCP Tool Naming

Current adapter builds `codemap_${contract.name}`. For `env-contract`, the stable tool name must be `codemap_env_contract`. The executor should either:

1. Normalize generated names in `schema-adapter.ts`, or
2. Register native `codemap_env_contract` and let the contract tool be renamed by the existing reserved-name logic.

The plan should test the actual `listTools()` result, not assume either path.

## Test Analog Map

| Test need | Existing analog |
|-----------|-----------------|
| Temp-dir init assets | `src/cli/init/__tests__/env-contract-plan.test.ts` |
| Command output mode | `src/cli/commands/__tests__/init-command.test.ts` |
| Interface contract registration | `src/server/mcp/__tests__/dynamic-server.test.ts` |
| MCP client call | `src/server/mcp/__tests__/dynamic-server.test.ts` |
| Subprocess built CLI | Phase 57/VER-03 requirement; use Node `spawnSync`/`execFileSync` against `dist/cli/index.js`. |

## PATTERN MAPPING COMPLETE
