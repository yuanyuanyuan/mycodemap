/**
 * 置信度计算机制
 * 用于评估搜索结果的质量，决定是否触发回退策略
 */

// 从 types.ts 导入需要的类型
import { UnifiedResult } from './types';

// IntentType 联合类型（8种意图）
type IntentType = 'impact' | 'dependency' | 'search' | 'documentation' | 
                  'complexity' | 'overview' | 'refactor' | 'reference';

// SearchResult 接口（兼容 UnifiedResult）
interface SearchResult extends UnifiedResult {}

// ConfidenceResult 接口
interface ConfidenceResult {
  score: number;                       // 0-1 的置信度分数
  level: 'high' | 'medium' | 'low';    // 置信度级别
  reasons: string[];                   // 置信度来源说明
}

// 每种 intent 的阈值配置
const CONFIDENCE_THRESHOLDS: Record<IntentType, { high: number; medium: number }> = {
  impact: { high: 0.7, medium: 0.4 },
  dependency: { high: 0.7, medium: 0.4 },
  search: { high: 0.5, medium: 0.25 },
  documentation: { high: 0.6, medium: 0.3 },
  complexity: { high: 0.7, medium: 0.4 },
  overview: { high: 0.8, medium: 0.5 },
  refactor: { high: 0.75, medium: 0.45 },
  reference: { high: 0.6, medium: 0.3 },
};

// 辅助函数：限制数值范围
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// 辅助函数：获取结果相关度（兼容多种字段格式）
function getRelevance(result: SearchResult): number {
  // 优先使用 relevance，其次 toolScore，最后 score
  if ('relevance' in result && typeof result.relevance === 'number') {
    return result.relevance;
  }
  if ('toolScore' in result && typeof result.toolScore === 'number') {
    return result.toolScore;
  }
  // 兼容可能存在的 score 字段
  const r = result as SearchResult & { score?: number };
  if ('score' in r && typeof r.score === 'number') {
    return r.score;
  }
  return 0;
}

// 辅助函数：获取结果匹配次数
function getMatchCount(result: SearchResult): number {
  // 基于 keywords 数量或返回 1（至少匹配一次）
  if (result.keywords && Array.isArray(result.keywords)) {
    return result.keywords.length;
  }
  return 1;
}

// 辅助函数：获取指定 intent 和 level 的阈值
function getThreshold(intent: IntentType, level: 'high' | 'medium'): number {
  return CONFIDENCE_THRESHOLDS[intent][level];
}

// 核心函数：计算置信度
export function calculateConfidence(
  results: SearchResult[],
  intent: IntentType
): ConfidenceResult {
  const reasons: string[] = [];
  
  // 1. 结果数量评分 (40%权重)
  // 最高5个结果得满分，按比例递减
  const countScore = Math.min(results.length / 5, 1);
  const countWeight = 0.4;
  
  if (results.length === 0) {
    reasons.push('未找到任何结果');
  } else if (results.length <= 5) {
    reasons.push(`找到 ${results.length} 个相关结果`);
  } else {
    reasons.push(`找到 ${results.length} 个相关结果（超出最优数量）`);
  }
  
  // 2. 结果质量评分 (40%权重)
  // 基于结果平均相关度
  let qualityScore = 0;
  if (results.length > 0) {
    const totalRelevance = results.reduce((sum, r) => sum + getRelevance(r), 0);
    qualityScore = totalRelevance / results.length;
  }
  const qualityWeight = 0.4;
  
  if (results.length > 0) {
    const avgRelevance = Math.round(qualityScore * 100);
    reasons.push(`平均相关度 ${avgRelevance}%`);
  }
  
  // 3. 场景匹配评分 (20%权重)
  // 基于 intent 类型的特定规则
  let scenarioScore = 0.5; // 默认中等
  switch (intent) {
    case 'search':
      // search 对数量敏感
      scenarioScore = results.length >= 3 ? 0.8 : results.length > 0 ? 0.5 : 0.2;
      break;
    case 'impact':
    case 'dependency':
      // impact/dependency 对质量敏感
      scenarioScore = qualityScore >= 0.7 ? 0.9 : qualityScore >= 0.4 ? 0.6 : 0.3;
      break;
    case 'documentation':
      // documentation 宽松一些
      scenarioScore = results.length > 0 ? 0.7 : 0.3;
      break;
    case 'overview':
      // overview 需要更多结果
      scenarioScore = results.length >= 5 ? 0.9 : results.length >= 3 ? 0.6 : 0.3;
      break;
    case 'complexity':
      // complexity 依赖质量
      scenarioScore = qualityScore >= 0.6 ? 0.85 : 0.4;
      break;
    case 'refactor':
      // refactor 需要高质量结果
      scenarioScore = qualityScore >= 0.7 && results.length >= 2 ? 0.8 : 0.4;
      break;
    case 'reference':
      // reference 适中
      scenarioScore = results.length >= 2 && qualityScore >= 0.5 ? 0.75 : 0.4;
      break;
    default:
      scenarioScore = 0.5;
  }
  const scenarioWeight = 0.2;
  reasons.push(`场景 '${intent}' 匹配度评估完成`);
  
  // 计算综合分数
  const rawScore = countScore * countWeight + 
                   qualityScore * qualityWeight + 
                   scenarioScore * scenarioWeight;
  
  // 限制在 [0, 1] 范围
  const score = clamp(rawScore, 0, 1);
  
  // 确定置信度级别
  const highThreshold = getThreshold(intent, 'high');
  const mediumThreshold = getThreshold(intent, 'medium');
  
  let level: 'high' | 'medium' | 'low';
  if (score >= highThreshold) {
    level = 'high';
    reasons.push(`置信度 ${Math.round(score * 100)}% 达到高级阈值 (${Math.round(highThreshold * 100)}%)`);
  } else if (score >= mediumThreshold) {
    level = 'medium';
    reasons.push(`置信度 ${Math.round(score * 100)}% 达到中级阈值 (${Math.round(mediumThreshold * 100)}%)`);
  } else {
    level = 'low';
    reasons.push(`置信度 ${Math.round(score * 100)}% 低于中级阈值 (${Math.round(mediumThreshold * 100)}%)，建议调整关键词`);
  }
  
  return { score, level, reasons };
}

// 导出类型和辅助函数（供测试使用）
export type { IntentType, SearchResult, ConfidenceResult };
export { CONFIDENCE_THRESHOLDS, getThreshold, getRelevance, getMatchCount, clamp };
