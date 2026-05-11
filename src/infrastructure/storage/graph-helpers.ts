// [META] since:2026-03-24 | owner:architecture-team | stable:false
// [WHY] Share CodeGraph clone/query/analysis helpers across storage backends to keep contract behavior consistent

import type {
  Cycle,
  GraphMetadata,
  ImpactAnalysisRequest,
  ImpactEntrypoint,
  ImpactEntrypointCandidate,
  ImpactNode,
  SharedImpactResult,
  ImpactResult,
  ProjectStatistics,
  SymbolImpactResult,
  SymbolImpactNode,
} from '../../interface/types/storage.js';
import type {
  CodeGraph,
  DependencyConfidence,
  Module,
  Symbol,
  Dependency,
} from '../../interface/types/index.js';
import type { IncrementalRefreshReason } from '../../interface/types/storage.js';

export interface IncrementalNeighborhood {
  invalidatedModuleIds: string[];
  invalidatedModulePaths: string[];
  reasons: IncrementalRefreshReason[];
}

export interface GraphReadIndex {
  moduleById: Map<string, Module>;
  symbolById: Map<string, Symbol>;
  dependenciesBySourceId: Map<string, Dependency[]>;
  dependenciesByTargetId: Map<string, Dependency[]>;
  moduleReverseAdjacency: Map<string, string[]>;
  symbolReverseAdjacency: Map<string, string[]>;
}

interface TraversalState {
  id: string;
  depth: number;
  path: string[];
}

interface ImpactTraversalOutput {
  direct: ImpactNode[];
  transitiveLayers: SharedImpactResult['transitiveLayers'];
  truncated: boolean;
}

type ResolvedImpactEntrypoint =
  | {
    ok: true;
    entrypoint: ImpactEntrypoint;
    rootId: string;
  }
  | {
    ok: false;
    result: SharedImpactResult;
  };

function cloneDependencyList(dependencies: readonly Dependency[]): Dependency[] {
  return dependencies.map((dependency) => ({ ...dependency }));
}

export function cloneCodeGraph(graph: CodeGraph): CodeGraph {
  return globalThis.structuredClone(graph);
}

export function serializeCodeGraphSnapshot(graph: CodeGraph): string {
  return JSON.stringify(graph);
}

export function deserializeCodeGraphSnapshot(
  snapshot: string,
  projectPath: string = ''
): CodeGraph {
  const parsedGraph = JSON.parse(snapshot) as CodeGraph & {
    project: {
      createdAt: string | Date;
      updatedAt: string | Date;
    };
  };

  return {
    ...parsedGraph,
    project: {
      ...parsedGraph.project,
      rootPath: parsedGraph.project.rootPath || projectPath,
      createdAt: new Date(parsedGraph.project.createdAt),
      updatedAt: new Date(parsedGraph.project.updatedAt),
    },
    graphStatus: parsedGraph.graphStatus ?? 'complete',
    failedFileCount: parsedGraph.failedFileCount ?? 0,
    parseFailureFiles: parsedGraph.parseFailureFiles ?? [],
    lastRefresh: parsedGraph.lastRefresh,
  };
}

export function createEmptyCodeGraph(projectPath: string = ''): CodeGraph {
  const now = new Date();

  return {
    project: {
      id: '',
      name: '',
      rootPath: projectPath,
      createdAt: now,
      updatedAt: now,
    },
    modules: [],
    symbols: [],
    dependencies: [],
    graphStatus: 'complete',
    failedFileCount: 0,
    parseFailureFiles: [],
    lastRefresh: undefined,
  };
}

export function getGraphMetadataFromGraph(
  graph: CodeGraph,
  generatedAt: string | null = null
): GraphMetadata {
  const hasMaterializedGraph = graph.modules.length > 0 || graph.symbols.length > 0;
  const graphGeneratedAt = generatedAt
    ?? (hasMaterializedGraph ? graph.project.updatedAt.toISOString() : null);

  return {
    generatedAt: graphGeneratedAt,
    graphStatus: graph.graphStatus ?? 'complete',
    failedFileCount: graph.failedFileCount ?? 0,
    parseFailureFiles: [...(graph.parseFailureFiles ?? [])],
    moduleCount: graph.modules.length,
    symbolCount: graph.symbols.length,
    lastRefresh: graph.lastRefresh,
  };
}

