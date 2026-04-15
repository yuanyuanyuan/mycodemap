// [META] since:2026-03-26 | owner:architecture-team | stable:false
// [WHY] Define the canonical verification/drift contract shared by design verify CLI and docs guardrails

import type {
  DesignContractDiagnosticCode,
  DesignContractSectionId,
} from './design-contract.js';
import type {
  DesignHandoffDiagnosticCode,
  DesignHandoffSourceRef,
} from './design-handoff.js';
import type { DesignMappingDiagnosticCode } from './design-mapping.js';

export type DesignVerificationStatus =
  | 'satisfied'
  | 'needs-review'
  | 'violated'
  | 'blocked';

export type DesignDriftKind =
  | 'scope-extra'
  | 'acceptance-unverified'
  | 'handoff-missing'
  | 'blocked-input';

export type DesignDriftSeverity = 'error' | 'warning' | 'info';

export type DesignVerificationDiagnosticSeverity = 'error' | 'warning' | 'info';

export type DesignVerificationDiagnosticCode =
  | DesignContractDiagnosticCode
  | DesignMappingDiagnosticCode
  | DesignHandoffDiagnosticCode
  | 'handoff-missing'
  | 'handoff-invalid'
  | 'blocked-input';

export type DesignVerificationEvidenceRef =
  | DesignHandoffSourceRef
  | `design:${DesignContractSectionId}`
  | `diagnostic:${DesignVerificationDiagnosticCode}`
  | `test:${string}`
  | `artifact:${string}`
  | `handoff:${string}`;

export interface DesignVerificationChecklistItem {
  id: string;
  text: string;
  status: DesignVerificationStatus;
  evidenceRefs: DesignVerificationEvidenceRef[];
}

export interface DesignDriftItem {
  kind: DesignDriftKind;
  severity: DesignDriftSeverity;
  message: string;
  sourceRefs: DesignVerificationEvidenceRef[];
}

export interface DesignVerificationSummary {
  checklistCount: number;
  satisfiedCount: number;
  needsReviewCount: number;
  violatedCount: number;
  blockedCount: number;
  driftCount: number;
  diagnosticCount: number;
  reviewRequired: boolean;
  blocked: boolean;
}

export interface DesignVerificationDiagnostic {
  code: DesignVerificationDiagnosticCode;
  severity: DesignVerificationDiagnosticSeverity;
  blocker: boolean;
  message: string;
  sourceRefs: DesignVerificationEvidenceRef[];
}

export interface DesignVerificationResult {
  ok: boolean;
  filePath: string;
  readyForExecution: boolean;
  summary: DesignVerificationSummary;
  checklist: DesignVerificationChecklistItem[];
  drift: DesignDriftItem[];
  diagnostics: DesignVerificationDiagnostic[];
}
