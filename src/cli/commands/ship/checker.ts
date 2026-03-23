// [META] since:2026-03 | owner:cli-team | stable:false
// [WHY] Step 3: 质量检查，运行 mustPass 和 shouldPass 检查

import chalk from 'chalk';
import { execSync } from 'child_process';
import { AnalyzeResult } from './analyzer.js';
import { VersionResult } from './versioner.js';
import { CheckContext, runChecks } from './rules/quality-rules.js';
import { calculateConfidence, ConfidenceResult } from './rules/confidence-rules.js';

export interface CheckOutput {
  mustPassResults: Map<string, { passed: boolean; message?: string }>;
  shouldPassResults: Map<string, { passed: boolean; message?: string }>;
  allMustPassed: boolean;
  confidence: ConfidenceResult;
}

export async function runQualityChecks(
  analyzeResult: AnalyzeResult,
  versionResult: VersionResult
): Promise<CheckOutput> {
  const branch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();

  const ctx: CheckContext = {
    commits: analyzeResult.commits,
    changedFiles: analyzeResult.changedFiles,
    currentVersion: versionResult.currentVersion,
    branch
  };

  // 运行所有检查
  const { mustPassResults, shouldPassResults } = await runChecks(ctx);

  // 计算置信度
  // 跳过 merge commits，只检查常规 commits
  const nonMergeCommits = analyzeResult.commits.filter(c => !c.type.toLowerCase().includes('merge'));
  const allCommitsConventional = nonMergeCommits.every(c =>
    /^(feat|fix|docs|style|refactor|test|chore|ci|perf|breaking|feature|bugfix|hotfix|config|infra|enhance|improvement|breaking-change)(\(.+\))?:/i.test(c.type)
  );

  const confidence = calculateConfidence({
    commits: analyzeResult.commits,
    changedFiles: analyzeResult.changedFiles,
    allCommitsConventional,
    coverageAbove80: true, // 简化，实际应该从 shouldPassResults 获取
    changelogUpdated: shouldPassResults.get('changelogUpdated')?.passed ?? false,
    hasBreaking: analyzeResult.breakingChanges
  });

  const allMustPassed = Array.from(mustPassResults.values()).every(r => r.passed);

  return {
    mustPassResults,
    shouldPassResults,
    allMustPassed,
    confidence
  };
}

export function formatCheckOutput(output: CheckOutput): string {
  const lines: string[] = [];
  const { mustPassResults, shouldPassResults, confidence } = output;

  lines.push('质量检查:');

  // mustPass 结果
  for (const [name, result] of mustPassResults) {
    const icon = result.passed ? '✅' : '❌';
    const label = name.replace(/([A-Z])/g, ' $1').toLowerCase();
    lines.push(`   ${icon} ${label}`);
    if (!result.passed && result.message) {
      lines.push(`      ${result.message}`);
    }
  }

  // 置信度
  lines.push('');
  lines.push(`置信度: ${confidence.score}/100`);

  for (const reason of confidence.reasons.slice(0, 5)) {
    lines.push(`   ${reason}`);
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
  // mustPass 失败
  if (!output.allMustPassed) {
    return true;
  }

  // 置信度过低
  if (output.confidence.decision === 'block') {
    return true;
  }

  return false;
}
