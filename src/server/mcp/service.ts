// [META] since:2026-04-19 | owner:server-team | stable:false
// [WHY] Reuse storage truth to power experimental MCP symbol query and impact tools without duplicating graph logic

import type { Symbol } from '../../interface/types/index.js';
import type {
  CommunityCluster,
  IStorage,
  GraphMetadata,
  ImpactAnalysisRequest,
  ImpactEntrypointCandidate,
  ImpactNode,
  SharedCommunityResult,
  SharedImpactResult,
} from '../../interface/types/storage.js';
import { analyzeCommunitiesInGraph } from '../../infrastructure/storage/community-helpers.js';
import { analyzeImpactInGraph } from '../../infrastructure/storage/graph-helpers.js';
import type {
  McpCommunityCluster,
  McpCommunityResult,
  McpGraphStatus,
  McpImpactEntrypoint,
  McpImpactEntrypointCandidate,
  McpImpactLayer,
  McpImpactNode,
  McpImpactResult,
  McpQueryResult,
  McpSymbolRef,
  McpToolConfidence,
  McpToolError,
  McpToolStatus,
} from './types.js';

export const MAX_MCP_SYMBOL_IMPACT_DEPTH = 5;
export const MAX_MCP_SYMBOL_IMPACT_LIMIT = 50;
export const DEFAULT_MCP_SYMBOL_IMPACT_DEPTH = 3;
export const DEFAULT_MCP_SYMBOL_IMPACT_LIMIT = 20;

export interface QuerySymbolInput {
  symbol: string;
  filePath?: string;
}

export interface ImpactSymbolInput extends QuerySymbolInput {
  depth?: number;
  limit?: number;
}

interface ResolvedSymbolCandidate {
  symbol: Symbol;
  confidence: McpToolConfidence;
}

function normalizePath(value: string): string {
  return value.replace(/\\/gu, '/');
}

function matchesFilePath(candidatePath: string, requestedPath: string): boolean {
  const normalizedCandidate = normalizePath(candidatePath);
  const normalizedRequested = normalizePath(requestedPath);

  return normalizedCandidate === normalizedRequested
    || normalizedCandidate.endsWith(`/${normalizedRequested}`)
    || normalizedRequested.endsWith(`/${normalizedCandidate}`);
}

export function toGraphStatus(metadata: GraphMetadata): McpGraphStatus {
  return metadata.generatedAt ? metadata.graphStatus : 'missing';
}

export function buildGraphEnvelope(metadata: GraphMetadata): Pick<
  McpQueryResult,
  'graph_status' | 'generated_at' | 'failed_file_count' | 'parse_failure_files'
> {
  return {
    graph_status: toGraphStatus(metadata),
    generated_at: metadata.generatedAt,
    failed_file_count: metadata.failedFileCount,
    parse_failure_files: [...metadata.parseFailureFiles],
  };
}

function createErrorResult<T extends McpQueryResult | McpImpactResult>(
  metadata: GraphMetadata,
  status: McpToolStatus,
  confidence: McpToolConfidence,
  error: McpToolError,
  base: Omit<T, 'status' | 'confidence' | 'error' | 'graph_status' | 'generated_at' | 'failed_file_count' | 'parse_failure_files'>
): T {
  return {
    status,
    confidence,
    error,
    ...buildGraphEnvelope(metadata),
    ...base,
  } as T;
}

function toSymbolRef(symbol: Symbol): McpSymbolRef {
  return {
    id: symbol.id,
    module_id: symbol.moduleId,
    name: symbol.name,
    kind: symbol.kind,
    visibility: symbol.visibility,
    file_path: symbol.location.file,
    line: symbol.location.line,
    column: symbol.location.column,
    signature: symbol.signature,
  };
}

function clampImpactDepth(depth?: number): number {
  if (!Number.isFinite(depth ?? NaN)) {
    return DEFAULT_MCP_SYMBOL_IMPACT_DEPTH;
  }

  return Math.min(
    Math.max(Math.trunc(depth ?? DEFAULT_MCP_SYMBOL_IMPACT_DEPTH), 1),
    MAX_MCP_SYMBOL_IMPACT_DEPTH
  );
}

