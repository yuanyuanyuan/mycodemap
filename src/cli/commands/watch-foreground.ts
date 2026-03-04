// [META] since:2026-03 | owner:cli-team | stable:true
// [WHY] Foreground file watching for development mode

import chalk from 'chalk';
import chokidar from 'chokidar';
import { analyze } from '../../core/analyzer.js';
import { generateAIMap, generateJSON, generateContext } from '../../generator/index.js';
import { resolveOutputDir } from '../paths.js';
import type { AnalysisOptions } from '../../types/index.js';

export interface WatchCommandForegroundOptions {
  mode?: string;
  output?: string;
}

/**
 * Watch 命令 - 前台模式（原有实现）
 */
export async function watchCommandForeground(options: WatchCommandForegroundOptions) {
  const mode = (options.mode as 'fast' | 'smart') || 'fast';
  const { outputDir } = resolveOutputDir(options.output);
  const rootDir = process.cwd();

  console.log(chalk.blue('👀 启动 Watch 模式...'));
  console.log(chalk.gray(`   监听目录: ${rootDir}`));
  console.log(chalk.gray(`   输出目录: ${outputDir}`));
  console.log(chalk.gray(`   分析模式: ${mode}`));
  console.log('');

  // 初始生成
  await runAnalysis(rootDir, mode, outputDir);

  // 设置文件监听
  const watcher = chokidar.watch(['src/**/*.ts'], {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100
    }
  });

  let debounceTimer: NodeJS.Timeout;

  const handleChange = async (filePath: string, type: string) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      console.log(chalk.yellow(`\n📝 检测到变更: ${type} - ${filePath}`));
      console.log(chalk.gray('   重新分析中...'));
      await runAnalysis(rootDir, mode, outputDir);
      console.log(chalk.green('   ✅ 更新完成！'));
      console.log(chalk.gray('   继续监听中...\n'));
    }, 1000);
  };

  watcher
    .on('add', (path) => handleChange(path, '新增'))
    .on('change', (path) => handleChange(path, '修改'))
    .on('unlink', (path) => handleChange(path, '删除'));

  console.log(chalk.green('✅ Watch 模式已启动！'));
  console.log(chalk.gray('按 Ctrl+C 停止监听'));
  console.log('');

  // 保持进程运行
  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n\n🛑 正在停止 Watch 模式...'));
    await watcher.close();
    console.log(chalk.green('✅ 已停止'));
    process.exit(0);
  });
}

async function runAnalysis(rootDir: string, mode: string, outputDir: string) {
  const analysisOptions: AnalysisOptions = {
    mode: mode as 'fast' | 'smart',
    rootDir,
    output: outputDir
  };

  const codeMap = await analyze(analysisOptions);
  await generateAIMap(codeMap, outputDir);
  await generateJSON(codeMap, outputDir);
  await generateContext(codeMap, outputDir);
}
