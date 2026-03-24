/**
 * [META] ToolOrchestrator - 工具编排器
 * [WHY] 负责执行工具、超时控制、错误隔离、回退级联，是连接 IntentRouter、适配器和结果融合的"胶水"组件。
 */

import type {
  UnifiedResult,
  CodemapIntent,
  IntentType,
  ExecutionIntentType,
  ToolOptions
} from './types.js';
import { calculateConfidence, getThreshold, type ConfidenceResult } from './confidence.js';
import type { ToolAdapter } from './adapters/base-adapter.js';

/**
 * 默认超时时间（毫秒）
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * 预定义回退链（仅内部调试用，默认关闭）
 * 用户可见输出必须走 CodeMap 语义链路
 */
const FALLBACK_CHAINS: Record<string, string[]> = {
  'ast-grep': ['rg-internal'],   // AST搜索 → 文本搜索（内部）
  'codemap': ['rg-internal'],    // 结构分析 → 文本搜索（内部）
};

/**
 * 执行结果
 */
export interface ExecutionResult {
  results: UnifiedResult[];
  tool: string;
  confidence: ConfidenceResult;
}

/**
 * 安全执行结果
 */
export interface SafeExecutionResult {
  results: UnifiedResult[];
  error?: Error;
}

/**
 * ToolOrchestrator 类 - 工具编排器核心控制器
 */
export class ToolOrchestrator {
  /** 超时配置（毫秒） */
  private readonly DEFAULT_TIMEOUT = DEFAULT_TIMEOUT;

  /** 工具适配器映射 */
  private adapters: Map<string, ToolAdapter> = new Map();

  /** 回退链配置 */
  private fallbackChains: Record<string, string[]>;

  /** 已执行过的工具（用于防止回退链循环） */
  private executedTools: Set<string> = new Set();

  /**
   * 构造函数
   * @param fallbackChains 自定义回退链配置
   */
  constructor(fallbackChains?: Record<string, string[]>) {
    this.fallbackChains = fallbackChains ?? FALLBACK_CHAINS;
  }