function clampImpactLimit(limit?: number): number {
  if (!Number.isFinite(limit ?? NaN)) {
    return DEFAULT_MCP_SYMBOL_IMPACT_LIMIT;
  }

  return Math.min(
    Math.max(Math.trunc(limit ?? DEFAULT_MCP_SYMBOL_IMPACT_LIMIT), 1),
    MAX_MCP_SYMBOL_IMPACT_LIMIT
  );
}

function toMcpImpactCandidate(candidate: ImpactEntrypointCandidate): McpImpactEntrypointCandidate {
  return {
    id: candidate.id,
    kind: candidate.kind,
    name: candidate.name,
    file_path: candidate.filePath,
    line: candidate.line,
  };
}

function toMcpImpactEntrypoint(entrypoint: SharedImpactResult['entrypoint']): McpImpactEntrypoint {
  return {
    kind: entrypoint.kind,
    id: entrypoint.id,
    name: entrypoint.name,
    file_path: entrypoint.filePath,
    line: entrypoint.line,
    candidates: entrypoint.candidates?.map(toMcpImpactCandidate),
  };
}

function toMcpImpactNode(node: ImpactNode): McpImpactNode {
  return {
    id: node.id,
    kind: node.kind,
    name: node.name,
    file_path: node.filePath,
    depth: node.depth,
    path: [...node.path],
  };
}

function toMcpImpactLayer(layer: SharedImpactResult['transitiveLayers'][number]): McpImpactLayer {
  return {
    depth: layer.depth,
    nodes: layer.nodes.map(toMcpImpactNode),
  };
}

function toMcpImpactError(error: SharedImpactResult['error']): McpToolError | undefined {
  if (!error) {
    return undefined;
  }

  return {
    code: error.code,
    message: error.message,
    details: error.details,
  };
}

function toMcpCommunityCluster(cluster: CommunityCluster): McpCommunityCluster {
  return {
    id: cluster.id,
    label: cluster.label,
    module_ids: [...cluster.moduleIds],
    module_paths: [...cluster.modulePaths],
    size: cluster.size,
    top_paths: [...cluster.topPaths],
    dominant_edge_kinds: [...cluster.dominantEdgeKinds],
    cohesion: cluster.cohesion,
  };
}

export function mapSharedCommunityResult(
  result: SharedCommunityResult,
  metadata: GraphMetadata
): McpCommunityResult {
  return {
    status: result.status,
    confidence: result.confidence,
    ...buildGraphEnvelope(metadata),
    summary: {
      total_modules: result.summary.totalModules,
      total_edges: result.summary.totalEdges,
      community_count: result.summary.communityCount,
      singleton_count: result.summary.singletonCount,
      modularity: result.summary.modularity,
      largest_community_size: result.summary.largestCommunitySize,
      largest_community_ratio: result.summary.largestCommunityRatio,
    },
    communities: result.communities.map(toMcpCommunityCluster),
    warnings: result.warnings.map((warning) => ({
      code: warning.code,
      message: warning.message,
    })),
    remediation: result.remediation,
    error: toMcpImpactError(result.error),
  };
}

function mapSharedImpactResult(result: SharedImpactResult, metadata: GraphMetadata): McpImpactResult {
  return {
    status: result.status,
    confidence: result.confidence,
    ...buildGraphEnvelope(metadata),
    entrypoint: toMcpImpactEntrypoint(result.entrypoint),
    summary: {
      requested_depth: result.summary.requestedDepth,
      direct_count: result.summary.directCount,
      transitive_count: result.summary.transitiveCount,
      total_count: result.summary.totalCount,
      max_depth: result.summary.maxDepth,
      truncated: result.summary.truncated,
    },
    direct: result.direct.map(toMcpImpactNode),
    transitive_layers: result.transitiveLayers.map(toMcpImpactLayer),
    warnings: result.warnings.map((warning) => ({
      code: warning.code,
      message: warning.message,
    })),
    truncated: result.truncated,
    remediation: result.remediation,
    error: toMcpImpactError(result.error),
  };
}

