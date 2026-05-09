<!-- generated-by: gsd-doc-writer -->

# Architecture

## Overview

CodeMap is organized as a layered TypeScript application with a single CLI entry point, an HTTP server, a parser/analyzer pipeline, and shared domain/infrastructure abstractions. The live source of truth is in `src/`; generated documentation should follow the behavior defined there, not old command names or legacy paths.

## Runtime Surfaces

| Surface | Entry | Purpose |
|---|---|---|
| CLI | `src/cli/index.ts` | Primary user and agent interface |
| HTTP API | `src/server/index.ts` + `src/server/routes/api.ts` | Query and analysis endpoints under `/api/v1` |
| MCP server | `src/server/mcp/server.ts` | Experimental stdio MCP transport |
| Analyzer | `src/core/analyzer.ts` | Filesystem discovery and code graph generation |
| Parser | `src/parser/index.ts` | Tree-sitter based parsing with deprecated mode rejection |

Phase 61 adds a shared direct-execution seam at `src/execution/contract-tools/` for the `query` / `deps` / `analyze` family. Both CLI wrappers and MCP handlers call this transport-free layer so result envelopes, diagnostics, and runtime bootstrap come from one execution truth instead of diverging wrapper logic.

## Layering

The repository follows a top-down dependency direction:

`CLI -> Server -> Domain -> Infrastructure -> Interface`

- `src/cli/` contains command entry points, config loading, docs validation hooks, and output formatting.
- `src/server/` contains the HTTP API, handlers, and MCP integration.
- `src/execution/` contains shared transport-free execution seams used by multiple surfaces when command logic should not live in a wrapper.
- `src/domain/` contains core entities and graph-building logic.
- `src/infrastructure/` contains storage and parser implementations.
- `src/interface/` contains shared types and config contracts.

Cross-layer imports should stay downward. Domain code should not depend on CLI or server code.

`Server Layer` 是内部架构层，不等于公共 `mycodemap server` 命令。

## Analysis Pipeline

1. `mycodemap generate` enters through `src/cli/commands/generate.ts`.
2. `src/core/file-discovery.ts` discovers source files using project-root aware globbing.
3. `src/parser/index.ts` resolves the active parser. The supported mode is `tree-sitter`; `fast`, `smart`, and `hybrid` are deprecated and rejected.
4. `src/infrastructure/parser/registry/ParserRegistry.ts` dispatches to language-specific parsers for TypeScript, Go, and Python.
5. `src/parser/enhancers/TypeScriptTypeEnhancer.ts` enriches TypeScript results after parsing.
6. `src/core/global-index.ts` and related graph builders resolve symbol, dependency, and call relationships.
7. `src/generator/index.ts` writes graph artifacts such as `codemap.json`, `AI_MAP.md`, and context documents.

## Storage

The storage layer is intentionally narrow:

- `sqlite` is the default persistent backend.
- `memory` is available for tests and ephemeral runs.
- `auto` is a SQLite-family alias.
- `filesystem`, `kuzudb`, and `neo4j` are rejected.

The active storage implementations live in `src/infrastructure/storage/adapters/`, with loader logic in `sqlite-loader.ts`.

## Server

`CodeMapServer` mounts the API at `/api/v1` and uses Hono middleware for logging, pretty JSON, and optional CORS. The server config default is `host: 0.0.0.0` and `port: 3000`.

The REST API currently exposes:

- health and graph discovery endpoints
- symbol and module search/detail endpoints
- dependency graph and cycle analysis endpoints
- analysis, refresh, validate, and export endpoints

`ServerConfig.auth` supports `none`, `bearer`, and `api-key`. The MCP server is separate and uses stdio transport.

For the Phase 61 family (`codemap_query`, `codemap_deps`, `codemap_analyze`), MCP no longer returns `cli_redirect` success stubs. Those tools execute the shared contract-tool layer directly and return one structured envelope with `status`, `result`, `error`, and `diagnostics`.

Phase 62 adds one native routing tool on top of that execution surface: `codemap_context`. It lives in `src/server/mcp/context-tool.ts`, supports `review` / `debug` / `default`, and exposes `detailLevel=minimal|standard` plus a strict `allowedTools` filter. The filter is fail-closed: if it would hide a tool the route itself needs to recommend, MCP returns a structured `FILTER_CONFLICT` error instead of silently emitting inconsistent guidance.

Phase 65 moves `impact` onto one shared graph-native traversal truth. `src/infrastructure/storage/graph-helpers.ts` now owns entrypoint resolution plus layered downstream reachability (`summary + direct[] + transitiveLayers[]`), while the CLI `impact` command and MCP `codemap_impact` tool stay as thin adapters over the same persisted graph result. Missing entrypoints, missing graph truth, partial graph warnings, and traversal truncation are surfaced explicitly instead of being flattened into empty success payloads.

Phase 66 adds graph-native community detection on the same persisted truth. `src/infrastructure/storage/community-helpers.ts` folds mixed module/symbol dependencies into a weighted module-level projection, runs a Louvain baseline, and emits interpretable `summary + communities[]` results with explicit low-signal warnings. The first public surface is MCP-only via `codemap_communities`; `src/server/mcp/service.ts` remains a thin snake_case adapter and does not reimplement partition logic.

## CLI Contract

The top-level CLI registers these primary commands in `src/cli/index.ts`:

- `init`
- `generate`
- `query`
- `deps`
- `cycles`
- `complexity`
- `impact`
- `analyze`
- `benchmark`
- `export`
- `ship`
- `ci`
- `check`
- `workflow`
- `history`
- `preview`
- `env-contract`
- `mcp`
- `doctor`
- `readiness-gate`

`mycodemap` is the canonical program name; `codemap` remains an alias for compatibility.

## Output Locations

- Workspace output defaults to `.mycodemap/`
- Canonical config lives at `.mycodemap/config.json`
- The persisted code graph is `codemap.json`
- Legacy `.codemap/` and root config filenames are still readable for migration compatibility

## Directory Map

| Directory | Responsibility |
|---|---|
| `src/cli/` | Command registration, output formatting, config loading, docs validation |
| `src/core/` | Discovery, analysis orchestration, and indexing |
| `src/domain/` | Entities, repositories, and graph builder services |
| `src/infrastructure/` | Parsers, storage adapters, and concrete implementations |
| `src/parser/` | Parser façade and TypeScript enhancement |
| `src/server/` | HTTP API and MCP server |
| `src/execution/` | Shared command execution seams reused by CLI and MCP |
| `src/generator/` | Artifact generation |
| `src/interface/` | Shared types and config contracts |
