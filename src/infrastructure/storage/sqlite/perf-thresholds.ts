// [META] since:2026-04 | owner:architecture-team | stable:false
// [WHY] Explicit governance graph eager-cache thresholds keep fallback behavior honest and testable

export type GovernanceGraphCacheMode = 'memory-eager' | 'sqlite-direct';

export interface GovernanceGraphPerfThresholds {
  readonly maxFiles: number;
  readonly maxLoadMs: number;
  readonly maxRssMb: number;
}

export interface GovernanceGraphRuntimeStats {
  readonly cacheMode: GovernanceGraphCacheMode;
  readonly thresholds: GovernanceGraphPerfThresholds;
  readonly moduleCount: number;
  readonly dependencyCount: number;
  readonly loadMs: number;
  readonly rssDeltaMb: number;
  readonly warning?: string;
}

export const GOVERNANCE_GRAPH_MAX_FILES = 10_000;
export const GOVERNANCE_GRAPH_MAX_LOAD_MS = 1_000;
export const GOVERNANCE_GRAPH_MAX_RSS_MB = 200;

export const DEFAULT_GOVERNANCE_GRAPH_PERF_THRESHOLDS: GovernanceGraphPerfThresholds = Object.freeze({
  maxFiles: GOVERNANCE_GRAPH_MAX_FILES,
  maxLoadMs: GOVERNANCE_GRAPH_MAX_LOAD_MS,
  maxRssMb: GOVERNANCE_GRAPH_MAX_RSS_MB,
});

export function createGovernanceGraphRuntimeStats(
  overrides: Partial<GovernanceGraphRuntimeStats> & {
    cacheMode: GovernanceGraphCacheMode;
    thresholds?: GovernanceGraphPerfThresholds;
  }
): GovernanceGraphRuntimeStats {
  return {
    cacheMode: overrides.cacheMode,
    thresholds: overrides.thresholds ?? DEFAULT_GOVERNANCE_GRAPH_PERF_THRESHOLDS,
    moduleCount: overrides.moduleCount ?? 0,
    dependencyCount: overrides.dependencyCount ?? 0,
    loadMs: overrides.loadMs ?? 0,
    rssDeltaMb: overrides.rssDeltaMb ?? 0,
    warning: overrides.warning,
  };
}

export function bytesToMb(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}