export class CodeMapMcpService {
  constructor(private readonly storage: IStorage) {}

  async querySymbol(input: QuerySymbolInput): Promise<McpQueryResult> {
    const metadata = await this.storage.loadGraphMetadata();
    if (toGraphStatus(metadata) === 'missing') {
      return createErrorResult<McpQueryResult>(
        metadata,
        'unavailable',
        'unavailable',
        {
          code: 'GRAPH_NOT_FOUND',
          message: 'Code graph not found. Run `mycodemap generate --symbol-level` first.',
        },
        {
          callers: [],
          callees: [],
        }
      );
    }

    const resolved = await this.resolveSymbol(input, metadata);
    if ('error' in resolved) {
      return createErrorResult<McpQueryResult>(
        metadata,
        resolved.status,
        resolved.confidence,
        resolved.error,
        {
          callers: [],
          callees: [],
        }
      );
    }

    const callers = await this.storage.findCallers(resolved.symbol.id);
    const callees = await this.storage.findCallees(resolved.symbol.id);

    return {
      status: 'ok',
      confidence: resolved.confidence,
      ...buildGraphEnvelope(metadata),
      symbol: toSymbolRef(resolved.symbol),
      callers: callers.map(toSymbolRef),
      callees: callees.map(toSymbolRef),
    };
  }

  async impactSymbol(input: ImpactSymbolInput): Promise<McpImpactResult> {
    const metadata = await this.storage.loadGraphMetadata();
    const depth = clampImpactDepth(input.depth);
    const limit = clampImpactLimit(input.limit);
    const graph = await this.storage.loadCodeGraph();
    const request: ImpactAnalysisRequest = {
      kind: 'symbol',
      symbol: input.symbol,
      filePath: input.filePath,
      depth,
      limit,
    };
    return mapSharedImpactResult(analyzeImpactInGraph(graph, request), metadata);
  }

  async communities(): Promise<McpCommunityResult> {
    const metadata = await this.storage.loadGraphMetadata();
    const graph = await this.storage.loadCodeGraph();
    return mapSharedCommunityResult(analyzeCommunitiesInGraph(graph, metadata), metadata);
  }

  private async resolveSymbol(
    input: QuerySymbolInput,
    metadata: GraphMetadata
  ): Promise<
    ResolvedSymbolCandidate
    | { status: McpToolStatus; confidence: McpToolConfidence; error: McpToolError }
  > {
    const matchedByName = (await this.storage.findSymbolByName(input.symbol))
      .filter(symbol => symbol.name === input.symbol);
    const scopedMatches = input.filePath
      ? matchedByName.filter(symbol => matchesFilePath(symbol.location.file, input.filePath ?? ''))
      : matchedByName;

    if (scopedMatches.length === 1) {
      return {
        symbol: scopedMatches[0],
        confidence: metadata.graphStatus === 'partial' ? 'high' : 'high',
      };
    }

    if (scopedMatches.length > 1) {
      return {
        status: 'ambiguous',
        confidence: 'ambiguous',
        error: {
          code: 'AMBIGUOUS_EDGE',
          message: `Symbol "${input.symbol}" resolves to multiple candidates.`,
          details: {
            candidates: scopedMatches.map(symbol => ({
              id: symbol.id,
              file_path: symbol.location.file,
              line: symbol.location.line,
            })),
          },
        },
      };
    }

    return {
      status: 'not_found',
      confidence: 'unavailable',
      error: {
        code: 'SYMBOL_NOT_FOUND',
        message: input.filePath
          ? `Symbol "${input.symbol}" not found in "${input.filePath}".`
          : `Symbol "${input.symbol}" not found.`,
      },
    };
  }
}
