# Phase 80 Research: MCP Stdio Blank-Line Filtering

## Verified Findings

1. `src/server/mcp/server.ts` currently constructs `new StdioServerTransport(options.stdin, options.stdout)` directly, so there is no repository-owned seam for filtering or parse-failure shaping.
2. SDK implementation (`@modelcontextprotocol/sdk/dist/cjs/shared/stdio.js`) reads one newline-delimited frame at a time and runs `JSON.parse(line)` immediately.
3. A blank line therefore becomes `JSON.parse('')`, which is a transport parse error rather than an ignored no-op.
4. A raw local experiment against the current server path produced no stdout frame for either blank-line input or `not-json\n`, proving malformed non-blank payloads are currently swallowed instead of failing explicitly.
5. Existing MCP integration tests already assert stdout protocol cleanliness and real transport behavior, so Phase 80 should extend that style rather than add mock-only coverage.

## Implementation Direction

- Add a repository-owned stdio transport wrapper/class for the MCP server path.
- Filter whitespace-only lines before JSON parsing.
- Preserve non-blank payload bytes for parsing.
- On parse failure for non-blank payload, emit an explicit JSON-RPC parse-error frame to stdout.
- Keep `server.ts` as the composition root that chooses this transport for `startCodeMapMcpServer`.

## Non-Goals

- No HTTP/SSE transport work.
- No tool schema changes.
- No MCP business-logic refactor.
