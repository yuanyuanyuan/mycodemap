// [META] since:2026-03-25 | owner:cli-team | stable:false
// [WHY] Build canonical design handoff artifacts from validated design contracts and design-to-code mapping truth

import path from 'node:path';
import { cwd } from 'node:process';
import { hasBlockingDesignContractDiagnostics, loadDesignContract } from './design-contract-loader.js';
import { resolveOutputDir } from './paths.js';
import { resolveDesignScope } from './design-scope-resolver.js';
import type {
  DesignContractDiagnostic,
  DesignContractSection,
  DesignContractSectionId,
  DesignHandoffApproval,
  DesignHandoffArtifacts,
  DesignHandoffAssumption,
  DesignHandoffDiagnostic,
  DesignHandoffOpenQuestion,
  DesignHandoffPayload,
  DesignHandoffResult,
  DesignHandoffSourceRef,
  DesignMappingCandidate,
  DesignMappingDiagnostic,
} from '../interface/types/index.js';

export interface ResolveDesignHandoffArtifactsOptions {
  filePath: string;
  outputDir?: string;
  rootDir?: string;
}

export interface BuildDesignHandoffOptions {
  filePath?: string;
  outputDir?: string;
  rootDir?: string;
}

const REQUIRED_APPROVAL_SECTIONS: readonly DesignContractSectionId[] = [
  'goal',
  'constraints',
  'acceptanceCriteria',
  'nonGoals',
];

function uniq<T>(items: readonly T[]): T[] {
  return Array.from(new Set(items));
}

function normalizeItemText(line: string): string {
  return line
    .trim()
    .replace(/^[-*+]\s+\[[ xX]\]\s*/u, '')
    .replace(/^[-*+]\s+/u, '')
    .replace(/^\d+\.\s+/u, '')
    .trim();
}

function toSectionItems(section?: DesignContractSection): string[] {
  return (section?.content ?? [])
    .map(normalizeItemText)
    .filter((item) => item.length > 0);
}

function toHandoffStem(filePath: string): string {
  const baseName = path.basename(filePath);
  if (baseName.endsWith('.design.md')) {
    return baseName.slice(0, -'.design.md'.length);
  }

  return path.parse(baseName).name;
}

function toSourceRefs(items: readonly DesignHandoffSourceRef[]): DesignHandoffSourceRef[] {
  return uniq(items).filter((item) => item.length > 0);
}

function toSectionRef(sectionId: DesignContractSectionId): DesignHandoffSourceRef {
  return `design:${sectionId}`;
}

function toCandidateRef(candidatePath: string): DesignHandoffSourceRef {
  return `candidate:${candidatePath}`;
}

function toDiagnosticRef(code: DesignHandoffDiagnostic['code']): DesignHandoffSourceRef {
  return `diagnostic:${code}`;
}

function describeApproval(sectionId: DesignContractSectionId): string {
  const labels: Record<DesignContractSectionId, string> = {
    goal: 'Goal',
    constraints: 'Constraints',
    acceptanceCriteria: 'Acceptance Criteria',
    nonGoals: 'Non-Goals',
    context: 'Context',
    openQuestions: 'Open Questions',
    notes: 'Notes',
  };

  return `${labels[sectionId]} 已被纳入 handoff 事实输入`;
}

function createApprovedSectionItems(
  sections: Partial<Record<DesignContractSectionId, DesignContractSection>>,
): DesignHandoffApproval[] {
  return REQUIRED_APPROVAL_SECTIONS
    .filter((sectionId) => sections[sectionId] !== undefined)
    .map((sectionId) => ({
      id: `approved-${sectionId}`,
      status: 'approved',
      text: describeApproval(sectionId),
      sourceRefs: [toSectionRef(sectionId)],
    }));
}

function createAssumptions(candidates: readonly DesignMappingCandidate[]): DesignHandoffAssumption[] {
  return candidates.flatMap((candidate, candidateIndex) =>
    candidate.unknowns.map((unknown, unknownIndex) => ({
      id: `assumption-${candidateIndex + 1}-${unknownIndex + 1}`,
      text: unknown,
      sourceRefs: [toCandidateRef(candidate.path)],
    })));
}

