// [META] since:2026-03 | owner:cli-team | stable:false
// [WHY] 流水线编排，协调所有步骤的执行

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import chalk from 'chalk';
import { analyzeCommits, formatAnalyzeOutput, AnalyzeResult } from './analyzer.js';
import { calculateVersion, formatVersionOutput, VersionResult } from './versioner.js';
import { runQualityChecks, formatCheckOutput, shouldBlockRelease, CheckOutput } from './checker.js';
import { publish, formatPublishOutput, PublishResult, isLargeRelease, formatLargeReleaseWarning } from './publisher.js';
import { monitorCI, formatMonitorOutput, MonitorResult } from './monitor.js';

export interface ShipPipelineContext {
  dryRun: boolean;
  verbose: boolean;
  autoConfirm: boolean;
}

export interface PipelineResult {
  success: boolean;
  analyzeResult?: AnalyzeResult;
  versionResult?: VersionResult;
  checkOutput?: CheckOutput;
  publishResult?: PublishResult;
  monitorResult?: MonitorResult;
  blocked?: boolean;
  blockReason?: string;
}

const SEPARATOR = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
const CONFIRM_TIMEOUT_MS = 30_000;

async function runStep(
  name: string,
  fn: () => Promise<void>,
  format: () => string
): Promise<boolean> {
  console.log(chalk.blue(`\n> ${name}...`));
  try {
    await fn();
    console.log(chalk.green(format()));
    return true;
  } catch (error) {
    console.log(chalk.red(`\n❌ ${name} 失败`));
    if (error instanceof Error) {
      console.log(chalk.gray(`  ${error.message}`));
    }
    return false;
  }
}

async function promptForReleaseConfirmation(
  version: string,
  checkOutput: CheckOutput
): Promise<'confirmed' | 'rejected' | 'timeout' | 'unavailable'> {
  if (!input.isTTY || !output.isTTY) {
    return 'unavailable';
  }

  console.log(SEPARATOR);
  console.log(chalk.yellow(`\n⚠️ 置信度: ${checkOutput.confidence.score}/100 — 需确认发布`));

  const warnings = checkOutput.confidence.reasons
    .filter(reason => reason.includes('-') || reason.includes('低') || reason.includes('修改'))
    .slice(0, 3);

  if (warnings.length > 0) {
    console.log(chalk.gray('  风险提示:'));
    for (const warning of warnings) {
      console.log(chalk.gray(`    - ${warning}`));
    }
  }

  console.log(chalk.gray(`  目标版本: v${version}`));

  const readline = createInterface({ input, output });
  const timer = setTimeout(() => readline.close(), CONFIRM_TIMEOUT_MS);

  try {
    const answer = await readline.question('确认发布? [y/N] ');
    return /^y(?:es)?$/i.test(answer.trim()) ? 'confirmed' : 'rejected';
  } catch {
    return 'timeout';
  } finally {
    clearTimeout(timer);
    readline.close();
  }
}

