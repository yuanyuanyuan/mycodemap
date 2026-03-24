/**
 * [META] since:2026-03 | owner:codemap-team | stable:false
 * [WHY] @version 2.5
 */

/**
 * 工作流结果融合器
 * 实现跨阶段结果传递和融合
 *
 * @module WorkflowResultFusion
 * @version 2.5
 *
 * 设计参考: REFACTOR_RESULT_FUSION_DESIGN.md §8.1
 */

import type { UnifiedResult } from '../types.js';
import type { WorkflowPhase, PhaseArtifacts } from './types.js';

// ============================================
// 类型定义
// ============================================

/**
 * 工作流融合上下文
 * 存储跨阶段的结果数据
 */
export interface WorkflowFusionContext {
  /** 各阶段的结果映射 */
  phaseResults: Map<WorkflowPhase, UnifiedResult[]>;
  /** 累积的上下文（去重后的结果） */
  accumulatedContext: Map<string, UnifiedResult>;
}

/**
 * 融合选项
 */
export interface FusionOptions {
  /** 限制返回结果数量 */
  topK?: number;
  /** 是否应用阶段权重 */
  applyPhaseWeights?: boolean;
  /** 关键词权重 */
  keywordWeights?: Record<string, number>;
}

// ============================================
// 阶段权重配置
// ============================================

/**
 * 工作流阶段权重表
 * 越近期的阶段权重越高
 */
const PHASE_WEIGHTS: Record<WorkflowPhase, number> = {
  'find': 0.8,
  'read': 0.9,
  'link': 1.0,
  'show': 0.95
};

/**
 * 源到阶段的映射
 * 用于推断结果的来源阶段
 */
const SOURCE_TO_PHASE: Record<string, WorkflowPhase> = {
  'ast-grep': 'find',
  'codemap': 'read',
  'ai-feed': 'link',
  'rg-internal': 'find'
};

// ============================================
// WorkflowResultFusion 类
// ============================================

export class WorkflowResultFusion {
  /**
   * 创建空的融合上下文
   */
  static createEmptyContext(): WorkflowFusionContext {
    return {
      phaseResults: new Map(),
      accumulatedContext: new Map()
    };
  }

  /**
   * 从阶段产物构建融合上下文
   */
  static buildContextFromArtifacts(
    artifacts: Map<WorkflowPhase, PhaseArtifacts>
  ): WorkflowFusionContext {
    const context = this.createEmptyContext();

    for (const [phase, artifact] of artifacts) {
      if (artifact.results && artifact.results.length > 0) {
        context.phaseResults.set(phase, artifact.results);

        // 添加到累积上下文
        for (const result of artifact.results) {
          const key = this.getResultKey(result);
          context.accumulatedContext.set(key, result);
        }
      }
    }

    return context;
  }

  /**
   * 将新阶段结果与已有上下文合并
   *
   * @param newResults - 新阶段的结果
   * @param context - 当前融合上下文
   * @param currentPhase - 当前阶段
   * @param options - 融合选项
   * @returns 融合后的结果列表
   */
  mergeWithContext(
    newResults: UnifiedResult[],
    context: WorkflowFusionContext,
    currentPhase: WorkflowPhase,
    options: FusionOptions = {}
  ): UnifiedResult[] {
    const { topK = 20, applyPhaseWeights = true } = options;

    // 1. 存储新结果到阶段结果映射
    context.phaseResults.set(currentPhase, newResults);

    // 2. 合并所有历史结果
    const allResults = this.collectAllResults(context, newResults);

    // 3. 去重（保留最新/最高分的结果）
    const dedupedResults = this.deduplicateResults(allResults);

    // 4. 应用工作流阶段权重
    let weightedResults = dedupedResults;
    if (applyPhaseWeights) {
      weightedResults = this.applyWorkflowWeights(dedupedResults, context);
    }

    // 5. 应用关键词加权
    if (options.keywordWeights && Object.keys(options.keywordWeights).length > 0) {
      weightedResults = this.applyKeywordBoost(weightedResults, options.keywordWeights);
    }

    // 6. 按相关度排序
    const sortedResults = this.sortByRelevance(weightedResults);

    // 7. 更新累积上下文
    this.updateAccumulatedContext(context, sortedResults);

    // 8. 返回 Top-K 结果
    return sortedResults.slice(0, topK);
  }