export function upsertModuleInGraph(graph: CodeGraph, module: Module): CodeGraph {
  const nextGraph = cloneCodeGraph(graph);
  const index = nextGraph.modules.findIndex(existingModule => existingModule.id === module.id);

  if (index >= 0) {
    nextGraph.modules[index] = { ...module };
  } else {
    nextGraph.modules.push({ ...module });
  }

  return nextGraph;
}

export function deleteModuleFromGraph(graph: CodeGraph, moduleId: string): CodeGraph {
  const nextGraph = cloneCodeGraph(graph);

  nextGraph.modules = nextGraph.modules.filter(module => module.id !== moduleId);
  nextGraph.symbols = nextGraph.symbols.filter(symbol => symbol.moduleId !== moduleId);
  nextGraph.dependencies = nextGraph.dependencies.filter(
    dependency => dependency.sourceId !== moduleId && dependency.targetId !== moduleId
  );

  return nextGraph;
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/gu, '/');
}

function matchesRequestedPath(candidatePath: string, requestedPath: string): boolean {
  const normalizedCandidate = normalizePath(candidatePath);
  const normalizedRequested = normalizePath(requestedPath);

  return normalizedCandidate === normalizedRequested
    || normalizedCandidate.endsWith(`/${normalizedRequested}`)
    || normalizedRequested.endsWith(`/${normalizedCandidate}`);
}

function isConservativeConfidence(confidence: DependencyConfidence | undefined): boolean {
  return confidence === 'INFERRED' || confidence === 'AMBIGUOUS';
}

function createEmptyImpactResult(
  request: ImpactAnalysisRequest,
  graphStatus: SharedImpactResult['graphStatus'],
  overrides: Pick<SharedImpactResult, 'status' | 'confidence'> & {
    error?: SharedImpactResult['error'];
    warnings?: SharedImpactResult['warnings'];
    remediation?: string;
    entrypoint?: Partial<ImpactEntrypoint>;
  }
): SharedImpactResult {
  return {
    status: overrides.status,
    confidence: overrides.confidence,
    graphStatus,
    entrypoint: {
      kind: request.kind,
      name: request.kind === 'file' ? request.filePath : request.symbol,
      filePath: request.filePath,
      ...overrides.entrypoint,
    },
    summary: {
      requestedDepth: request.depth,
      directCount: 0,
      transitiveCount: 0,
      totalCount: 0,
      maxDepth: 0,
      truncated: false,
    },
    direct: [],
    transitiveLayers: [],
    warnings: overrides.warnings ?? [],
    truncated: false,
    remediation: overrides.remediation,
    error: overrides.error,
  };
}

export function createGraphReadIndex(graph: CodeGraph): GraphReadIndex {
  const dependenciesBySourceId = new Map<string, Dependency[]>();
  const dependenciesByTargetId = new Map<string, Dependency[]>();

  for (const dependency of graph.dependencies) {
    const sourceDependencies = dependenciesBySourceId.get(dependency.sourceId) ?? [];
    sourceDependencies.push(dependency);
    dependenciesBySourceId.set(dependency.sourceId, sourceDependencies);

    const targetDependencies = dependenciesByTargetId.get(dependency.targetId) ?? [];
    targetDependencies.push(dependency);
    dependenciesByTargetId.set(dependency.targetId, targetDependencies);
  }

  return {
    moduleById: new Map(graph.modules.map((module) => [module.id, module] as const)),
    symbolById: new Map(graph.symbols.map((symbol) => [symbol.id, symbol] as const)),
    dependenciesBySourceId,
    dependenciesByTargetId,
    moduleReverseAdjacency: buildModuleReverseAdjacency(graph),
    symbolReverseAdjacency: buildSymbolReverseAdjacency(graph),
  };
}

