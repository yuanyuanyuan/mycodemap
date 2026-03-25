/**
 * [META] since:2026-03-25 | owner:cli-team | stable:false
 * [WHY] Provide a dedicated CLI surface for validating human-authored design contracts
 */

import { Command } from 'commander';
import {
  hasBlockingDesignContractDiagnostics,
  loadDesignContract,
  type LoadedDesignContract,
} from '../design-contract-loader.js';
import { DEFAULT_DESIGN_CONTRACT_PATH } from '../design-contract-schema.js';

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

export const designCommand = new Command('design');

designCommand
  .description('Design contract utilities')
  .command('validate')
  .description(`Validate a design contract file (default: ${DEFAULT_DESIGN_CONTRACT_PATH})`)
  .argument('[file]', 'Design contract path')
  .option('-j, --json', 'JSON 格式输出')
  .action(handleDesignValidate);
