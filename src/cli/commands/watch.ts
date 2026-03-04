// [META] since:2026-03 | owner:cli-team | stable:true
// [WHY] Watch mode command with daemon support

import chalk from 'chalk';
import { watchCommandForeground } from './watch-foreground.js';
import { createWatchDaemon } from '../../watcher/index.js';
import { resolveOutputDir } from '../paths.js';

export interface WatchCommandOptions {
  mode?: string;
  output?: string;
  detach?: boolean;
  stop?: boolean;
  status?: boolean;
}

/**
 * Watch 命令 - 支持前台和后台模式
 */
export async function watchCommand(options: WatchCommandOptions) {
  const mode = (options.mode as 'fast' | 'smart') || 'fast';
  // 保持原始 output 传递以向后兼容测试
  const output = options.output || '.mycodemap';
  // 获取完整路径用于内部操作
  const { outputDir } = resolveOutputDir(options.output);
  const rootDir = process.cwd();

  // 状态查询
  if (options.status) {
    await showStatus(rootDir, outputDir);
    return;
  }

  // 停止守护进程
  if (options.stop) {
    await stopDaemon(rootDir, outputDir);
    return;
  }

  // 启动守护进程（后台模式）
  if (options.detach) {
    await startDaemon(rootDir, outputDir, mode);
    return;
  }

  // 前台模式（默认）
  await watchCommandForeground({
    mode,
    output: output
  });
}

/**
 * 启动守护进程
 */
async function startDaemon(rootDir: string, outputDir: string, mode: string): Promise<void> {
  const daemon = createWatchDaemon({
    rootDir,
    outputDir,
    mode: mode as 'fast' | 'smart'
  });

  try {
    await daemon.start();
    console.log(chalk.green('✅ Watch 守护进程已启动！'));
    console.log(chalk.gray(`   监听目录: ${rootDir}`));
    console.log(chalk.gray(`   输出目录: ${outputDir}`));
    console.log(chalk.gray(`   分析模式: ${mode}`));
    console.log(chalk.gray('\n   使用以下命令管理守护进程:'));
    console.log(chalk.gray(`   - codemap watch --status   查看状态`));
    console.log(chalk.gray(`   - codemap watch --stop    停止守护进程`));
  } catch (error) {
    if (error instanceof Error && error.message.includes('已在运行')) {
      console.log(chalk.yellow('⚠️  Watch 守护进程已在运行中'));
      const status = await daemon.getStatus();
      if (status) {
        console.log(chalk.gray(`   PID: ${status.pid}`));
      }
    } else {
      console.log(chalk.red(`❌ 启动失败: ${error}`));
      process.exit(1);
    }
  }
}

/**
 * 停止守护进程
 */
async function stopDaemon(rootDir: string, outputDir: string): Promise<void> {
  const daemon = createWatchDaemon({
    rootDir,
    outputDir,
    mode: 'fast'
  });

  try {
    await daemon.stop();
    console.log(chalk.green('✅ Watch 守护进程已停止'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('未运行')) {
      console.log(chalk.yellow('⚠️  Watch 守护进程未运行'));
    } else {
      console.log(chalk.red(`❌ 停止失败: ${error}`));
      process.exit(1);
    }
  }
}

/**
 * 显示守护进程状态
 */
async function showStatus(rootDir: string, outputDir: string): Promise<void> {
  const daemon = createWatchDaemon({
    rootDir,
    outputDir,
    mode: 'fast'
  });

  const status = await daemon.getStatus();

  if (status) {
    console.log(chalk.green('🟢 Watch 守护进程运行中'));
    console.log(chalk.gray(`   PID: ${status.pid}`));
    console.log(chalk.gray(`   监听目录: ${status.rootDir}`));
    console.log(chalk.gray(`   输出目录: ${status.outputDir}`));
    console.log(chalk.gray(`   分析模式: ${status.mode}`));
    console.log(chalk.gray(`   启动时间: ${new Date(status.startedAt).toLocaleString('zh-CN')}`));
  } else {
    console.log(chalk.gray('⚪ Watch 守护进程未运行'));
  }
}
