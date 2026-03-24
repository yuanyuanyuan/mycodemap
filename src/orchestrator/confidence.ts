// [META] since:2026-03 | owner:orchestrator-team | stable:true
// [WHY] Confidence calculation now centers on public analyze intents
// while keeping legacy compat inputs normalizable during the migration window

import type {
  UnifiedResult,
  IntentType as PublicIntentType,
  CompatibleLegacyIntentType
} from './types.js';

type LegacyIntentType = CompatibleLegacyIntentType | 'refactor';
type NormalizedIntentType = PublicIntentType | 'refactor';

export type IntentType = PublicIntentType | LegacyIntentType;

interface SearchResult extends UnifiedResult {
  score?: number;
}

interface ConfidenceResult {
  score: number;
  level: 'high' | 'medium' | 'low';
  reasons: string[];
}

const NORMALIZED_INTENT_MAP: Record<IntentType, NormalizedIntentType> = {
  find: 'find',
  read: 'read',
  link: 'link',
  show: 'show',
  search: 'find',
  impact: 'read',
  complexity: 'read',
  dependency: 'link',
  reference: 'link',
  overview: 'show',
  documentation: 'show',
  refactor: 'refactor'
};

const CONFIDENCE_THRESHOLDS: Record<NormalizedIntentType, { high: number; medium: number }> = {
  find: { high: 0.5, medium: 0.25 },
  read: { high: 0.65, medium: 0.35 },
  link: { high: 0.6, medium: 0.3 },
  show: { high: 0.55, medium: 0.3 },
  refactor: { high: 0.6, medium: 0.3 }
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getRelevance(result: SearchResult): number {
  if ('relevance' in result && typeof result.relevance === 'number') {
    return result.relevance;
  }
  if ('toolScore' in result && typeof result.toolScore === 'number') {
    return result.toolScore;
  }
  if ('score' in result && typeof result.score === 'number') {
    return result.score;
  }
  return 0;
}

function getMatchCount(result: SearchResult): number {
  if (result.keywords && Array.isArray(result.keywords)) {
    return result.keywords.length;
  }
  return 1;
}

function normalizeIntent(intent: IntentType): NormalizedIntentType {
  return NORMALIZED_INTENT_MAP[intent];
}

function getThreshold(intent: IntentType, level: 'high' | 'medium'): number {
  return CONFIDENCE_THRESHOLDS[normalizeIntent(intent)][level];
}

export function calculateConfidence(
  results: SearchResult[],
  intent: IntentType
): ConfidenceResult {
  const normalizedIntent = normalizeIntent(intent);
  const reasons: string[] = [];

  const countScore = Math.min(results.length / 5, 1);
  const countWeight = 0.4;

  if (results.length === 0) {
    reasons.push('未找到任何结果');
  } else if (results.length <= 5) {
    reasons.push(`找到 ${results.length} 个相关结果`);
  } else {
    reasons.push(`找到 ${results.length} 个相关结果（超出最优数量）`);
  }

  let qualityScore = 0;
  if (results.length > 0) {
    const totalRelevance = results.reduce((sum, result) => sum + getRelevance(result), 0);
    qualityScore = totalRelevance / results.length;
    reasons.push(`平均相关度 ${Math.round(qualityScore * 100)}%`);
  }
  const qualityWeight = 0.4;

  let scenarioScore = 0.5;
  switch (normalizedIntent) {
    case 'find':
      scenarioScore = results.length >= 3 ? 0.8 : results.length > 0 ? 0.5 : 0.2;
      break;
    case 'read':
      scenarioScore = qualityScore >= 0.7 ? 0.85 : qualityScore >= 0.4 ? 0.6 : 0.3;
      break;
    case 'link':
      scenarioScore = results.length >= 2 && qualityScore >= 0.5 ? 0.8 : results.length > 0 ? 0.55 : 0.25;
      break;
    case 'show':
      scenarioScore = results.length >= 3 ? 0.85 : results.length > 0 ? 0.65 : 0.3;
      break;
    case 'refactor':
      scenarioScore = qualityScore >= 0.7 && results.length >= 2 ? 0.8 : 0.4;
      break;
  }
  const scenarioWeight = 0.2;
  reasons.push(`场景 '${normalizedIntent}' 匹配度评估完成`);

  const rawScore = countScore * countWeight
    + qualityScore * qualityWeight
    + scenarioScore * scenarioWeight;
  const score = clamp(rawScore, 0, 1);

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

export type { SearchResult, ConfidenceResult };
export { CONFIDENCE_THRESHOLDS, getThreshold, getRelevance, getMatchCount, clamp, normalizeIntent };
