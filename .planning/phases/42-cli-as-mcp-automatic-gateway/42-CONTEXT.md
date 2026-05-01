# Phase 42: CLI-as-MCP Automatic Gateway - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped — infrastructure phase)

<domain>
## Phase Boundary

Auto-expose every schema-defined CLI command as an MCP tool with zero handwritten maintenance. The MCP server must dynamically register tools from the contract schema (not hardcoded `server.ts`). Adding a new command to the schema must automatically create a new MCP tool on restart. All existing 20+ CLI commands must be accessible via MCP (not just 2 experimental tools). Complex nested types must degrade gracefully to simple scalar mappings if schema generation fails.

</domain>

<decisions>
## Implementation Decisions

### the agent's Discretion
All implementation choices are at the agent's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key dependency: Phase 41 must deliver the interface contract schema before this phase can implement the gateway.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/server/mcp/server.ts` — experimental MCP server with hand-registered `codemap_query` and `codemap_impact` tools
- `src/server/mcp/service.ts` — CodeMapMcpService for symbol graph queries
- `src/server/mcp/types.ts` — MCP contract types (McpQueryResult, McpImpactResult, etc.)
- `src/cli/commands/mcp.ts` — CLI command for MCP install/start
- `@modelcontextprotocol/sdk` — already in dependencies
- `zod` — already in dependencies, used for schema validation

### Established Patterns
- MCP tools registered via `server.registerTool(name, { title, description, inputSchema }, handler)`
- `z.object()` used for input schema with `.describe()` annotations
- stdio transport for local MCP server
- JSON stringified output in `text` content type

### Integration Points
- `src/server/mcp/server.ts` — primary modification target: replace hand-registered tools with schema-driven registration
- `src/cli/index.ts` — CLI commands are the source of truth to expose
- Phase 41 output (contract schema) — required input for dynamic tool generation

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

Requirements mapping:
- AGENT-03: Schema-driven automatic MCP tool definition generation
- AGENT-06: Progressive migration of core commands (must be accessible via MCP)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
