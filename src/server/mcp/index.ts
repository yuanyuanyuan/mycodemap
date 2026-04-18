// [META] since:2026-04-19 | owner:server-team | stable:false
// [WHY] Public entry for the experimental MCP stdio thin slice

export { createCodeMapMcpServer, startCodeMapMcpServer } from './server.js';
export { CodeMapMcpService } from './service.js';
export type {
  McpGraphStatus,
  McpImpactNode,
  McpImpactResult,
  McpQueryResult,
  McpSymbolRef,
  McpToolConfidence,
  McpToolError,
  McpToolStatus,
} from './types.js';
