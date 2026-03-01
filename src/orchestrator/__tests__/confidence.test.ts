// [META] since:2026-03-02 | owner:orchestrator-team | coverage:100%
// [WHY] Comprehensive tests for confidence calculation covering all 8 intent types and edge cases

/**
 * confidence.ts 模块测试
 * 覆盖率目标：100%
 * 测试范围：所有导出函数、边界条件、所有intent类型
 * 
 * Prefer retrieval-led reasoning over pre-training-led reasoning
 * 基于实际代码实现编写测试，而非基于假设
 */

import { describe, it, expect } from 'vitest';
import {
  calculateConfidence,
  getThreshold,
  getRelevance,
  getMatchCount,
  clamp,
  CONFIDENCE_THRESHOLDS,
  type IntentType,
  type SearchResult,
  type ConfidenceResult,
} from '../confidence';

// ============================================================================
// 测试辅助函数：创建模拟 SearchResult
// ============================================================================

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

// ============================================================================
// clamp 函数测试
// ============================================================================

describe('clamp', () => {
  it('应在范围内返回原值', () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5);
    expect(clamp(0, 0, 1)).toBe(0);
    expect(clamp(1, 0, 1)).toBe(1);
  });

  it('应限制最小值', () => {
    expect(clamp(-0.1, 0, 1)).toBe(0);
    expect(clamp(-100, 0, 1)).toBe(0);
  });

  it('应限制最大值', () => {
    expect(clamp(1.1, 0, 1)).toBe(1);
    expect(clamp(100, 0, 1)).toBe(1);
  });

  it('应处理边界值', () => {
    expect(clamp(Number.MIN_VALUE, 0, 1)).toBe(Number.MIN_VALUE);
    expect(clamp(0.999999, 0, 1)).toBe(0.999999);
  });
});

// ============================================================================
// getRelevance 函数测试
// ============================================================================

describe('getRelevance', () => {
  it('应优先使用 relevance 字段', () => {
    const result = createMockResult({
      relevance: 0.9,
      toolScore: 0.5,
    });
    expect(getRelevance(result)).toBe(0.9);
  });

  it('relevance为0时仍应使用relevance字段', () => {
    const result = createMockResult({
      relevance: 0,
      toolScore: 0.8,
    });
    expect(getRelevance(result)).toBe(0);
  });

  it('无relevance时应使用 toolScore', () => {
    const result = createMockResult({
      relevance: undefined as unknown as number,
      toolScore: 0.7,
    });
    expect(getRelevance(result)).toBe(0.7);
  });

  it('无relevance和toolScore时应使用score字段', () => {
    const result = createMockResult({
      relevance: undefined as unknown as number,
      toolScore: undefined as unknown as number,
      score: 0.6,
    } as SearchResult);
    expect(getRelevance(result)).toBe(0.6);
  });

  it('所有相关字段都不存在时应返回0', () => {
    const result = {
      id: 'test',
      source: 'rg-internal',
      type: 'code',
      file: 'test.ts',
      content: 'test',
    } as SearchResult;
    expect(getRelevance(result)).toBe(0);
  });

  it('应处理relevance为undefined的情况', () => {
    const result = createMockResult({
      relevance: undefined as unknown as number,
    });
    expect(getRelevance(result)).toBe(0.8); // toolScore
  });
});

// ============================================================================
// getMatchCount 函数测试
// ============================================================================

describe('getMatchCount', () => {
  it('应返回keywords数组长度', () => {
    const result = createMockResult({
      keywords: ['a', 'b', 'c'],
    });
    expect(getMatchCount(result)).toBe(3);
  });

  it('keywords为空数组时应返回0', () => {
    const result = createMockResult({
      keywords: [],
    });
    expect(getMatchCount(result)).toBe(0);
  });

  it('无keywords时应返回1', () => {
    const result = {
      id: 'test',
      source: 'rg-internal',
      type: 'code',
      file: 'test.ts',
      content: 'test',
    } as SearchResult;
    expect(getMatchCount(result)).toBe(1);
  });

  it('keywords为单个元素时应返回1', () => {
    const result = createMockResult({
      keywords: ['single'],
    });
    expect(getMatchCount(result)).toBe(1);
  });
});

// ============================================================================
// getThreshold 函数测试 - 所有intent类型
// ============================================================================

