// [META] since:2026-04-19 | owner:server-team | stable:false
// [WHY] Experimental MCP contract types for the Phase 26 symbol-query thin slice

import type { Symbol } from '../../interface/types/index.js';
import type { GraphMetadata } from '../../interface/types/storage.js';

export type McpToolStatus = 'ok' | 'not_found' | 'ambiguous' | 'unavailable' | 'invalid_input';
export type McpToolConfidence = 'high' | 'reduced' | 'ambiguous' | 'unavailable';
export type McpGraphStatus = GraphMetadata['graphStatus'] | 'missing';
export type McpErrorCode = 'GRAPH_NOT_FOUND' | 'SYMBOL_NOT_FOUND' | 'AMBIGUOUS_EDGE' | 'INVALID_TASK' | 'FILTER_CONFLICT';

export interface McpToolError {
  code: McpErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface McpSymbolRef {
  id: string;
  module_id: string;
  name: string;
  kind: Symbol['kind'];
  visibility: Symbol['visibility'];
  file_path: string;
  line: number;
  column: number;
  signature?: string;
}

export interface McpQueryResult {
  [key: string]: unknown;
  status: McpToolStatus;
  confidence: McpToolConfidence;
  graph_status: McpGraphStatus;
  generated_at: string | null;
  failed_file_count: number;
  parse_failure_files: string[];
  symbol?: McpSymbolRef;
  callers: McpSymbolRef[];
  callees: McpSymbolRef[];
  error?: McpToolError;
}

export interface McpImpactNode {
  symbol: McpSymbolRef;
  depth: number;
  path: string[];
}

export interface McpImpactResult {
  [key: string]: unknown;
  status: McpToolStatus;
  confidence: McpToolConfidence;
  graph_status: McpGraphStatus;
  generated_at: string | null;
  failed_file_count: number;
  parse_failure_files: string[];
  root_symbol?: McpSymbolRef;
  affected_symbols: McpImpactNode[];
  depth: number;
  limit: number;
  truncated: boolean;
  error?: McpToolError;
}

export type McpContextTask = 'review' | 'debug' | 'default';
export type McpContextDetailLevel = 'minimal' | 'standard';
export type McpContextRiskLevel = 'low' | 'medium' | 'high';

export interface McpContextGraphStats {
  modules: number;
  symbols: number;
  edges: number;
  cycles: number;
}

export interface McpContextRiskSummary {
  level: McpContextRiskLevel;
  score: number;
  factors: string[];
}

export interface McpToolSuggestion {
  tool: string;
  reason: string;
}

export interface McpContextResult {
  [key: string]: unknown;
  status: McpToolStatus;
  confidence: McpToolConfidence;
  task?: McpContextTask;
  detailLevel: McpContextDetailLevel;
  summary: string;
  graph_status: McpGraphStatus;
  generated_at: string | null;
  failed_file_count: number;
  parse_failure_files: string[];
  graphStats: McpContextGraphStats;
  riskSummary: McpContextRiskSummary;
  nextToolSuggestions: McpToolSuggestion[];
  warnings?: string[];
  rationale?: string[];
  focusAreas?: string[];
  error?: McpToolError;
}
