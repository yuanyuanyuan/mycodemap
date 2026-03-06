// [META] since:2026-03-06 | owner:cli-team | stable:false
// [WHY] 首次运行引导，向用户展示快速开始指南和下一步命令

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

/**
 * 首次运行检测标记文件路径
 */
const FIRST_RUN_MARKER = '.mycodemap/.first-run-done';

/**
 * 检查是否是首次运行
 * - 不存在配置文件
 * - 不存在首次运行标记文件
 * - 不存在旧输出目录（用于迁移检测）
 */
export function isFirstRun(cwd: string = process.cwd()): boolean {
  const configNew = path.join(cwd, 'mycodemap.config.json');
  const configOld = path.join(cwd, 'codemap.config.json');
  const markerPath = path.join(cwd, FIRST_RUN_MARKER);
  const oldOutputDir = path.join(cwd, '.codemap');

  const hasConfig = fs.existsSync(configNew) || fs.existsSync(configOld);
  const hasMarker = fs.existsSync(markerPath);
  const hasOldOutput = fs.existsSync(oldOutputDir);

  // 如果有旧配置或旧输出目录，不是首次运行（需要迁移）
  return !hasConfig && !hasMarker && !hasOldOutput;
}

/**
 * 标记首次运行已完成
 */
export function markFirstRunDone(cwd: string = process.cwd()): void {
  const markerDir = path.join(cwd, '.mycodemap');
  const markerPath = path.join(cwd, FIRST_RUN_MARKER);

  try {
    if (!fs.existsSync(markerDir)) {
      fs.mkdirSync(markerDir, { recursive: true });
    }
    fs.writeFileSync(markerPath, new Date().toISOString(), 'utf-8');
  } catch {
    // 标记失败不影响主流程
  }
}

/**
 * 显示首次运行欢迎信息
 */
export function showFirstRunGuide(): void {
  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.white.bold('  欢迎使用 CodeMap - TypeScript 代码地图工具'));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');

  console.log(chalk.white('  快速开始：'));
  console.log('');

  console.log(chalk.gray('  1. ') + chalk.white('初始化配置'));
  console.log(chalk.gray('     ') + chalk.cyan('mycodemap init'));
  console.log(chalk.gray('        或 ') + chalk.cyan('codemap init'));
  console.log('');

  console.log(chalk.gray('  2. ') + chalk.white('生成代码地图'));
  console.log(chalk.gray('     ') + chalk.cyan('mycodemap generate'));
  console.log('');

  console.log(chalk.gray('  3. ') + chalk.white('查看帮助'));
  console.log(chalk.gray('     ') + chalk.cyan('mycodemap --help'));
  console.log('');

  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.gray('  更多功能：query | deps | cycles | complexity | impact'));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');
}

/**
 * 执行首次运行引导流程
 * - 检测是否是首次运行
 * - 显示欢迎指南
 * - 标记已完成
 */
export function runFirstRunGuide(cwd: string = process.cwd()): boolean {
  if (!isFirstRun(cwd)) {
    return false;
  }

  showFirstRunGuide();
  markFirstRunDone(cwd);

  return true;
}
