// [META] since:2026-03-26 | owner:cli-team | stable:false
// [WHY] Aggregate validated design + reviewed handoff truth into a conservative verification/drift result

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { cwd } from 'node:process';
import {
  hasBlockingDesignContractDiagnostics,
  loadDesignContract,
} from './design-contract-loader.js';
import {
  buildDesignHandoff,
  resolveDesignHandoffArtifacts,
} from './design-handoff-builder.js';
import type {
  DesignContractDiagnostic,
  DesignContractSection,
  DesignContractSectionId,
  DesignDriftItem,
  DesignHandoffArtifacts,
  DesignHandoffDiagnostic,
  DesignHandoffResult,
  DesignVerificationChecklistItem,
  DesignVerificationDiagnostic,
  DesignVerificationDiagnosticCode,
  DesignVerificationEvidenceRef,
  DesignVerificationResult,
  DesignVerificationStatus,
} from '../interface/types/index.js';

export interface BuildDesignVerificationOptions {
  filePath?: string;
  outputDir?: string;
  rootDir?: string;
}

type HandoffTruthSource = 'artifact' | 'fallback';

interface LoadedHandoffTruth {
  handoff: DesignHandoffResult;
  source: HandoffTruthSource;
  diagnostics: DesignVerificationDiagnostic[];
  artifacts: DesignHandoffArtifacts;
}

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

function toEvidenceRefs(
  refs: readonly DesignVerificationEvidenceRef[],
): DesignVerificationEvidenceRef[] {
  return uniq(refs).filter((ref) => ref.length > 0);
}

function toDesignRef(
  sectionId: DesignContractSectionId,
): DesignVerificationEvidenceRef {
  return `design:${sectionId}`;
}

function toDiagnosticRef(
  code: DesignVerificationDiagnosticCode,
): DesignVerificationEvidenceRef {
  return `diagnostic:${code}`;
}

function toArtifactRef(filePath: string): DesignVerificationEvidenceRef {
  return `artifact:${filePath}`;
}

function toCandidateRef(filePath: string): DesignVerificationEvidenceRef {
  return `candidate:${filePath}` as DesignVerificationEvidenceRef;
}

function toTestRef(filePath: string): DesignVerificationEvidenceRef {
  return `test:${filePath}`;
}

function toHandoffRef(label: string): DesignVerificationEvidenceRef {
  return `handoff:${label}`;
}

function collectPathAnchors(text: string): string[] {
  const matches = text.match(/(?:\.planning|src|tests|docs|scripts)\/[A-Za-z0-9_./-]+/gu) ?? [];
  return uniq(matches.map((match) => match.replace(/[),.:;!?]+$/u, '')));
}

function contractDiagnosticToVerification(
  diagnostic: DesignContractDiagnostic,
): DesignVerificationDiagnostic {
  const sourceRefs: DesignVerificationEvidenceRef[] = [
    toDiagnosticRef(diagnostic.code),
  ];

  if (diagnostic.section) {
    sourceRefs.push(toDesignRef(diagnostic.section));
  }

  return {
    code: diagnostic.code,
    severity: diagnostic.severity,
    blocker: diagnostic.severity === 'error',
    message: diagnostic.message,
    sourceRefs: toEvidenceRefs(sourceRefs),
  };
}

function handoffDiagnosticToVerification(
  diagnostic: DesignHandoffDiagnostic,
): DesignVerificationDiagnostic {
  return {
    code: diagnostic.code,
    severity: diagnostic.severity,
    blocker: diagnostic.blocker,
    message: diagnostic.message,
    sourceRefs: toEvidenceRefs(
      diagnostic.sourceRefs as readonly DesignVerificationEvidenceRef[],
    ),
  };
}

function dedupeDiagnostics(
  diagnostics: readonly DesignVerificationDiagnostic[],
): DesignVerificationDiagnostic[] {
  const seen = new Set<string>();
  const result: DesignVerificationDiagnostic[] = [];

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isDesignHandoffResult(value: unknown): value is DesignHandoffResult {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.ok !== 'boolean' || typeof value.filePath !== 'string') {
    return false;
  }

  if (typeof value.readyForExecution !== 'boolean') {
    return false;
  }

  if (!isRecord(value.summary) || !Array.isArray(value.diagnostics)) {
    return false;
  }

  if (!isRecord(value.handoff)) {
    return false;
  }

  const handoff = value.handoff;
  return isStringArray(handoff.touchedFiles)
    && isStringArray(handoff.supportingFiles)
    && isStringArray(handoff.tests)
    && isStringArray(handoff.acceptanceCriteria);
}

