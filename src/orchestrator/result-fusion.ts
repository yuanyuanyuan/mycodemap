/**
 * ResultFusion - 多工具结果融合模块
 *
 * 负责将多个工具（CodeMap 核心、ast-grep、AI 饲料等）的输出进行统一格式转换、
 * 加权合并、去重、排序和截断。
 *
 * 融合策略（按顺序执行）：
 * 1. 加权合并 - 按工具权重调整 relevance
 * 2. AI 饲料融合 - 合并 AI 饲料结果（预留接口）
 * 3. 风险加权 - 基于 riskLevel 调整 relevance
 * 4. 去重 - 基于 file:line 作为 key
 * 5. 排序 - 按 relevance 降序（影响分析场景按风险排序）
 * 6. 关键词加权 - 提升匹配关键词的结果
 * 7. 截断 - Top-K + Token 限制
 */

import type { UnifiedResult } from './types';

/**
 * 融合选项配置
 */
export interface FusionOptions {
  /** 返回结果数量上限，默认 8 */
  topK?: number;
  /** 关键词权重映射 */
  keywordWeights?: Record<string, number>;
  /** 意图类型，影响排序策略 */
  intent?: string;
  /** 每个结果的最大 token 数，默认 160 */
  maxTokens?: number;
}

/**
 * 工具权重配置
 */
const TOOL_WEIGHTS: Record<string, number> = {
  'ast-grep': 1.0,      // AST 分析最准确
  'codemap': 0.9,       // 结构分析次之
  'ai-feed': 0.85,      // AI 饲料数据
  'rg-internal': 0.7    // 文本搜索兜底（仅内部调试用）
};

/**
 * 默认工具权重
 */
const DEFAULT_TOOL_WEIGHT = 0.5;

/**
 * 风险等级调整值
 */
const RISK_BOOST: Record<string, number> = {
  'high': -0.1,    // 高风险文件降权，提示谨慎
  'medium': 0,     // 中风险文件不做调整
  'low': 0.05      // 低风险文件加权，推荐优先修改
};

/**
 * 风险排序优先级
 */
const RISK_ORDER: Record<string, number> = {
  'high': 0,
  'medium': 1,
  'low': 2
};

/**
 * ResultFusion 类 - 多工具结果融合器
 */
export class ResultFusion {
  /**
   * 多工具结果融合
   *
   * @param resultsByTool - 按工具分组的的结果映射
   * @param options - 融合选项
   * @returns 融合后的统一结果数组
   */
  fuse(resultsByTool: Map<string, UnifiedResult[]>, options: FusionOptions): UnifiedResult[] {
    const topK = options.topK ?? 8;
    const keywordWeights = options.keywordWeights ?? {};
    const maxTokens = options.maxTokens ?? 160;

    // 1. 加权合并
    let allResults = this.applyToolWeights(resultsByTool);

    // 2. 风险加权（v2.4）
    allResults = this.applyRiskBoost(allResults);

    // 3. 去重（基于文件+行号）
    allResults = this.deduplicate(allResults);

    // 4. 排序
    allResults = this.sortResults(allResults, options.intent);

    // 5. 关键词加权
    allResults = this.applyKeywordBoost(allResults, keywordWeights);

    // 6. Token 截断
    allResults = this.truncateResults(allResults, maxTokens);

    // 7. Top-K 裁剪
    return allResults.slice(0, topK);
  }

  /**
   * 获取工具权重
   */
  private getToolWeight(tool: string): number {
    return TOOL_WEIGHTS[tool] ?? DEFAULT_TOOL_WEIGHT;
  }

  /**
   * 应用工具权重
   */
  private applyToolWeights(resultsByTool: Map<string, UnifiedResult[]>): UnifiedResult[] {
    const allResults: UnifiedResult[] = [];

    for (const [tool, results] of resultsByTool) {
      const toolWeight = this.getToolWeight(tool);
      const weighted = results.map(r => ({
        ...r,
        relevance: r.relevance * toolWeight
      }));
      allResults.push(...weighted);
    }

    return allResults;
  }

