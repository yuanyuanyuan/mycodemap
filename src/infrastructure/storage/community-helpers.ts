// [META] since:2026-05-09 | owner:architecture-team | stable:false
// [WHY] Keep persisted-graph community detection truth shared across MCP and future surfaces

import { UndirectedGraph } from 'graphology';
import louvain from 'graphology-communities-louvain';
import { relative } from 'node:path';
import type {
  CommunityCluster,
  CommunitySummary,
  GraphMetadata,
  SharedCommunityResult,
} from '../../interface/types/storage.js';
import type { CodeGraph, Dependency, Module } from '../../interface/types/index.js';

const COMMUNITY_EDGE_WEIGHTS: Record<Dependency['type'], number> = {
  call: 1,
  inherit: 0.8,
  implement: 0.7,
  import: 0.7,
  'type-ref': 0.6,
};

interface AggregatedProjectionEdge {
  sourceId: string;
  targetId: string;
  weight: number;
  kinds: Map<Dependency['type'], number>;
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/gu, '/');
}

function toDisplayPath(projectRoot: string, filePath: string): string {
  const normalizedProjectRoot = normalizePath(projectRoot);
  const normalizedFilePath = normalizePath(filePath);
  if (
    normalizedProjectRoot
    && (normalizedFilePath === normalizedProjectRoot || normalizedFilePath.startsWith(`${normalizedProjectRoot}/`))
  ) {
    const relativePath = normalizePath(relative(projectRoot, filePath));
    return relativePath || normalizedFilePath;
  }

  return normalizedFilePath;
}

function createEmptySummary(): CommunitySummary {
  return {
    totalModules: 0,
    totalEdges: 0,
    communityCount: 0,
    singletonCount: 0,
    modularity: 0,
    largestCommunitySize: 0,
    largestCommunityRatio: 0,
  };
}

function createMissingGraphResult(): SharedCommunityResult {
  return {
    status: 'unavailable',
    confidence: 'unavailable',
    graphStatus: 'missing',
    summary: createEmptySummary(),
    communities: [],
    warnings: [],
    remediation: 'Run `mycodemap generate --symbol-level` to rebuild graph truth before querying communities.',
    error: {
      code: 'GRAPH_NOT_FOUND',
      message: 'Code graph not found. Run `mycodemap generate --symbol-level` first.',
    },
  };
}

function resolveModuleId(
  dependencyId: string,
  entityType: Dependency['sourceEntityType'] | Dependency['targetEntityType'] | undefined,
  symbolToModuleId: Map<string, string>
): string | null {
  if (entityType === 'symbol') {
    return symbolToModuleId.get(dependencyId) ?? null;
  }

  return dependencyId;
}

function buildProjection(graph: CodeGraph): {
  moduleById: Map<string, Module>;
  edges: AggregatedProjectionEdge[];
  projectedEdgeCount: number;
} {
  const moduleById = new Map(graph.modules.map((module) => [module.id, module] as const));
  const symbolToModuleId = new Map(graph.symbols.map((symbol) => [symbol.id, symbol.moduleId] as const));
  const aggregated = new Map<string, AggregatedProjectionEdge>();

  for (const dependency of graph.dependencies) {
    const weight = COMMUNITY_EDGE_WEIGHTS[dependency.type];
    if (weight === undefined) {
      continue;
    }

    const sourceModuleId = resolveModuleId(
      dependency.sourceId,
      dependency.sourceEntityType,
      symbolToModuleId
    );
    const targetModuleId = resolveModuleId(
      dependency.targetId,
      dependency.targetEntityType,
      symbolToModuleId
    );

    if (!sourceModuleId || !targetModuleId || sourceModuleId === targetModuleId) {
      continue;
    }

    const sourceModule = moduleById.get(sourceModuleId);
    const targetModule = moduleById.get(targetModuleId);
    if (!sourceModule || !targetModule) {
      continue;
    }

    const [leftId, rightId] = sourceModuleId < targetModuleId
      ? [sourceModuleId, targetModuleId]
      : [targetModuleId, sourceModuleId];
    const key = `${leftId}::${rightId}`;
    const existing = aggregated.get(key);

    if (existing) {
      existing.weight += weight;
      existing.kinds.set(dependency.type, (existing.kinds.get(dependency.type) ?? 0) + weight);
      continue;
    }

    aggregated.set(key, {
      sourceId: leftId,
      targetId: rightId,
      weight,
      kinds: new Map([[dependency.type, weight]]),
    });
  }

  return {
    moduleById,
    edges: Array.from(aggregated.values()),
    projectedEdgeCount: aggregated.size,
  };
}