function createOpenQuestions(section?: DesignContractSection): DesignHandoffOpenQuestion[] {
  return toSectionItems(section).map((text, index) => ({
    id: `open-question-${index + 1}`,
    text,
    sourceRefs: [toSectionRef('openQuestions')],
  }));
}

function createReviewGateApproval(
  assumptions: readonly DesignHandoffAssumption[],
  openQuestions: readonly DesignHandoffOpenQuestion[],
): DesignHandoffApproval | undefined {
  if (assumptions.length === 0 && openQuestions.length === 0) {
    return undefined;
  }

  const sourceRefs = toSourceRefs([
    ...assumptions.flatMap((item) => item.sourceRefs),
    ...openQuestions.flatMap((item) => item.sourceRefs),
    toDiagnosticRef('review-required'),
  ]);

  return {
    id: 'human-review-required',
    status: 'needs-review',
    text: '存在 assumptions 或 open questions，需人类确认后再执行。',
    sourceRefs,
  };
}

function contractDiagnosticToHandoff(
  diagnostic: DesignContractDiagnostic,
): DesignHandoffDiagnostic {
  const sourceRefs: DesignHandoffSourceRef[] = [toDiagnosticRef(diagnostic.code)];
  if (diagnostic.section) {
    sourceRefs.push(toSectionRef(diagnostic.section));
  }

  return {
    code: diagnostic.code,
    severity: diagnostic.severity,
    blocker: diagnostic.severity === 'error',
    message: diagnostic.message,
    sourceRefs: toSourceRefs(sourceRefs),
  };
}

function mappingDiagnosticToHandoff(
  diagnostic: DesignMappingDiagnostic,
): DesignHandoffDiagnostic {
  const sourceRefs: DesignHandoffSourceRef[] = [toDiagnosticRef(diagnostic.code)];

  if (diagnostic.section) {
    sourceRefs.push(toSectionRef(diagnostic.section));
  }

  if (diagnostic.candidatePaths) {
    sourceRefs.push(...diagnostic.candidatePaths.map(toCandidateRef));
  }

  return {
    code: diagnostic.code,
    severity: diagnostic.severity,
    blocker: diagnostic.blocker,
    message: diagnostic.message,
    sourceRefs: toSourceRefs(sourceRefs),
  };
}

function createBlockedMappingDiagnostic(
  diagnostics: readonly DesignHandoffDiagnostic[],
): DesignHandoffDiagnostic | undefined {
  const blockerSourceRefs = diagnostics
    .filter((diagnostic) => diagnostic.blocker)
    .flatMap((diagnostic) => diagnostic.sourceRefs);

  if (blockerSourceRefs.length === 0) {
    return undefined;
  }

  return {
    code: 'blocked-mapping',
    severity: 'error',
    blocker: true,
    message: 'Handoff blocked because the design contract did not resolve a safe executable scope.',
    sourceRefs: toSourceRefs([toDiagnosticRef('blocked-mapping'), ...blockerSourceRefs]),
  };
}

function createReviewRequiredDiagnostic(
  approvals: readonly DesignHandoffApproval[],
  assumptions: readonly DesignHandoffAssumption[],
  openQuestions: readonly DesignHandoffOpenQuestion[],
): DesignHandoffDiagnostic | undefined {
  const sourceRefs = toSourceRefs([
    ...approvals.flatMap((item) => item.sourceRefs),
    ...assumptions.flatMap((item) => item.sourceRefs),
    ...openQuestions.flatMap((item) => item.sourceRefs),
    toDiagnosticRef('review-required'),
  ]);

  if (sourceRefs.length === 0) {
    return undefined;
  }

  return {
    code: 'review-required',
    severity: 'warning',
    blocker: false,
    message: 'Handoff generated successfully but still requires human review before execution.',
    sourceRefs,
  };
}

function formatRisk(candidate: DesignMappingCandidate): string {
  const suffix = candidate.unknowns.length > 0
    ? ` (${candidate.unknowns.length} unresolved item${candidate.unknowns.length === 1 ? '' : 's'})`
    : '';
  return `${candidate.path}: ${candidate.risk}${suffix}`;
}