async function loadPreferredHandoffTruth(
  filePath: string,
  options: BuildDesignVerificationOptions,
): Promise<LoadedHandoffTruth> {
  const rootDir = options.rootDir ?? cwd();
  const artifacts = resolveDesignHandoffArtifacts({
    filePath,
    outputDir: options.outputDir,
    rootDir,
  });

  if (existsSync(artifacts.jsonPath)) {
    try {
      const parsed = JSON.parse(await readFile(artifacts.jsonPath, 'utf8')) as unknown;

      if (isDesignHandoffResult(parsed)) {
        return {
          handoff: parsed,
          source: 'artifact',
          diagnostics: [],
          artifacts,
        };
      }
    } catch {
      return {
        handoff: await buildDesignHandoff({
          filePath,
          outputDir: options.outputDir,
          rootDir,
        }),
        source: 'fallback',
        diagnostics: [{
          code: 'handoff-invalid',
          severity: 'warning',
          blocker: false,
          message: 'Canonical handoff artifact exists but is unreadable, so verification fell back to live handoff generation.',
          sourceRefs: toEvidenceRefs([
            toDiagnosticRef('handoff-invalid'),
            toArtifactRef(artifacts.jsonPath),
          ]),
        }],
        artifacts,
      };
    }

    return {
      handoff: await buildDesignHandoff({
        filePath,
        outputDir: options.outputDir,
        rootDir,
      }),
      source: 'fallback',
      diagnostics: [{
        code: 'handoff-invalid',
        severity: 'warning',
        blocker: false,
        message: 'Canonical handoff artifact exists but is not a valid handoff result, so verification fell back to live handoff generation.',
        sourceRefs: toEvidenceRefs([
          toDiagnosticRef('handoff-invalid'),
          toArtifactRef(artifacts.jsonPath),
        ]),
      }],
      artifacts,
    };
  }

  return {
    handoff: await buildDesignHandoff({
      filePath,
      outputDir: options.outputDir,
      rootDir,
    }),
    source: 'fallback',
    diagnostics: [{
      code: 'handoff-missing',
      severity: 'warning',
      blocker: false,
      message: 'Canonical handoff artifact is missing, so verification remains review-needed even though a live handoff was rebuilt.',
      sourceRefs: toEvidenceRefs([
        toDiagnosticRef('handoff-missing'),
        toArtifactRef(artifacts.jsonPath),
      ]),
    }],
    artifacts,
  };
}

function collectChecklistEvidenceRefs(
  text: string,
  handoff: DesignHandoffResult,
  source: HandoffTruthSource,
): DesignVerificationEvidenceRef[] {
  if (source !== 'artifact' || !handoff.ok || !handoff.readyForExecution) {
    return [];
  }

  const pathAnchors = collectPathAnchors(text);
  const touchedFiles = new Set(handoff.handoff.touchedFiles);
  const supportingFiles = new Set(handoff.handoff.supportingFiles);
  const testFiles = new Set(handoff.handoff.tests);
  const refs: DesignVerificationEvidenceRef[] = [];

  for (const anchor of pathAnchors) {
    if (touchedFiles.has(anchor)) {
      refs.push(toCandidateRef(anchor));
    }

    if (supportingFiles.has(anchor)) {
      refs.push(toHandoffRef(`supporting-file:${anchor}`));
    }

    if (testFiles.has(anchor)) {
      refs.push(toTestRef(anchor));
    }
  }

  if (refs.length > 0) {
    refs.push(toHandoffRef('ready'));
  }

  if (refs.length === 0 && /(?:测试|test|regression|回归)/iu.test(text)) {
    refs.push(...handoff.handoff.tests.map(toTestRef));
  }

  if (refs.length > 0 && !refs.includes(toHandoffRef('ready'))) {
    refs.push(toHandoffRef('ready'));
  }

  return toEvidenceRefs(refs);
}

function createChecklist(
  contractSections: Partial<Record<DesignContractSectionId, DesignContractSection>>,
  handoffTruth: LoadedHandoffTruth,
  blocked: boolean,
): DesignVerificationChecklistItem[] {
  const acceptanceItems = toSectionItems(contractSections.acceptanceCriteria);

  return acceptanceItems.map((text, index) => {
    const evidenceRefs = collectChecklistEvidenceRefs(
      text,
      handoffTruth.handoff,
      handoffTruth.source,
    );

    const status: DesignVerificationStatus = blocked
      ? 'blocked'
      : evidenceRefs.length > 0
        ? 'satisfied'
        : 'needs-review';

    return {
      id: `acceptance-${index + 1}`,
      text,
      status,
      evidenceRefs: toEvidenceRefs([
        ...evidenceRefs,
        toDesignRef('acceptanceCriteria'),
      ]),
    };
  });
}

function createScopeDrift(
  handoff: DesignHandoffResult,
): DesignDriftItem | undefined {
  const reviewRefs = toEvidenceRefs([
    ...handoff.handoff.approvals
      .filter((approval) => approval.status === 'needs-review')
      .flatMap((approval) => approval.sourceRefs),
    ...handoff.handoff.assumptions.flatMap((item) => item.sourceRefs),
    ...handoff.handoff.openQuestions.flatMap((item) => item.sourceRefs),
    ...handoff.diagnostics
      .filter((diagnostic) => diagnostic.code === 'review-required')
      .flatMap((diagnostic) => diagnostic.sourceRefs),
  ] as readonly DesignVerificationEvidenceRef[]);

  if (reviewRefs.length === 0) {
    return undefined;
  }

  return {
    kind: 'scope-extra',
    severity: 'warning',
    message: 'Handoff scope still contains unapproved assumptions or open questions, so the approved execution boundary is not yet final.',
    sourceRefs: reviewRefs,
  };
}

