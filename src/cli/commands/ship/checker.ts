// [META] since:2026-03 | owner:cli-team | stable:false
// [WHY] Step 3: 质量检查，运行 hard、warn-only 和 fallback gate 检查

import chalk from 'chalk';
import { AnalyzeResult } from './analyzer.js';
import { VersionResult } from './versioner.js';
import { CheckContext, runChecks, type GateCheckItem } from './rules/quality-rules.js';
import { calculateConfidence, ConfidenceResult } from './rules/confidence-rules.js';

export interface CheckOutput {
  results: Map<string, GateCheckItem>;
  allHardPassed: boolean;
  hasFallback: boolean;
  confidence: ConfidenceResult;
}

export async function runQualityChecks(
  analyzeResult: AnalyzeResult,
  versionResult: VersionResult
): Promise<CheckOutput> {
  const ctx: CheckContext = {
    commits: analyzeResult.commits,
    changedFiles: analyzeResult.changedFiles,
    currentVersion: versionResult.currentVersion,
    versionType: versionResult.versionType
  };

  // 运行所有检查
  const results = await runChecks(ctx);

  // 计算置信度
  // 跳过 merge commits，只检查常规 commits
  const nonMergeCommits = analyzeResult.commits.filter(c => !c.type.toLowerCase().includes('merge'));
  const allCommitsConventional = nonMergeCommits.every(c =>
    /^(feat|fix|docs|style|refactor|test|chore|ci|perf|breaking|feature|bugfix|hotfix|config|infra|enhance|improvement|breaking-change)(\(.+\))?$/i.test(c.type)
  );

  const coverageItem = results.get('testCoverageAbove80');
  const changelogItem = results.get('changelogUpdated');

  const confidence = calculateConfidence({
    commits: analyzeResult.commits,
    changedFiles: analyzeResult.changedFiles,
    allCommitsConventional,
    coverageAbove80: coverageItem?.result.status === 'passed',
    changelogUpdated: changelogItem?.result.status === 'passed',
    hasBreaking: analyzeResult.breakingChanges
  });

  const allHardPassed = Array.from(results.values())
    .filter(item => item.gateMode === 'hard')
    .every(item => item.result.status === 'passed');

  const hasFallback = Array.from(results.values())
    .some(item => item.result.status === 'fallback');

  return {
    results,
    allHardPassed,
    hasFallback,
    confidence
  };
}

function formatStatusIcon(status: string): string {
  switch (status) {
    case 'passed':
      return '✅';
    case 'failed':
      return '❌';
    case 'fallback':
      return '⏸️';
    default:
      return '❓';
  }
}

function formatGateModeLabel(gateMode: string): string {
  switch (gateMode) {
    case 'hard':
      return '[hard]';
    case 'warn-only':
      return '[warn]';
    case 'fallback':
      return '[fallback]';
    default:
      return '[?]';
  }
}

export function formatCheckOutput(output: CheckOutput, verbose: boolean = false): string {
  const lines: string[] = [];
  const { results, confidence } = output;

  lines.push('质量检查:');

  // hard 结果
  for (const [name, item] of results) {
    if (item.gateMode !== 'hard') continue;
    const icon = formatStatusIcon(item.result.status);
    const label = name.replace(/([A-Z])/g, ' $1').toLowerCase();
    lines.push(`   ${icon} ${formatGateModeLabel(item.gateMode)} ${label}`);
    if (item.result.status !== 'passed' && item.result.message) {
      lines.push(`      ${item.result.message}`);
    }
  }

  // 置信度
  lines.push('');
  lines.push(`置信度: ${confidence.score}/100`);

  const reasons = verbose ? confidence.reasons : confidence.reasons.slice(0, 5);
  for (const reason of reasons) {
    lines.push(`   ${reason}`);
  }

  if (verbose) {
    lines.push('');
    lines.push('建议检查:');
    for (const [name, item] of results) {
      if (item.gateMode === 'hard') continue;
      const icon = formatStatusIcon(item.result.status);
      const label = name.replace(/([A-Z])/g, ' $1').toLowerCase();
      lines.push(`   ${icon} ${formatGateModeLabel(item.gateMode)} ${label}`);
      if (item.result.message) {
        lines.push(`      ${item.result.message}`);
      }
    }
  }

  return lines.join('\n');
}

export function formatConfidenceOutput(confidence: ConfidenceResult): string {
  const lines: string[] = [];
  const { score, decision, reasons } = confidence;

  const decisionText = {
    auto: '自动发布',
    confirm: '需确认发布',
    block: '阻止发布'
  }[decision];

  const decisionColor = {
    auto: chalk.green,
    confirm: chalk.yellow,
    block: chalk.red
  }[decision];

  lines.push(`判定: ${decisionColor(decisionText)}`);
  lines.push(`置信度: ${score}/100`);

  return lines.join('\n');
}

export function shouldBlockRelease(output: CheckOutput): boolean {
  // hard gate 失败
  if (!output.allHardPassed) {
    return true;
  }

  // fallback 状态存在（需要人工判断）
  if (output.hasFallback) {
    return true;
  }

  // 置信度过低
  if (output.confidence.decision === 'block') {
    return true;
  }

  return false;
}