function toImpactCandidate(moduleOrSymbol: Module | Symbol): ImpactEntrypointCandidate {
  if ('moduleId' in moduleOrSymbol) {
    return {
      id: moduleOrSymbol.id,
      kind: 'symbol',
      name: moduleOrSymbol.name,
      filePath: moduleOrSymbol.location.file,
      line: moduleOrSymbol.location.line,
    };
  }

  return {
    id: moduleOrSymbol.id,
    kind: 'module',
    name: moduleOrSymbol.path,
    filePath: moduleOrSymbol.path,
  };
}

function resolveImpactEntrypointInGraph(
  graph: CodeGraph,
  request: ImpactAnalysisRequest
): ResolvedImpactEntrypoint {
  const graphStatus = graph.modules.length > 0 || graph.symbols.length > 0
    ? (graph.graphStatus ?? 'complete')
    : 'missing';

  if (graphStatus === 'missing') {
    return {
      ok: false,
      result: createEmptyImpactResult(request, 'missing', {
        status: 'unavailable',
        confidence: 'unavailable',
        error: {
          code: 'GRAPH_NOT_FOUND',
          message: 'Code graph not found. Run `mycodemap generate --symbol-level` first.',
        },
        remediation: 'Run `mycodemap generate --symbol-level` to rebuild graph truth before querying impact.',
      }),
    };
  }

  if (request.kind === 'file') {
    const matches = graph.modules.filter((module) => matchesRequestedPath(module.path, request.filePath));
    if (matches.length === 1) {
      return {
        ok: true,
        rootId: matches[0].id,
        entrypoint: {
          kind: 'file',
          id: matches[0].id,
          name: matches[0].path,
          filePath: matches[0].path,
        },
      };
    }

    if (matches.length > 1) {
      return {
        ok: false,
        result: createEmptyImpactResult(request, graphStatus, {
          status: 'ambiguous',
          confidence: 'ambiguous',
          error: {
            code: 'AMBIGUOUS_ENTRYPOINT',
            message: `File "${request.filePath}" resolves to multiple modules.`,
            details: {
              candidates: matches.map(toImpactCandidate),
            },
          },
          entrypoint: {
            candidates: matches.map(toImpactCandidate),
          },
        }),
      };
    }

    return {
      ok: false,
      result: createEmptyImpactResult(request, graphStatus, {
        status: 'not_found',
        confidence: 'unavailable',
        error: {
          code: 'FILE_NOT_FOUND',
          message: `File "${request.filePath}" not found in the persisted graph.`,
        },
        remediation: 'Use a repo-relative path and regenerate graph truth if the file is newly added.',
      }),
    };
  }

  const matches = graph.symbols
    .filter((symbol) => symbol.name === request.symbol)
    .filter((symbol) => request.filePath ? matchesRequestedPath(symbol.location.file, request.filePath) : true);

  if (matches.length === 1) {
    return {
      ok: true,
      rootId: matches[0].id,
      entrypoint: {
        kind: 'symbol',
        id: matches[0].id,
        name: matches[0].name,
        filePath: matches[0].location.file,
        line: matches[0].location.line,
      },
    };
  }

  if (matches.length > 1) {
    return {
      ok: false,
      result: createEmptyImpactResult(request, graphStatus, {
        status: 'ambiguous',
        confidence: 'ambiguous',
        error: {
          code: 'AMBIGUOUS_ENTRYPOINT',
          message: `Symbol "${request.symbol}" resolves to multiple candidates.`,
          details: {
            candidates: matches.map(toImpactCandidate),
          },
        },
        entrypoint: {
          candidates: matches.map(toImpactCandidate),
        },
      }),
    };
  }

  return {
    ok: false,
    result: createEmptyImpactResult(request, graphStatus, {
      status: 'not_found',
      confidence: 'unavailable',
      error: {
        code: 'SYMBOL_NOT_FOUND',
        message: request.filePath
          ? `Symbol "${request.symbol}" not found in "${request.filePath}".`
          : `Symbol "${request.symbol}" not found.`,
      },
      remediation: 'Use an exact symbol name and optionally pass filePath to disambiguate.',
    }),
  };
}