function createAcceptanceDrift(
  checklist: readonly DesignVerificationChecklistItem[],
): DesignDriftItem[] {
  return checklist
    .filter((item) => item.status !== 'satisfied')
    .map((item) => ({
      kind: 'acceptance-unverified',
      severity: item.status === 'blocked' ? 'error' : 'warning',
      message: `Acceptance criteria still lacks direct execution evidence: ${item.text}`,
      sourceRefs: toEvidenceRefs(item.evidenceRefs),
    }));
}

function createHandoffDrift(
  diagnostics: readonly DesignVerificationDiagnostic[],
): DesignDriftItem[] {
  return diagnostics
    .filter((diagnostic) =>
      diagnostic.code === 'handoff-missing' || diagnostic.code === 'handoff-invalid')
    .map((diagnostic) => ({
      kind: 'handoff-missing',
      severity: diagnostic.severity,
      message: diagnostic.message,
      sourceRefs: toEvidenceRefs(diagnostic.sourceRefs),
    }));
}

function createBlockedInputDrift(
  diagnostics: readonly DesignVerificationDiagnostic[],
  blocked: boolean,
): DesignDriftItem[] {
  if (!blocked) {
    return [];
  }

  const sourceRefs = diagnostics
    .filter((diagnostic) => diagnostic.blocker)
    .flatMap((diagnostic) => diagnostic.sourceRefs);

  return [{
    kind: 'blocked-input',
    severity: 'error',
    message: 'Verification is blocked because the upstream design or handoff truth still contains blocker diagnostics.',
    sourceRefs: toEvidenceRefs([
      toDiagnosticRef('blocked-input'),
      ...sourceRefs,
    ]),
  }];
}

function createSummary(
  checklist: readonly DesignVerificationChecklistItem[],
  drift: readonly DesignDriftItem[],
  diagnostics: readonly DesignVerificationDiagnostic[],
  blocked: boolean,
): DesignVerificationResult['summary'] {
  const satisfiedCount = checklist.filter((item) => item.status === 'satisfied').length;
  const needsReviewCount = checklist.filter((item) => item.status === 'needs-review').length;
  const violatedCount = checklist.filter((item) => item.status === 'violated').length;
  const blockedCount = checklist.filter((item) => item.status === 'blocked').length;

  return {
    checklistCount: checklist.length,
    satisfiedCount,
    needsReviewCount,
    violatedCount,
    blockedCount,
    driftCount: drift.length,
    diagnosticCount: diagnostics.length,
    reviewRequired: !blocked && (needsReviewCount > 0 || drift.some((item) => item.severity === 'warning')),
    blocked,
  };
}

export async function buildDesignVerification(
  options: BuildDesignVerificationOptions = {},
): Promise<DesignVerificationResult> {
  const rootDir = options.rootDir ?? cwd();
  const loadedContract = await loadDesignContract({
    filePath: options.filePath,
    rootDir,
  });
  const handoffTruth = await loadPreferredHandoffTruth(loadedContract.filePath, {
    ...options,
    rootDir,
  });
  const contractBlocked = hasBlockingDesignContractDiagnostics(loadedContract.diagnostics);
  const handoffBlocked = !handoffTruth.handoff.ok
    || handoffTruth.handoff.diagnostics.some((diagnostic) => diagnostic.blocker);
  const blocked = contractBlocked || handoffBlocked;
  const diagnostics = dedupeDiagnostics([
    ...loadedContract.diagnostics.map(contractDiagnosticToVerification),
    ...handoffTruth.diagnostics,
    ...handoffTruth.handoff.diagnostics.map(handoffDiagnosticToVerification),
  ]);
  const checklist = createChecklist(
    loadedContract.contract.sections,
    handoffTruth,
    blocked,
  );
  const drift = uniq([
    ...createAcceptanceDrift(checklist),
    ...createHandoffDrift(diagnostics),
    ...createBlockedInputDrift(diagnostics, blocked),
    createScopeDrift(handoffTruth.handoff),
  ].filter((item): item is DesignDriftItem => item !== undefined));
  const summary = createSummary(checklist, drift, diagnostics, blocked);
  const readyForExecution = !blocked
    && handoffTruth.source === 'artifact'
    && handoffTruth.handoff.readyForExecution
    && checklist.length > 0
    && checklist.every((item) => item.status === 'satisfied')
    && drift.every((item) => item.severity === 'info');

  return {
    ok: !blocked,
    filePath: loadedContract.filePath,
    readyForExecution,
    summary,
    checklist,
    drift,
    diagnostics,
  };
}
