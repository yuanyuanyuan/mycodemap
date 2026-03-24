/**
 * [META] since:2026-03 | owner:codemap-team | stable:false
 * [WHY] @version 2.5
 */

/**
 * 阶段结果继承器
 * 管理工作流阶段间的结果继承逻辑
 *
 * @module PhaseInheritance
 * @version 2.5
 *
 * 设计参考: REFACTOR_RESULT_FUSION_DESIGN.md §8.2
 */

import type { UnifiedResult } from '../types.js';
import type { WorkflowPhase } from './types.js';
import type { WorkflowFusionContext } from './result-fusion.js';

// ============================================
// 类型定义
// ============================================

/**
 * 继承策略
 */
export type InheritanceStrategy =
  | 'all'           // 继承所有结果
  | 'code-analysis' // 仅继承代码分析结果
  | 'risk-analysis' // 仅继承风险分析结果
  | 'none';         // 不继承

/**
 * 阶段继承配置
 */
export interface PhaseInheritanceConfig {
  /** 阶段名称 */
  phase: WorkflowPhase;
  /** 继承策略 */
  strategy: InheritanceStrategy;
  /** 过滤特定来源（可选） */
  filterSources?: string[];
  /** 排除特定来源（可选） */
  excludeSources?: string[];
  /** 最小相关度阈值（可选） */
  minRelevance?: number;
}

// ============================================
// 阶段继承配置表
// ============================================

/**
 * 默认阶段继承配置
 * 定义每个阶段应该继承哪些前一阶段的结果
 */
const DEFAULT_INHERITANCE_CONFIG: Record<WorkflowPhase, PhaseInheritanceConfig> = {
  'find': {
    phase: 'find',
    strategy: 'none',
  },
  'read': {
    phase: 'read',
    strategy: 'code-analysis',
    filterSources: ['ast-grep', 'codemap'],
  },
  'link': {
    phase: 'link',
    strategy: 'all',
  },
  'show': {
    phase: 'show',
    strategy: 'all',
    minRelevance: 0.4,
  }
};

// ============================================
// PhaseInheritance 类
// ============================================

export class PhaseInheritance {
  private config: Map<WorkflowPhase, PhaseInheritanceConfig>;

  constructor(customConfig?: Partial<Record<WorkflowPhase, Partial<PhaseInheritanceConfig>>>) {
    // 初始化配置，合并默认配置和自定义配置
    this.config = new Map();

    for (const [phase, defaultConfig] of Object.entries(DEFAULT_INHERITANCE_CONFIG)) {
      const customPhaseConfig = customConfig?.[phase as WorkflowPhase];
      this.config.set(phase as WorkflowPhase, {
        ...defaultConfig,
        ...customPhaseConfig,
      });
    }
  }

  /**
   * 获取下一阶段应该继承的结果
   *
   * 根据当前阶段的配置，从历史结果中筛选出应该继承的结果
   *
   * @param currentPhase - 当前阶段
   * @param context - 工作流融合上下文（包含所有历史结果）
   * @returns 应该继承的结果列表
   */
  getInheritedResults(
    currentPhase: WorkflowPhase,
    context: WorkflowFusionContext
  ): UnifiedResult[] {
    const config = this.config.get(currentPhase);

    if (!config || config.strategy === 'none') {
      return [];
    }

    // 收集所有历史结果
    let allResults = this.collectAllHistoricalResults(context, currentPhase);

    // 应用继承策略过滤
    allResults = this.applyStrategyFilter(allResults, config);

    // 应用来源过滤
    if (config.filterSources && config.filterSources.length > 0) {
      allResults = this.filterBySources(allResults, config.filterSources);
    }

    // 应用来源排除
    if (config.excludeSources && config.excludeSources.length > 0) {
      allResults = this.excludeSources(allResults, config.excludeSources);
    }

    // 应用相关度阈值
    if (config.minRelevance !== undefined) {
      allResults = this.filterByRelevance(allResults, config.minRelevance);
    }

    // 去重
    allResults = this.deduplicateResults(allResults);

    // 按相关度排序
    return this.sortByRelevance(allResults);
  }

  /**
   * 收集所有历史结果（当前阶段之前的结果）
   */
  private collectAllHistoricalResults(
    context: WorkflowFusionContext,
    currentPhase: WorkflowPhase
  ): UnifiedResult[] {
    const results: UnifiedResult[] = [];
    const phaseOrder: WorkflowPhase[] = ['find', 'read', 'link', 'show'];
    const currentIndex = phaseOrder.indexOf(currentPhase);

    // 只收集当前阶段之前的结果
    for (let i = 0; i < currentIndex; i++) {
      const phase = phaseOrder[i];
      const phaseResults = context.phaseResults.get(phase);
      if (phaseResults) {
        results.push(...phaseResults);
      }
    }

    return results;
  }

