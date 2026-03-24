// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Export command - exports code graph to various formats (MVP3 architecture)
// ============================================

import chalk from 'chalk';
import { writeFile, readFile, access } from 'fs/promises';
import { join } from 'path';
import { AnalysisHandler } from '../../server/handlers/AnalysisHandler.js';
import { CodeGraphBuilder } from '../../domain/services/CodeGraphBuilder.js';
import { createConfiguredStorage } from '../storage-runtime.js';

interface ExportOptions {
  output?: string;
}

/**
 * Codemap数据格式（来自codemap.json）
 */
interface CodemapData {
  version: string;
  generatedAt: string;
  project: {
    name: string;
    rootDir: string;
  };
  summary: {
    totalFiles: number;
    totalModules: number;
  };
  modules: Array<{
    id: string;
    path: string;
    absolutePath: string;
    exports?: Array<{
      name: string;
      kind: string;
    }>;
    imports?: Array<{
      source: string;
      specifiers?: string[];
    }>;
  }>;
}

export async function exportCommand(format: string, options: ExportOptions): Promise<void> {
  try {
    // 验证格式
    const validFormats = ['json', 'graphml', 'dot', 'mermaid'];
    if (!validFormats.includes(format)) {
      console.error(chalk.red(`❌ 无效格式: ${format}`));
      console.log(chalk.gray(`支持的格式: ${validFormats.join(', ')}`));
      process.exit(1);
    }

    console.log(chalk.blue(`📤 导出代码图为 ${format.toUpperCase()} 格式...\n`));

    // Mermaid格式直接从codemap.json读取
    if (format === 'mermaid') {
      const codemapPath = join(process.cwd(), '.mycodemap', 'codemap.json');

      // 检查文件是否存在
      try {
        await access(codemapPath);
      } catch {
        console.log(chalk.yellow('⚠️  未找到代码图数据'));
        console.log(chalk.gray('请先运行: mycodemap generate'));
        process.exit(0);
      }

      // 读取codemap数据
      const data = await readFile(codemapPath, 'utf-8');
      const codemap: CodemapData = JSON.parse(data);

      // 检查数据是否为空
      if (!codemap.modules || codemap.modules.length === 0) {
        console.log(chalk.yellow('⚠️  代码图数据为空'));
        console.log(chalk.gray('请先运行: mycodemap generate'));
        process.exit(0);
      }

      // 转换为Mermaid格式
      const mermaidData = toMermaid(codemap);
      const outputPath = options.output ?? 'codemap.mmd';
      await writeFile(outputPath, mermaidData, 'utf-8');

      console.log(chalk.green(`✅ 导出成功！`));
      console.log(chalk.white(`📁 文件: ${chalk.cyan(outputPath)}`));
      console.log(chalk.white(`📊 大小: ${chalk.cyan(formatBytes(mermaidData.length))}`));
      console.log(chalk.white(`📈 模块: ${chalk.cyan(codemap.modules.length)} 个`));
      return;
    }

    // 其他格式使用原有的handler方式
    const { storage } = await createConfiguredStorage(process.cwd());

    const builder = CodeGraphBuilder.create({
      mode: 'fast',
      rootDir: process.cwd(),
    });
    const handler = new AnalysisHandler(storage, builder);

    const result = await handler.export(format as 'json' | 'graphml' | 'dot');
    const outputPath = options.output ?? result.filename;
    await writeFile(outputPath, result.data, 'utf-8');

    console.log(chalk.green(`✅ 导出成功！`));
    console.log(chalk.white(`📁 文件: ${chalk.cyan(outputPath)}`));
    console.log(chalk.white(`📊 大小: ${chalk.cyan(formatBytes(result.data.length))}`));

    await storage.close();
  } catch (error) {
    console.error(chalk.red('\n❌ 导出失败:'), error);
    process.exit(1);
  }
}

/**
 * 转换为 Mermaid 格式
 */
function toMermaid(codemap: CodemapData): string {
  const lines: string[] = ['graph TD'];

  // 添加节点
  for (const module of codemap.modules) {
    const label = module.path.split('/').pop() ?? module.path;
    const safeId = module.id.replace(/[^a-zA-Z0-9]/g, '_');
    lines.push(`  ${safeId}["${label}"]`);
  }

  // 添加边（从imports推断依赖关系）
  for (const module of codemap.modules) {
    if (module.imports) {
      for (const imp of module.imports) {
        // 查找源模块
        const sourceModule = codemap.modules.find(m =>
          m.path === imp.source || m.path.endsWith('/' + imp.source.replace(/\.js$/, '.ts'))
        );
        if (sourceModule) {
          const targetId = module.id.replace(/[^a-zA-Z0-9]/g, '_');
          const sourceId = sourceModule.id.replace(/[^a-zA-Z0-9]/g, '_');
          lines.push(`  ${sourceId} --> ${targetId}`);
        }
      }
    }
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
