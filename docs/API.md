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

## Authentication

The server configuration accepts an optional `auth` field, but authentication is **not enforced by middleware** in the current implementation. All endpoints are publicly accessible when the server is started with default settings.

When `auth.type` is set to `bearer` or `api-key`, consumers should include the credential in the `Authorization` header. <!-- VERIFY: actual header format and secret rotation are not implemented in route middleware -->

## Endpoints Overview

All endpoints are mounted under `/api/v1`.

| Method | Path | Description | Auth Required |
|---|---|---|---|
| GET | `/health` | Basic health check | No |
| GET | `/search/symbols` | Search symbols by query string | No |
| GET | `/search/modules` | Search modules by query string | No |
| GET | `/modules/:id` | Module detail | No |
| GET | `/symbols/:id` | Symbol detail | No |
| GET | `/symbols/:id/callers` | Incoming callers for a symbol | No |
| GET | `/symbols/:id/callees` | Outgoing callees for a symbol | No |
| POST | `/analysis` | Run analysis for a project path | No |
| POST | `/analysis/refresh` | Refresh an existing project | No |
| POST | `/analysis/impact` | Analyze the impact of a module change | No |
| GET | `/analysis/cycles` | Detect circular dependencies | No |
| GET | `/analysis/validate` | Validate the current code graph | No |
| GET | `/stats` | Project statistics | No |
| GET | `/graph` | Dependency graph data for visualization | No |
| GET | `/export/:format` | Export graph data | No |

### Query Parameters

Search endpoints accept:

- `q` — string, default empty
- `limit` — number, default `50`

The graph endpoint accepts:

- `page` — number, default `1`
- `limit` — number, default `100`

### Export Formats

`export/:format` accepts `json`, `graphml`, and `dot`. The response is returned as a file download with the appropriate `Content-Type` and `Content-Disposition` headers.

## Request/Response Formats

### Response Envelope

Every JSON endpoint returns an `ApiResponse<T>` envelope:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-05-11T08:49:11.768Z",
    "requestId": "req_1746989351768_abc1234"
  }
}
```

On failure:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Module xyz not found"
  },
  "meta": {
    "timestamp": "2026-05-11T08:49:11.768Z",
    "requestId": "req_1746989351768_abc1234"
  }
}
```

### Request Bodies

**POST `/analysis`**

```json
{
  "projectPath": "/path/to/project",
  "options": {
    "mode": "tree-sitter"
  }
}
```

**POST `/analysis/refresh`**

```json
{
  "projectPath": "/path/to/project"
}
```

**POST `/analysis/impact`**

```json
{
  "moduleId": "module-uuid",
  "depth": 3
}
```

For deprecated parser modes, the API returns the same actionable error shape used by the CLI, including `nextCommand` when available.

## Error Codes

Standard HTTP status codes and their meanings in this API:

| Status | Code | Meaning |
|---|---|---|
| 200 | — | Success |
| 400 | `INVALID_FORMAT` | Unsupported export format or bad request parameter |
| 400 | `DEPRECATED_PARSER_MODE` | Requested parser mode is no longer supported |
| 404 | `NOT_FOUND` | Requested module or symbol does not exist |
| 500 | `INTERNAL_ERROR` | Unhandled server exception |
| 500 | `SEARCH_ERROR` | Search operation failed |
| 500 | `QUERY_ERROR` | Query operation failed |
| 500 | `ANALYSIS_ERROR` | Analysis operation failed |
| 500 | `EXPORT_ERROR` | Export operation failed |
| 500 | `VALIDATION_ERROR` | Validation operation failed |
| 501 | `ANALYSIS_NOT_SUPPORTED` | Analysis operation is not supported by the server layer |
| 501 | `INCREMENTAL_UPDATE_NOT_SUPPORTED` | Incremental update is not supported |
| 501 | `REFRESH_NOT_SUPPORTED` | Refresh operation is not supported by the server layer |

The 404 handler also returns a standard error envelope for unmatched routes:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Route /api/v1/unknown not found"
  }
}
```

## Rate Limits

No rate limiting is currently configured for the API.

## MCP

The MCP server lives under `src/server/mcp/` and is started via the `mcp start` CLI path. It is intentionally experimental and uses the process' stdio transport rather than the REST API transport.
