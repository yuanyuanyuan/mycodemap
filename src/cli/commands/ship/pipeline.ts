// [META] since:2026-03 | owner:cli-team | stable:false
// [WHY] 流水线编排，协调所有步骤的执行

import chalk from 'chalk';
import { analyzeCommits, formatAnalyzeOutput, AnalyzeResult } from './analyzer.js';
import { calculateVersion, formatVersionOutput, VersionResult } from './versioner.js';
import { runQualityChecks, formatCheckOutput, shouldBlockRelease, CheckOutput } from './checker.js';
import { publish, formatPublishOutput, PublishResult } from './publisher.js';
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
    () => analyzeResult ? formatAnalyzeOutput(analyzeResult) : ''
  );

  if (!analyzeStep || !analyzeResult) {
    return { ...result, blocked: true, blockReason: '变更分析失败' };
  }

  // Step 2: VERSION
  const versionStep = await runStep(
    '版本计算',
    async () => {
      versionResult = await calculateVersion(analyzeResult!);
    },
    () => versionResult ? formatVersionOutput(versionResult) : ''
  );

  if (!versionStep || !versionResult) {
    return { ...result, blocked: true, blockReason: '版本计算失败' };
  }

  if (!versionResult.shouldRelease) {
    console.log(chalk.yellow('\n⚠️ 无可发布的变更'));
    console.log(SEPARATOR);
    return { success: true, analyzeResult, versionResult, blocked: false };
  }

  // Step 3: CHECK
  const checkStep = await runStep(
    '质量检查',
    async () => {
      checkOutput = await runQualityChecks(analyzeResult!, versionResult!);
    },
    () => checkOutput ? formatCheckOutput(checkOutput) : ''
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
    console.log(SEPARATOR);
    console.log(chalk.yellow(`\n⚠️ 置信度: ${checkOutput.confidence.score}/100 — 需确认发布`));
    console.log(chalk.gray('  如需发布，请运行: codemap ship --yes'));
    return {
      success: false,
      analyzeResult,
      versionResult,
      checkOutput,
      blocked: true,
      blockReason: '需要手动确认'
    };
  }

  // Step 4: PUBLISH (仅非 dry-run)
  let publishResult: PublishResult | undefined;
  if (!ctx.dryRun) {
    console.log(SEPARATOR);
    console.log(chalk.blue('\n> 开始发布...'));

    publishResult = await publish(versionResult.suggestedVersion, ctx.dryRun);
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
    const monitorResult = await monitorCI(ctx.dryRun);
    console.log(chalk.green(formatMonitorOutput(monitorResult)));

    result.monitorResult = monitorResult;
  } else {
    console.log(SEPARATOR);
    console.log(chalk.blue('\n> 发布模拟'));
    console.log(chalk.gray(`  版本: v${versionResult.suggestedVersion}`));
    console.log(chalk.gray('  [dry-run] 跳过实际发布'));
  }

  // 成功输出
  console.log(SEPARATOR);
  console.log(chalk.green('\n🎉 发布成功!'));
  console.log(chalk.green(`   v${versionResult.suggestedVersion} 已上线`));

  return {
    success: true,
    analyzeResult,
    versionResult,
    checkOutput,
    publishResult
  };
}

export function formatPipelineError(result: PipelineResult): string {
  if (result.blocked) {
    return `发布被阻止: ${result.blockReason}`;
  }
  return '发布失败';
}
