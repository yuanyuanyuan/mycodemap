// [META] since:2026-03-06 | owner:cli-team | stable:false
// [WHY] 提供日志管理命令，支持列出、导出和清理日志

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { resolveLogDir } from '../paths.js';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source?: string;
}

interface ListOptions {
  limit?: string;
  level?: string;
  json?: boolean;
}

interface ExportOptions {
  output?: string;
  days?: string;
  format?: string;
}

interface ClearOptions {
  confirm?: boolean;
  days?: string;
}

/**
 * 列出日志文件
 */
async function listLogs(options: ListOptions) {
  const rootDir = process.cwd();
  const logDir = resolveLogDir(rootDir);

  if (!fs.existsSync(logDir)) {
    console.log(chalk.yellow('日志目录不存在'));
    return;
  }

  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.log'))
    .map(f => {
      const filePath = path.join(logDir, f);
      const stats = fs.statSync(filePath);
      return {
        name: f,
        path: filePath,
        size: stats.size,
        mtime: stats.mtime,
      };
    })
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  if (files.length === 0) {
    console.log(chalk.yellow('没有找到日志文件'));
    return;
  }

  const limit = parseInt(options.limit || '10', 10);
  const levelFilter = options.level?.toUpperCase();

  // 收集日志条目
  let allEntries: LogEntry[] = [];
  for (const file of files) {
    const content = fs.readFileSync(file.path, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());

    for (const line of lines) {
      const match = line.match(/^\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.*)$/);
      if (match) {
        allEntries.push({
          timestamp: match[1],
          level: match[2],
          message: match[3],
          source: file.name,
        });
      }
    }
  }

  // 按时间排序（最新的在前）
  allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // 按级别过滤
  if (levelFilter) {
    allEntries = allEntries.filter(e => e.level === levelFilter);
  }

  // 限制数量
  allEntries = allEntries.slice(0, limit);

  if (options.json) {
    console.log(JSON.stringify(allEntries, null, 2));
    return;
  }

  console.log(chalk.cyan(`\n📋 最近 ${limit} 条日志:\n`));

  for (const entry of allEntries) {
    const levelColor = entry.level === 'ERROR' ? chalk.red :
      entry.level === 'WARN' ? chalk.yellow :
        entry.level === 'DEBUG' ? chalk.gray : chalk.blue;

    console.log(`${chalk.gray(entry.timestamp.slice(0, 19))} ${levelColor(entry.level.padEnd(5))} ${entry.message}`);
    if (entry.source) {
      console.log(chalk.gray(`   来源: ${entry.source}`));
    }
  }

  console.log(chalk.gray(`\n共 ${allEntries.length} 条日志`));
}

/**
 * 导出日志
 */
async function exportLogs(options: ExportOptions) {
  const rootDir = process.cwd();
  const logDir = resolveLogDir(rootDir);
  const days = parseInt(options.days || '7', 10);
  const format = options.format || 'json';

  if (!fs.existsSync(logDir)) {
    console.log(chalk.yellow('日志目录不存在'));
    return;
  }

  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.log'))
    .map(f => path.join(logDir, f))
    .filter(f => {
      const stats = fs.statSync(f);
      const ageInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
      return ageInDays <= days;
    });

  if (files.length === 0) {
    console.log(chalk.yellow(`最近 ${days} 天没有日志文件`));
    return;
  }

  // 收集日志条目
  let allEntries: LogEntry[] = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    const source = path.basename(file);

    for (const line of lines) {
      const match = line.match(/^\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.*)$/);
      if (match) {
        allEntries.push({
          timestamp: match[1],
          level: match[2],
          message: match[3],
          source,
        });
      }
    }
  }

  // 按时间排序
  allEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // 生成输出文件名
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputFile = options.output || path.join(rootDir, `mycodemap-logs-${timestamp}.${format}`);

  if (format === 'json') {
    fs.writeFileSync(outputFile, JSON.stringify(allEntries, null, 2), 'utf-8');
  } else if (format === 'txt') {
    const text = allEntries.map(e => `[${e.timestamp}] [${e.level}] ${e.message}`).join('\n');
    fs.writeFileSync(outputFile, text, 'utf-8');
  }

  console.log(chalk.green(`✅ 已导出 ${allEntries.length} 条日志到: ${outputFile}`));
}

/**
 * 清理日志
 */
async function clearLogs(options: ClearOptions) {
  const rootDir = process.cwd();
  const logDir = resolveLogDir(rootDir);
  const days = parseInt(options.days || '30', 10);

  if (!fs.existsSync(logDir)) {
    console.log(chalk.yellow('日志目录不存在'));
    return;
  }

  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.log'))
    .map(f => path.join(logDir, f))
    .filter(f => {
      const stats = fs.statSync(f);
      const ageInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
      return ageInDays > days;
    });

  if (files.length === 0) {
    console.log(chalk.green(`没有需要清理的日志（保留 ${days} 天内的日志）`));
    return;
  }

  if (!options.confirm) {
    console.log(chalk.yellow(`将删除 ${files.length} 个日志文件（超过 ${days} 天）`));
    console.log(chalk.gray('使用 --confirm 确认删除'));
    return;
  }

  for (const file of files) {
    fs.unlinkSync(file);
  }

  console.log(chalk.green(`✅ 已清理 ${files.length} 个日志文件`));
}

/**
 * Logs 命令实现
 */
export async function logsCommand(subcommand: string, options: Record<string, unknown>) {
  switch (subcommand) {
    case 'list':
      await listLogs(options as ListOptions);
      break;
    case 'export':
      await exportLogs(options as ExportOptions);
      break;
    case 'clear':
      await clearLogs(options as ClearOptions);
      break;
    default:
      console.error(chalk.red(`未知子命令: ${subcommand}`));
      console.log(chalk.gray('\n用法:'));
      console.log(chalk.gray('   mycodemap logs list    # 列出日志'));
      console.log(chalk.gray('   mycodemap logs export  # 导出日志'));
      console.log(chalk.gray('   mycodemap logs clear  # 清理日志'));
      process.exit(1);
  }
}
