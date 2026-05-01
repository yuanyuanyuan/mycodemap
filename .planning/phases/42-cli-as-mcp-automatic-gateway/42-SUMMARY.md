---
phase: 42-cli-as-mcp-automatic-gateway
plan: 01
status: completed
completed_at: 2026-04-30
---

# Phase 42 Summary: CLI-as-MCP Automatic Gateway

## Objective

Auto-expose every schema-defined CLI command as an MCP tool with zero handwritten maintenance. Replace hardcoded `server.ts` tool registration with dynamic schema-driven registration.

## Plan vs. Implementation Alignment

| Plan Item | Status | Notes |
|-----------|--------|-------|
| Schema-to-MCP adapter | Completed | `schema-adapter.ts` with full flag-to-zod and output-shape-to-JSON-Schema conversion |
| Dynamic tool registration | Completed | `registerContractTools()` iterates contract and registers each command |
| Flag-to-zod mapping | Completed | All types (string, boolean, number, array) with defaults and optionality |
| Output shape JSON Schema conversion | Completed | Recursive conversion with graceful degradation for deep nesting (>10) |
| Graceful degradation | Completed | Unknown types fall back to `z.string()`; malformed shapes catch safely |

## New Files (1)

| File | Purpose | Lines |
|------|---------|-------|
| `src/server/mcp/schema-adapter.ts` | Core adapter: flag→zod, output→JSON Schema, contract→MCP tools | 187 |

## Modified Files (2)

| File | Change |
|------|--------|
| `src/server/mcp/server.ts` | Renamed `registerTools` → `registerNativeTools`; added `registerContractTools()`; native tools reserved to prevent conflicts |
| `src/server/mcp/__tests__/CodeMapMcpServer.test.ts` | Updated expected tool list to include contract tools alongside native tools |

## Key Design Decisions

- **Native tools preserved:** Existing `codemap_query` and `codemap_impact` remain as native implementations; contract tools use `cli_redirect` pattern
- **Name reservation:** Native tool names are reserved to prevent contract from overwriting them
- **cli_redirect response:** Contract tools return structured response with equivalent CLI command line, enabling agents to execute via shell
- **Graceful degradation:** Deep nesting (>10 levels) falls back to permissive schemas; unknown flag types fall back to `z.string()`
- **Alias support:** Contract commands with aliases generate multiple MCP tool definitions

## Test Results

- **MCP adapter tests:** 25/25 pass in `schema-adapter.test.ts`
- **MCP server tests:** 5/5 pass in `CodeMapMcpServer.test.ts` (updated for dynamic tools)
- **Dynamic server tests:** 6/6 pass in `dynamic-server.test.ts`
- **Full suite:** 995 tests passed, 1 pre-existing failure unrelated to changes
- **Type check:** `npm run build` passes cleanly

## Verification

See `42-VERIFICATION.md` for full verification report including detailed test coverage.

## Gaps / Deferred

| Item | Target | Reason |
|------|--------|--------|
| Full programmatic execution (bypassing CLI) | Future | Requires service-layer implementations per command family |
| Contract coverage beyond 3 commands | Phase 49 | Adapter is fully dynamic; will auto-register as contract expands |
| outputSchema describes cli_redirect not outputShape | Warning | MCP `outputSchema` uses cli_redirect shape for consistency; contract `outputShape` is separate concern |

## Architecture

```
src/server/mcp/
  schema-adapter.ts    ── Flag→Zod, Output→JSON Schema, Contract→MCP Tool[]
  server.ts            ── registerNativeTools() + registerContractTools()
```

## Commits

- `[FEATURE] mcp-gateway: add schema-adapter with flag-to-zod and output-shape conversion`
- `[FEATURE] mcp-gateway: integrate dynamic contract tool registration into MCP server`
- `[FEATURE] mcp-gateway: add comprehensive test suite for schema adapter and dynamic registration`