function buildModuleReverseAdjacency(graph: CodeGraph): Map<string, string[]> {
  const adjacency = new Map<string, Set<string>>();
  const symbolToModuleId = new Map(graph.symbols.map((symbol) => [symbol.id, symbol.moduleId] as const));

  for (const dependency of graph.dependencies) {
    const sourceModuleId = dependency.sourceEntityType === 'symbol'
      ? symbolToModuleId.get(dependency.sourceId)
      : dependency.sourceId;
    const targetModuleId = dependency.targetEntityType === 'symbol'
      ? symbolToModuleId.get(dependency.targetId)
      : dependency.targetId;

    if (!sourceModuleId || !targetModuleId || sourceModuleId === targetModuleId) {
      continue;
    }

    if (!adjacency.has(targetModuleId)) {
      adjacency.set(targetModuleId, new Set());
    }
    adjacency.get(targetModuleId)?.add(sourceModuleId);
  }

  return new Map(
    Array.from(adjacency.entries()).map(([key, values]) => [key, Array.from(values)])
  );
}

function buildSymbolReverseAdjacency(graph: CodeGraph): Map<string, string[]> {
  const adjacency = new Map<string, Set<string>>();

  for (const dependency of graph.dependencies) {
    if (
      dependency.type !== 'call'
      || dependency.sourceEntityType !== 'symbol'
      || dependency.targetEntityType !== 'symbol'
    ) {
      continue;
    }

    if (!adjacency.has(dependency.targetId)) {
      adjacency.set(dependency.targetId, new Set());
    }
    adjacency.get(dependency.targetId)?.add(dependency.sourceId);
  }

  return new Map(
    Array.from(adjacency.entries()).map(([key, values]) => [key, Array.from(values)])
  );
}

function collectImpactTraversal(
  rootId: string,
  depth: number,
  limit: number,
  adjacency: Map<string, string[]>,
  resolveNode: (id: string, hop: number, path: string[]) => ImpactNode | null
): ImpactTraversalOutput {
  const direct: ImpactNode[] = [];
  const transitiveLayerMap = new Map<number, ImpactNode[]>();
  const visited = new Set<string>([rootId]);
  const queue: TraversalState[] = [{ id: rootId, depth: 0, path: [rootId] }];
  let impactedCount = 0;
  let truncated = false;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.depth >= depth) {
      continue;
    }

    const neighbors = adjacency.get(current.id) ?? [];
    for (const neighborId of neighbors) {
      if (visited.has(neighborId)) {
        continue;
      }

      if (impactedCount >= limit) {
        truncated = true;
        queue.length = 0;
        break;
      }

      const nextDepth = current.depth + 1;
      const nextPath = [...current.path, neighborId];
      const node = resolveNode(neighborId, nextDepth, nextPath);
      if (!node) {
        continue;
      }

      visited.add(neighborId);
      impactedCount += 1;

      if (nextDepth === 1) {
        direct.push(node);
      } else {
        const layer = transitiveLayerMap.get(nextDepth) ?? [];
        layer.push(node);
        transitiveLayerMap.set(nextDepth, layer);
      }

      queue.push({
        id: neighborId,
        depth: nextDepth,
        path: nextPath,
      });
    }
  }

  return {
    direct,
    transitiveLayers: Array.from(transitiveLayerMap.entries())
      .sort((left, right) => left[0] - right[0])
      .map(([layerDepth, nodes]) => ({
        depth: layerDepth,
        nodes,
      })),
    truncated,
  };
}

