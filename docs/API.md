<!-- generated-by: gsd-doc-writer -->

# API Reference

CodeMap provides two API surfaces: a **REST API** (Hono-based HTTP server) and an **MCP (Model Context Protocol) server** for AI tool integrations. The REST API is an internal architecture layer, not a public CLI command. The MCP server exposes the same code graph data through the Model Context Protocol for AI assistants.

## Authentication

The REST API supports optional authentication configured via `ServerConfig.auth`:

| Type | Description |
|---|---|
| `none` | No authentication (default). All endpoints are accessible without credentials. |
| `bearer` | JWT Bearer token. Include the `Authorization: Bearer <token>` header. |
| `api-key` | API key. Include the `X-API-Key: <key>` header. <!-- VERIFY: api-key header name --> |

When `auth` is not configured in `ServerConfig`, all endpoints are accessible without credentials. Authentication is not enforced by default -- it must be explicitly configured at server creation time.

The MCP server uses stdio transport and inherits the security context of the spawning process. No separate authentication is required.

## REST API Endpoints

All REST endpoints are mounted under the `/api/v1` prefix. The server is built on Hono and runs on the host and port specified in `ServerConfig` (default: `0.0.0.0:3000`).

### Health & Status

| Method | Path | Description | Auth Required |
|---|---|---|---|
| GET | `/api/v1/health` | Health check. Returns `ok` status. | No |

### Search

| Method | Path | Description | Auth Required |
|---|---|---|---|
| GET | `/api/v1/search/symbols` | Search symbols by name. | No |
| GET | `/api/v1/search/modules` | Search modules by path. | No |

**Query parameters (search/symbols):**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `q` | `string` | `""` | Search query string. Matched against symbol names. |
| `limit` | `number` | `50` | Maximum number of results to return. |

**Query parameters (search/modules):**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `q` | `string` | `""` | Search query string. Matched against module paths. |
| `limit` | `number` | `50` | Maximum number of results to return. |

### Modules

| Method | Path | Description | Auth Required |
|---|---|---|---|
| GET | `/api/v1/modules/:id` | Get module detail by ID. | No |

### Symbols

| Method | Path | Description | Auth Required |
|---|---|---|---|
| GET | `/api/v1/symbols/:id` | Get symbol detail by ID. | No |
| GET | `/api/v1/symbols/:id/callers` | Get all callers of a symbol. | No |
| GET | `/api/v1/symbols/:id/callees` | Get all callees of a symbol. | No |

### Analysis

| Method | Path | Description | Auth Required |
|---|---|---|---|
| POST | `/api/v1/analysis` | Execute code analysis on a project. | No |
| POST | `/api/v1/analysis/refresh` | Refresh (re-analyze) a project. | No |
| POST | `/api/v1/analysis/impact` | Run impact analysis for a module. | No |
| GET | `/api/v1/analysis/cycles` | Detect circular dependencies. | No |
| GET | `/api/v1/analysis/validate` | Validate code graph consistency. | No |

### Stats & Graph

| Method | Path | Description | Auth Required |
|---|---|---|---|
| GET | `/api/v1/stats` | Get project statistics. | No |
| GET | `/api/v1/graph` | Get dependency graph data for visualization. | No |

**Query parameters (graph):**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | `number` | `1` | Page number for paginated results. |
| `limit` | `number` | `100` | Number of nodes per page. |

### Export

| Method | Path | Description | Auth Required |
|---|---|---|---|
| GET | `/api/v1/export/:format` | Export code graph in a specified format. | No |

The `:format` parameter accepts: `json`, `graphml`, or `dot`. Returns a file download with the appropriate `Content-Type` and `Content-Disposition` headers.

## Request and Response Formats

### Standard Response Envelope

All REST API responses follow the `ApiResponse<T>` envelope:

```json
{
  "success": true,
  "data": { },
  "meta": {
    "timestamp": "2026-05-06T12:00:00.000Z",
    "requestId": "req_1746532800000_a1b2c3d"
  }
}
```

