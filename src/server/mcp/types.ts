// [META] since:2026-04-19 | owner:server-team | stable:false
// [WHY] Experimental MCP contract types for the Phase 26 symbol-query thin slice

import type { Symbol } from '../../interface/types/index.js';
import type { GraphMetadata } from '../../interface/types/storage.js';

export type McpToolStatus = 'ok' | 'not_found' | 'ambiguous' | 'unavailable' | 'invalid_input';
export type McpToolConfidence = 'high' | 'reduced' | 'ambiguous' | 'unavailable';
export type McpGraphStatus = GraphMetadata['graphStatus'] | 'missing';
export type McpErrorCode =
  | 'GRAPH_NOT_FOUND'
  | 'FILE_NOT_FOUND'
  | 'SYMBOL_NOT_FOUND'
  | 'AMBIGUOUS_ENTRYPOINT'
  | 'AMBIGUOUS_EDGE'
  | 'INVALID_TASK'
  | 'FILTER_CONFLICT';

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
  id: string;
  kind: 'module' | 'symbol';
  name: string;
  file_path: string;
  depth: number;
  path: string[];
}

export interface McpImpactEntrypointCandidate {
  id: string;
  kind: 'module' | 'symbol';
  name: string;
  file_path: string;
  line?: number;
}

export interface McpImpactEntrypoint {
  kind: 'file' | 'symbol';
  id?: string;
  name: string;
  file_path?: string;
  line?: number;
  candidates?: McpImpactEntrypointCandidate[];
}

export interface McpImpactLayer {
  depth: number;
  nodes: McpImpactNode[];
}

export interface McpImpactWarning {
  code: 'GRAPH_PARTIAL' | 'TRAVERSAL_TRUNCATED';
  message: string;
}

export interface McpImpactSummary {
  requested_depth: number;
  direct_count: number;
  transitive_count: number;
  total_count: number;
  max_depth: number;
  truncated: boolean;
}

export interface McpImpactResult {
  [key: string]: unknown;
  status: McpToolStatus;
  confidence: McpToolConfidence;
  graph_status: McpGraphStatus;
  generated_at: string | null;
  failed_file_count: number;
  parse_failure_files: string[];
  entrypoint: McpImpactEntrypoint;
  summary: McpImpactSummary;
  direct: McpImpactNode[];
  transitive_layers: McpImpactLayer[];
  warnings: McpImpactWarning[];
  truncated: boolean;
  remediation?: string;
  error?: McpToolError;
}

export interface McpCommunityWarning {
  code:
    | 'GRAPH_PARTIAL'
    | 'LOW_SIGNAL_SPARSE_GRAPH'
    | 'LOW_SIGNAL_DOMINANT_SINGLE_CLUSTER'
    | 'LOW_SIGNAL_SINGLETON_HEAVY';
  message: string;
}

export interface McpCommunitySummary {
  total_modules: number;
  total_edges: number;
  community_count: number;
  singleton_count: number;
  modularity: number;
  largest_community_size: number;
  largest_community_ratio: number;
}

export interface McpCommunityCluster {
  id: string;
  label: string;
  module_ids: string[];
  module_paths: string[];
  size: number;
  top_paths: string[];
  dominant_edge_kinds: Array<'import' | 'inherit' | 'implement' | 'call' | 'type-ref'>;
  cohesion: number;
}

export interface McpCommunityTopologyCandidate {
  module_id: string;
  module_path: string;
  score: number;
  connected_module_count: number;
  linked_community_labels: string[];
  dominant_edge_kinds: Array<'import' | 'inherit' | 'implement' | 'call' | 'type-ref'>;
}

export interface McpCommunityTopology {
  deduped_dependency_count: number;
  duplicate_dependency_count: number;
  hubs: McpCommunityTopologyCandidate[];
  bridges: McpCommunityTopologyCandidate[];
}

export interface McpCommunityResult {
  [key: string]: unknown;
  status: McpToolStatus;
  confidence: McpToolConfidence;
  graph_status: McpGraphStatus;
  generated_at: string | null;
  failed_file_count: number;
  parse_failure_files: string[];
  summary: McpCommunitySummary;
  communities: McpCommunityCluster[];
  topology: McpCommunityTopology;
  warnings: McpCommunityWarning[];
  remediation?: string;
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
