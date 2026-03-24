#!/usr/bin/env node
// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] CLI entry point - new architecture CLI integrating all layers
// ============================================
// CLI 入口点 - 新架构 CLI，整合所有分层
// ============================================

import { Command } from 'commander';
import chalk from 'chalk';

import { createExportCommand } from './commands/export.js';
import { createQueryCommand } from './commands/query.js';

// 读取 package.json 版本
const packageJson = await import('../../package.json', { assert: { type: 'json' } });
const version = packageJson.default.version ?? '0.1.0';

/**
 * 创建 CLI 程序
 */
export function createCLI(): Command {
  const program = new Command();

  program
    .name('codemap')
    .description('CodeMap - 智能代码地图工具')
    .version(version, '-v, --version', '显示版本号')
    .option('--verbose', '启用详细日志', false)
    .option('--silent', '静默模式，只输出错误', false)
    .hook('preAction', (thisCommand) => {
      const options = thisCommand.opts();
      if (options.verbose) {
        process.env.MYCODEMAP_VERBOSE = 'true';
      }
      if (options.silent) {
        process.env.MYCODEMAP_SILENT = 'true';
      }
    });

  // 添加命令
  program.addCommand(createExportCommand());
  program.addCommand(createQueryCommand());

  // 原有命令的代理（保持向后兼容）
  program
    .command('generate')
    .description('生成代码地图（原有命令）')
    .option('-m, --mode <mode>', '分析模式: fast, smart, hybrid', 'hybrid')
    .option('-o, --output <path>', '输出目录')
    .option('-w, --watch', '监视模式')
    .action(async () => {
      console.log(chalk.yellow('⚠️  请使用旧版 CLI: npx mycodemap generate'));
      console.log(chalk.gray('新架构 CLI 正在开发中...'));
    });

  return program;
}

/**
 * 解析命令行参数并执行
 */
export async function run(argv: string[] = process.argv): Promise<void> {
  const program = createCLI();
  await program.parseAsync(argv);
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
