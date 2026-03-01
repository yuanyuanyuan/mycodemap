/**
 * CodemapAdapter - CodeMap 工具适配器
 * 实现 ToolAdapter 接口，供编排器调用
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ToolAdapter } from './base-adapter.js';
import type { UnifiedResult, ToolOptions } from '../types.js';
import { ImpactCommand } from '../../cli/commands/impact.js';
import { DepsCommand } from '../../cli/commands/deps.js';
import { ComplexityCommand } from '../../cli/commands/complexity.js';

/**
 * CodemapAdapter 配置选项
 */
export interface CodemapAdapterOptions {
  /** Codemap 数据目录路径 */
  codemapPath?: string;
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

  constructor(options: CodemapAdapterOptions = {}) {
    this.codemapPath = options.codemapPath || '.codemap';
  }

  /**
   * 检查 CodeMap 是否可用
   * 检查 .codemap/codemap.json 是否存在
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
   * 根据 options.intent 调用对应的命令
   */
  async execute(keywords: string[], options: ToolOptions): Promise<UnifiedResult[]> {
    const intent = (options.intent as string) || 'impact';
    const targets = (options.targets as string[]) || [];
    const scope = (options.scope as 'direct' | 'transitive') || 'direct';
    const topK = options.topK || 8;

    // 根据 intent 路由到对应命令
    switch (intent) {
      case 'impact':
        return this.executeImpact(targets, scope, topK, keywords);
      case 'dependency':
      case 'deps':
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
    const command = new ImpactCommand();
    const args = { targets, scope };
    const results = await command.runEnhanced(args);

    // 限制返回结果数量
    return results.slice(0, topK);
  }

  /**
   * 执行依赖分析
   */
  private async executeDeps(
    targets: string[],
    topK: number,
    keywords: string[]
  ): Promise<UnifiedResult[]> {
    const command = new DepsCommand();
    const args = { targets };
    const results = await command.runEnhanced(args);

    // 限制返回结果数量
    return results.slice(0, topK);
  }

  /**
   * 执行复杂度分析
   */
  private async executeComplexity(
    targets: string[],
    topK: number,
    keywords: string[]
  ): Promise<UnifiedResult[]> {
    const command = new ComplexityCommand();
    const args = { targets };
    const results = await command.runEnhanced(args);

    // 限制返回结果数量
    return results.slice(0, topK);
  }
}

/**
 * 创建 CodemapAdapter 实例的工厂函数
 */
export function createCodemapAdapter(options?: CodemapAdapterOptions): ToolAdapter {
  return new CodemapAdapter(options);
}
