// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Query command - search and query the code graph
// ============================================
// Query 命令 - 搜索和查询代码图
// ============================================

import { Command } from 'commander';
import chalk from 'chalk';

import { QueryHandler } from '../../server/handlers/QueryHandler.js';
import { createConfiguredStorage } from '../../cli/storage-runtime.js';
import type { QueryOptions } from '../types/index.js';

/**
 * Query 命令
 *
 * 查询代码图中的符号、模块和依赖关系。
 *
 * 示例:
 *   codemap query "MyClass"              # 搜索符号
 *   codemap query -t module "src/"       # 搜索模块
 *   codemap query -f json "parse"        # JSON 格式输出
 *   codemap query --limit 10 "test"      # 限制结果数量
 */
export function createQueryCommand(): Command {
  const command = new Command('query');

  command
    .description('查询代码图中的符号、模块和依赖')
    .argument('<query>', '搜索查询字符串')
    .option('-t, --type <type>', '查询类型: symbol, module, dependency', 'symbol')
    .option('-f, --format <format>', '输出格式: json, table, markdown', 'table')
    .option('-l, --limit <number>', '结果数量限制', '50')
    .action(async (query: string, options: QueryOptions) => {
      try {
        const type = options.type ?? 'symbol';
        const format = options.format ?? 'table';
        const limit = Number(options.limit ?? 50);

        console.log(chalk.blue(`🔍 查询: "${query}" (${type})\n`));

        // 创建存储和处理器
        const { storage } = await createConfiguredStorage(process.cwd());
        const handler = new QueryHandler(storage);

        // 执行查询
        let results: Array<Record<string, unknown>> = [];

        switch (type) {
          case 'symbol':
            const symbolResult = await handler.searchSymbols({ query, limit });
            results = symbolResult.items as unknown as Array<Record<string, unknown>>;
            console.log(chalk.gray(`找到 ${symbolResult.total} 个符号 (显示 ${results.length})\n`));
            break;

          case 'module':
            const moduleResult = await handler.searchModules({ query, limit });
            results = moduleResult.items as unknown as Array<Record<string, unknown>>;
            console.log(chalk.gray(`找到 ${moduleResult.total} 个模块 (显示 ${results.length})\n`));
            break;

          case 'dependency':
            // 依赖查询需要特殊处理
            console.log(chalk.yellow('依赖查询暂未实现\n'));
            break;

          default:
            console.error(chalk.red(`❌ 无效查询类型: ${type}`));
            process.exit(1);
        }

        // 格式化输出
        if (results.length === 0) {
          console.log(chalk.yellow('未找到结果'));
        } else {
          console.log(formatResults(results, format));
        }

        await storage.close();
      } catch (error) {
        console.error(chalk.red('\n❌ 查询失败:'), error);
        process.exit(1);
      }
    });

  return command;
}

/**
 * 格式化查询结果
 */
function formatResults(results: Array<Record<string, unknown>>, format: string): string {
  switch (format) {
    case 'json':
      return JSON.stringify(results, null, 2);

    case 'markdown':
      return formatAsMarkdown(results);

    case 'table':
    default:
      return formatAsTable(results);
  }
}

/**
 * 表格格式输出
 */
function formatAsTable(results: Array<Record<string, unknown>>): string {
  const firstResult = results[0];
  if (!firstResult) return '';

  const keys = Object.keys(firstResult);
  const lines: string[] = [];

  // 表头
  lines.push(keys.join(' | '));
  lines.push(keys.map(() => '---').join(' | '));

  // 数据行
  for (const row of results) {
    const values = keys.map(key => {
      const value = row[key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    });
    lines.push(values.join(' | '));
  }

  return lines.join('\n');
}

/**
 * Markdown 格式输出
 */
function formatAsMarkdown(results: Array<Record<string, unknown>>): string {
  return formatAsTable(results); // 表格就是有效的 Markdown
}
