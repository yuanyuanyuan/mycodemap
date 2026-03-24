# Codebase Architecture

**Analysis Date:** 2026-03-24

## Current Pattern

This repository is a **hybrid architecture in transition**. Two systems coexist:

1. **Legacy CodeMap pipeline** centered on `src/cli/index.ts`, `src/core/`, `src/parser/`, `src/generator/`, and `src/orchestrator/`.
2. **MVP3 layered architecture** centered on `src/interface/`, `src/infrastructure/`, `src/domain/`, `src/server/`, and `src/cli-new/`.

Treat the repository as transitional unless a phase explicitly removes one side.

## Primary Entry Points

- CLI entry: `src/cli/index.ts`
- Library entry: `src/index.ts`
- Transitional new CLI: `src/cli-new/index.ts`
- Server entry: `src/server/CodeMapServer.ts`
- Workflow orchestrator: `src/orchestrator/workflow/workflow-orchestrator.ts`

## Main Execution Flows

### Legacy analysis flow

`src/cli/index.ts`
→ `src/cli/commands/*.ts`
→ `src/core/`, `src/parser/`, `src/generator/`
→ `.mycodemap/` outputs or human CLI output

### Orchestrated analysis flow

`src/cli/commands/analyze.ts`
→ `src/orchestrator/intent-router.ts`
→ `src/orchestrator/tool-orchestrator.ts`
→ adapters such as `src/orchestrator/adapters/codemap-adapter.ts`
→ `src/orchestrator/result-fusion.ts`

### MVP3 layered flow

`src/cli/commands/server.ts`
→ `src/server/CodeMapServer.ts`
→ `src/server/handlers/*`
→ `src/domain/services/CodeGraphBuilder.ts`
→ `src/infrastructure/storage/*` and `src/infrastructure/parser/*`
→ interfaces from `src/interface/types/*`

## Architectural Boundaries

**Legacy boundary:**
- `src/cli/commands/*` still call concrete implementations directly.
- Several commands remain coupled to `.mycodemap` JSON output and local files.

**Layered boundary:**
- `src/interface/` holds contracts.
- `src/infrastructure/` holds adapters and concrete technical implementations.
- `src/domain/` holds entities and graph-building behavior.
- `src/server/` exposes HTTP transport over the layered core.

## State and Persistence

- Workflow state persists under `.mycodemap/workflow` through `src/orchestrator/workflow/workflow-persistence.ts`.
- Code graph persistence defaults to filesystem JSON via `src/infrastructure/storage/adapters/FileSystemStorage.ts`.
- Some storage/server paths still write to `.codemap/storage`, so output-path drift is real.

## High-Impact Files

- `src/cli/index.ts` - public command registry; changing it has wide blast radius.
- `src/cli/commands/analyze.ts` - output contract and intent surface.
- `src/orchestrator/workflow/workflow-orchestrator.ts` - workflow phase engine and tool integration.
- `src/server/routes/api.ts` - HTTP surface contract.
- `src/infrastructure/storage/StorageFactory.ts` - backend selection and optional adapters.

## Design Guidance

- Put **legacy command behavior changes** in `src/cli/commands/` first, then wire them in `src/cli/index.ts`.
- Put **new cross-layer abstractions** under `src/interface/`, `src/domain/`, and `src/infrastructure/` instead of expanding `src/core/`.
- Treat `src/cli-new/` as experimental/transitional until it becomes the sole CLI.
- Update both code and documentation whenever a public command or output contract changes.

## Architecture Risks

- The repo exposes both CLI-first and server-first surfaces at once.
- `ARCHITECTURE.md` at repo root still presents Server Layer as HTTP API, while the product direction document argues that server CLI may not belong in the core product.
- Legacy and MVP3 modules overlap in responsibility, especially around parsing, storage, and query/export flows.

---
*Architecture analysis: 2026-03-24*
