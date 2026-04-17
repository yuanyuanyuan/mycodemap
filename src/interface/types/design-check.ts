// [META] since:2026-04-15 | owner:architecture-team | stable:false
// [WHY] Define the canonical contract-check result types shared by CLI output, CI gate, and diff-aware execution

import type { DesignContractRuleSeverity, DesignContractRuleType } from './design-contract.js';
import type {
  HistoryConfidence,
  HistoryFreshness,
  HistoryRiskLevel,
  HistoryScopeMode,
  HistorySignalStatus,
} from './history-risk.js';

export type ContractScanMode = 'full' | 'diff';

export interface ContractCheckWarning {
  code: string;
  message: string;
  details?: Record<string, string | number | boolean | null>;
}

export interface ContractViolationRisk {
  status: HistorySignalStatus;
  level: HistoryRiskLevel;
  confidence: HistoryConfidence;
  freshness: HistoryFreshness;
  score: number | null;
  factors: string[];
  analyzed_at: string | null;
}

export interface ContractCheckHistoryMetadata {
  status: HistorySignalStatus;
  confidence: HistoryConfidence;
  freshness: HistoryFreshness;
  scope_mode: HistoryScopeMode;
  enriched_file_count: number;
  unavailable_count: number;
  stale_count: number;
  low_confidence_count: number;
  requires_precompute: boolean;
}

export type ContractViolationDiagnosticScope = 'line' | 'file' | 'general';

export type ContractViolationDiagnosticSource = 'dependency-cruiser' | 'custom-evaluator';

export type ContractViolationDiagnosticCategory = 'dependency' | 'module_boundary' | 'complexity';

export interface ContractViolationDiagnostic {
  file?: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  scope: ContractViolationDiagnosticScope;
  source: ContractViolationDiagnosticSource;
  category: ContractViolationDiagnosticCategory;
  degraded: boolean;
}

export interface ContractViolation {
  rule: string;
  rule_type: DesignContractRuleType;
  severity: DesignContractRuleSeverity;
  location: string;
  message: string;
  dependency_chain: string[];
  hard_fail: boolean;
  diagnostic?: ContractViolationDiagnostic;
  risk?: ContractViolationRisk;
}

export interface ContractCheckSummary {
  total_violations: number;
  error_count: number;
  warn_count: number;
  scanned_file_count: number;
  rule_count: number;
}

export interface ContractCheckResult {
  passed: boolean;
  scan_mode: ContractScanMode;
  contract_path: string;
  against_path: string;
  changed_files: string[];
  scanned_files: string[];
  warnings: ContractCheckWarning[];
  violations: ContractViolation[];
  summary: ContractCheckSummary;
  history?: ContractCheckHistoryMetadata;
}
