// [META] since:2026-03 | owner:cli-team | stable:false
// [WHY] codemap ship 命令入口

import chalk from 'chalk';
import { Command } from 'commander';
import { runShipPipeline, PipelineResult, formatPipelineError } from './pipeline.js';

export interface ShipOptions {
  dryRun?: boolean;
  verbose?: boolean;
  yes?: boolean;
}

export async function shipCommand(options: ShipOptions): Promise<void> {
  const ctx = {
    dryRun: options.dryRun ?? false,
    verbose: options.verbose ?? false,
    autoConfirm: options.yes ?? false
  };

  try {
    const result: PipelineResult = await runShipPipeline(ctx);

    if (!result.success && result.blocked) {
      console.error(chalk.red(`\n${formatPipelineError(result)}`));
      process.exit(1);
    }

    if (!result.success) {
      process.exit(1);
    }

  } catch (error) {
    console.error(chalk.red('\n❌ 发布流程异常'));
    if (error instanceof Error) {
      console.error(chalk.gray(`  ${error.message}`));
    }
    process.exit(1);
  }
}

export function createShipCommand(): Command {
  const program = new Command('ship');

  program
    .description('一键智能发布 - 自动分析变更、计算版本、运行检查、发布 npm')
    .option('--dry-run', '仅分析，不发布')
    .option('--verbose', '显示详细输出')
    .option('--yes, -y', '置信度 60-75 时自动确认（不询问）')
    .action(async (opts) => {
      await shipCommand(opts);
    });

  return program;
}

// 导出所有子模块
export { runShipPipeline } from './pipeline.js';
export { analyzeCommits } from './analyzer.js';
export { calculateVersion } from './versioner.js';
export { runQualityChecks } from './checker.js';
export { publish } from './publisher.js';
export { monitorCI } from './monitor.js';
export { versionRules } from './rules/version-rules.js';
export { confidenceConfig } from './rules/confidence-rules.js';
