// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Export command - exports code graph to various formats
// ============================================
// Export 命令 - 导出代码图到各种格式
// ============================================

import { Command } from 'commander';
import chalk from 'chalk';
import { writeFile } from 'fs/promises';

import { AnalysisHandler } from '../../server/handlers/AnalysisHandler.js';
import { CodeGraphBuilder } from '../../domain/services/CodeGraphBuilder.js';
import { createConfiguredStorage } from '../../cli/storage-runtime.js';

/**
 * Export 命令
 *
 * 将代码图导出为各种格式（JSON、GraphML、DOT、Mermaid）。
 *
 * 示例:
 *   codemap export json           # 导出为 JSON
 *   codemap export graphml        # 导出为 GraphML
 *   codemap export dot            # 导出为 DOT (Graphviz)
 *   codemap export mermaid        # 导出为 Mermaid 语法
 *   codemap export json -o ./out  # 指定输出目录
 */
export function createExportCommand(): Command {
  const command = new Command('export');

  command
    .description('导出代码图到各种格式')
    .argument('<format>', '导出格式: json, graphml, dot, mermaid')
    .option('-o, --output <path>', '输出文件路径')
    .action(async (format: string, options: { output?: string }) => {
      try {
        // 验证格式
        const validFormats = ['json', 'graphml', 'dot', 'mermaid'];
        if (!validFormats.includes(format)) {
          console.error(chalk.red(`❌ 无效格式: ${format}`));
          console.log(chalk.gray(`支持的格式: ${validFormats.join(', ')}`));
          process.exit(1);
        }

        console.log(chalk.blue(`📤 导出代码图为 ${format.toUpperCase()} 格式...\n`));

        // 创建存储实例
        const { storage } = await createConfiguredStorage(process.cwd());

        // 创建分析处理器
        const builder = CodeGraphBuilder.create({
          mode: 'fast',
          rootDir: process.cwd(),
        });
        const handler = new AnalysisHandler(storage, builder);

        // 执行导出
        let result: { data: string; contentType: string; filename: string };
        
        if (format === 'mermaid') {
          // Mermaid 格式需要特殊处理
          const graph = await storage.loadCodeGraph();
          result = {
            data: toMermaid(graph),
            contentType: 'text/markdown',
            filename: 'codemap.mmd',
          };
        } else {
          result = await handler.export(format as 'json' | 'graphml' | 'dot');
        }

        // 确定输出路径
        const outputPath = options.output ?? result.filename;

        // 写入文件
        await writeFile(outputPath, result.data, 'utf-8');

        console.log(chalk.green(`✅ 导出成功！`));
        console.log(chalk.white(`📁 文件: ${chalk.cyan(outputPath)}`));
        console.log(chalk.white(`📊 大小: ${chalk.cyan(formatBytes(result.data.length))}`));

        await storage.close();
      } catch (error) {
        console.error(chalk.red('\n❌ 导出失败:'), error);
        process.exit(1);
      }
    });

  return command;
}

/**
 * 转换为 Mermaid 格式
 */
function toMermaid(graph: {
  modules: Array<{ id: string; path: string }>;
  dependencies: Array<{ sourceId: string; targetId: string; type: string }>;
}): string {
  const lines: string[] = ['graph TD'];

  // 添加节点
  for (const module of graph.modules) {
    const label = module.path.split('/').pop() ?? module.path;
    const safeId = module.id.replace(/[^a-zA-Z0-9]/g, '_');
    lines.push(`  ${safeId}["${label}"]`);
  }

  // 添加边
  for (const dep of graph.dependencies) {
    const sourceId = dep.sourceId.replace(/[^a-zA-Z0-9]/g, '_');
    const targetId = dep.targetId.replace(/[^a-zA-Z0-9]/g, '_');
    lines.push(`  ${sourceId} -->|${dep.type}| ${targetId}`);
  }

  return lines.join('\n');
}

/**
 * 格式化字节大小
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
