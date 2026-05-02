// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] Defines the canonical Project Environment Contract schema shared by init, discovery, filtering, and checks.

export type ContractCategory = 'execution' | 'commit' | 'retrieval' | 'validation' | 'style';
export type ContractSeverity = 'critical' | 'high' | 'medium' | 'low';
export type SourceAuthority = 'executable' | 'governance' | 'generated' | 'example';
export type AgentType = 'explore' | 'plan' | 'edit' | 'worker' | 'review' | 'verify' | 'default';

export const CONTRACT_CATEGORIES: readonly ContractCategory[] = [
  'execution',
  'commit',
  'retrieval',
  'validation',
  'style',
];

export const CONTRACT_SEVERITIES: readonly ContractSeverity[] = [
  'critical',
  'high',
  'medium',
  'low',
];

export const SOURCE_AUTHORITIES: readonly SourceAuthority[] = [
  'executable',
  'governance',
  'generated',
  'example',
];

export interface ContractSource {
  file: string;
  line?: number;
  hash: string;
  authority: SourceAuthority;
}

export interface ContractItem {
  id: string;
  category: ContractCategory;
  severity: ContractSeverity;
  content: string;
  metadata?: Record<string, unknown>;
  sources: ContractSource[];
}

export interface ContractConflict {
  id: string;
  severity: ContractSeverity;
  description: string;
  sources: Array<{ file: string; value: string }>;
  recommendation: string;
}

export interface ProjectEnvironmentContract {
  schemaVersion: 'env-contract.v1';
  generatedAt: string;
  projectProfile: {
    name: string;
    source: string;
    confidence: 'high' | 'medium' | 'low' | 'none';
  };
  items: ContractItem[];
  conflicts: ContractConflict[];
  sourceSnapshots: Array<{ file: string; hash: string; lastModified: string }>;
}