  /**
   * 应用风险加权
   * 根据 riskLevel 调整 relevance
   */
  private applyRiskBoost(results: UnifiedResult[]): UnifiedResult[] {
    return results.map(r => {
      const riskLevel = r.metadata?.riskLevel;
      if (!riskLevel) return r;

      const boost = RISK_BOOST[riskLevel] ?? 0;
      const newRelevance = Math.max(0, Math.min(1, r.relevance + boost));

      return {
        ...r,
        relevance: newRelevance
      };
    });
  }

  /**
   * 去重
   * 基于 file:line 作为 key，保留 relevance 更高的结果
   */
  private deduplicate(results: UnifiedResult[]): UnifiedResult[] {
    const seen = new Map<string, UnifiedResult>();

    for (const result of results) {
      const key = `${result.file}:${result.line ?? ''}`;
      const existing = seen.get(key);

      if (!existing) {
        seen.set(key, result);
      } else if (result.relevance > existing.relevance) {
        // 保留分数更高的结果
        seen.set(key, result);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * 排序结果
   * - impact 场景：按风险等级排序（high > medium > low），同等级按 relevance
   * - 其他场景：按 relevance 降序
   */
  private sortResults(results: UnifiedResult[], intent?: string): UnifiedResult[] {
    if (intent === 'impact') {
      return this.sortByRiskImpact(results);
    }

    // 默认按 relevance 降序
    return [...results].sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * 按风险影响排序
   * 高风险优先，同风险等级按 relevance 排序
   */
  private sortByRiskImpact(results: UnifiedResult[]): UnifiedResult[] {
    return [...results].sort((a, b) => {
      const riskA = a.metadata?.riskLevel ?? 'low';
      const riskB = b.metadata?.riskLevel ?? 'low';

      const riskDiff = RISK_ORDER[riskA] - RISK_ORDER[riskB];
      if (riskDiff !== 0) return riskDiff;

      // 同风险等级按 relevance 降序
      return b.relevance - a.relevance;
    });
  }

  /**
   * 应用关键词加权
   */
  private applyKeywordBoost(
    results: UnifiedResult[],
    keywordWeights: Record<string, number>
  ): UnifiedResult[] {
    if (Object.keys(keywordWeights).length === 0) {
      return results;
    }

    return results.map(r => {
      let boost = 0;
      for (const keyword of r.keywords) {
        boost += keywordWeights[keyword] ?? 0;
      }

      const newRelevance = Math.max(0, Math.min(1, r.relevance + boost));

      return {
        ...r,
        relevance: newRelevance
      };
    }).sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * 对结果内容进行 token 截断
   */
  private truncateResults(results: UnifiedResult[], maxTokens: number): UnifiedResult[] {
    return results.map(r => ({
      ...r,
      content: truncateByToken(r.content, maxTokens)
    }));
  }
}

/**
 * 按 token 数量截断内容
 *
 * 使用简单估算：
 * - 英文约 4 字符 = 1 token
 * - 中文约 1 字符 = 1 token
 *
 * @param content - 原始内容
 * @param maxTokens - 最大 token 数
 * @returns 截断后的内容
 */
export function truncateByToken(content: string, maxTokens: number): string {
  // 简单估算：按空格分割的词 + 中文字符数
  const words = content.split(/\s+/);
  let tokenCount = 0;
  const result: string[] = [];

  for (const word of words) {
    // 统计中文字符数量
    const chineseChars = (word.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishChars = word.length - chineseChars;

    // 英文按 4 字符 = 1 token 估算
    const wordTokens = chineseChars + Math.ceil(englishChars / 4);

    if (tokenCount + wordTokens > maxTokens) {
      // 超过限制，添加省略号并退出
      if (result.length > 0) {
        return result.join(' ') + '...';
      }
      // 如果第一个词就超长了，截断该词
      if (chineseChars > 0) {
        const availableTokens = maxTokens - tokenCount;
        if (availableTokens > 0) {
          // 取前 availableTokens 个中文字符
          let taken = 0;
          let truncated = '';
          for (const char of word) {
            if (taken >= availableTokens) break;
            if (/[\u4e00-\u9fa5]/.test(char)) {
              taken++;
            }
            truncated += char;
          }
          return truncated + '...';
        }
      }
      return '...';
    }

    result.push(word);
    tokenCount += wordTokens;
  }

  return content;
}
