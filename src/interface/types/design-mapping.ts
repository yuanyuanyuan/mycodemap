// [META] since:2026-03-25 | owner:architecture-team | stable:false
// [WHY] Define the formal design-to-code mapping contract shared by CLI mapping and future handoff flows

import type {
  DesignContractDiagnosticCode,
  DesignContractSectionId,
} from './design-contract.js';

export type DesignMappingCandidateKind = 'file' | 'module' | 'symbol';

export type DesignMappingEvidenceType =
  | 'path-anchor'
  | 'module-anchor'
  | 'symbol-anchor'
  | 'keyword-match'
  | 'analyze-find'
  | 'filesystem-match'
  | 'dependency-link'
  | 'impact-read';

export type DesignMappingRiskLevel = 'high' | 'medium' | 'low';

export type DesignMappingDiagnosticSeverity = 'error' | 'warning' | 'info';

export type DesignMappingDiagnosticCode =
  | DesignContractDiagnosticCode
  | 'invalid-design-contract'
  | 'no-candidates'
  | 'over-broad-scope'
  | 'high-risk-scope';

export interface DesignMappingConfidence {
  score: number;
  level: 'high' | 'medium' | 'low';
}

export interface DesignMappingReason {
  section: DesignContractSectionId;
  matchedText: string;
  evidenceType: DesignMappingEvidenceType;
  detail?: string;
}

export interface DesignMappingCandidate {
  kind: DesignMappingCandidateKind;
  path: string;
  symbolName?: string;
  moduleName?: string;
  reasons: DesignMappingReason[];
  dependencies: string[];
  testImpact: string[];
  risk: DesignMappingRiskLevel;
  confidence: DesignMappingConfidence;
  unknowns: string[];
}

export interface DesignMappingDiagnostic {
  code: DesignMappingDiagnosticCode;
  severity: DesignMappingDiagnosticSeverity;
  blocker: boolean;
  message: string;
  section?: DesignContractSectionId;
  suggestion?: string;
  candidatePaths?: string[];
}

export interface DesignMappingSummary {
  candidateCount: number;
  blocked: boolean;
  unknownCount: number;
  diagnosticCount: number;
}

export interface DesignMappingResult {
  ok: boolean;
  filePath: string;
  summary: DesignMappingSummary;
  candidates: DesignMappingCandidate[];
  diagnostics: DesignMappingDiagnostic[];
}
