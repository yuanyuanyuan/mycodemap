/**
 * [META] since:2026-04-15 | owner:cli-team | stable:false
 * [WHY] Expose the contract enforcement surface as a top-level CLI command with canonical JSON truth
 */

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import type { ContractCheckResult } from '../../interface/types/index.js';
import { hasBlockingContractViolations, runContractCheck } from '../contract-checker.js';
import { resolveContractDiffScope } from '../contract-diff-scope.js';

export type CheckAnnotationFormat = 'github' | 'gitlab';

export interface CheckCommandOptions {
  contract: string;
  against: string;
  human?: boolean;
  base?: string;
  changedFiles?: string[];
  annotationFormat?: CheckAnnotationFormat;
  annotationFile?: string;
}

export function renderContractCheckResult(result: ContractCheckResult): string {
  const lines: string[] = [
    result.passed ? '✅ Contract check passed' : '❌ Contract check failed',
    `Contract: ${result.contract_path}`,
    `Against: ${result.against_path}`,
    `Scan Mode: ${result.scan_mode}`,
    `Scanned Files: ${result.summary.scanned_file_count}`,
    `Violations: ${result.summary.total_violations} (error=${result.summary.error_count}, warn=${result.summary.warn_count})`,
  ];

  if (result.history) {
    lines.push(
      `History Risk: status=${result.history.status}, confidence=${result.history.confidence}, freshness=${result.history.freshness}, enriched=${result.history.enriched_file_count}, unavailable=${result.history.unavailable_count}`,
    );
  }

  if (result.changed_files.length > 0) {
    lines.push(`Changed Files: ${result.changed_files.join(', ')}`);
  }

  lines.push('Warnings:');
  if (result.warnings.length === 0) {
    lines.push('- none');
  } else {
    for (const warning of result.warnings) {
      lines.push(`- [${warning.code}] ${warning.message}`);
    }
  }

  lines.push('Violations:');
  if (result.violations.length === 0) {
    lines.push('- none');
  } else {
    for (const violation of result.violations) {
      lines.push(
        `- [${violation.severity}] ${violation.rule_type} ${violation.rule}: ${violation.message}`,
      );
      if (violation.risk) {
        lines.push(
          `  risk=${violation.risk.level} confidence=${violation.risk.confidence} freshness=${violation.risk.freshness} factors=${violation.risk.factors.join(', ') || 'none'}`,
        );
      }
    }
  }

  return lines.join('\n');
}

function isCheckAnnotationFormat(value: string): value is CheckAnnotationFormat {
  return value === 'github' || value === 'gitlab';
}

function escapeGitHubAnnotationValue(value: string): string {
  return value
    .replace(/%/gu, '%25')
    .replace(/,/gu, '%2C')
    .replace(/:/gu, '%3A')
    .replace(/\r/gu, '%0D')
    .replace(/\n/gu, '%0A');
}

function renderGitHubAnnotationLine(violation: ContractCheckResult['violations'][number]): string {
  const diagnostic = violation.diagnostic;
  const file = diagnostic?.file ?? violation.location;
  const properties = [
    file ? `file=${escapeGitHubAnnotationValue(file)}` : undefined,
    diagnostic?.line ? `line=${diagnostic.line}` : undefined,
    diagnostic?.column ? `col=${diagnostic.column}` : undefined,
    diagnostic?.endLine ? `endLine=${diagnostic.endLine}` : undefined,
    diagnostic?.endColumn ? `endColumn=${diagnostic.endColumn}` : undefined,
    `title=${escapeGitHubAnnotationValue(`${violation.rule_type}: ${violation.rule}`)}`,
  ].filter((entry): entry is string => Boolean(entry));
  const level = violation.severity === 'error' ? 'error' : 'warning';
  const degradation = diagnostic?.degraded
    ? ` [diagnostic:${diagnostic.scope}]`
    : '';
  const history = violation.risk
    ? ` [risk:${violation.risk.level}]`
    : '';

  return `::${level} ${properties.join(',')}::${escapeGitHubAnnotationValue(`${violation.message}${degradation}${history}`)}`;
}

export function renderGitHubAnnotations(result: ContractCheckResult): string {
  const lines = result.violations.map((violation) => renderGitHubAnnotationLine(violation));
  return lines.join('\n');
}

function mapGitLabSeverity(severity: 'error' | 'warn'): 'major' | 'minor' {
  return severity === 'error' ? 'major' : 'minor';
}

export function renderGitLabAnnotations(result: ContractCheckResult): string {
  const issues = result.violations.flatMap((violation) => {
    const diagnostic = violation.diagnostic;
    if (!diagnostic?.file || diagnostic.scope !== 'line' || !diagnostic.line) {
      return [];
    }

    return [{
      description: violation.message,
      check_name: `${violation.rule_type}:${violation.rule}`,
      fingerprint: createHash('sha256')
        .update(`${violation.rule}|${diagnostic.file}|${diagnostic.line}|${violation.message}`)
        .digest('hex'),
      severity: mapGitLabSeverity(violation.severity),
      location: {
        path: diagnostic.file,
        lines: {
          begin: diagnostic.line,
        },
      },
    }];
  });

  return JSON.stringify(issues, null, 2);
}

function writeAnnotationOutput(output: string, outputFile: string): void {
  mkdirSync(path.dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, output);
}

function renderAnnotationOutput(
  result: ContractCheckResult,
  format: CheckAnnotationFormat,
): string {
  return format === 'github'
    ? renderGitHubAnnotations(result)
    : renderGitLabAnnotations(result);
}

async function handleCheckCommand(options: CheckCommandOptions): Promise<void> {
  const diffScope = await resolveContractDiffScope({
    againstPath: options.against,
    base: options.base,
    changedFiles: options.changedFiles,
  });
  const result = await runContractCheck({
    contractPath: options.contract,
    againstPath: options.against,
    scanMode: diffScope.scanMode,
    changedFiles: diffScope.changedFiles,
    warnings: diffScope.warnings,
  });

  if (options.annotationFormat) {
    if (!isCheckAnnotationFormat(options.annotationFormat)) {
      throw new Error(`不支持的 annotation format: ${options.annotationFormat}`);
    }

    const output = renderAnnotationOutput(result, options.annotationFormat);
    if (options.annotationFile) {
      writeAnnotationOutput(output, options.annotationFile);
      console.log(`Annotation output written to ${options.annotationFile}`);
    } else {
      console.log(output);
    }
  } else if (options.human) {
    console.log(renderContractCheckResult(result));
  } else {
    console.log(JSON.stringify(result, null, 2));
  }

  if (hasBlockingContractViolations(result)) {
    process.exitCode = 1;
  }
}

export function createCheckCommand(): Command {
  return new Command('check')
    .description('执行 design contract 规则校验')
    .requiredOption('--contract <file>', 'Design contract 文件路径')
    .requiredOption('--against <path>', '要扫描的代码目录或项目根')
    .option('--human', '使用人类可读输出（默认 JSON）')
    .option('--base <git-ref>', '显式指定 diff base')
    .option('--changed-files <paths...>', '显式指定 changed files')
    .option('--annotation-format <format>', 'annotation render mode (github|gitlab)')
    .option('--annotation-file <file>', '将 annotation 输出写入文件')
    .action(handleCheckCommand);
}

export const checkCommand = createCheckCommand();