function toSupportingFiles(candidates: readonly DesignMappingCandidate[]): string[] {
  const touchedFiles = new Set(candidates.map((candidate) => candidate.path));
  const testFiles = new Set(candidates.flatMap((candidate) => candidate.testImpact));

  return uniq(candidates.flatMap((candidate) => candidate.dependencies))
    .filter((dependency) => !touchedFiles.has(dependency))
    .filter((dependency) => !testFiles.has(dependency));
}

function createPayload(
  sections: Partial<Record<DesignContractSectionId, DesignContractSection>>,
  candidates: readonly DesignMappingCandidate[],
  approvals: readonly DesignHandoffApproval[],
  assumptions: readonly DesignHandoffAssumption[],
  openQuestions: readonly DesignHandoffOpenQuestion[],
): DesignHandoffPayload {
  return {
    goal: toSectionItems(sections.goal),
    constraints: toSectionItems(sections.constraints),
    acceptanceCriteria: toSectionItems(sections.acceptanceCriteria),
    nonGoals: toSectionItems(sections.nonGoals),
    touchedFiles: uniq(candidates.map((candidate) => candidate.path)),
    supportingFiles: toSupportingFiles(candidates),
    tests: uniq(candidates.flatMap((candidate) => candidate.testImpact)),
    risks: uniq(candidates.map(formatRisk)),
    validationChecklist: toSectionItems(sections.acceptanceCriteria),
    approvals: [...approvals],
    assumptions: [...assumptions],
    openQuestions: [...openQuestions],
  };
}

function createSummary(
  candidates: readonly DesignMappingCandidate[],
  payload: DesignHandoffPayload,
  diagnostics: readonly DesignHandoffDiagnostic[],
  requiresReview: boolean,
): DesignHandoffResult['summary'] {
  return {
    candidateCount: candidates.length,
    touchedFileCount: payload.touchedFiles.length,
    supportingFileCount: payload.supportingFiles.length,
    testCount: payload.tests.length,
    riskCount: payload.risks.length,
    approvalCount: payload.approvals.length,
    assumptionCount: payload.assumptions.length,
    openQuestionCount: payload.openQuestions.length,
    diagnosticCount: diagnostics.length,
    requiresReview,
  };
}

function dedupeDiagnostics(
  diagnostics: readonly DesignHandoffDiagnostic[],
): DesignHandoffDiagnostic[] {
  const seen = new Set<string>();
  const result: DesignHandoffDiagnostic[] = [];

  for (const diagnostic of diagnostics) {
    const key = [
      diagnostic.code,
      diagnostic.severity,
      diagnostic.blocker ? 'blocker' : 'non-blocker',
      diagnostic.message,
      ...diagnostic.sourceRefs,
    ].join('|');

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(diagnostic);
  }

  return result;
}

function renderList(items: readonly string[]): string[] {
  return items.length > 0 ? items.map((item) => `- ${item}`) : ['- none'];
}

function renderTraceItems(
  items: ReadonlyArray<DesignHandoffApproval | DesignHandoffAssumption | DesignHandoffOpenQuestion>,
  formatter: (item: DesignHandoffApproval | DesignHandoffAssumption | DesignHandoffOpenQuestion) => string,
): string[] {
  return items.length > 0 ? items.map(formatter) : ['- none'];
}

export function resolveDesignHandoffArtifacts(
  options: ResolveDesignHandoffArtifactsOptions,
): DesignHandoffArtifacts {
  const rootDir = options.rootDir ?? cwd();
  const baseOutputDir = resolveOutputDir(options.outputDir, rootDir).outputDir;
  const handoffOutputDir = path.join(baseOutputDir, 'handoffs');
  const stem = toHandoffStem(options.filePath);

  return {
    stem,
    outputDir: handoffOutputDir,
    markdownPath: path.join(handoffOutputDir, `${stem}.handoff.md`),
    jsonPath: path.join(handoffOutputDir, `${stem}.handoff.json`),
  };
}