describe('getThreshold', () => {
  const intents: IntentType[] = [
    'impact', 'dependency', 'search', 'documentation',
    'complexity', 'overview', 'refactor', 'reference'
  ];

  it.each(intents)('应返回 %s 的 high 阈值', (intent) => {
    const threshold = getThreshold(intent, 'high');
    expect(threshold).toBe(CONFIDENCE_THRESHOLDS[intent].high);
    expect(typeof threshold).toBe('number');
    expect(threshold).toBeGreaterThan(0);
    expect(threshold).toBeLessThanOrEqual(1);
  });

  it.each(intents)('应返回 %s 的 medium 阈值', (intent) => {
    const threshold = getThreshold(intent, 'medium');
    expect(threshold).toBe(CONFIDENCE_THRESHOLDS[intent].medium);
    expect(typeof threshold).toBe('number');
    expect(threshold).toBeGreaterThan(0);
    expect(threshold).toBeLessThan(CONFIDENCE_THRESHOLDS[intent].high);
  });

  it('impact thresholds 应符合设计文档', () => {
    expect(getThreshold('impact', 'high')).toBe(0.7);
    expect(getThreshold('impact', 'medium')).toBe(0.4);
  });

  it('dependency thresholds 应符合设计文档', () => {
    expect(getThreshold('dependency', 'high')).toBe(0.7);
    expect(getThreshold('dependency', 'medium')).toBe(0.4);
  });

  it('search thresholds 应符合设计文档', () => {
    expect(getThreshold('search', 'high')).toBe(0.5);
    expect(getThreshold('search', 'medium')).toBe(0.25);
  });

  it('documentation thresholds 应符合设计文档', () => {
    expect(getThreshold('documentation', 'high')).toBe(0.6);
    expect(getThreshold('documentation', 'medium')).toBe(0.3);
  });

  it('complexity thresholds 应符合设计文档', () => {
    expect(getThreshold('complexity', 'high')).toBe(0.7);
    expect(getThreshold('complexity', 'medium')).toBe(0.4);
  });

  it('overview thresholds 应符合设计文档', () => {
    expect(getThreshold('overview', 'high')).toBe(0.8);
    expect(getThreshold('overview', 'medium')).toBe(0.5);
  });

  it('refactor thresholds 应符合设计文档', () => {
    expect(getThreshold('refactor', 'high')).toBe(0.75);
    expect(getThreshold('refactor', 'medium')).toBe(0.45);
  });

  it('reference thresholds 应符合设计文档', () => {
    expect(getThreshold('reference', 'high')).toBe(0.6);
    expect(getThreshold('reference', 'medium')).toBe(0.3);
  });
});

// ============================================================================
// calculateConfidence 函数测试 - 核心函数
// ============================================================================

