// [META] since:2026-04 | owner:architecture-team | stable:false
// [WHY] Threshold-gated governance graph cache keeps SQLite as truth source while accelerating small/medium impact queries

import type {
  Cycle,
  ImpactResult,
} from '../../../interface/types/storage.js';
import type {
  CodeGraph,
  Dependency,
  Module,
} from '../../../interface/types/index.js';
import {
  calculateImpactInGraph,
  createEmptyCodeGraph,
  detectCyclesInGraph,
  findDependenciesInGraph,
  findDependentsInGraph,
} from '../graph-helpers.js';
import {
  bytesToMb,
  createGovernanceGraphRuntimeStats,
  DEFAULT_GOVERNANCE_GRAPH_PERF_THRESHOLDS,
  type GovernanceGraphPerfThresholds,
  type GovernanceGraphRuntimeStats,
} from './perf-thresholds.js';

interface GovernanceGraphStatementLike {
  get: (...params: unknown[]) => Record<string, unknown> | undefined;
  all: (...params: unknown[]) => Array<Record<string, unknown>>;
}

export interface GovernanceGraphDatabaseLike {
  prepare: (sql: string) => GovernanceGraphStatementLike;
}

function toStringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toNumberValue(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : Number(value ?? fallback);
}

function toDateValue(value: unknown, fallback: Date): Date {
  const candidate = value instanceof Date
    ? value
    : new Date(toStringValue(value, fallback.toISOString()));

  return Number.isNaN(candidate.getTime()) ? fallback : candidate;
}

export function readGovernanceGraphFromSQLite(
  database: GovernanceGraphDatabaseLike,
  projectPath: string
): CodeGraph {
  const fallbackDate = new Date();
  const projectRow = database
    .prepare(`
      SELECT id, name, root_path, created_at, updated_at
      FROM projects
      LIMIT 1
    `)
    .get();

  if (!projectRow) {
    return createEmptyCodeGraph(projectPath);
  }

  const modules = database
    .prepare(`
      SELECT id, project_id, path, language, lines, code_lines, comment_lines, blank_lines
      FROM modules
      ORDER BY path, id
    `)
    .all()
    .map((row): Module => ({
      id: toStringValue(row.id),
      projectId: toStringValue(row.project_id),
      path: toStringValue(row.path),
      language: toStringValue(row.language),
      stats: {
        lines: toNumberValue(row.lines),
        codeLines: toNumberValue(row.code_lines),
        commentLines: toNumberValue(row.comment_lines),
        blankLines: toNumberValue(row.blank_lines),
      },
    }));
  const dependencies = database
    .prepare(`
      SELECT id, source_id, target_id, dependency_type
      FROM dependencies
      ORDER BY id
    `)
    .all()
    .map((row): Dependency => ({
      id: toStringValue(row.id),
      sourceId: toStringValue(row.source_id),
      targetId: toStringValue(row.target_id),
      type: toStringValue(row.dependency_type) as Dependency['type'],
    }));

  return {
    project: {
      id: toStringValue(projectRow.id),
      name: toStringValue(projectRow.name),
      rootPath: toStringValue(projectRow.root_path, projectPath),
      createdAt: toDateValue(projectRow.created_at, fallbackDate),
      updatedAt: toDateValue(projectRow.updated_at, fallbackDate),
    },
    modules,
    symbols: [],
    dependencies,
  };
}

function readGovernanceGraphCounts(database: GovernanceGraphDatabaseLike): {
  moduleCount: number;
  dependencyCount: number;
} {
  const row = database
    .prepare(`
      SELECT
        (SELECT COUNT(*) FROM modules) AS module_count,
        (SELECT COUNT(*) FROM dependencies) AS dependency_count
    `)
    .get();

  return {
    moduleCount: toNumberValue(row?.module_count),
    dependencyCount: toNumberValue(row?.dependency_count),
  };
}

export class GovernanceGraphCache {
  private graph: CodeGraph | null = null;

  private stats: GovernanceGraphRuntimeStats = createGovernanceGraphRuntimeStats({
    cacheMode: 'sqlite-direct',
    warning: 'governance graph cache not initialized',
  });