function buildLabel(modulePaths: string[], ordinal: number): string {
  const splitDirs = modulePaths
    .map(path => normalizePath(path).split('/').slice(0, -1))
    .filter(parts => parts.length > 0);

  if (splitDirs.length === 0) {
    return `community-${ordinal}`;
  }

  const shortest = Math.min(...splitDirs.map(parts => parts.length));
  const prefix: string[] = [];
  for (let index = 0; index < shortest; index += 1) {
    const candidate = splitDirs[0][index];
    if (splitDirs.every(parts => parts[index] === candidate)) {
      prefix.push(candidate);
      continue;
    }
    break;
  }

  if (prefix.length >= 2) {
    return prefix.join('/');
  }

  const dirCounts = new Map<string, number>();
  for (const dirs of splitDirs) {
    for (let index = dirs.length; index >= 2; index -= 1) {
      const candidate = dirs.slice(0, index).join('/');
      dirCounts.set(candidate, (dirCounts.get(candidate) ?? 0) + 1);
    }
  }

  const majorityCandidate = Array.from(dirCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1] || right[0].length - left[0].length || left[0].localeCompare(right[0]))
    .at(0)?.[0];

  if (majorityCandidate) {
    return majorityCandidate;
  }

  const commonParent = splitDirs[0].at(-1);
  if (modulePaths.length === 1 && commonParent) {
    return commonParent;
  }

  return `community-${ordinal}`;
}

function getDominantEdgeKinds(
  moduleIds: Set<string>,
  edges: AggregatedProjectionEdge[]
): CommunityCluster['dominantEdgeKinds'] {
  const internalKinds = new Map<Dependency['type'], number>();

  for (const edge of edges) {
    if (!moduleIds.has(edge.sourceId) || !moduleIds.has(edge.targetId)) {
      continue;
    }

    for (const [kind, weight] of edge.kinds) {
      internalKinds.set(kind, (internalKinds.get(kind) ?? 0) + weight);
    }
  }

  return Array.from(internalKinds.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([kind]) => kind);
}

function calculateCohesion(moduleIds: Set<string>, edges: AggregatedProjectionEdge[]): number {
  let internalWeight = 0;
  let boundaryWeight = 0;

  for (const edge of edges) {
    const sourceInside = moduleIds.has(edge.sourceId);
    const targetInside = moduleIds.has(edge.targetId);

    if (sourceInside && targetInside) {
      internalWeight += edge.weight;
    } else if (sourceInside || targetInside) {
      boundaryWeight += edge.weight;
    }
  }

  if (internalWeight === 0 && boundaryWeight === 0) {
    return 0;
  }

  return Number((internalWeight / (internalWeight + boundaryWeight)).toFixed(3));
}

function buildCommunities(
  communityAssignments: Record<string, number>,
  moduleById: Map<string, Module>,
  edges: AggregatedProjectionEdge[],
  projectRoot: string
): CommunityCluster[] {
  const grouped = new Map<number, Module[]>();

  for (const [moduleId, communityId] of Object.entries(communityAssignments)) {
    const module = moduleById.get(moduleId);
    if (!module) {
      continue;
    }

    const bucket = grouped.get(communityId) ?? [];
    bucket.push(module);
    grouped.set(communityId, bucket);
  }

  return Array.from(grouped.entries())
    .sort((left, right) => right[1].length - left[1].length || left[0] - right[0])
    .map(([communityId, modules], index) => {
      const orderedModules = [...modules].sort((left, right) => left.path.localeCompare(right.path));
      const moduleIds = orderedModules.map(module => module.id);
      const modulePaths = orderedModules.map(module => toDisplayPath(projectRoot, module.path));
      const memberSet = new Set(moduleIds);

      return {
        id: `community-${communityId}`,
        label: buildLabel(modulePaths, index + 1),
        moduleIds,
        modulePaths,
        size: orderedModules.length,
        topPaths: modulePaths.slice(0, 5),
        dominantEdgeKinds: getDominantEdgeKinds(memberSet, edges),
        cohesion: calculateCohesion(memberSet, edges),
      };
    })
    .sort((left, right) => right.size - left.size || left.label.localeCompare(right.label));
}

