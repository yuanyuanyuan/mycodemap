// [META] since:2026-04-16 | owner:cli-team | stable:false
// [WHY] Centralize calibrated contract-gate thresholds so diff-scope, scripts, and CI use one truth

import {
  DEFAULT_GOVERNANCE_GRAPH_PERF_THRESHOLDS,
  GOVERNANCE_GRAPH_MAX_FILES,
  GOVERNANCE_GRAPH_MAX_LOAD_MS,
  GOVERNANCE_GRAPH_MAX_RSS_MB,
} from '../infrastructure/storage/sqlite/perf-thresholds.js';

export const CONTRACT_GATE_MAX_CHANGED_FILES_FOR_HARD_GATE = 10;
export const CONTRACT_GATE_MAX_FALSE_POSITIVE_RATE = 0.10;

export const CONTRACT_GATE_PERF_BUDGET = Object.freeze({
  maxFiles: GOVERNANCE_GRAPH_MAX_FILES,
  maxLoadMs: GOVERNANCE_GRAPH_MAX_LOAD_MS,
  maxRssMb: GOVERNANCE_GRAPH_MAX_RSS_MB,
});

export const DEFAULT_CONTRACT_GATE_THRESHOLDS = Object.freeze({
  maxChangedFilesForHardGate: CONTRACT_GATE_MAX_CHANGED_FILES_FOR_HARD_GATE,
  maxFalsePositiveRate: CONTRACT_GATE_MAX_FALSE_POSITIVE_RATE,
  perfBudget: DEFAULT_GOVERNANCE_GRAPH_PERF_THRESHOLDS,
});

export function isWithinContractGateHardGateWindow(
  changedFileCount: number,
  maxChangedFiles: number = CONTRACT_GATE_MAX_CHANGED_FILES_FOR_HARD_GATE,
): boolean {
  return changedFileCount <= maxChangedFiles;
}
