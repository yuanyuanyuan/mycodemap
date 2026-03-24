// [META] since:2026-03-02 | owner:orchestrator-team | coverage:100%
// [WHY] Confidence tests now validate public 4 intents first, with legacy aliases normalized during migration

import { describe, it, expect } from 'vitest';
import {
  calculateConfidence,
  getThreshold,
  getRelevance,
  getMatchCount,
  clamp,
  normalizeIntent,
  CONFIDENCE_THRESHOLDS,
  type IntentType,
  type SearchResult,
} from '../confidence';

function createMockResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    id: 'test-id',
    source: 'rg-internal',
    toolScore: 0.8,
    type: 'code',
    file: 'test.ts',
    line: 1,
    content: 'test content',
    relevance: 0.8,
    keywords: ['test'],
    ...overrides,
  };
}

describe('clamp', () => {
  it('应在范围内返回原值', () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5);
    expect(clamp(0, 0, 1)).toBe(0);
    expect(clamp(1, 0, 1)).toBe(1);
  });

  it('应限制边界值', () => {
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(2, 0, 1)).toBe(1);
  });
});

describe('getRelevance', () => {
  it('应优先读取 relevance', () => {
    expect(getRelevance(createMockResult({ relevance: 0.9, toolScore: 0.2 }))).toBe(0.9);
  });

  it('缺少 relevance 时回退到 toolScore', () => {
    expect(getRelevance(createMockResult({ relevance: undefined as unknown as number, toolScore: 0.7 }))).toBe(0.7);
  });

  it('缺少 relevance/toolScore 时回退到 score', () => {
    expect(getRelevance({
      ...createMockResult(),
      relevance: undefined as unknown as number,
      toolScore: undefined as unknown as number,
      score: 0.6,
    })).toBe(0.6);
  });
});

describe('getMatchCount', () => {
  it('应返回关键词数量', () => {
    expect(getMatchCount(createMockResult({ keywords: ['a', 'b', 'c'] }))).toBe(3);
  });

  it('缺少 keywords 时回退到 1', () => {
    expect(getMatchCount({ ...createMockResult(), keywords: undefined as unknown as string[] })).toBe(1);
  });
});

describe('normalizeIntent', () => {
  const expectations: Array<[IntentType, ReturnType<typeof normalizeIntent>]> = [
    ['find', 'find'],
    ['search', 'find'],
    ['read', 'read'],
    ['impact', 'read'],
    ['complexity', 'read'],
    ['link', 'link'],
    ['dependency', 'link'],
    ['reference', 'link'],
    ['show', 'show'],
    ['overview', 'show'],
    ['documentation', 'show'],
    ['refactor', 'refactor'],
  ];

  it.each(expectations)('应将 %s 归一化到 %s', (input, expected) => {
    expect(normalizeIntent(input)).toBe(expected);
  });
});

describe('getThreshold', () => {
  it('public intent 应命中新的阈值表', () => {
    expect(getThreshold('find', 'high')).toBe(CONFIDENCE_THRESHOLDS.find.high);
    expect(getThreshold('read', 'medium')).toBe(CONFIDENCE_THRESHOLDS.read.medium);
    expect(getThreshold('link', 'high')).toBe(CONFIDENCE_THRESHOLDS.link.high);
    expect(getThreshold('show', 'medium')).toBe(CONFIDENCE_THRESHOLDS.show.medium);
  });

  it('legacy alias 应命中归一化后的阈值', () => {
    expect(getThreshold('search', 'high')).toBe(CONFIDENCE_THRESHOLDS.find.high);
    expect(getThreshold('impact', 'medium')).toBe(CONFIDENCE_THRESHOLDS.read.medium);
    expect(getThreshold('complexity', 'high')).toBe(CONFIDENCE_THRESHOLDS.read.high);
    expect(getThreshold('dependency', 'medium')).toBe(CONFIDENCE_THRESHOLDS.link.medium);
    expect(getThreshold('reference', 'high')).toBe(CONFIDENCE_THRESHOLDS.link.high);
    expect(getThreshold('overview', 'medium')).toBe(CONFIDENCE_THRESHOLDS.show.medium);
    expect(getThreshold('documentation', 'high')).toBe(CONFIDENCE_THRESHOLDS.show.high);
  });
});

describe('calculateConfidence', () => {
  it('空结果应返回 low 级别', () => {
    const result = calculateConfidence([], 'find');
    expect(result.level).toBe('low');
    expect(result.reasons).toContain('未找到任何结果');
  });

  it('find 应对结果数量敏感', () => {
    const result = calculateConfidence([
      createMockResult({ relevance: 0.8 }),
      createMockResult({ relevance: 0.7 }),
      createMockResult({ relevance: 0.75 }),
    ], 'find');

    expect(result.score).toBeGreaterThan(0.3);
    expect(result.reasons).toContain(`场景 'find' 匹配度评估完成`);
  });

  it('read 应对质量更敏感', () => {
    const result = calculateConfidence([
      createMockResult({ relevance: 0.95 }),
      createMockResult({ relevance: 0.9 }),
    ], 'read');

    expect(['medium', 'high']).toContain(result.level);
    expect(result.reasons).toContain(`场景 'read' 匹配度评估完成`);
  });

  it('link 应支持 public intent', () => {
    const result = calculateConfidence([
      createMockResult({ relevance: 0.75 }),
      createMockResult({ relevance: 0.7 }),
    ], 'link');

    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons).toContain(`场景 'link' 匹配度评估完成`);
  });

  it('show 应支持展示型场景', () => {
    const result = calculateConfidence([
      createMockResult({ relevance: 0.6 }),
    ], 'show');

    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons).toContain(`场景 'show' 匹配度评估完成`);
  });

  it('refactor 仍作为 legacy 特例可计算', () => {
    const result = calculateConfidence([
      createMockResult({ relevance: 0.8 }),
      createMockResult({ relevance: 0.75 }),
    ], 'refactor');

    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons).toContain(`场景 'refactor' 匹配度评估完成`);
  });

  it('legacy alias 应输出归一化后的场景文案', () => {
    const result = calculateConfidence([
      createMockResult({ relevance: 0.9 }),
    ], 'impact');

    expect(result.reasons).toContain(`场景 'read' 匹配度评估完成`);
    expect(result.reasons.some(reason => reason.includes(`场景 'impact'`))).toBe(false);
  });
});

describe('CONFIDENCE_THRESHOLDS', () => {
  it('只保留 public 4 intent 与 refactor 特例', () => {
    expect(Object.keys(CONFIDENCE_THRESHOLDS).sort()).toEqual(['find', 'link', 'read', 'refactor', 'show']);
  });

  it('所有阈值都满足 high > medium', () => {
    for (const thresholds of Object.values(CONFIDENCE_THRESHOLDS)) {
      expect(thresholds.high).toBeGreaterThan(thresholds.medium);
      expect(thresholds.high).toBeLessThanOrEqual(1);
      expect(thresholds.medium).toBeGreaterThan(0);
    }
  });
});