function buildWarnings(
  graphStatus: SharedCommunityResult['graphStatus'],
  summary: CommunitySummary
): SharedCommunityResult['warnings'] {
  const warnings: SharedCommunityResult['warnings'] = [];

  if (graphStatus === 'partial') {
    warnings.push({
      code: 'GRAPH_PARTIAL',
      message: 'Graph truth is partial; parse failures may hide community boundaries.',
    });
  }

  const moduleCount = summary.totalModules;
  const density = moduleCount > 1
    ? summary.totalEdges / ((moduleCount * (moduleCount - 1)) / 2)
    : 0;

  if (moduleCount > 1 && (summary.totalEdges <= 1 || density < 0.15)) {
    warnings.push({
      code: 'LOW_SIGNAL_SPARSE_GRAPH',
      message: 'Projected graph is sparse; community boundaries are weak and may be unstable.',
    });
  }

  if (moduleCount >= 3 && summary.singletonCount / moduleCount >= 0.5) {
    warnings.push({
      code: 'LOW_SIGNAL_SINGLETON_HEAVY',
      message: 'Most modules are isolated singletons; the partition has low structural signal.',
    });
  }

  if (
    moduleCount >= 4
    && summary.communityCount <= 2
    && summary.largestCommunityRatio >= 0.8
  ) {
    warnings.push({
      code: 'LOW_SIGNAL_DOMINANT_SINGLE_CLUSTER',
      message: 'One dominant community absorbs most modules; boundaries are likely low-signal.',
    });
  }

  return warnings;
}

export function analyzeCommunitiesInGraph(
  graph: CodeGraph,
  metadata?: GraphMetadata
): SharedCommunityResult {
  if (graph.modules.length === 0 && graph.symbols.length === 0) {
    return createMissingGraphResult();
  }

  const graphStatus = metadata?.generatedAt
    ? metadata.graphStatus
    : (graph.graphStatus ?? 'complete');
  const { moduleById, edges, projectedEdgeCount } = buildProjection(graph);
  const projected = new UndirectedGraph();

  for (const module of graph.modules) {
    projected.addNode(module.id, { path: toDisplayPath(graph.project.rootPath, module.path) });
  }

  for (const edge of edges) {
    projected.addUndirectedEdgeWithKey(edge.sourceId + '::' + edge.targetId, edge.sourceId, edge.targetId, {
      weight: edge.weight,
    });
  }

  const details = louvain.detailed(projected, {
    getEdgeWeight: 'weight',
    randomWalk: false,
  });
  const communities = buildCommunities(
    details.communities as Record<string, number>,
    moduleById,
    edges,
    graph.project.rootPath
  );
  const largestCommunitySize = communities[0]?.size ?? 0;
  const summary: CommunitySummary = {
    totalModules: graph.modules.length,
    totalEdges: projectedEdgeCount,
    communityCount: communities.length,
    singletonCount: communities.filter(community => community.size === 1).length,
    modularity: Number((details.modularity ?? 0).toFixed(6)),
    largestCommunitySize,
    largestCommunityRatio: graph.modules.length > 0
      ? Number((largestCommunitySize / graph.modules.length).toFixed(3))
      : 0,
  };
  const warnings = buildWarnings(graphStatus, summary);

  return {
    status: 'ok',
    confidence: warnings.length > 0 ? 'reduced' : 'high',
    graphStatus,
    summary,
    communities,
    warnings,
  };
}