  /**
   * 收集所有历史结果
   */
  private collectAllResults(
    context: WorkflowFusionContext,
    newResults: UnifiedResult[]
  ): UnifiedResult[] {
    const allResults: UnifiedResult[] = [];

    // 添加所有阶段的历史结果
    for (const results of context.phaseResults.values()) {
      allResults.push(...results);
    }

    // 添加新结果
    allResults.push(...newResults);

    return allResults;
  }

  /**
   * 去重结果（基于文件+行号）
   * 保留相关度更高的结果
   */
  private deduplicateResults(results: UnifiedResult[]): UnifiedResult[] {
    const seen = new Map<string, UnifiedResult>();

    for (const result of results) {
      const key = WorkflowResultFusion.getResultKey(result);

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
   * 应用工作流阶段权重
   * 根据结果来源的阶段调整相关度
   */
  applyWorkflowWeights(
    results: UnifiedResult[],
    context: WorkflowFusionContext
  ): UnifiedResult[] {
    return results.map(result => {
      // 推断结果来源的阶段
      const sourcePhase = this.inferPhase(result.source);
      const weight = PHASE_WEIGHTS[sourcePhase] || 0.5;

      return {
        ...result,
        relevance: Math.min(1, result.relevance * weight)
      };
    });
  }

  /**
   * 应用关键词加权
   */
  private applyKeywordBoost(
    results: UnifiedResult[],
    keywordWeights: Record<string, number>
  ): UnifiedResult[] {
    return results
      .map(result => {
        let boost = 0;
        for (const keyword of result.keywords || []) {
          boost += keywordWeights[keyword] || 0;
        }
        return {
          ...result,
          relevance: Math.min(1, result.relevance + boost)
        };
      })
      .sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * 按相关度排序
   */
  private sortByRelevance(results: UnifiedResult[]): UnifiedResult[] {
    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * 按工作流阶段优先级排序
   * 用于特定场景下的排序需求
   */
  sortByWorkflowPriority(results: UnifiedResult[]): UnifiedResult[] {
    return results.sort((a, b) => {
      const phaseA = this.inferPhase(a.source);
      const phaseB = this.inferPhase(b.source);

      // 按阶段权重排序（高权重优先）
      const weightDiff = PHASE_WEIGHTS[phaseB] - PHASE_WEIGHTS[phaseA];
      if (weightDiff !== 0) return weightDiff;

      // 同阶段按相关度排序
      return b.relevance - a.relevance;
    });
  }

  /**
   * 推断结果来源的阶段
   */
  private inferPhase(source: string): WorkflowPhase {
    return SOURCE_TO_PHASE[source] || 'find';
  }

  /**
   * 更新累积上下文
   */
  private updateAccumulatedContext(
    context: WorkflowFusionContext,
    results: UnifiedResult[]
  ): void {
    for (const result of results) {
      const key = WorkflowResultFusion.getResultKey(result);
      context.accumulatedContext.set(key, result);
    }
  }

  /**
   * 获取结果的唯一键
   */
  private static getResultKey(result: UnifiedResult): string {
    return `${result.file}:${result.line || ''}`;
  }

  /**
   * 获取特定阶段的结果
   */
  getPhaseResults(
    context: WorkflowFusionContext,
    phase: WorkflowPhase
  ): UnifiedResult[] {
    return context.phaseResults.get(phase) || [];
  }

  /**
   * 获取累积上下文中的所有结果
   */
  getAccumulatedResults(context: WorkflowFusionContext): UnifiedResult[] {
    return Array.from(context.accumulatedContext.values());
  }

  /**
   * 清除特定阶段的结果
   */
  clearPhaseResults(
    context: WorkflowFusionContext,
    phase: WorkflowPhase
  ): void {
    context.phaseResults.delete(phase);

    // 重新构建累积上下文
    context.accumulatedContext.clear();
    for (const results of context.phaseResults.values()) {
      for (const result of results) {
        const key = WorkflowResultFusion.getResultKey(result);
        context.accumulatedContext.set(key, result);
      }
    }
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 创建结果融合器实例
 */
export function createResultFusion(): WorkflowResultFusion {
  return new WorkflowResultFusion();
}

/**
 * 快速融合结果（便捷函数）
 */
export function fuseResults(
  newResults: UnifiedResult[],
  context: WorkflowFusionContext,
  currentPhase: WorkflowPhase,
  options?: FusionOptions
): UnifiedResult[] {
  const fusion = createResultFusion();
  return fusion.mergeWithContext(newResults, context, currentPhase, options);
}

export default WorkflowResultFusion;
