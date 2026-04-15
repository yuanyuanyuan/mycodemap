/**
 * [META] since:2026-03-25 | owner:cli-team | stable:false
 * [WHY] Provide a dedicated CLI surface for validating human-authored design contracts
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { Command } from 'commander';
import {
  hasBlockingDesignContractDiagnostics,
  loadDesignContract,
  type LoadedDesignContract,
} from '../design-contract-loader.js';
import {
  buildDesignHandoff,
  renderDesignHandoffMarkdown,
} from '../design-handoff-builder.js';
import { DEFAULT_DESIGN_CONTRACT_PATH } from '../design-contract-schema.js';
import { resolveDesignScope } from '../design-scope-resolver.js';
import { buildDesignVerification } from '../design-verification-builder.js';
import type {
  DesignHandoffResult,
  DesignMappingCandidate,
  DesignMappingResult,
  DesignVerificationResult,
} from '../../interface/types/index.js';

export interface DesignValidateOptions {
  json?: boolean;
}

export interface DesignValidateJsonOutput {
  ok: boolean;
  exists: boolean;
  filePath: string;
  title?: string;
  missingRequiredSections: string[];
  diagnostics: LoadedDesignContract['diagnostics'];
  sections: Array<{
    id: string;
    title: string;
    line: number;
    itemCount: number;
  }>;
}

export interface DesignMapOptions {
  json?: boolean;
}

export interface DesignHandoffOptions {
  json?: boolean;
  output?: string;
}

export interface DesignVerifyOptions {
  json?: boolean;
}

function toJsonOutput(result: LoadedDesignContract): DesignValidateJsonOutput {
  return {
    ok: result.ok,
    exists: result.exists,
    filePath: result.filePath,
    title: result.contract.metadata.title,
    missingRequiredSections: [...result.contract.missingRequiredSections],
    diagnostics: result.diagnostics,
    sections: result.contract.orderedSections.map((section) => ({
      id: section.id,
      title: section.title,
      line: section.line,
      itemCount: section.content.length,
    })),
  };
}

export function renderDesignValidationResult(result: LoadedDesignContract): string {
  const lines: string[] = [
    result.ok ? '✅ Design contract valid' : '❌ Design contract invalid',
    `File: ${result.filePath}`,
  ];

  if (result.contract.metadata.title) {
    lines.push(`Title: ${result.contract.metadata.title}`);
  }

  lines.push(`Sections: ${result.contract.orderedSections.length}`);

  if (result.diagnostics.length === 0) {
    lines.push('Diagnostics: none');
    return lines.join('\n');
  }

  lines.push('Diagnostics:');
  for (const diagnostic of result.diagnostics) {
    const location = diagnostic.line ? ` (line ${diagnostic.line})` : '';
    const heading = diagnostic.heading ? ` [${diagnostic.heading}]` : '';
    lines.push(`- [${diagnostic.severity}] ${diagnostic.code}${location}${heading}: ${diagnostic.message}`);
  }

  return lines.join('\n');
}

function renderCandidate(candidate: DesignMappingCandidate): string[] {
  const lines = [`- [${candidate.kind}] ${candidate.path}`];

  if (candidate.moduleName) {
    lines.push(`  Module: ${candidate.moduleName}`);
  }

  if (candidate.symbolName) {
    lines.push(`  Symbol: ${candidate.symbolName}`);
  }

  lines.push('  Reasons:');
  for (const reason of candidate.reasons) {
    lines.push(`  - [${reason.section}] ${reason.matchedText} (${reason.evidenceType})`);
  }

  lines.push(`  Risk: ${candidate.risk}`);
  lines.push(`  Confidence: ${candidate.confidence.level} (${candidate.confidence.score})`);
  lines.push(`  Dependencies: ${candidate.dependencies.length > 0 ? candidate.dependencies.join(', ') : 'none'}`);
  lines.push(`  Test Impact: ${candidate.testImpact.length > 0 ? candidate.testImpact.join(', ') : 'none'}`);

  return lines;
}

export function renderDesignMappingResult(result: DesignMappingResult): string {
  const lines: string[] = [
    result.ok ? '✅ Design mapping ready' : '❌ Design mapping blocked',
    `File: ${result.filePath}`,
    `Summary: ${result.summary.candidateCount} candidates, ${result.summary.unknownCount} unknowns`,
    'Candidates:',
  ];

  if (result.candidates.length === 0) {
    lines.push('- none');
  } else {
    for (const candidate of result.candidates) {
      lines.push(...renderCandidate(candidate));
    }
  }

  lines.push('Unknowns:');
  const unknownLines = result.candidates.flatMap((candidate) =>
    candidate.unknowns.map((unknown) => `- ${candidate.path}: ${unknown}`),
  );
  lines.push(...(unknownLines.length > 0 ? unknownLines : ['- none']));

  lines.push('Diagnostics:');
  if (result.diagnostics.length === 0) {
    lines.push('- none');
  } else {
    for (const diagnostic of result.diagnostics) {
      const candidateInfo = diagnostic.candidatePaths?.length
        ? ` [${diagnostic.candidatePaths.join(', ')}]`
        : '';
      lines.push(`- [${diagnostic.severity}] ${diagnostic.code}${candidateInfo}: ${diagnostic.message}`);
    }
  }

  return lines.join('\n');
}

export function renderDesignHandoffResult(result: DesignHandoffResult): string {
  const statusLine = result.ok
    ? result.readyForExecution
      ? '✅ Design handoff ready for execution'
      : '🟡 Design handoff needs human review'
    : '❌ Design handoff blocked';

  const lines: string[] = [
    statusLine,
    `File: ${result.filePath}`,
    `Candidates: ${result.summary.candidateCount}`,
    `Approvals: ${result.summary.approvalCount}`,
    `Assumptions: ${result.summary.assumptionCount}`,
    `Open Questions: ${result.summary.openQuestionCount}`,
  ];

  if (result.ok) {
    lines.push(`Artifacts: ${result.artifacts.markdownPath}, ${result.artifacts.jsonPath}`);
  }

  if (result.diagnostics.length > 0) {
    lines.push('Diagnostics:');
    for (const diagnostic of result.diagnostics) {
      lines.push(`- [${diagnostic.severity}] ${diagnostic.code}: ${diagnostic.message}`);
    }
  }

  return lines.join('\n');
}

export function renderDesignVerificationResult(result: DesignVerificationResult): string {
  const statusLine = result.ok
    ? result.readyForExecution
      ? '✅ Design verification ready for execution'
      : '🟡 Design verification needs review'
    : '❌ Design verification blocked';
  const lines: string[] = [
    statusLine,
    `File: ${result.filePath}`,
    `Checklist: ${result.summary.satisfiedCount}/${result.summary.checklistCount} satisfied`,
    `Drift: ${result.summary.driftCount}`,
    `Diagnostics: ${result.summary.diagnosticCount}`,
  ];

  lines.push('Checklist Items:');
  if (result.checklist.length === 0) {
    lines.push('- none');
  } else {
    for (const item of result.checklist) {
      lines.push(`- [${item.status}] ${item.text}`);
    }
  }

  lines.push('Drift Items:');
  if (result.drift.length === 0) {
    lines.push('- none');
  } else {
    for (const item of result.drift) {
      lines.push(`- [${item.severity}] ${item.kind}: ${item.message}`);
    }
  }

  if (!result.ok) {
    lines.push('Next Step: fix blocker diagnostics in design or handoff truth before running verify again.');
  } else if (!result.readyForExecution) {
    lines.push('Next Step: resolve review-needed checklist/drift items or persist a reviewed handoff artifact before execution.');
  } else {
    lines.push('Next Step: proceed with execution against the reviewed handoff boundary.');
  }

  return lines.join('\n');
}

export async function runDesignValidate(
  filePath: string | undefined,
  options: DesignValidateOptions & { json: true },
): Promise<DesignValidateJsonOutput>;
export async function runDesignValidate(
  filePath?: string,
  options?: DesignValidateOptions,
): Promise<LoadedDesignContract>;
export async function runDesignValidate(
  filePath?: string,
  options: DesignValidateOptions = {},
): Promise<DesignValidateJsonOutput | LoadedDesignContract> {
  const result = await loadDesignContract({ filePath });

  if (options.json) {
    return toJsonOutput(result);
  }

  return result;
}

export async function runDesignMap(
  filePath?: string,
  _options: DesignMapOptions = {},
): Promise<DesignMappingResult> {
  return resolveDesignScope({ filePath });
}

export async function runDesignHandoff(
  filePath?: string,
  options: DesignHandoffOptions = {},
): Promise<DesignHandoffResult> {
  return buildDesignHandoff({
    filePath,
    outputDir: options.output,
  });
}

export async function runDesignVerify(
  filePath?: string,
  _options: DesignVerifyOptions = {},
): Promise<DesignVerificationResult> {
  return buildDesignVerification({ filePath });
}

async function handleDesignValidate(
  filePath: string | undefined,
  options: DesignValidateOptions,
): Promise<void> {
  const result = await loadDesignContract({ filePath });

  if (options.json) {
    console.log(JSON.stringify(toJsonOutput(result), null, 2));
  } else {
    console.log(renderDesignValidationResult(result));
  }

  if (hasBlockingDesignContractDiagnostics(result.diagnostics)) {
    process.exitCode = 1;
  }
}

async function handleDesignMap(
  filePath: string | undefined,
  options: DesignMapOptions,
): Promise<void> {
  const result = await resolveDesignScope({ filePath });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderDesignMappingResult(result));
  }

  if (result.diagnostics.some((diagnostic) => diagnostic.blocker)) {
    process.exitCode = 1;
  }
}

async function writeDesignHandoffArtifacts(result: DesignHandoffResult): Promise<void> {
  await mkdir(result.artifacts.outputDir, { recursive: true });
  await writeFile(result.artifacts.markdownPath, `${renderDesignHandoffMarkdown(result)}\n`, 'utf8');
  await writeFile(result.artifacts.jsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

async function handleDesignHandoff(
  filePath: string | undefined,
  options: DesignHandoffOptions,
): Promise<void> {
  const result = await runDesignHandoff(filePath, options);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    if (result.ok) {
      await writeDesignHandoffArtifacts(result);
    }

    console.log(renderDesignHandoffResult(result));
  }

  if (!result.ok || result.diagnostics.some((diagnostic) => diagnostic.blocker)) {
    process.exitCode = 1;
  }
}

async function handleDesignVerify(
  filePath: string | undefined,
  options: DesignVerifyOptions,
): Promise<void> {
  const result = await runDesignVerify(filePath, options);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderDesignVerificationResult(result));
  }

  if (!result.ok || result.diagnostics.some((diagnostic) => diagnostic.blocker)) {
    process.exitCode = 1;
  }
}

export const designCommand = new Command('design');

designCommand.description('Design contract utilities');

designCommand
  .command('validate')
  .description(`Validate a design contract file (default: ${DEFAULT_DESIGN_CONTRACT_PATH})`)
  .argument('[file]', 'Design contract path')
  .option('-j, --json', 'JSON 格式输出')
  .action(handleDesignValidate);

designCommand
  .command('map')
  .description(`Resolve design contract into candidate code scope (default: ${DEFAULT_DESIGN_CONTRACT_PATH})`)
  .argument('[file]', 'Design contract path')
  .option('-j, --json', 'JSON 格式输出')
  .action(handleDesignMap);

designCommand
  .command('handoff')
  .description(`Generate a design handoff package (default: ${DEFAULT_DESIGN_CONTRACT_PATH})`)
  .argument('[file]', 'Design contract path')
  .option('-j, --json', 'JSON 格式输出')
  .option('-o, --output <dir>', '指定 handoff output 目录')
  .action(handleDesignHandoff);

designCommand
  .command('verify')
  .description(`Verify design contract against reviewed handoff truth (default: ${DEFAULT_DESIGN_CONTRACT_PATH})`)
  .argument('[file]', 'Design contract path')
  .option('-j, --json', 'JSON 格式输出')
  .action(handleDesignVerify);