export async function runShipPipeline(ctx: ShipPipelineContext): Promise<PipelineResult> {
  const result: PipelineResult = { success: false };

  console.log(chalk.blue('\n🚀 智能发布系统启动'));
  if (ctx.dryRun) {
    console.log(chalk.gray('  [DRY-RUN 模式 - 仅分析，不发布]'));
  }

  let analyzeResult: AnalyzeResult | undefined;
  let versionResult: VersionResult | undefined;
  let checkOutput: CheckOutput | undefined;

  // Step 1: ANALYZE
  const analyzeStep = await runStep(
    '变更分析',
    async () => {
      analyzeResult = await analyzeCommits();
    },
    () => analyzeResult ? formatAnalyzeOutput(analyzeResult, ctx.verbose) : ''
  );

  if (!analyzeStep || !analyzeResult) {
    return { ...result, blocked: true, blockReason: '变更分析失败' };
  }

  // 检测大规模发布并显示警告
  if (isLargeRelease(analyzeResult.commits)) {
    const warningLines = formatLargeReleaseWarning(analyzeResult.commits);
    for (const line of warningLines) {
      console.log(line);
    }
  }

  // Step 2: VERSION
  const versionStep = await runStep(
    '版本计算',
    async () => {
      versionResult = await calculateVersion(analyzeResult!);
    },
    () => versionResult ? formatVersionOutput(versionResult, ctx.verbose) : ''
  );

  if (!versionStep || !versionResult) {
    return { ...result, blocked: true, blockReason: '版本计算失败' };
  }

  if (!versionResult.shouldRelease) {
    console.log(chalk.yellow('\n⚠️ 无可发布的变更'));
    console.log(SEPARATOR);
    return { success: true, analyzeResult, versionResult, blocked: false };
  }

  // versionType === 'none' 时跳过发布（只有文档或配置变更）
  if (versionResult.versionType === 'none') {
    console.log(chalk.yellow('\n⚠️ 无功能变更，跳过发布'));
    console.log(SEPARATOR);
    return { success: true, analyzeResult, versionResult, blocked: false };
  }

  // Step 3: CHECK
  const checkStep = await runStep(
    '质量检查',
    async () => {
      checkOutput = await runQualityChecks(analyzeResult!, versionResult!);
    },
    () => checkOutput ? formatCheckOutput(checkOutput, ctx.verbose) : ''
  );

  if (!checkStep || !checkOutput) {
    return { ...result, blocked: true, blockReason: '质量检查失败' };
  }

  // 检查是否应该阻止发布
  if (shouldBlockRelease(checkOutput)) {
    console.log(SEPARATOR);
    console.log(chalk.red('\n发布被阻止: 检查未通过'));
    if (checkOutput.confidence.decision === 'block') {
      console.log(chalk.yellow(`  置信度过低 (${checkOutput.confidence.score}/100)`));
    }
    if (!checkOutput.allMustPassed) {
      const failed = Array.from(checkOutput.mustPassResults.entries())
        .filter(([, r]) => !r.passed)
        .map(([name]) => name);
      console.log(chalk.yellow(`  失败检查: ${failed.join(', ')}`));
    }
    return {
      success: false,
      analyzeResult,
      versionResult,
      checkOutput,
      blocked: true,
      blockReason: '质量检查未通过'
    };
  }

  // 置信度 60-75 需要确认
  if (checkOutput.confidence.decision === 'confirm' && !ctx.autoConfirm) {
    const confirmResult = await promptForReleaseConfirmation(versionResult.suggestedVersion, checkOutput);
    if (confirmResult !== 'confirmed') {
      console.log(SEPARATOR);
      if (confirmResult === 'unavailable') {
        console.log(chalk.yellow('\n⚠️ 当前终端不可交互'));
        console.log(chalk.gray('  如需发布，请运行: codemap ship --yes'));
      } else if (confirmResult === 'timeout') {
        console.log(chalk.yellow('\n⏱️ 确认超时，已取消发布'));
      } else {
        console.log(chalk.yellow('\n已取消发布'));
      }
      return {
        success: false,
        analyzeResult,
        versionResult,
        checkOutput,
        blocked: true,
        blockReason: '需要手动确认'
      };
    }
  }

  // Step 4: PUBLISH (仅非 dry-run)
  let publishResult: PublishResult | undefined;
  if (!ctx.dryRun) {
    console.log(SEPARATOR);
    console.log(chalk.blue('\n> 开始发布...'));

    publishResult = await publish(versionResult.suggestedVersion, {
      dryRun: ctx.dryRun,
      analyzeResult
    });
    console.log(chalk.green(formatPublishOutput(publishResult)));

    if (!publishResult.success) {
      console.log(SEPARATOR);
      console.log(chalk.red('\n发布失败'));
      return {
        success: false,
        analyzeResult,
        versionResult,
        checkOutput,
        publishResult,
        blocked: true,
        blockReason: '发布失败'
      };
    }

    // Step 5: MONITOR
    console.log(SEPARATOR);
    const monitorResult = await monitorCI({
      dryRun: ctx.dryRun,
      tagName: publishResult.tagName,
      headSha: publishResult.headSha,
      startedAtMs: publishResult.pushedAtMs
    });
    const monitorOutput = formatMonitorOutput(monitorResult, ctx.verbose);
    console.log(monitorResult.success ? chalk.green(monitorOutput) : chalk.yellow(monitorOutput));

    if (!monitorResult.success) {
      return {
        success: false,
        analyzeResult,
        versionResult,
        checkOutput,
        publishResult,
        monitorResult,
        blocked: true,
        blockReason: monitorResult.status === 'timeout' ? 'CI 监控超时' : 'GitHub Actions 发布失败'
      };
    }

    result.monitorResult = monitorResult;
  } else {
    console.log(SEPARATOR);
    console.log(chalk.blue('\n> 发布模拟'));
    console.log(chalk.gray(`  版本: v${versionResult.suggestedVersion}`));
    console.log(chalk.gray('  [dry-run] 跳过实际发布'));

    console.log(SEPARATOR);
    console.log(chalk.green('\n✅ Dry-run 完成'));
    console.log(chalk.gray(`   推荐版本: v${versionResult.suggestedVersion}`));
    console.log(chalk.gray('   未执行实际发布'));

    return {
      success: true,
      analyzeResult,
      versionResult,
      checkOutput
    };
  }

  // 成功输出
  console.log(SEPARATOR);
  console.log(chalk.green('\n🎉 发布成功!'));
  console.log(chalk.green(`   v${versionResult.suggestedVersion} 已上线`));
  if (result.monitorResult?.releaseUrl) {
    console.log(chalk.gray(`   ${result.monitorResult.releaseUrl}`));
  }

  return {
    success: true,
    analyzeResult,
    versionResult,
    checkOutput,
    publishResult,
    monitorResult: result.monitorResult
  };
}

export function formatPipelineError(result: PipelineResult): string {
  if (result.blocked) {
    return `发布被阻止: ${result.blockReason}`;
  }
  return '发布失败';
}