export async function buildDesignHandoff(
  options: BuildDesignHandoffOptions = {},
): Promise<DesignHandoffResult> {
  const rootDir = options.rootDir ?? cwd();
  const loadedContract = await loadDesignContract({
    filePath: options.filePath,
    rootDir,
  });
  const mapping = await resolveDesignScope({
    filePath: options.filePath,
    rootDir,
  });
  const artifacts = resolveDesignHandoffArtifacts({
    filePath: loadedContract.filePath,
    outputDir: options.outputDir,
    rootDir,
  });

  const contractDiagnostics = loadedContract.diagnostics.map(contractDiagnosticToHandoff);
  const mappingDiagnostics = mapping.diagnostics.map(mappingDiagnosticToHandoff);
  const contractBlocked = hasBlockingDesignContractDiagnostics(loadedContract.diagnostics);
  const mappingBlocked = mapping.diagnostics.some((diagnostic) => diagnostic.blocker) || !mapping.ok;
  const approvals = createApprovedSectionItems(loadedContract.contract.sections);
  const assumptions = contractBlocked || mappingBlocked ? [] : createAssumptions(mapping.candidates);
  const openQuestions = createOpenQuestions(loadedContract.contract.sections.openQuestions);
  const reviewGate = contractBlocked || mappingBlocked
    ? undefined
    : createReviewGateApproval(assumptions, openQuestions);
  const payload = createPayload(
    loadedContract.contract.sections,
    contractBlocked || mappingBlocked ? [] : mapping.candidates,
    reviewGate ? [...approvals, reviewGate] : approvals,
    assumptions,
    openQuestions,
  );
  const requiresReview = !contractBlocked && !mappingBlocked
    && (payload.assumptions.length > 0 || payload.openQuestions.length > 0);
  const diagnostics: DesignHandoffDiagnostic[] = dedupeDiagnostics([
    ...contractDiagnostics,
    ...mappingDiagnostics,
  ]);
  const blockedDiagnostic = contractBlocked || mappingBlocked
    ? createBlockedMappingDiagnostic(diagnostics)
    : undefined;
  const reviewRequiredDiagnostic = requiresReview
    ? createReviewRequiredDiagnostic(payload.approvals, payload.assumptions, payload.openQuestions)
    : undefined;

  if (blockedDiagnostic) {
    diagnostics.push(blockedDiagnostic);
  }

  if (reviewRequiredDiagnostic) {
    diagnostics.push(reviewRequiredDiagnostic);
  }

  const ok = !contractBlocked && !mappingBlocked;
  const readyForExecution = ok && !requiresReview;

  return {
    ok,
    filePath: loadedContract.filePath,
    outputDir: artifacts.outputDir,
    readyForExecution,
    artifacts,
    summary: createSummary(mapping.candidates, payload, dedupeDiagnostics(diagnostics), requiresReview),
    handoff: payload,
    diagnostics: dedupeDiagnostics(diagnostics),
  };
}

export function renderDesignHandoffMarkdown(result: DesignHandoffResult): string {
  const approvalLines = renderTraceItems(result.handoff.approvals, (item) => {
    const approval = item as DesignHandoffApproval;
    return `- [${approval.status}] ${approval.text} (${approval.sourceRefs.join(', ')})`;
  });
  const assumptionLines = renderTraceItems(result.handoff.assumptions, (item) =>
    `- ${item.text} (${item.sourceRefs.join(', ')})`);
  const openQuestionLines = renderTraceItems(result.handoff.openQuestions, (item) =>
    `- ${item.text} (${item.sourceRefs.join(', ')})`);

  return [
    `# Design Handoff: ${result.artifacts.stem}`,
    '',
    `Ready for execution: ${result.readyForExecution ? 'yes' : 'no'}`,
    `Source file: ${result.filePath}`,
    '',
    '## Goal',
    ...renderList(result.handoff.goal),
    '',
    '## Scope',
    '### Touched Files',
    ...renderList(result.handoff.touchedFiles),
    '',
    '### Supporting Files',
    ...renderList(result.handoff.supportingFiles),
    '',
    '### Tests',
    ...renderList(result.handoff.tests),
    '',
    '## Non-Goals',
    ...renderList(result.handoff.nonGoals),
    '',
    '## Risks',
    ...renderList(result.handoff.risks),
    '',
    '## Validation Checklist',
    ...renderList(result.handoff.validationChecklist),
    '',
    '## Assumptions',
    ...assumptionLines,
    '',
    '## Open Questions',
    ...openQuestionLines,
    '',
    '## Approval Gates',
    ...approvalLines,
  ].join('\n');
}