  /**
   * 应用继承策略过滤
   */
  private applyStrategyFilter(
    results: UnifiedResult[],
    config: PhaseInheritanceConfig
  ): UnifiedResult[] {
    switch (config.strategy) {
      case 'all':
        return results;

      case 'code-analysis':
        return results.filter(r =>
          r.source === 'ast-grep' ||
          r.source === 'codemap' ||
          r.type === 'code' ||
          r.type === 'symbol'
        );

      case 'risk-analysis':
        return results.filter(r =>
          r.source === 'ai-feed' ||
          r.type === 'risk-assessment'
        );

      case 'none':
      default:
        return [];
    }
  }

  /**
   * 按来源过滤结果
   */
  private filterBySources(
    results: UnifiedResult[],
    sources: string[]
  ): UnifiedResult[] {
    return results.filter(r => sources.includes(r.source));
  }

  /**
   * 排除特定来源的结果
   */
  private excludeSources(
    results: UnifiedResult[],
    sources: string[]
  ): UnifiedResult[] {
    return results.filter(r => !sources.includes(r.source));
  }

  /**
   * 按相关度阈值过滤
   */
  private filterByRelevance(
    results: UnifiedResult[],
    minRelevance: number
  ): UnifiedResult[] {
    return results.filter(r => r.relevance >= minRelevance);
  }

  /**
   * 去重结果
   */
  private deduplicateResults(results: UnifiedResult[]): UnifiedResult[] {
    const seen = new Map<string, UnifiedResult>();

    for (const result of results) {
      const key = this.getResultKey(result);

      if (!seen.has(key)) {
        seen.set(key, result);
      } else {
        // 保留分数更高的
        const existing = seen.get(key)!;
        if (result.relevance > existing.relevance) {
          seen.set(key, result);
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * 按相关度排序
   */
  private sortByRelevance(results: UnifiedResult[]): UnifiedResult[] {
    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * 获取结果的唯一键
   */
  private getResultKey(result: UnifiedResult): string {
    return `${result.file}:${result.line || ''}`;
  }

  /**
   * 获取阶段的继承配置
   */
  getConfig(phase: WorkflowPhase): PhaseInheritanceConfig | undefined {
    return this.config.get(phase);
  }

  /**
   * 更新阶段继承配置
   */
  updateConfig(
    phase: WorkflowPhase,
    config: Partial<PhaseInheritanceConfig>
  ): void {
    const existing = this.config.get(phase);
    if (existing) {
      this.config.set(phase, { ...existing, ...config });
    }
  }

  /**
   * 设置自定义继承配置
   */
  setConfig(phase: WorkflowPhase, config: PhaseInheritanceConfig): void {
    this.config.set(phase, config);
  }

  /**
   * 获取所有阶段的继承配置
   */
  getAllConfigs(): Map<WorkflowPhase, PhaseInheritanceConfig> {
    return new Map(this.config);
  }

  /**
   * 重置为默认配置
   */
  resetToDefaults(): void {
    this.config.clear();
    for (const [phase, defaultConfig] of Object.entries(DEFAULT_INHERITANCE_CONFIG)) {
      this.config.set(phase as WorkflowPhase, { ...defaultConfig });
    }
  }

  /**
   * 检查阶段是否有继承结果
   */
  hasInheritedResults(
    phase: WorkflowPhase,
    context: WorkflowFusionContext
  ): boolean {
    const inherited = this.getInheritedResults(phase, context);
    return inherited.length > 0;
  }

  /**
   * 获取继承结果的统计信息
   */
  getInheritanceStats(
    phase: WorkflowPhase,
    context: WorkflowFusionContext
  ): {
    total: number;
    bySource: Record<string, number>;
    byType: Record<string, number>;
    avgRelevance: number;
  } {
    const inherited = this.getInheritedResults(phase, context);

    const bySource: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalRelevance = 0;

    for (const result of inherited) {
      bySource[result.source] = (bySource[result.source] || 0) + 1;
      byType[result.type] = (byType[result.type] || 0) + 1;
      totalRelevance += result.relevance;
    }

    return {
      total: inherited.length,
      bySource,
      byType,
      avgRelevance: inherited.length > 0 ? totalRelevance / inherited.length : 0
    };
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 创建阶段继承器实例
 */
export function createPhaseInheritance(
  customConfig?: Partial<Record<WorkflowPhase, Partial<PhaseInheritanceConfig>>>
): PhaseInheritance {
  return new PhaseInheritance(customConfig);
}

/**
 * 快速获取继承结果（便捷函数）
 */
export function getInheritedResults(
  phase: WorkflowPhase,
  context: WorkflowFusionContext,
  customConfig?: Partial<Record<WorkflowPhase, Partial<PhaseInheritanceConfig>>>
): UnifiedResult[] {
  const inheritance = createPhaseInheritance(customConfig);
  return inheritance.getInheritedResults(phase, context);
}

/**
 * 获取默认继承配置
 */
export function getDefaultInheritanceConfig(): Record<WorkflowPhase, PhaseInheritanceConfig> {
  return { ...DEFAULT_INHERITANCE_CONFIG };
}

export default PhaseInheritance;
