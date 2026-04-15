// [META] since:2026-03-25 | owner:architecture-team | stable:false
// [WHY] Define the canonical handoff contract shared by design CLI review summaries and machine-readable agent payloads

import type {
  DesignContractDiagnosticCode,
  DesignContractSectionId,
} from './design-contract.js';
import type { DesignMappingDiagnosticCode } from './design-mapping.js';

export type DesignHandoffApprovalStatus = 'approved' | 'needs-review';

export type DesignHandoffDiagnosticSeverity = 'error' | 'warning' | 'info';

export type DesignHandoffDiagnosticCode =
  | DesignContractDiagnosticCode
  | DesignMappingDiagnosticCode
  | 'blocked-mapping'
  | 'review-required';

export type DesignHandoffSourceRef =
  | `design:${DesignContractSectionId}`
  | `candidate:${string}`
  | `diagnostic:${DesignHandoffDiagnosticCode}`;

export interface DesignHandoffTraceItem {
  id: string;
  text: string;
  sourceRefs: DesignHandoffSourceRef[];
}

export interface DesignHandoffApproval extends DesignHandoffTraceItem {
  status: DesignHandoffApprovalStatus;
}

export interface DesignHandoffAssumption extends DesignHandoffTraceItem {}

export interface DesignHandoffOpenQuestion extends DesignHandoffTraceItem {}

export interface DesignHandoffArtifacts {
  stem: string;
  outputDir: string;
  markdownPath: string;
  jsonPath: string;
}

export interface DesignHandoffSummary {
  candidateCount: number;
  touchedFileCount: number;
  supportingFileCount: number;
  testCount: number;
  riskCount: number;
  approvalCount: number;
  assumptionCount: number;
  openQuestionCount: number;
  diagnosticCount: number;
  requiresReview: boolean;
}

export interface DesignHandoffPayload {
  goal: string[];
  constraints: string[];
  acceptanceCriteria: string[];
  nonGoals: string[];
  touchedFiles: string[];
  supportingFiles: string[];
  tests: string[];
  risks: string[];
  validationChecklist: string[];
  approvals: DesignHandoffApproval[];
  assumptions: DesignHandoffAssumption[];
  openQuestions: DesignHandoffOpenQuestion[];
}

export interface DesignHandoffDiagnostic {
  code: DesignHandoffDiagnosticCode;
  severity: DesignHandoffDiagnosticSeverity;
  blocker: boolean;
  message: string;
  sourceRefs: DesignHandoffSourceRef[];
}

export interface DesignHandoffResult {
  ok: boolean;
  filePath: string;
  outputDir: string;
  readyForExecution: boolean;
  artifacts: DesignHandoffArtifacts;
  summary: DesignHandoffSummary;
  handoff: DesignHandoffPayload;
  diagnostics: DesignHandoffDiagnostic[];
}
