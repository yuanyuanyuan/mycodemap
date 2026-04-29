/**
 * [META] since:2026-04-29 | owner:cli-team | stable:false
 * [WHY]  standalone readiness gate command that runs all release quality checks with three-layer gate semantics
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { analyzeCommits } from './ship/analyzer.js';
import { calculateVersion } from './ship/versioner.js';
import { runQualityChecks, formatCheckOutput, shouldBlockRelease, type CheckOutput } from './ship/checker.js';

export interface ReadinessGateOptions {
  dryRun?: boolean;
  verbose?: boolean;
  json?: boolean;
  structured?: boolean;
}

export interface ReadinessGateResult {
  success: boolean;
  blocked: boolean;
  blockReason?: string;
  checkOutput: CheckOutput;
  version?: string;
  versionType?: string;
}

function renderGateResult(result: ReadinessGateResult): string {
  const lines: string[] = [];
  const { checkOutput, version, versionType } = result;

  lines.push(chalk.bold('Readiness Gate 结果'));
  lines.push('');

  if (version) {
    lines.push(`目标版本: v${version} (${versionType})`);
    lines.push('');
  }

  // Hard gates
  lines.push(chalk.bold('Hard Gates:'));
  for (const [name, item] of checkOutput.results) {
    if (item.gateMode !== 'hard') continue;
    const icon = item.result.status === 'passed' ? chalk.green('✓') : item.result.status === 'failed' ? chalk.red('✗') : chalk.yellow('⏸');
    const label = name.replace(/([A-Z])/g, ' $1').toLowerCase();
    lines.push(`  ${icon} ${label}`);
    if (item.result.message) {
      lines.push(`     ${chalk.gray(item.result.message)}`);
    }
  }
  lines.push('');

  // Warn-only gates
  lines.push(chalk.bold('Warn-only Gates:'));
  for (const [name, item] of checkOutput.results) {
    if (item.gateMode === 'hard') continue;
    const icon = item.result.status === 'passed' ? chalk.green('✓') : item.result.status === 'failed' ? chalk.yellow('!') : chalk.yellow('⏸');
    const label = name.replace(/([A-Z])/g, ' $1').toLowerCase();
    lines.push(`  ${icon} ${label}`);
    if (item.result.message) {
      lines.push(`     ${chalk.gray(item.result.message)}`);
    }
  }
  lines.push('');

  // Summary
  const hardPassed = Array.from(checkOutput.results.values())
    .filter(item => item.gateMode === 'hard')
    .every(item => item.result.status === 'passed');
  const hasFallback = checkOutput.hasFallback;

  if (hasFallback) {
    lines.push(chalk.yellow('⏸️  判定: FALLBACK — 部分检查信号不可用，需要人工判断'));
  } else if (!hardPassed) {
    lines.push(chalk.red('❌ 判定: BLOCKED — hard gate 未通过'));
  } else if (checkOutput.confidence.decision === 'block') {
    lines.push(chalk.red('❌ 判定: BLOCKED — 置信度过低'));
  } else if (checkOutput.confidence.decision === 'confirm') {
    lines.push(chalk.yellow('⚠️  判定: CONFIRM — 置信度中等，建议人工确认'));
  } else {
    lines.push(chalk.green('✅ 判定: PASSED — 所有 gate 通过'));
  }

  lines.push(`置信度: ${checkOutput.confidence.score}/100`);

  return lines.join('\n');
}

function toStructuredResult(result: ReadinessGateResult): unknown {
  const { checkOutput, version, versionType } = result;
  const gates: Record<string, unknown> = {};

  for (const [name, item] of checkOutput.results) {
    gates[name] = {
      gateMode: item.gateMode,
      status: item.result.status,
      message: item.result.message,
      details: item.result.details,
    };
  }

  return {
    success: result.success,
    blocked: result.blocked,
    blockReason: result.blockReason,
    version,
    versionType,
    confidence: checkOutput.confidence,
    gates,
  };
}

export async function runReadinessGate(options: ReadinessGateOptions = {}): Promise<ReadinessGateResult> {
  // Step 1: Analyze
  let analyzeResult;
  try {
    analyzeResult = await analyzeCommits();
  } catch {
    return {
      success: false,
      blocked: true,
      blockReason: '变更分析失败',
      checkOutput: {
        results: new Map(),
        allHardPassed: false,
        hasFallback: true,
        confidence: { score: 0, decision: 'block', reasons: ['无法分析 commits'], breakdown: { base: 0, bonuses: [], penalties: [] } }
      }
    };
  }

  // Step 2: Version
  let versionResult;
  try {
    versionResult = await calculateVersion(analyzeResult);
  } catch {
    return {
      success: false,
      blocked: true,
      blockReason: '版本计算失败',
      checkOutput: {
        results: new Map(),
        allHardPassed: false,
        hasFallback: true,
        confidence: { score: 0, decision: 'block', reasons: ['无法计算版本'], breakdown: { base: 0, bonuses: [], penalties: [] } }
      }
    };
  }

  if (!versionResult.shouldRelease || versionResult.versionType === 'none') {
    return {
      success: true,
      blocked: false,
      checkOutput: {
        results: new Map(),
        allHardPassed: true,
        hasFallback: false,
        confidence: { score: 100, decision: 'auto', reasons: ['无可发布变更'], breakdown: { base: 100, bonuses: [], penalties: [] } }
      },
      version: versionResult.suggestedVersion,
      versionType: versionResult.versionType,
    };
  }

  // Step 3: Gate checks
  const checkOutput = await runQualityChecks(analyzeResult, versionResult);
  const blocked = shouldBlockRelease(checkOutput);

  let blockReason: string | undefined;
  if (blocked) {
    if (checkOutput.hasFallback) {
      blockReason = '存在 fallback 状态，需要人工判断';
    } else if (!checkOutput.allHardPassed) {
      blockReason = 'hard gate 未通过';
    } else if (checkOutput.confidence.decision === 'block') {
      blockReason = '置信度过低';
    } else {
      blockReason = '发布检查未通过';
    }
  }

  return {
    success: !blocked,
    blocked,
    blockReason,
    checkOutput,
    version: versionResult.suggestedVersion,
    versionType: versionResult.versionType,
  };
}

export async function handleReadinessGateCommand(options: ReadinessGateOptions): Promise<void> {
  if (options.structured && !options.json) {
    throw new Error('--structured 需要配合 --json 使用');
  }

  const result = await runReadinessGate(options);

  if (options.json) {
    const output = options.structured
      ? toStructuredResult(result)
      : {
          ...result,
          checkOutput: {
            ...result.checkOutput,
            results: Object.fromEntries(result.checkOutput.results),
          },
        };
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  console.log(renderGateResult(result));
}

export function createReadinessGateCommand(): Command {
  return new Command('readiness-gate')
    .description('运行发布 readiness gate 检查（hard / warn-only / fallback 三层语义）')
    .option('--dry-run', '仅分析，不发布')
    .option('--verbose', '显示详细输出')
    .option('--json', 'JSON 格式输出')
    .option('--structured', '输出完全结构化的 JSON（不包含自然语言字符串，需要配合 --json 使用）')
    .action(handleReadinessGateCommand);
}

export const readinessGateCommand = createReadinessGateCommand();