function buildSharedImpactResult(
  graph: CodeGraph,
  request: ImpactAnalysisRequest,
  resolved: Extract<ResolvedImpactEntrypoint, { ok: true }>,
  traversal: ImpactTraversalOutput
): SharedImpactResult {
  const graphStatus = graph.graphStatus ?? 'complete';
  const warnings: SharedImpactResult['warnings'] = [];
  let confidence: SharedImpactResult['confidence'] = 'high';

  if (graphStatus === 'partial') {
    warnings.push({
      code: 'GRAPH_PARTIAL',
      message: 'Graph truth is partial; parse failures may hide affected files or symbols.',
    });
    confidence = 'reduced';
  }

  if (traversal.truncated) {
    warnings.push({
      code: 'TRAVERSAL_TRUNCATED',
      message: 'Impact traversal hit the configured depth/limit boundary before exhaustion.',
    });
    confidence = 'reduced';
  }

  const transitiveCount = traversal.transitiveLayers.reduce(
    (sum, layer) => sum + layer.nodes.length,
    0
  );

  return {
    status: 'ok',
    confidence,
    graphStatus,
    entrypoint: resolved.entrypoint,
    summary: {
      requestedDepth: request.depth,
      directCount: traversal.direct.length,
      transitiveCount,
      totalCount: traversal.direct.length + transitiveCount,
      maxDepth: traversal.transitiveLayers.at(-1)?.depth ?? (traversal.direct.length > 0 ? 1 : 0),
      truncated: traversal.truncated,
    },
    direct: traversal.direct,
    transitiveLayers: traversal.transitiveLayers,
    warnings,
    truncated: traversal.truncated,
  };
}

function toModuleImpactNode(module: Module, depth: number, path: string[]): ImpactNode {
  return {
    id: module.id,
    kind: 'module',
    name: module.path,
    filePath: module.path,
    depth,
    path,
  };
}

function toSymbolImpactNode(symbol: Symbol, depth: number, path: string[]): SymbolImpactNode {
  return {
    id: symbol.id,
    kind: 'symbol',
    name: symbol.name,
    filePath: symbol.location.file,
    depth,
    path,
    symbol: { ...symbol },
  };
}

export function analyzeImpactInGraph(
  graph: CodeGraph,
  request: ImpactAnalysisRequest,
  index?: GraphReadIndex
): SharedImpactResult {
  const resolved = resolveImpactEntrypointInGraph(graph, request);
  if (!resolved.ok) {
    return resolved.result;
  }

  if (request.kind === 'file') {
    const moduleMap = index?.moduleById ?? new Map(graph.modules.map((module) => [module.id, module] as const));
    const traversal = collectImpactTraversal(
      resolved.rootId,
      request.depth,
      request.limit ?? Number.MAX_SAFE_INTEGER,
      index?.moduleReverseAdjacency ?? buildModuleReverseAdjacency(graph),
      (id, hop, traversalPath) => {
        const module = moduleMap.get(id);
        return module ? toModuleImpactNode(module, hop, traversalPath) : null;
      }
    );

    return buildSharedImpactResult(graph, request, resolved, traversal);
  }

  const symbolMap = index?.symbolById ?? new Map(graph.symbols.map((symbol) => [symbol.id, symbol] as const));
  const traversal = collectImpactTraversal(
    resolved.rootId,
    request.depth,
    request.limit,
    index?.symbolReverseAdjacency ?? buildSymbolReverseAdjacency(graph),
    (id, hop, traversalPath) => {
      const symbol = symbolMap.get(id);
      return symbol ? toSymbolImpactNode(symbol, hop, traversalPath) : null;
    }
  );

  return buildSharedImpactResult(graph, request, resolved, traversal);
}

