<!-- generated-by: gsd-doc-writer -->

# API Reference

CodeMap exposes two runtime surfaces:

- a REST API mounted under `/api/v1`
- an experimental MCP server for stdio-based agent integrations

## Server Configuration

`CodeMapServer` defaults to:

- `host: 0.0.0.0`
- `port: 3000`

Optional server config includes:

- `cors.origin`
- `cors.credentials`
- `auth.type` with `none`, `bearer`, or `api-key`

## REST API

### Health

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/health` | Basic health check |

### Search

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/search/symbols` | Search symbols by query string |
| GET | `/api/v1/search/modules` | Search modules by query string |

Query parameters:

- `q` string, default empty
- `limit` number, default `50`

### Modules and Symbols

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/modules/:id` | Module detail |
| GET | `/api/v1/symbols/:id` | Symbol detail |
| GET | `/api/v1/symbols/:id/callers` | Incoming callers |
| GET | `/api/v1/symbols/:id/callees` | Outgoing callees |

### Analysis

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/analysis` | Run analysis for a project path |
| POST | `/api/v1/analysis/refresh` | Refresh an existing project |
| POST | `/api/v1/analysis/impact` | Analyze the impact of a module change |
| GET | `/api/v1/analysis/cycles` | Detect circular dependencies |
| GET | `/api/v1/analysis/validate` | Validate the current code graph |

### Graph and Export

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/stats` | Project statistics |
| GET | `/api/v1/graph` | Dependency graph data for visualization |
| GET | `/api/v1/export/:format` | Export graph data |

`export/:format` accepts `json`, `graphml`, and `dot`.

## Response Envelope

REST endpoints return an `ApiResponse<T>` envelope on success or failure. The envelope includes:

- `success`
- `data` for successful responses
- `error.code` and `error.message` for failures
- `meta.timestamp` and `meta.requestId`

For deprecated parser modes, the API returns the same actionable error shape used by the CLI, including `nextCommand` when available.

## MCP

The MCP server lives under `src/server/mcp/` and is started via the `mcp start` CLI path. It is intentionally experimental and uses the process' stdio transport rather than the REST API transport.

