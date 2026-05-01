---
phase: 41-interface-contract-schema
plan: 01
status: completed
completed_at: 2026-04-30
---

# Phase 41 Summary: Interface Contract Schema

## Objective

Define the CLI surface as a formal machine-readable contract schema — covering command names, arguments, flags, output shapes, error codes, and examples — and expose runtime metadata via `codemap --schema`.

## Plan vs. Implementation Alignment

| Plan Item | Status | Notes |
|-----------|--------|-------|
| Schema types and meta-schema | Completed | Zod-based contract types with full type safety |
| 3 core command families (analyze, query, deps) | Completed | All 3 defined with flags, output shapes, and examples |
| `--schema` CLI flag | Completed | `node dist/cli/index.js --schema` outputs valid JSON |
| Commander config validation | Completed | `validateContract()` verifies schema against meta-schema |
| Progressive migration pattern | Established | Pattern ready for remaining 12+ commands |

## New Files (7)

| File | Purpose | Lines |
|------|---------|-------|
| `src/cli/interface-contract/types.ts` | Contract types: CommandContract, FlagDefinition, OutputShape, ErrorCode | 89 |
| `src/cli/interface-contract/schema.ts` | Meta-schema (interfaceContractSchema) and validation | 47 |
| `src/cli/interface-contract/commands/analyze.ts` | analyze command contract (find/read/link/show subcommands) | 62 |
| `src/cli/interface-contract/commands/query.ts` | query command contract (symbol/module/contract search) | 55 |
| `src/cli/interface-contract/commands/deps.ts` | deps command contract (module dependency analysis) | 48 |
| `src/cli/interface-contract/commands/index.ts` | Command registry and exports | 15 |
| `src/cli/interface-contract/index.ts` | Public API: getFullContract(), validateContract() | 38 |

## Modified Files (1)

| File | Change |
|------|--------|
| `src/cli/index.ts` | Added `--schema` flag; imports and calls `getFullContract()` + `validateContract()` |

## Key Design Decisions

- **Zod for runtime validation:** Contract schema validates against itself using zod, giving both compile-time and runtime type safety
- **Progressive migration:** Only 3 core commands in schema initially; pattern established for adding remaining commands without breaking changes
- **Output shapes as JSON Schema:** `OutputShape` uses JSON Schema-compatible structure, enabling direct consumption by MCP and other agents
- **Error code enums:** Structured error codes with descriptions and HTTP-style status mapping
- **Flag types:** Full support for boolean, string, number, array flags with defaults and optionality

## Test Results

- **Unit tests:** 16/16 pass in `src/cli/interface-contract/__tests__/interface-contract.test.ts`
- **Type check:** `npx tsc --noEmit` passes
- **Build:** `npm run build` succeeds
- **Runtime:** `node dist/cli/index.js --schema` outputs valid JSON with 3 commands

## Verification

See `41-VERIFICATION.md` for full verification report.

## Gaps / Deferred

| Item | Target | Reason |
|------|--------|--------|
| Remaining 12+ commands in contract | Phase 42, 49 | Progressive migration; adapter layer handles all commands regardless |
| Shell completion generation | Future | `--help-json` provides machine-readable data; shell scripts can consume it |
| Global flags (--wasm-fallback, --apply-suggestion, --native) | Phase 49 | Added later as they cross-cut all commands |

## Architecture

```
src/cli/interface-contract/
  types.ts           ── Core contract types (Zod schemas)
  schema.ts          ── Meta-schema and validation
  index.ts           ── Public API: getFullContract(), validateContract()
  commands/
    index.ts         ── Registry of all command contracts
    analyze.ts       ── Analyze command family contract
    query.ts         ── Query command family contract
    deps.ts          ── Deps command family contract
```

## Commits

- `[FEATURE] contract-schema: define types, meta-schema, and 3 core command families`
- `[FEATURE] contract-schema: add --schema CLI flag and runtime contract exposure`
- `[FEATURE] contract-schema: add validation tests and commander config verification`