export function collectIncrementalNeighborhood(
  graph: CodeGraph,
  changedModulePaths: readonly string[],
): IncrementalNeighborhood {
  const normalizedChangedPaths = changedModulePaths.map(normalizePath);
  const moduleById = new Map(graph.modules.map((module) => [module.id, module] as const));
  const moduleIdByPath = new Map(
    graph.modules.map((module) => [normalizePath(module.path), module.id] as const)
  );
  const symbolToModuleId = new Map(
    graph.symbols.map((symbol) => [symbol.id, symbol.moduleId] as const)
  );
  const adjacency = new Map<string, Set<string>>();
  const reasonMap = new Map<string, string>();

  const addEdge = (fromId: string, toId: string, reason: string): void => {
    if (!adjacency.has(fromId)) {
      adjacency.set(fromId, new Set());
    }
    adjacency.get(fromId)?.add(toId);
    if (!reasonMap.has(`${fromId}->${toId}`)) {
      reasonMap.set(`${fromId}->${toId}`, reason);
    }
  };

  for (const dependency of graph.dependencies) {
    const sourceModuleId = dependency.sourceEntityType === 'symbol'
      ? symbolToModuleId.get(dependency.sourceId)
      : dependency.sourceId;
    const targetModuleId = dependency.targetEntityType === 'symbol'
      ? symbolToModuleId.get(dependency.targetId)
      : dependency.targetId;

    if (!sourceModuleId || !targetModuleId || sourceModuleId === targetModuleId) {
      continue;
    }

    const conservativeSuffix = isConservativeConfidence(dependency.confidence)
      ? '（保守扩张）'
      : '';
    const reason = `${dependency.type} ${sourceModuleId} -> ${targetModuleId}${conservativeSuffix}`;
    addEdge(sourceModuleId, targetModuleId, reason);
    addEdge(targetModuleId, sourceModuleId, reason);
  }

  const queue: Array<{ moduleId: string; depth: number }> = [];
  const visited = new Set<string>();
  const reasons: IncrementalRefreshReason[] = [];

  for (const changedPath of normalizedChangedPaths) {
    const changedModuleId = moduleIdByPath.get(changedPath);
    if (!changedModuleId) {
      continue;
    }
    queue.push({ moduleId: changedModuleId, depth: 0 });
    reasons.push({
      path: changedPath,
      reason: 'changed file seed',
    });
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current.moduleId) || current.depth > 2) {
      continue;
    }

    visited.add(current.moduleId);
    const neighbors = adjacency.get(current.moduleId) ?? new Set<string>();
    for (const neighborId of neighbors) {
      if (visited.has(neighborId)) {
        continue;
      }
      const neighbor = moduleById.get(neighborId);
      if (!neighbor) {
        continue;
      }
      reasons.push({
        path: normalizePath(neighbor.path),
        reason: `2-hop invalidation: ${reasonMap.get(`${current.moduleId}->${neighborId}`) ?? 'dependency edge'}`,
      });
      queue.push({ moduleId: neighborId, depth: current.depth + 1 });
    }
  }

  const invalidatedModuleIds = Array.from(visited);
  const invalidatedModulePaths = invalidatedModuleIds
    .map((moduleId) => moduleById.get(moduleId)?.path)
    .filter((value): value is string => Boolean(value))
    .map(normalizePath);

  return {
    invalidatedModuleIds,
    invalidatedModulePaths,
    reasons,
  };
}

export function findCallersInGraph(graph: CodeGraph, functionId: string): Symbol[] {
  const callerIds = new Set<string>();

  for (const dependency of graph.dependencies) {
    if (dependency.targetId === functionId && dependency.type === 'call') {
      callerIds.add(dependency.sourceId);
    }
  }

  return graph.symbols
    .filter(symbol => callerIds.has(symbol.id))
    .map(symbol => ({ ...symbol }));
}

export function findCalleesInGraph(graph: CodeGraph, functionId: string): Symbol[] {
  const calleeIds = new Set<string>();

  for (const dependency of graph.dependencies) {
    if (dependency.sourceId === functionId && dependency.type === 'call') {
      calleeIds.add(dependency.targetId);
    }
  }

  return graph.symbols
    .filter(symbol => calleeIds.has(symbol.id))
    .map(symbol => ({ ...symbol }));
}

export function findDependenciesInGraph(
  graph: CodeGraph,
  moduleId: string,
  index?: GraphReadIndex
): Dependency[] {
  if (index) {
    return cloneDependencyList(index.dependenciesBySourceId.get(moduleId) ?? []);
  }

  return graph.dependencies
    .filter(dependency => dependency.sourceId === moduleId)
    .map(dependency => ({ ...dependency }));
}