  /**
   * 注册工具适配器
   * @param adapter 工具适配器实例
   */
  registerAdapter(adapter: ToolAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * 将 CodemapIntent 转换为适配器调用参数
   * @param intent 意图对象
   * @returns [keywords, options] 元组
   */
  private convertIntentToAdapterArgs(intent: CodemapIntent): [string[], ToolOptions] {
    const keywords = intent.keywords || [];
    const effectiveIntent = intent.executionIntent ?? intent.intent;
    const options: ToolOptions = {
      intent: effectiveIntent,
      targets: intent.targets,
      scope: intent.scope,
      timeout: DEFAULT_TIMEOUT,
    };
    return [keywords, options];
  }

  /**
   * 带超时控制的工具执行
   *
   * 使用 AbortController + Promise.race 实现真正的超时控制
   *
   * @param tool 工具名称
   * @param intent 意图对象
   * @param timeout 超时时间（毫秒），默认 30 秒
   * @returns 工具执行结果数组
   */
  async runToolWithTimeout(
    tool: string,
    intent: CodemapIntent,
    timeout: number = this.DEFAULT_TIMEOUT
  ): Promise<UnifiedResult[]> {
    // console.debug(`执行工具: ${tool}, 超时: ${timeout}ms`);

    const adapter = this.adapters.get(tool);
    if (!adapter) {
      // console.warn(`工具 ${tool} 未注册，返回空结果`);
      return [];
    }

    // 检查工具是否可用
    if (!(await adapter.isAvailable())) {
      // console.warn(`工具 ${tool} 不可用，返回空结果`);
      return [];
    }

    // 将 intent 转换为适配器调用参数
    const [keywords, options] = this.convertIntentToAdapterArgs(intent);

    // 创建 AbortController 用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    // 将 signal 添加到 options
    const optionsWithSignal = {
      ...options,
      signal: controller.signal,
      timeout,
    };

    // 使用 Promise.race 实现硬超时
    const executionPromise = adapter.execute(keywords, optionsWithSignal);

    try {
      const results = await Promise.race([
        executionPromise,
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new DOMException('工具执行超时', 'AbortError'));
          });
        })
      ]);
      // console.debug(`工具 ${tool} 执行成功，返回 ${results.length} 条结果`);
      return results;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // console.warn(`工具 ${tool} 执行超时 (${timeout}ms)`);
      } else {
        // console.error(`工具 ${tool} 执行失败: ${error}`);
      }
      // 超时或错误时返回空结果，触发回退
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 错误隔离的工具执行
   *
   * 包装工具执行，捕获所有异常
   * 错误时返回空结果而非抛出异常（除致命错误外）
   *
   * @param tool 工具名称
   * @param intent 意图对象
   * @returns 安全执行结果
   */
  async runToolSafely(tool: string, intent: CodemapIntent): Promise<SafeExecutionResult> {
    try {
      const results = await this.runToolWithTimeout(tool, intent);
      return { results };
    } catch (error) {
      // console.error(`工具 ${tool} 执行异常:`, error);
      return { results: [], error: error as Error };
    }
  }

  /**
   * 回退执行
   *
   * 执行主工具并计算置信度
   * 当置信度 < medium 阈值时，依次执行回退链
   * 合并主工具和回退工具的结果（去重 + 排序）
   * 达到阈值或回退链耗尽后停止
   *
   * @param intent 意图对象
   * @param primaryTool 主工具名称
   * @returns 执行结果
   */
  async executeWithFallback(
    intent: CodemapIntent,
    primaryTool: string
  ): Promise<ExecutionResult> {
    // 重置已执行工具集合
    this.executedTools.clear();

    const effectiveIntent = intent.executionIntent ?? intent.intent;

    // 1. 执行主工具
    let results = await this.runToolWithTimeout(primaryTool, intent);
    let confidence = calculateConfidence(results, effectiveIntent as import('./confidence.js').IntentType);

    // console.debug(`主工具 ${primaryTool} 置信度: ${confidence.score.toFixed(2)} (${confidence.level})`);

    // 2. 检查是否需要回退（低于当前 intent 的中等阈值）
    const threshold = this.getMediumThreshold(effectiveIntent);

    if (confidence.score < threshold) {
      const fallbackTools = this.fallbackChains[primaryTool] || [];

      for (const fallbackTool of fallbackTools) {
        // 防止循环执行同一工具
        if (this.executedTools.has(fallbackTool)) {
          // console.warn(`跳过已执行的工具: ${fallbackTool}`);
          continue;
        }

        this.executedTools.add(fallbackTool);
        // console.warn(`[LOW CONFIDENCE] ${primaryTool} confidence: ${confidence.score.toFixed(2)}, trying ${fallbackTool}...`);

        const fallbackResults = await this.runToolWithTimeout(fallbackTool, intent);
        const fallbackConfidence = calculateConfidence(
          fallbackResults,
          effectiveIntent as import('./confidence.js').IntentType
        );

        // 3. 合并结果（去重 + 排序）
        results = this.mergeResults(results, fallbackResults);

        // 更新置信度（取最大值）
        confidence = {
          score: Math.max(confidence.score, fallbackConfidence.score),
          level: confidence.score > fallbackConfidence.score ? confidence.level : fallbackConfidence.level,
          reasons: [...confidence.reasons, ...fallbackConfidence.reasons]
        };

        // console.debug(`回退工具 ${fallbackTool} 置信度: ${fallbackConfidence.score.toFixed(2)}, 合并后: ${confidence.score.toFixed(2)}`);

        // 4. 达到阈值则停止回退
        if (confidence.score >= threshold) {
          confidence.reasons.push(`回退到 ${fallbackTool} 后达到阈值`);
          break;
        }
      }
    }

    return { results, tool: primaryTool, confidence };
  }

  /**
   * 并行执行
   *
   * 并行执行多个工具
   * 每个工具独立超时控制
   * 返回按工具分组的结果
   *
   * @param intent 意图对象
   * @param tools 工具名称数组
   * @returns 按工具分组的结果映射
   */
  async executeParallel(
    intent: CodemapIntent,
    tools: string[]
  ): Promise<Map<string, UnifiedResult[]>> {
    const resultsMap = new Map<string, UnifiedResult[]>();

    // 并行执行所有工具
    const promises = tools.map(async (tool) => {
      const results = await this.runToolWithTimeout(tool, intent);
      return { tool, results };
    });

    const allResults = await Promise.all(promises);

    // 收集结果
    for (const { tool, results } of allResults) {
      resultsMap.set(tool, results);
    }

    return resultsMap;
  }

  /**
   * 合并结果（去重 + 排序）
   */
  private mergeResults(
    primary: UnifiedResult[],
    fallback: UnifiedResult[]
  ): UnifiedResult[] {
    // 合并所有结果
    const allResults = [...primary, ...fallback];

    // 去重（基于 file:line）
    const seen = new Map<string, UnifiedResult>();

    for (const result of allResults) {
      const key = `${result.file}:${result.line ?? ''}`;
      const existing = seen.get(key);

      if (!existing) {
        seen.set(key, result);
      } else if (result.relevance > existing.relevance) {
        // 保留分数更高的结果
        seen.set(key, result);
      }
    }

    // 按 relevance 降序排序
    return Array.from(seen.values()).sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * 获取中等阈值
   */
  private getMediumThreshold(intent: IntentType | ExecutionIntentType): number {
    return getThreshold(intent as import('./confidence.js').IntentType, 'medium');
  }
}

// 重新导出 ToolAdapter 类型，保持向后兼容
export type { ToolAdapter } from './adapters/base-adapter.js';