  constructor(
    private readonly database: GovernanceGraphDatabaseLike,
    private readonly projectPath: string,
    private readonly thresholds: GovernanceGraphPerfThresholds = DEFAULT_GOVERNANCE_GRAPH_PERF_THRESHOLDS
  ) {}

  hydrate(): void {
    const rssBefore = process.memoryUsage().rss;
    const startedAt = performance.now();

    try {
      const { moduleCount, dependencyCount } = readGovernanceGraphCounts(this.database);
      if (moduleCount > this.thresholds.maxFiles) {
        const loadMs = performance.now() - startedAt;
        this.graph = null;
        this.stats = createGovernanceGraphRuntimeStats({
          cacheMode: 'sqlite-direct',
          thresholds: this.thresholds,
          moduleCount,
          dependencyCount,
          loadMs,
          rssDeltaMb: bytesToMb(Math.max(process.memoryUsage().rss - rssBefore, 0)),
          warning: `governance graph cache disabled: module count ${moduleCount} exceeds maxFiles=${this.thresholds.maxFiles}`,
        });
        return;
      }

      const graph = readGovernanceGraphFromSQLite(this.database, this.projectPath);
      const loadMs = performance.now() - startedAt;
      const rssDeltaMb = bytesToMb(Math.max(process.memoryUsage().rss - rssBefore, 0));

      if (loadMs > this.thresholds.maxLoadMs) {
        this.graph = null;
        this.stats = createGovernanceGraphRuntimeStats({
          cacheMode: 'sqlite-direct',
          thresholds: this.thresholds,
          moduleCount,
          dependencyCount,
          loadMs,
          rssDeltaMb,
          warning: `governance graph cache disabled: load time ${loadMs.toFixed(2)}ms exceeds maxLoadMs=${this.thresholds.maxLoadMs}`,
        });
        return;
      }

      if (rssDeltaMb > this.thresholds.maxRssMb) {
        this.graph = null;
        this.stats = createGovernanceGraphRuntimeStats({
          cacheMode: 'sqlite-direct',
          thresholds: this.thresholds,
          moduleCount,
          dependencyCount,
          loadMs,
          rssDeltaMb,
          warning: `governance graph cache disabled: rss delta ${rssDeltaMb.toFixed(2)}MB exceeds maxRssMb=${this.thresholds.maxRssMb}`,
        });
        return;
      }

      this.graph = graph;
      this.stats = createGovernanceGraphRuntimeStats({
        cacheMode: 'memory-eager',
        thresholds: this.thresholds,
        moduleCount,
        dependencyCount,
        loadMs,
        rssDeltaMb,
      });
    } catch (error) {
      const loadMs = performance.now() - startedAt;
      const rssDeltaMb = bytesToMb(Math.max(process.memoryUsage().rss - rssBefore, 0));
      const warning = error instanceof Error ? error.message : String(error);
      this.graph = null;
      this.stats = createGovernanceGraphRuntimeStats({
        cacheMode: 'sqlite-direct',
        thresholds: this.thresholds,
        loadMs,
        rssDeltaMb,
        warning: `governance graph cache disabled: ${warning}`,
      });
    }
  }

  getStats(): GovernanceGraphRuntimeStats {
    return createGovernanceGraphRuntimeStats(this.stats);
  }

  findDependencies(moduleId: string): Dependency[] | null {
    if (!this.graph) {
      return null;
    }

    return findDependenciesInGraph(this.graph, moduleId);
  }

  findDependents(moduleId: string): Dependency[] | null {
    if (!this.graph) {
      return null;
    }

    return findDependentsInGraph(this.graph, moduleId);
  }

  detectCycles(): Cycle[] | null {
    if (!this.graph) {
      return null;
    }

    return detectCyclesInGraph(this.graph);
  }

  calculateImpact(moduleId: string, depth: number): ImpactResult | null {
    if (!this.graph) {
      return null;
    }

    return calculateImpactInGraph(this.graph, moduleId, depth);
  }
}