On error:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  },
  "meta": {
    "timestamp": "2026-05-06T12:00:00.000Z",
    "requestId": "req_1746532800000_a1b2c3d"
  }
}
```

### POST /api/v1/analysis -- Request Body

```json
{
  "projectPath": "/path/to/project",
  "options": {
    "mode": "tree-sitter"
  }
}
```

The `mode` field only accepts `"tree-sitter"`. Deprecated values (`"fast"`, `"smart"`, `"hybrid"`) return HTTP 400 with `DEPRECATED_PARSER_MODE`. Omitting `options` or `options.mode` uses the default tree-sitter mode.

### POST /api/v1/analysis -- Success Response

```json
{
  "success": true,
  "data": {
    "projectId": "abc123",
    "modulesAnalyzed": 42,
    "symbolsFound": 350,
    "dependenciesFound": 120,
    "duration": 2300,
    "mode": "tree-sitter"
  },
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

### POST /api/v1/analysis/impact -- Request Body

```json
{
  "moduleId": "mod_src_core_analyzer",
  "depth": 3
}
```

### POST /api/v1/analysis/impact -- Success Response

```json
{
  "success": true,
  "data": {
    "rootModule": "mod_src_core_analyzer",
    "affectedModules": [
      { "id": "mod_src_cli_commands_generate", "path": "src/cli/commands/generate.ts", "depth": 1 },
      { "id": "mod_src_server_handlers_AnalysisHandler", "path": "src/server/handlers/AnalysisHandler.ts", "depth": 2 }
    ],
    "totalAffected": 2,
    "maxDepth": 2
  },
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

### GET /api/v1/search/symbols -- Success Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "sym_001",
        "name": "analyze",
        "kind": "function",
        "visibility": "export",
        "location": { "file": "src/core/analyzer.ts", "line": 15, "column": 0 },
        "module": { "id": "mod_src_core_analyzer", "path": "src/core/analyzer.ts" }
      }
    ],
    "total": 1
  },
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

### GET /api/v1/stats -- Success Response

```json
{
  "success": true,
  "data": {
    "totalModules": 45,
    "totalSymbols": 380,
    "totalDependencies": 150,
    "totalLines": 12000,
    "averageComplexity": 3.2,
    "languageDistribution": { "typescript": 40, "python": 3, "go": 2 }
  },
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

### GET /api/v1/graph -- Success Response

```json
{
  "success": true,
  "data": {
    "nodes": [
      { "id": "mod_001", "label": "analyzer.ts", "type": "module", "category": "source" }
    ],
    "edges": [
      { "from": "mod_001", "to": "mod_002", "type": "import" }
    ]
  },
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

### GET /api/v1/analysis/validate -- Success Response

```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": [],
    "warnings": ["Module src/util/helper.ts is isolated (no dependencies)"]
  },
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

### GET /api/v1/analysis/cycles -- Success Response

```json
{
  "success": true,
  "data": {
    "cycles": [
      { "modules": ["mod_a", "mod_b", "mod_c"], "length": 3 }
    ],
    "totalCycles": 1
  },
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

## Error Codes

The API returns structured error codes in the `error.code` field. Below are all error codes organized by the HTTP status code at which they appear.

### 400 Bad Request

| Code | Description |
|---|---|
| `DEPRECATED_PARSER_MODE` | A deprecated parser mode (`fast`, `smart`, or `hybrid`) was specified. The response includes a `nextCommand: "mycodemap doctor"` field with remediation guidance. |
| `INVALID_FORMAT` | An unsupported export format was requested. Supported formats: `json`, `graphml`, `dot`. |

### 404 Not Found

| Code | Description |
|---|---|
| `NOT_FOUND` | The requested resource (module, symbol, or route) does not exist. |

### 500 Internal Server Error

| Code | Description |
|---|---|
| `INTERNAL_ERROR` | An unexpected server error occurred. |
| `SEARCH_ERROR` | An error occurred during search operations. |
| `QUERY_ERROR` | An error occurred during read-only query operations. |
| `ANALYSIS_ERROR` | A generic analysis error that does not match a more specific code. |
| `VALIDATION_ERROR` | An error occurred during graph validation. |
| `EXPORT_ERROR` | An error occurred during data export. |
| `REFRESH_ERROR` | A generic refresh error that does not match a more specific code. |

### 501 Not Implemented

| Code | Description |
|---|---|
| `ANALYSIS_NOT_SUPPORTED` | The `analyze` operation is not yet supported as a public server capability. |
| `INCREMENTAL_UPDATE_NOT_SUPPORTED` | The incremental update operation is not yet supported as a public server capability. |
| `REFRESH_NOT_SUPPORTED` | The `refresh` operation is not yet supported as a public server capability. |

Note: `POST /api/v1/analysis` with a deprecated parser mode returns 400 (checked first) before the 501 `ANALYSIS_NOT_SUPPORTED` response. With a valid or no mode, it returns 501 because the analysis write path is not yet exposed as a public server capability.

## Rate Limits

No rate limiting is configured on the REST API or MCP server. If the server is deployed behind a reverse proxy or API gateway, rate limiting should be configured at that layer.

## MCP Tools

The MCP server (`src/server/mcp/`) exposes code graph data through the Model Context Protocol using stdio transport. It is started programmatically via `startCodeMapMcpServer()`.

### Native MCP Tools

These three tools are implemented natively with direct storage access:

| Tool Name | Description |
|---|---|
| `codemap_query` | Query a symbol definition plus its callers and callees. |
| `codemap_impact` | Query symbol-level caller impact (transitive callers up to a depth). |
| `codemap_env_contract` | Query the Project Environment Contract for subagent rule retrieval. |

### codemap_query

Resolves a symbol name and returns the symbol definition along with its callers and callees.

**Input schema:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `symbol` | `string` | Yes | Exact symbol name to resolve. |
| `filePath` | `string` | No | Optional file path to disambiguate same-name symbols. |

**Output (McpQueryResult):**

```json
{
  "status": "ok",
  "confidence": "high",
  "graph_status": "complete",
  "generated_at": "2026-05-06T12:00:00.000Z",
  "failed_file_count": 0,
  "parse_failure_files": [],
  "symbol": {
    "id": "sym_001",
    "module_id": "mod_001",
    "name": "analyze",
    "kind": "function",
    "visibility": "export",
    "file_path": "src/core/analyzer.ts",
    "line": 15,
    "column": 0,
    "signature": "(projectPath: string) => Promise<CodeMap>"
  },
  "callers": [],
  "callees": []
}
```

Possible `status` values: `ok`, `not_found`, `ambiguous`, `unavailable`.
Possible `confidence` values: `high`, `ambiguous`, `unavailable`.

### codemap_impact

Resolves a symbol and traces its transitive caller impact.

**Input schema:**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `symbol` | `string` | Yes | -- | Exact symbol name to resolve. |
| `filePath` | `string` | No | -- | Optional file path to disambiguate same-name symbols. |
| `depth` | `number` | No | `3` | Caller traversal depth (1-20). |
| `limit` | `number` | No | `20` | Maximum affected symbols to return (1-200). |

**Output (McpImpactResult):**

```json
{
  "status": "ok",
  "confidence": "high",
  "graph_status": "complete",
  "generated_at": "2026-05-06T12:00:00.000Z",
  "failed_file_count": 0,
  "parse_failure_files": [],
  "root_symbol": { "id": "sym_001", "name": "analyze", "..." : "..." },
  "affected_symbols": [
    {
      "symbol": { "id": "sym_002", "name": "generateAction", "..." : "..." },
      "depth": 1,
      "path": ["sym_001", "sym_002"]
    }
  ],
  "depth": 3,
  "limit": 20,
  "truncated": false
}
```

Depth and limit are clamped: depth is bounded to 1-5 (max), limit to 1-50 (max). These internal maximums are stricter than the input schema range to keep response sizes manageable.

### codemap_env_contract

Queries the Project Environment Contract for subagent rule retrieval. Returns filtered contract items by agent type and category.

**Input schema:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `agentType` | `string` | No | Agent type to filter contract items. One of: `explore`, `plan`, `edit`, `worker`, `review`, `verify`, `default`. |
| `category` | `string` | No | Contract category filter. One of: `execution`, `commit`, `retrieval`, `validation`, `style`. |
| `check` | `boolean` | No | Run contract freshness and critical coverage check instead of returning items. |

**Output (default mode):**

```json
{
  "schemaVersion": "1.0",
  "generatedAt": "2026-05-06T12:00:00.000Z",
  "agentType": "default",
  "items": [],
  "conflicts": [],
  "sourceSnapshots": {}
}
```

**Output (check mode):**

```json
{
  "schemaVersion": "1.0",
  "generatedAt": "2026-05-06T12:00:00.000Z",
  "status": "ok",
  "checks": []
}
```

### Contract-Generated MCP Tools

In addition to the three native tools, the MCP server dynamically registers tools from the Interface Contract Schema. Each CLI command defined in the contract is exposed as an MCP tool with the naming pattern `codemap_<command_name>` (hyphens replaced with underscores).

For example, if the Interface Contract defines a command `env-contract`, it becomes the MCP tool `codemap_env_contract`. Aliases also get their own tool entries.

These contract-generated tools currently return a `cli_redirect` structured content that provides the equivalent CLI command line for the user to run, rather than executing the command directly:

```json
{
  "status": "cli_redirect",
  "command": "generate",
  "args": { "output": ".mycodemap" },
  "cliCommand": "codemap generate --output .mycodemap",
  "description": "Generate code map for the project",
  "examples": ["codemap generate", "codemap generate --output ./docs"],
  "errorCodes": ["DEPRECATED_PARSER_MODE", "RUN_COMMAND_FAILED"]
}
```

The full Interface Contract Schema is available via the `--schema` CLI flag:

```bash
mycodemap --schema
```

Tool name conflicts between native tools and contract-generated tools are resolved by appending `_contract` to the contract tool name. If that alternative is also taken, the tool is skipped with a warning.

## Cross-References

- **ARCHITECTURE.md** -- Server layer design, handler responsibilities, and data flow details.
- **docs/CONFIGURATION.md** -- MCP setup, storage configuration, and runtime environment variables.
