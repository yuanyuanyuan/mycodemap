// ============================================
// AI Overview Generator - AI 概述生成与保存
// ============================================

import * as fs from 'fs/promises';
import * as path from 'path';
import type { CodeMap } from '../types/index.js';
import type { SubagentOutput } from '../ai/subagent-caller.js';

/**
 * AI Overview Generator 配置
 */
export interface AIOverviewConfig {
  /** 输出目录 */
  outputDir: string;
  /** 是否启用 AI 生成 */
  enabled?: boolean;
  /** 输出文件名 */
  filename?: string;
}

/**
 * AI Overview Generator - 生成并保存 AI 概述
 */
export class AIOverviewGenerator {
  private outputDir: string;
  private enabled: boolean;
  private filename: string;

  constructor(config: AIOverviewConfig) {
    this.outputDir = config.outputDir;
    this.enabled = config.enabled ?? true;
    this.filename = config.filename || 'AI_OVERVIEW.md';
  }

  /**
   * 生成并保存 AI 概述
   */
  async generate(codeMap: CodeMap, aiOutput: SubagentOutput): Promise<string> {
    const outputPath = path.join(this.outputDir, this.filename);

    // 构建 Markdown 内容
    const content = this.buildMarkdown(codeMap, aiOutput);

    // 确保输出目录存在
    await fs.mkdir(this.outputDir, { recursive: true });

    // 写入文件
    await fs.writeFile(outputPath, content, 'utf-8');

    return outputPath;
  }

  /**
   * 构建 Markdown 内容
   */
  private buildMarkdown(codeMap: CodeMap, aiOutput: SubagentOutput): string {
    const lines: string[] = [];

    // 标题
    lines.push('# ' + aiOutput.title);
    lines.push('');

    // 元数据
    lines.push('<!-- AI Generated Overview -->');
    lines.push(`- **生成时间**: ${new Date(aiOutput.metadata.generatedAt).toLocaleString('zh-CN')}`);
    lines.push(`- **模型**: ${aiOutput.metadata.model}`);
    lines.push('');

    // 项目统计
    lines.push('## 项目统计');
    lines.push('');
    lines.push(`| 指标 | 数值 |`);
    lines.push(`|------|------|`);
    lines.push(`| 文件总数 | ${codeMap.summary.totalFiles} |`);
    lines.push(`| 代码行数 | ${codeMap.summary.totalLines} |`);
    lines.push(`| 模块数量 | ${codeMap.summary.totalModules} |`);
    lines.push(`| 导出符号 | ${codeMap.summary.totalExports} |`);
    lines.push(`| 类型定义 | ${codeMap.summary.totalTypes} |`);
    lines.push('');

    // 架构信息
    if (aiOutput.architecture) {
      lines.push('## 架构分析');
      lines.push('');
      lines.push(`- **架构模式**: ${aiOutput.architecture.pattern || '未识别'}`);
      lines.push('');

      if (aiOutput.architecture.layers && aiOutput.architecture.layers.length > 0) {
        lines.push('### 分层结构');
        lines.push('');
        for (const layer of aiOutput.architecture.layers) {
          lines.push(`#### ${layer.name}`);
          lines.push(`- **职责**: ${layer.responsibility}`);
          if (layer.modules.length > 0) {
            lines.push(`- **模块**: ${layer.modules.join(', ')}`);
          }
          lines.push('');
        }
      }

      if (aiOutput.architecture.metrics) {
        lines.push('### 架构指标');
        lines.push('');
        lines.push(`- **耦合度**: ${aiOutput.architecture.metrics.coupling}`);
        lines.push(`- **内聚度**: ${aiOutput.architecture.metrics.cohesion}`);
        lines.push(`- **复杂度**: ${aiOutput.architecture.metrics.complexity}`);
        lines.push('');
      }
    }

    // AI 生成的内容
    lines.push('## 项目概述');
    lines.push('');
    lines.push(aiOutput.content);
    lines.push('');

    // 亮点模块
    if (aiOutput.highlights.length > 0) {
      lines.push('## 亮点模块');
      lines.push('');
      for (const highlight of aiOutput.highlights) {
        lines.push(`- ${highlight}`);
      }
      lines.push('');
    }

    // 模块列表（简要）
    lines.push('## 模块列表');
    lines.push('');
    lines.push('| 模块路径 | 导出数 | 依赖数 |');
    lines.push('|----------|--------|--------|');

    for (const mod of codeMap.modules.slice(0, 20)) {
      const exportsCount = mod.exports.length;
      const depsCount = mod.dependencies.length;
      const relPath = path.relative(codeMap.project.rootDir, mod.path);
      lines.push(`| ${relPath} | ${exportsCount} | ${depsCount} |`);
    }

    if (codeMap.modules.length > 20) {
      lines.push(`| ... | ... | ... |`);
    }

    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('*由 CodeMap AI Generator 生成*');

    return lines.join('\n');
  }

  /**
   * 读取已保存的概述
   */
  async read(): Promise<string | null> {
    const outputPath = path.join(this.outputDir, this.filename);

    try {
      return await fs.readFile(outputPath, 'utf-8');
    } catch {
      return null;
    }
  }

  /**
   * 检查概述是否存在
   */
  async exists(): Promise<boolean> {
    const outputPath = path.join(this.outputDir, this.filename);

    try {
      await fs.access(outputPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取输出文件路径
   */
  getOutputPath(): string {
    return path.join(this.outputDir, this.filename);
  }

  /**
   * 是否启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

/**
 * 创建 AI Overview Generator 实例
 */
export function createAIOverviewGenerator(config: AIOverviewConfig): AIOverviewGenerator {
  return new AIOverviewGenerator(config);
}