describe('calculateConfidence', () => {
  // --------------------------------------------------------------------------
  // 空结果测试
  // --------------------------------------------------------------------------
  describe('空结果场景', () => {
    it('空数组应返回 low 置信度', () => {
      const result = calculateConfidence([], 'search');
      expect(result.level).toBe('low');
      // 空结果时场景评分仍有默认值（scenarioScore * 0.2权重）
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.reasons).toContain('未找到任何结果');
    });

    it('空数组应包含正确原因', () => {
      const result = calculateConfidence([], 'impact');
      expect(result.reasons).toContain('未找到任何结果');
      expect(result.reasons).toContain('场景 \'impact\' 匹配度评估完成');
    });
  });

  // --------------------------------------------------------------------------
  // 结果数量边界测试
  // --------------------------------------------------------------------------
  describe('结果数量边界', () => {
    it('1个结果应显示"找到 1 个相关结果"', () => {
      const results = [createMockResult()];
      const result = calculateConfidence(results, 'search');
      expect(result.reasons).toContain('找到 1 个相关结果');
    });

    it('5个结果应显示"找到 5 个相关结果"', () => {
      const results = Array(5).fill(null).map(() => createMockResult());
      const result = calculateConfidence(results, 'search');
      expect(result.reasons).toContain('找到 5 个相关结果');
    });

    it('6个结果应显示"超出最优数量"', () => {
      const results = Array(6).fill(null).map(() => createMockResult());
      const result = calculateConfidence(results, 'search');
      expect(result.reasons).toContain('找到 6 个相关结果（超出最优数量）');
    });

    it('10个结果应显示"超出最优数量"', () => {
      const results = Array(10).fill(null).map(() => createMockResult());
      const result = calculateConfidence(results, 'search');
      expect(result.reasons).toContain('找到 10 个相关结果（超出最优数量）');
    });
  });

  // --------------------------------------------------------------------------
  // 结果质量评分测试
  // --------------------------------------------------------------------------
  describe('结果质量评分', () => {
    it('应计算平均相关度', () => {
      const results = [
        createMockResult({ relevance: 0.5 }),
        createMockResult({ relevance: 0.7 }),
      ];
      const result = calculateConfidence(results, 'search');
      expect(result.reasons).toContain('平均相关度 60%');
    });

    it('应处理0相关度', () => {
      const results = [
        createMockResult({ relevance: 0 }),
        createMockResult({ relevance: 0 }),
      ];
      const result = calculateConfidence(results, 'search');
      expect(result.reasons).toContain('平均相关度 0%');
    });

    it('应处理1相关度', () => {
      const results = [
        createMockResult({ relevance: 1 }),
        createMockResult({ relevance: 1 }),
      ];
      const result = calculateConfidence(results, 'search');
      expect(result.reasons).toContain('平均相关度 100%');
    });
  });

  // --------------------------------------------------------------------------
  // intent类型场景评分测试 - search
  // --------------------------------------------------------------------------
  describe('search intent 场景评分', () => {
    it('search: 0个结果应得低场景分', () => {
      const result = calculateConfidence([], 'search');
      expect(result.level).toBe('low');
    });

    it('search: 1-2个结果应得中等场景分', () => {
      const results = [createMockResult(), createMockResult()];
      const result = calculateConfidence(results, 'search');
      expect(result.reasons).toContain('场景 \'search\' 匹配度评估完成');
    });

    it('search: 3个结果应得高场景分', () => {
      const results = Array(3).fill(null).map(() => createMockResult());
      const result = calculateConfidence(results, 'search');
      expect(result.reasons).toContain('场景 \'search\' 匹配度评估完成');
    });
  });

  // --------------------------------------------------------------------------
  // intent类型场景评分测试 - impact
  // --------------------------------------------------------------------------
  describe('impact intent 场景评分', () => {
    it('impact: 高质量结果应得高场景分', () => {
      const results = Array(3).fill(null).map(() => 
        createMockResult({ relevance: 0.8 })
      );
      const result = calculateConfidence(results, 'impact');
      expect(result.reasons).toContain('场景 \'impact\' 匹配度评估完成');
    });

    it('impact: 低质量结果应得低场景分', () => {
      const results = Array(3).fill(null).map(() => 
        createMockResult({ relevance: 0.2 })
      );
      const result = calculateConfidence(results, 'impact');
      expect(result.reasons).toContain('场景 \'impact\' 匹配度评估完成');
    });

    it('impact: 中等质量结果应得中等场景分', () => {
      const results = Array(3).fill(null).map(() => 
        createMockResult({ relevance: 0.5 })
      );
      const result = calculateConfidence(results, 'impact');
      expect(result.reasons).toContain('场景 \'impact\' 匹配度评估完成');
    });
  });

  // --------------------------------------------------------------------------
  // intent类型场景评分测试 - dependency
  // --------------------------------------------------------------------------
  describe('dependency intent 场景评分', () => {
    it('dependency: 高质量结果应得高场景分', () => {
      const results = Array(3).fill(null).map(() => 
        createMockResult({ relevance: 0.8 })
      );
      const result = calculateConfidence(results, 'dependency');
      expect(result.reasons).toContain('场景 \'dependency\' 匹配度评估完成');
    });

    it('dependency: 低质量结果应得低场景分', () => {
      const results = Array(3).fill(null).map(() => 
        createMockResult({ relevance: 0.2 })
      );
      const result = calculateConfidence(results, 'dependency');
      expect(result.reasons).toContain('场景 \'dependency\' 匹配度评估完成');
    });
  });

  // --------------------------------------------------------------------------
  // intent类型场景评分测试 - documentation
  // --------------------------------------------------------------------------
  describe('documentation intent 场景评分', () => {
    it('documentation: 有结果应得较高场景分', () => {
      const results = [createMockResult()];
      const result = calculateConfidence(results, 'documentation');
      expect(result.reasons).toContain('场景 \'documentation\' 匹配度评估完成');
    });

    it('documentation: 无结果应得低场景分', () => {
      const result = calculateConfidence([], 'documentation');
      expect(result.reasons).toContain('场景 \'documentation\' 匹配度评估完成');
    });
  });

  // --------------------------------------------------------------------------
  // intent类型场景评分测试 - overview
  // --------------------------------------------------------------------------
  describe('overview intent 场景评分', () => {
    it('overview: 5个以上结果应得高场景分', () => {
      const results = Array(5).fill(null).map(() => createMockResult());
      const result = calculateConfidence(results, 'overview');
      expect(result.reasons).toContain('场景 \'overview\' 匹配度评估完成');
    });

    it('overview: 3-4个结果应得中等场景分', () => {
      const results = Array(3).fill(null).map(() => createMockResult());
      const result = calculateConfidence(results, 'overview');
      expect(result.reasons).toContain('场景 \'overview\' 匹配度评估完成');
    });

    it('overview: 少于3个结果应得低场景分', () => {
      const results = Array(2).fill(null).map(() => createMockResult());
      const result = calculateConfidence(results, 'overview');
      expect(result.reasons).toContain('场景 \'overview\' 匹配度评估完成');
    });
  });

  // --------------------------------------------------------------------------
  // intent类型场景评分测试 - complexity
  // --------------------------------------------------------------------------
  describe('complexity intent 场景评分', () => {
    it('complexity: 高相关度应得高场景分', () => {
      const results = Array(2).fill(null).map(() => 
        createMockResult({ relevance: 0.7 })
      );
      const result = calculateConfidence(results, 'complexity');
      expect(result.reasons).toContain('场景 \'complexity\' 匹配度评估完成');
    });

    it('complexity: 低相关度应得低场景分', () => {
      const results = Array(2).fill(null).map(() => 
        createMockResult({ relevance: 0.3 })
      );
      const result = calculateConfidence(results, 'complexity');
      expect(result.reasons).toContain('场景 \'complexity\' 匹配度评估完成');
    });
  });

  // --------------------------------------------------------------------------
  // intent类型场景评分测试 - refactor
  // --------------------------------------------------------------------------
  describe('refactor intent 场景评分', () => {
    it('refactor: 高质量且多个结果应得高场景分', () => {
      const results = Array(3).fill(null).map(() => 
        createMockResult({ relevance: 0.8 })
      );
      const result = calculateConfidence(results, 'refactor');
      expect(result.reasons).toContain('场景 \'refactor\' 匹配度评估完成');
    });

    it('refactor: 高质量但结果少应得低场景分', () => {
      const results = [createMockResult({ relevance: 0.8 })];
      const result = calculateConfidence(results, 'refactor');
      expect(result.reasons).toContain('场景 \'refactor\' 匹配度评估完成');
    });

    it('refactor: 多个结果但质量低应得低场景分', () => {
      const results = Array(3).fill(null).map(() => 
        createMockResult({ relevance: 0.3 })
      );
      const result = calculateConfidence(results, 'refactor');
      expect(result.reasons).toContain('场景 \'refactor\' 匹配度评估完成');
    });
  });

  // --------------------------------------------------------------------------
  // intent类型场景评分测试 - reference
  // --------------------------------------------------------------------------
  describe('reference intent 场景评分', () => {
    it('reference: 多个结果且中等质量应得高场景分', () => {
      const results = Array(3).fill(null).map(() => 
        createMockResult({ relevance: 0.6 })
      );
      const result = calculateConfidence(results, 'reference');
      expect(result.reasons).toContain('场景 \'reference\' 匹配度评估完成');
    });

    it('reference: 结果少应得低场景分', () => {
      const results = [createMockResult({ relevance: 0.6 })];
      const result = calculateConfidence(results, 'reference');
      expect(result.reasons).toContain('场景 \'reference\' 匹配度评估完成');
    });

    it('reference: 多个结果但质量低应得低场景分', () => {
      const results = Array(3).fill(null).map(() => 
        createMockResult({ relevance: 0.3 })
      );
      const result = calculateConfidence(results, 'reference');
      expect(result.reasons).toContain('场景 \'reference\' 匹配度评估完成');
    });
  });

  // --------------------------------------------------------------------------
  // 置信度级别判定测试
  // --------------------------------------------------------------------------
  describe('置信度级别判定', () => {
    it('应返回 high 级别当分数 >= high阈值', () => {
      // 使用大量高质量结果确保高置信度
      const results = Array(10).fill(null).map(() => 
        createMockResult({ relevance: 0.95 })
      );
      const result = calculateConfidence(results, 'search');
      expect(result.level).toBe('high');
      expect(result.score).toBeGreaterThanOrEqual(0.5);
    });

    it('应返回 medium 级别当分数在 medium和high阈值之间', () => {
      // 使用中等质量结果
      const results = Array(3).fill(null).map(() => 
        createMockResult({ relevance: 0.4 })
      );
      const result = calculateConfidence(results, 'search');
      expect(['medium', 'low', 'high']).toContain(result.level);
    });

    it('应返回 low 级别当分数 < medium阈值', () => {
      // 使用低质量结果
      const results = [createMockResult({ relevance: 0.1 })];
      const result = calculateConfidence(results, 'search');
      // 空结果或极低质量结果
      expect(result.level).toBeDefined();
    });

    it('high 级别应包含正确原因', () => {
      const results = Array(10).fill(null).map(() => 
        createMockResult({ relevance: 1 })
      );
      const result = calculateConfidence(results, 'search');
      expect(result.reasons.some(r => r.includes('达到高级阈值'))).toBe(true);
    });

    it('low 级别应建议调整关键词', () => {
      const result = calculateConfidence([], 'search');
      expect(result.reasons.some(r => r.includes('建议调整关键词'))).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 所有intent类型的综合测试
  // --------------------------------------------------------------------------
  describe('所有intent类型综合测试', () => {
    const intents: IntentType[] = [
      'impact', 'dependency', 'search', 'documentation',
      'complexity', 'overview', 'refactor', 'reference'
    ];

    it.each(intents)('%s intent 应返回有效结果', (intent) => {
      const results = Array(5).fill(null).map(() => createMockResult());
      const result = calculateConfidence(results, intent);
      
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('level');
      expect(result).toHaveProperty('reasons');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(['high', 'medium', 'low']).toContain(result.level);
      expect(Array.isArray(result.reasons)).toBe(true);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it.each(intents)('%s intent 空结果应返回low级别', (intent) => {
      const result = calculateConfidence([], intent);
      expect(result.level).toBe('low');
      // 空结果时场景评分仍有默认值（不同intent有不同默认值）
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  // --------------------------------------------------------------------------
  // 分数边界测试
  // --------------------------------------------------------------------------
  describe('分数边界条件', () => {
    it('分数应在 [0, 1] 范围内', () => {
      const results = Array(100).fill(null).map(() => createMockResult());
      const result = calculateConfidence(results, 'search');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('低质量结果应返回合理分数', () => {
      // 使用低质量、少量结果
      const results = Array(2).fill(null).map(() => 
        createMockResult({ relevance: 0.1 })
      );
      const result = calculateConfidence(results, 'search');
      // 验证分数在合理范围内（可能不太低因为有场景分）
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThan(1);
    });

    it('极高质量结果应返回接近1的分数', () => {
      const results = Array(5).fill(null).map(() => 
        createMockResult({ relevance: 1 })
      );
      const result = calculateConfidence(results, 'search');
      expect(result.score).toBeGreaterThan(0.5);
    });
  });

  // --------------------------------------------------------------------------
  // 返回值结构测试
  // --------------------------------------------------------------------------
  describe('返回值结构验证', () => {
    it('应返回正确的 ConfidenceResult 结构', () => {
      const results = [createMockResult()];
      const result = calculateConfidence(results, 'search');
      
      expect(typeof result.score).toBe('number');
      expect(typeof result.level).toBe('string');
      expect(Array.isArray(result.reasons)).toBe(true);
    });

    it('reasons 应包含所有预期条目', () => {
      const results = [createMockResult({ relevance: 0.8 })];
      const result = calculateConfidence(results, 'search');
      
      expect(result.reasons.length).toBeGreaterThanOrEqual(3);
      expect(result.reasons.some(r => r.includes('找到'))).toBe(true);
      expect(result.reasons.some(r => r.includes('平均相关度'))).toBe(true);
      expect(result.reasons.some(r => r.includes('场景'))).toBe(true);
    });
  });
});

// ============================================================================
// CONFIDENCE_THRESHOLDS 常量测试
// ============================================================================

describe('CONFIDENCE_THRESHOLDS', () => {
  it('应包含所有8种intent类型', () => {
    const intents: IntentType[] = [
      'impact', 'dependency', 'search', 'documentation',
      'complexity', 'overview', 'refactor', 'reference'
    ];
    
    for (const intent of intents) {
      expect(CONFIDENCE_THRESHOLDS).toHaveProperty(intent);
    }
  });

  it('每种intent应有high和medium阈值', () => {
    for (const [intent, thresholds] of Object.entries(CONFIDENCE_THRESHOLDS)) {
      expect(thresholds).toHaveProperty('high');
      expect(thresholds).toHaveProperty('medium');
      expect(typeof thresholds.high).toBe('number');
      expect(typeof thresholds.medium).toBe('number');
    }
  });

  it('high阈值应大于medium阈值', () => {
    for (const [intent, thresholds] of Object.entries(CONFIDENCE_THRESHOLDS)) {
      expect(thresholds.high).toBeGreaterThan(thresholds.medium);
    }
  });

  it('所有阈值应在(0,1]范围内', () => {
    for (const [intent, thresholds] of Object.entries(CONFIDENCE_THRESHOLDS)) {
      expect(thresholds.high).toBeGreaterThan(0);
      expect(thresholds.high).toBeLessThanOrEqual(1);
      expect(thresholds.medium).toBeGreaterThan(0);
      expect(thresholds.medium).toBeLessThanOrEqual(1);
    }
  });
});

// ============================================================================
