// [META] since:2026-03-06 | owner:cli-team | stable:false
// [WHY] 提供报告生成命令，用于汇总代码地图分析结果和运行日志

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { resolveOutputDir, resolveDataPath, resolveLogDir } from '../paths.js';
import { sanitize } from '../utils/sanitize.js';
import type { CodeMap } from '../../types/index.js';

interface ReportOptions {
  output?: string;
  days?: string;
  json?: boolean;
  verbose?: boolean;
}

interface ReportData {
  generatedAt: string;
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  summary: {
    totalFiles: number;
    totalModules: number;
    totalExports: number;
    totalLines: number;
  };
  logs: {
    totalCount: number;
    entries: LogEntry[];
  };
  modules: ModuleSummary[];
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

interface ModuleSummary {
  path: string;
  exports: number;
  dependencies: number;
  complexity?: number;
}

/**
 * 获取指定天数范围内的日志文件
 */
function getLogFiles(logDir: string, days: number): string[] {
  if (!fs.existsSync(logDir)) {
    return [];
  }

  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.log'))
    .map(f => path.join(logDir, f))
    .filter(f => {
      const stats = fs.statSync(f);
      const ageInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
      return ageInDays <= days;
    });

  return files;
}

/**
 * 解析日志文件
 */
function parseLogFiles(files: string[]): LogEntry[] {
  const entries: LogEntry[] = [];
  const now = new Date();

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());

      for (const line of lines) {
        // 尝试解析日志行 (格式: [TIMESTAMP] [LEVEL] MESSAGE)
        const match = line.match(/^\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.*)$/);
        if (match) {
          entries.push({
            timestamp: match[1],
            level: match[2],
            message: match[3],
          });
        } else if (line.trim()) {
          // 非标准格式，作为普通消息处理
          entries.push({
            timestamp: now.toISOString(),
            level: 'INFO',
            message: line,
          });
        }
      }
    } catch {
      // 忽略读取错误
    }
  }

  return entries;
}

/**
 * 生成报告数据
 */
function generateReportData(days: number): ReportData {
  const rootDir = process.cwd();
  const outputDir = resolveOutputDir(undefined, rootDir);
  const logDir = resolveLogDir(rootDir);
  const codemapPath = resolveDataPath(rootDir);

  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // 读取代码地图
  let codeMap: CodeMap | null = null;
  if (fs.existsSync(codemapPath)) {
    try {
      const data = fs.readFileSync(codemapPath, 'utf-8');
      codeMap = JSON.parse(data) as CodeMap;
    } catch {
      // 忽略解析错误
    }
  }

  // 获取日志
  const logFiles = getLogFiles(logDir, days);
  const logEntries = parseLogFiles(logFiles);

  // 脱敏日志
  const sanitizedLogs = sanitize(logEntries) as LogEntry[];

  // 构建模块摘要
  const modules: ModuleSummary[] = codeMap?.modules?.slice(0, 50).map(m => ({
    path: m.path || path.relative(rootDir, m.absolutePath),
    exports: m.exports?.length || 0,
    dependencies: m.dependencies?.length || 0,
    complexity: (m as unknown as { complexity?: number }).complexity,
  })) || [];

  return {
    generatedAt: now.toISOString(),
    period: {
      days,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
    },
    summary: {
      totalFiles: codeMap?.summary?.totalFiles || 0,
      totalModules: codeMap?.summary?.totalModules || 0,
      totalExports: codeMap?.summary?.totalExports || 0,
      totalLines: codeMap?.summary?.totalLines || 0,
    },
    logs: {
      totalCount: sanitizedLogs.length,
      entries: sanitizedLogs.slice(0, 100), // 限制日志条目数量
    },
    modules,
  };
}

/**
 * Report 命令实现
 */
export async function reportCommand(options: ReportOptions) {
  const days = parseInt(options.days || '7', 10);
  const output = options.output || '.mycodemap';
  const verbose = options.verbose || false;

  if (days < 1 || days > 365) {
    console.error(chalk.red('错误: --days 必须在 1-365 之间'));
    process.exit(1);
  }

  console.log(chalk.blue(`📊 生成代码地图报告 (最近 ${days} 天)...`));

  try {
    const reportData = generateReportData(days);

    // 生成输出文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const outputFile = path.join(output, `mycodemap-report-${timestamp}.json`);

    // 确保输出目录存在
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 写入报告文件
    fs.writeFileSync(outputFile, JSON.stringify(reportData, null, 2), 'utf-8');

    console.log(chalk.green(`✅ 报告已生成: ${outputFile}`));

    // 显示摘要
    if (!options.json) {
      console.log(chalk.gray('\n📈 报告摘要:'));
      console.log(chalk.gray(`   时间范围: ${reportData.period.startDate.slice(0, 10)} ~ ${reportData.period.endDate.slice(0, 10)}`));
      console.log(chalk.gray(`   文件总数: ${reportData.summary.totalFiles}`));
      console.log(chalk.gray(`   模块数量: ${reportData.summary.totalModules}`));
      console.log(chalk.gray(`   导出符号: ${reportData.summary.totalExports}`));
      console.log(chalk.gray(`   代码行数: ${reportData.summary.totalLines}`));
      console.log(chalk.gray(`   日志条目: ${reportData.logs.totalCount}`));

      if (verbose) {
        console.log(chalk.gray(`   模块详情: ${reportData.modules.length} 个`));
      }
    }

  } catch (error) {
    console.error(chalk.red('❌ 生成报告失败:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
