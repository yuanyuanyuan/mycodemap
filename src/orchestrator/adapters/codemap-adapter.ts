// [META] since:2026-03-02 | owner:orchestrator-team | stable:true
// [WHY] Adapter implementing ToolAdapter interface for CodeMap tool integration with unified result format

/**
 * CodemapAdapter - CodeMap 工具适配器
 * 实现 ToolAdapter 接口，供编排器调用
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { UnifiedResult, ToolOptions } from '../types.js';
import type { ToolAdapter } from './base-adapter.js';
import { ImpactCommand } from '../../cli/commands/impact.js';
import { DepsCommand } from '../../cli/commands/deps.js';
import { ComplexityCommand } from '../../cli/commands/complexity.js';
import { resolveOutputDir } from '../../cli/paths.js';

/**
 * CodemapAdapter 配置选项
 */
export interface CodemapAdapterOptions {
  /** Codemap 数据目录路径 */
  codemapPath?: string;
  /** 默认意图类型 */
  defaultIntent?: 'impact' | 'dependency' | 'complexity';
  /** 默认分析范围 */
  defaultScope?: 'direct' | 'transitive';
}

/**
 * CodemapAdapter 实现
 * 提供统一的 CodeMap 工具调用接口
 */
export class CodemapAdapter implements ToolAdapter {
  /** 适配器名称 */
  name = 'codemap';

  /** 结果权重 */
  weight = 0.9;

  private codemapPath: string;
  private defaultIntent: 'impact' | 'dependency' | 'complexity';
  private defaultScope: 'direct' | 'transitive';

  constructor(options: CodemapAdapterOptions = {}) {
    this.codemapPath = options.codemapPath || resolveOutputDir().outputDir;
    this.defaultIntent = options.defaultIntent || 'impact';
    this.defaultScope = options.defaultScope || 'direct';
  }

  /**
   * 检查 CodeMap 是否可用
   * 检查 codemap.json 是否存在（优先 .mycodemap，回退 .codemap）
   */
  async isAvailable(): Promise<boolean> {
    try {
      const configPath = join(this.codemapPath, 'codemap.json');
      await readFile(configPath, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 执行 CodeMap 分析
   * 根据 keywords 和 options 调用对应的命令
   * @param keywords - 搜索关键词列表（第一个关键词可能包含意图信息）
   * @param options - 工具选项，可包含 intent、scope、targets 等
   */
  async execute(keywords: string[], options: ToolOptions): Promise<UnifiedResult[]> {
    // 从 options 中提取意图和配置
    const intent = (options.intent as 'impact' | 'dependency' | 'complexity') || this.defaultIntent;
    const scope = (options.scope as 'direct' | 'transitive') || this.defaultScope;
    const targets = (options.targets as string[]) || keywords;
    const topK = options.topK ?? 8;

    // 如果没有目标，返回空结果
    if (targets.length === 0) {
      return [];
    }

    // 根据 intent 路由到对应命令
    switch (intent) {
      case 'impact':
        return this.executeImpact(targets, scope, topK, keywords);
      case 'dependency':
        return this.executeDeps(targets, topK, keywords);
      case 'complexity':
        return this.executeComplexity(targets, topK, keywords);
      default:
        // 默认执行 impact 分析
        return this.executeImpact(targets, scope, topK, keywords);
    }
  }

  /**
   * 执行影响分析
   */
  private async executeImpact(
    targets: string[],
    scope: 'direct' | 'transitive',
    topK: number,
    keywords: string[]
  ): Promise<UnifiedResult[]> {
    try {
      const command = new ImpactCommand();
      const args = { targets, scope };
      const results = await command.runEnhanced(args);

      // 添加关键词信息到结果
      const resultsWithKeywords = results.map(result => ({
        ...result,
        keywords: [...new Set([...result.keywords, ...keywords])]
      }));

      // 限制返回结果数量
      return resultsWithKeywords.slice(0, topK);
    } catch (error) {
      console.warn(`Impact 分析失败: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * 执行依赖分析
   */
  private async executeDeps(
    targets: string[],
    topK: number,
    keywords: string[]
  ): Promise<UnifiedResult[]> {
    try {
      const command = new DepsCommand();
      const args = { targets };
      const results = await command.runEnhanced(args);

      // 添加关键词信息到结果
      const resultsWithKeywords = results.map(result => ({
        ...result,
        keywords: [...new Set([...result.keywords, ...keywords])]
      }));

      // 限制返回结果数量
      return resultsWithKeywords.slice(0, topK);
    } catch (error) {
      console.warn(`Dependency 分析失败: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * 执行复杂度分析
   */
  private async executeComplexity(
    targets: string[],
    topK: number,
    keywords: string[]
  ): Promise<UnifiedResult[]> {
    try {
      const command = new ComplexityCommand();
      const args = { targets };
      const results = await command.runEnhanced(args);

      // 添加关键词信息到结果
      const resultsWithKeywords = results.map(result => ({
        ...result,
        keywords: [...new Set([...result.keywords, ...keywords])]
      }));

      // 限制返回结果数量
      return resultsWithKeywords.slice(0, topK);
    } catch (error) {
      console.warn(`Complexity 分析失败: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
}

/**
 * 创建 CodemapAdapter 实例的工厂函数
 */
export function createCodemapAdapter(options?: CodemapAdapterOptions): ToolAdapter {
  return new CodemapAdapter(options);
}