export function findDependentsInGraph(
  graph: CodeGraph,
  moduleId: string,
  index?: GraphReadIndex
): Dependency[] {
  if (index) {
    return cloneDependencyList(index.dependenciesByTargetId.get(moduleId) ?? []);
  }

  return graph.dependencies
    .filter(dependency => dependency.targetId === moduleId)
    .map(dependency => ({ ...dependency }));
}

export function detectCyclesInGraph(graph: CodeGraph): Cycle[] {
  const cycles: Cycle[] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  const dfs = (nodeId: string, path: string[]): void => {
    if (inStack.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      const cycleModules = path.slice(cycleStart);
      cycles.push({
        modules: cycleModules,
        length: cycleModules.length,
      });
      return;
    }

    if (visited.has(nodeId)) {
      return;
    }

    visited.add(nodeId);
    inStack.add(nodeId);

    for (const dependency of graph.dependencies) {
      if (dependency.sourceId === nodeId) {
        dfs(dependency.targetId, [...path, nodeId]);
      }
    }

    inStack.delete(nodeId);
  };

  for (const module of graph.modules) {
    if (!visited.has(module.id)) {
      dfs(module.id, []);
    }
  }

  return cycles;
}

export function calculateImpactInGraph(
  graph: CodeGraph,
  moduleId: string,
  depth: number,
  index?: GraphReadIndex
): ImpactResult {
  const module = index?.moduleById.get(moduleId)
    ?? graph.modules.find((candidate) => candidate.id === moduleId);
  const shared = module
    ? analyzeImpactInGraph(graph, { kind: 'file', filePath: module.path, depth }, index)
    : createEmptyImpactResult(
      { kind: 'file', filePath: moduleId, depth },
      graph.graphStatus ?? 'complete',
      {
        status: 'not_found',
        confidence: 'unavailable',
        error: {
          code: 'FILE_NOT_FOUND',
          message: `Module "${moduleId}" not found in the persisted graph.`,
        },
      }
    );

  return {
    ...shared,
    rootModule: moduleId,
    affectedModules: [...shared.direct, ...shared.transitiveLayers.flatMap((layer) => layer.nodes)]
      .map((node) => graph.modules.find((candidate) => candidate.id === node.id))
      .filter((candidate): candidate is Module => Boolean(candidate))
      .map((candidate) => ({ ...candidate })),
    depth,
  };
}

export function calculateSymbolImpactInGraph(
  graph: CodeGraph,
  symbolId: string,
  depth: number,
  limit: number,
  index?: GraphReadIndex
): SymbolImpactResult {
  const rootSymbol = index?.symbolById.get(symbolId)
    ?? graph.symbols.find(symbol => symbol.id === symbolId);
  if (!rootSymbol) {
    throw new Error(`Symbol ${symbolId} not found`);
  }
  const shared = analyzeImpactInGraph(graph, {
    kind: 'symbol',
    symbol: rootSymbol.name,
    filePath: rootSymbol.location.file,
    depth,
    limit,
  }, index);
  const flattenedNodes = [
    ...shared.direct,
    ...shared.transitiveLayers.flatMap((layer) => layer.nodes),
  ];

  return {
    ...shared,
    rootSymbol: { ...rootSymbol },
    affectedSymbols: flattenedNodes
      .map((node) => graph.symbols.find((candidate) => candidate.id === node.id))
      .filter((candidate): candidate is Symbol => Boolean(candidate))
      .map((candidate, index) => {
        const flattenedNode = flattenedNodes[index];
        return toSymbolImpactNode(candidate, flattenedNode.depth, flattenedNode.path);
      }),
    depth,
    limit,
    truncated: shared.truncated,
  };
}

export function getProjectStatisticsFromGraph(graph: CodeGraph): ProjectStatistics {
  const totalLines = graph.modules.reduce((sum, module) => sum + module.stats.lines, 0);

  return {
    totalModules: graph.modules.length,
    totalSymbols: graph.symbols.length,
    totalDependencies: graph.dependencies.length,
    totalLines,
    averageComplexity: 0,
  };
}
