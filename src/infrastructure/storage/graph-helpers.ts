// [META] since:2026-03-24 | owner:architecture-team | stable:false
// [WHY] Share CodeGraph clone/query/analysis helpers across storage backends to keep contract behavior consistent

import type {
  Cycle,
  GraphMetadata,
  ImpactResult,
  ProjectStatistics,
  SymbolImpactResult,
} from '../../interface/types/storage.js';
import type {
  CodeGraph,
  Module,
  Symbol,
  Dependency,
} from '../../interface/types/index.js';

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

export function findDependenciesInGraph(graph: CodeGraph, moduleId: string): Dependency[] {
  return graph.dependencies
    .filter(dependency => dependency.sourceId === moduleId)
    .map(dependency => ({ ...dependency }));
}

export function findDependentsInGraph(graph: CodeGraph, moduleId: string): Dependency[] {
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
  depth: number
): ImpactResult {
  const affectedModules: Module[] = [];
  const visited = new Set<string>();
  const queue: Array<{ id: string; level: number }> = [{ id: moduleId, level: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const { id, level } = current;

    if (visited.has(id) || level > depth) {
      continue;
    }

    visited.add(id);

    if (level > 0) {
      const module = graph.modules.find(candidate => candidate.id === id);
      if (module) {
        affectedModules.push({ ...module });
      }
    }

    for (const dependency of graph.dependencies) {
      if (dependency.targetId === id && !visited.has(dependency.sourceId)) {
        queue.push({ id: dependency.sourceId, level: level + 1 });
      }
    }
  }

  return {
    rootModule: moduleId,
    affectedModules,
    depth,
  };
}

export function calculateSymbolImpactInGraph(
  graph: CodeGraph,
  symbolId: string,
  depth: number,
  limit: number
): SymbolImpactResult {
  const rootSymbol = graph.symbols.find(symbol => symbol.id === symbolId);
  if (!rootSymbol) {
    throw new Error(`Symbol ${symbolId} not found`);
  }

  const symbolMap = new Map(
    graph.symbols.map(symbol => [symbol.id, symbol] as const)
  );
  const callerMap = new Map<string, Dependency[]>();

  for (const dependency of graph.dependencies) {
    if (
      dependency.type !== 'call'
      || dependency.sourceEntityType !== 'symbol'
      || dependency.targetEntityType !== 'symbol'
    ) {
      continue;
    }

    const existing = callerMap.get(dependency.targetId) ?? [];
    existing.push(dependency);
    callerMap.set(dependency.targetId, existing);
  }

  const affectedSymbols: SymbolImpactResult['affectedSymbols'] = [];
  const visited = new Set<string>([symbolId]);
  const queue: Array<{ id: string; level: number; path: string[] }> = [{
    id: symbolId,
    level: 0,
    path: [symbolId],
  }];
  let truncated = false;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    if (current.level >= depth) {
      continue;
    }

    const callers = callerMap.get(current.id) ?? [];
    for (const dependency of callers) {
      if (affectedSymbols.length >= limit) {
        truncated = true;
        queue.length = 0;
        break;
      }

      const callerId = dependency.sourceId;
      if (visited.has(callerId)) {
        continue;
      }

      const callerSymbol = symbolMap.get(callerId);
      if (!callerSymbol) {
        continue;
      }

      visited.add(callerId);
      const nextPath = [...current.path, callerId];
      const nextLevel = current.level + 1;

      affectedSymbols.push({
        symbol: { ...callerSymbol },
        depth: nextLevel,
        path: nextPath,
      });

      queue.push({
        id: callerId,
        level: nextLevel,
        path: nextPath,
      });
    }
  }

  return {
    rootSymbol: { ...rootSymbol },
    affectedSymbols,
    depth,
    limit,
    truncated,
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
