// [META] since:2026-04-19 | owner:server-team | stable:false
// [WHY] Reuse storage truth to power experimental MCP symbol query and impact tools without duplicating graph logic

import type { Symbol } from '../../interface/types/index.js';
import type { IStorage, GraphMetadata } from '../../interface/types/storage.js';
import type {
  McpGraphStatus,
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

function toGraphStatus(metadata: GraphMetadata): McpGraphStatus {
  return metadata.generatedAt ? metadata.graphStatus : 'missing';
}

function buildGraphEnvelope(metadata: GraphMetadata): Pick<
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
    if (toGraphStatus(metadata) === 'missing') {
      return createErrorResult<McpImpactResult>(
        metadata,
        'unavailable',
        'unavailable',
        {
          code: 'GRAPH_NOT_FOUND',
          message: 'Code graph not found. Run `mycodemap generate --symbol-level` first.',
        },
        {
          affected_symbols: [],
          depth: clampImpactDepth(input.depth),
          limit: clampImpactLimit(input.limit),
          truncated: false,
        }
      );
    }

    const resolved = await this.resolveSymbol(input, metadata);
    const depth = clampImpactDepth(input.depth);
    const limit = clampImpactLimit(input.limit);

    if ('error' in resolved) {
      return createErrorResult<McpImpactResult>(
        metadata,
        resolved.status,
        resolved.confidence,
        resolved.error,
        {
          affected_symbols: [],
          depth,
          limit,
          truncated: false,
        }
      );
    }

    const impact = await this.storage.calculateSymbolImpact(
      resolved.symbol.id,
      depth,
      limit
    );

    return {
      status: 'ok',
      confidence: resolved.confidence,
      ...buildGraphEnvelope(metadata),
      root_symbol: toSymbolRef(impact.rootSymbol),
      affected_symbols: impact.affectedSymbols.map(node => ({
        symbol: toSymbolRef(node.symbol),
        depth: node.depth,
        path: [...node.path],
      })),
      depth: impact.depth,
      limit: impact.limit,
      truncated: impact.truncated,
    };
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
