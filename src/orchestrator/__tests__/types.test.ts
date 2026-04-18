// [META] since:2026-03-02 | owner:orchestrator-team | coverage:100%
// [WHY] Comprehensive type safety tests for Codemap types including guards, interfaces, and utilities

/**
 * types.ts 模块测试
 * 覆盖率目标：100%
 * 测试范围：类型守卫、接口验证、辅助函数
 * 
 * Prefer retrieval-led reasoning over pre-training-led reasoning
 * 基于实际代码实现编写测试，而非基于假设
 */

import { describe, it, expect } from 'vitest';
import {
  isCodemapOutput,
  calculateConfidenceLevel,
  type UnifiedResult,
  type CodemapOutput,
  type HeatScore,
  type Confidence,
  type ConfidenceResult,
  type IntentType,
  type ToolOptions,
  type CodemapIntent,
  type AnalyzeArgs,
} from '../types';

// ============================================================================
// 测试辅助函数：创建模拟数据
// ============================================================================

function createMockHeatScore(overrides: Partial<HeatScore> = {}): HeatScore {
  return {
    freq30d: 5,
    lastType: 'feat',
    lastDate: '2026-03-01T00:00:00Z',
    stability: true,
    ...overrides,
  };
}

function createMockUnifiedResult(overrides: Partial<UnifiedResult> = {}): UnifiedResult {
  return {
    id: 'test-id-001',
    source: 'codemap',
    toolScore: 0.85,
    type: 'file',
    file: 'src/test.ts',
    line: 42,
    content: 'test content',
    relevance: 0.9,
    keywords: ['test', 'mock'],
    metadata: {
      symbolType: 'function',
      dependencies: ['dep1.ts', 'dep2.ts'],
      testFile: 'src/test.spec.ts',
      commitCount: 10,
      gravity: 0.75,
      heatScore: createMockHeatScore(),
      impactCount: 5,
      stability: true,
      riskLevel: 'medium',
    },
    ...overrides,
  };
}

function createMockCodemapOutput(overrides: Partial<CodemapOutput> = {}): CodemapOutput {
  return {
    schemaVersion: 'v1.0.0',
    intent: 'find',
    tool: 'codemap-find',
    confidence: {
      score: 0.85,
      level: 'high',
    },
    results: [createMockUnifiedResult()],
    metadata: {
      executionTime: 150,
      resultCount: 1,
      total: 1,
      scope: 'direct',
    },
    ...overrides,
  };
}

// ============================================================================
// isCodemapOutput 类型守卫测试
// ============================================================================

describe('isCodemapOutput', () => {
  // R4.1: 测试有效对象返回 true
  describe('有效对象测试 (R4.1)', () => {
    it('应返回 true 当传入完整的 CodemapOutput 对象', () => {
      const output = createMockCodemapOutput();
      expect(isCodemapOutput(output)).toBe(true);
    });

    it('应返回 true 当包含所有必需字段', () => {
      const output = {
        schemaVersion: 'v1.0.0',
        intent: 'find',
        tool: 'test-tool',
        confidence: { score: 0.8, level: 'high' as const },
        results: [],
      };
      expect(isCodemapOutput(output)).toBe(true);
    });

    it('应返回 true 当 results 包含 UnifiedResult 对象', () => {
      const output = createMockCodemapOutput({
        results: [createMockUnifiedResult(), createMockUnifiedResult()],
      });
      expect(isCodemapOutput(output)).toBe(true);
    });

    it('应返回 true 当 confidence.level 为 medium', () => {
      const output = createMockCodemapOutput({
        confidence: { score: 0.5, level: 'medium' },
      });
      expect(isCodemapOutput(output)).toBe(true);
    });

    it('应返回 true 当 confidence.level 为 low', () => {
      const output = createMockCodemapOutput({
        confidence: { score: 0.3, level: 'low' },
      });
      expect(isCodemapOutput(output)).toBe(true);
    });
  });

  // R4.2: 测试 null/undefined 返回 false
  describe('null/undefined 测试 (R4.2)', () => {
    it('应返回 false 当传入 null', () => {
      expect(isCodemapOutput(null)).toBe(false);
    });

    it('应返回 false 当传入 undefined', () => {
      expect(isCodemapOutput(undefined)).toBe(false);
    });

    it('应返回 false 当传入空值', () => {
      expect(isCodemapOutput(null)).toBeFalsy();
      expect(isCodemapOutput(undefined)).toBeFalsy();
    });
  });

  // R4.3: 测试缺少必需字段返回 false
  describe('缺少必需字段测试 (R4.3)', () => {
    it('应返回 false 当缺少 schemaVersion', () => {
      const output = {
        intent: 'find',
        tool: 'test-tool',
        confidence: { score: 0.8, level: 'high' },
        results: [],
      };
      expect(isCodemapOutput(output)).toBe(false);
    });

    it('应返回 false 当缺少 intent', () => {
      const output = {
        schemaVersion: 'v1.0.0',
        tool: 'test-tool',
        confidence: { score: 0.8, level: 'high' },
        results: [],
      };
      expect(isCodemapOutput(output)).toBe(false);
    });

    it('应返回 false 当缺少 tool', () => {
      const output = {
        schemaVersion: 'v1.0.0',
        intent: 'find',
        confidence: { score: 0.8, level: 'high' },
        results: [],
      };
      expect(isCodemapOutput(output)).toBe(false);
    });

    it('应返回 false 当缺少 confidence', () => {
      const output = {
        schemaVersion: 'v1.0.0',
        intent: 'find',
        tool: 'test-tool',
        results: [],
      };
      expect(isCodemapOutput(output)).toBe(false);
    });

    it('应返回 false 当缺少 results', () => {
      const output = {
        schemaVersion: 'v1.0.0',
        intent: 'find',
        tool: 'test-tool',
        confidence: { score: 0.8, level: 'high' },
      };
      expect(isCodemapOutput(output)).toBe(false);
    });

    it('应返回 false 当 confidence 为 null', () => {
      const output = {
        schemaVersion: 'v1.0.0',
        intent: 'find',
        tool: 'test-tool',
        confidence: null,
        results: [],
      };
      expect(isCodemapOutput(output)).toBe(false);
    });
  });

  // R4.4: 测试错误类型字段返回 false
  describe('错误类型字段测试 (R4.4)', () => {
    it('应返回 false 当 schemaVersion 不是字符串', () => {
      const output = {
        schemaVersion: 123,
        intent: 'find',
        tool: 'test-tool',
        confidence: { score: 0.8, level: 'high' },
        results: [],
      };
      expect(isCodemapOutput(output)).toBe(false);
    });

    it('应返回 false 当 intent 不是字符串', () => {
      const output = {
        schemaVersion: 'v1.0.0',
        intent: 123,
        tool: 'test-tool',
        confidence: { score: 0.8, level: 'high' },
        results: [],
      };
      expect(isCodemapOutput(output)).toBe(false);
    });

    it('应返回 false 当 tool 不是字符串', () => {
      const output = {
        schemaVersion: 'v1.0.0',
        intent: 'find',
        tool: 123,
        confidence: { score: 0.8, level: 'high' },
        results: [],
      };
      expect(isCodemapOutput(output)).toBe(false);
    });

    it('应返回 false 当 confidence.score 不是数字', () => {
      const output = {
        schemaVersion: 'v1.0.0',
        intent: 'find',
        tool: 'test-tool',
        confidence: { score: '0.8', level: 'high' },
        results: [],
      };
      expect(isCodemapOutput(output)).toBe(false);
    });

    it('应返回 false 当 confidence.level 不是 high/medium/low', () => {
      const output = {
        schemaVersion: 'v1.0.0',
        intent: 'find',
        tool: 'test-tool',
        confidence: { score: 0.8, level: 'invalid' },
        results: [],
      };
      expect(isCodemapOutput(output)).toBe(false);
    });

    it('应返回 false 当 confidence.level 为其他字符串', () => {
      const output = {
        schemaVersion: 'v1.0.0',
        intent: 'find',
        tool: 'test-tool',
        confidence: { score: 0.8, level: 'unknown' },
        results: [],
      };
      expect(isCodemapOutput(output)).toBe(false);
    });

    it('应返回 false 当 results 不是数组', () => {
      const output = {
        schemaVersion: 'v1.0.0',
        intent: 'find',
        tool: 'test-tool',
        confidence: { score: 0.8, level: 'high' },
        results: 'not-an-array',
      };
      expect(isCodemapOutput(output)).toBe(false);
    });
  });

  // R4.5: 测试可选字段缺失仍返回 true
  describe('可选字段缺失测试 (R4.5)', () => {
    it('应返回 true 当缺少可选 metadata 字段', () => {
      const output = {
        schemaVersion: 'v1.0.0',
        intent: 'find',
        tool: 'test-tool',
        confidence: { score: 0.8, level: 'high' },
        results: [],
      };
      expect(isCodemapOutput(output)).toBe(true);
    });

    it('应返回 true 当 results 为空数组', () => {
      const output = createMockCodemapOutput({ results: [] });
      expect(isCodemapOutput(output)).toBe(true);
    });

    it('应返回 true 当 metadata 存在但部分字段缺失', () => {
      const output = createMockCodemapOutput({
        metadata: {
          executionTime: 100,
          // resultCount, total, scope 缺失
        },
      });
      expect(isCodemapOutput(output)).toBe(true);
    });
  });

  // 边界条件测试
  describe('边界条件测试', () => {
    it('应返回 false 当传入空对象', () => {
      expect(isCodemapOutput({})).toBe(false);
    });

    it('应返回 false 当传入原始类型', () => {
      expect(isCodemapOutput('string')).toBe(false);
      expect(isCodemapOutput(123)).toBe(false);
      expect(isCodemapOutput(true)).toBe(false);
    });

    it('应返回 false 当传入数组', () => {
      expect(isCodemapOutput([])).toBe(false);
      expect(isCodemapOutput([1, 2, 3])).toBe(false);
    });

    it('应返回 true 当传入带有额外字段的对象', () => {
      const output = {
        schemaVersion: 'v1.0.0',
        intent: 'find',
        tool: 'test-tool',
        confidence: { score: 0.8, level: 'high' },
        results: [],
        extraField: 'extra',
      };
      expect(isCodemapOutput(output)).toBe(true);
    });
  });
});

// ============================================================================
// calculateConfidenceLevel 辅助函数测试
// ============================================================================

describe('calculateConfidenceLevel', () => {
  // R5.1: 测试边界值 score = 0.7 → 'high'
  describe('边界值 0.7 测试 (R5.1)', () => {
    it('应返回 high 当 score = 0.7', () => {
      expect(calculateConfidenceLevel(0.7)).toBe('high');
    });

    it('应返回 high 当 score > 0.7', () => {
      expect(calculateConfidenceLevel(0.71)).toBe('high');
      expect(calculateConfidenceLevel(0.8)).toBe('high');
      expect(calculateConfidenceLevel(0.9)).toBe('high');
    });

    it('应返回 high 当 score = 1', () => {
      expect(calculateConfidenceLevel(1)).toBe('high');
    });
  });

  // R5.2: 测试边界值 score = 0.4 → 'medium'
  describe('边界值 0.4 测试 (R5.2)', () => {
    it('应返回 medium 当 score = 0.4', () => {
      expect(calculateConfidenceLevel(0.4)).toBe('medium');
    });

    it('应返回 medium 当 0.4 <= score < 0.7', () => {
      expect(calculateConfidenceLevel(0.5)).toBe('medium');
      expect(calculateConfidenceLevel(0.6)).toBe('medium');
      expect(calculateConfidenceLevel(0.69)).toBe('medium');
    });

    it('应返回 medium 当 score 略大于 0.4', () => {
      expect(calculateConfidenceLevel(0.41)).toBe('medium');
    });
  });

  // R5.3: 测试边界值 score = 0.399... → 'low'
  describe('边界值 0.399... 测试 (R5.3)', () => {
    it('应返回 low 当 score < 0.4', () => {
      expect(calculateConfidenceLevel(0.39)).toBe('low');
      expect(calculateConfidenceLevel(0.3)).toBe('low');
      expect(calculateConfidenceLevel(0.1)).toBe('low');
    });

    it('应返回 low 当 score 略小于 0.4', () => {
      expect(calculateConfidenceLevel(0.399)).toBe('low');
      expect(calculateConfidenceLevel(0.3999)).toBe('low');
    });
  });

  // R5.4: 测试极端值
  describe('极端值测试 (R5.4)', () => {
    it('应返回 low 当 score = 0', () => {
      expect(calculateConfidenceLevel(0)).toBe('low');
    });

    it('应返回 high 当 score = 1', () => {
      expect(calculateConfidenceLevel(1)).toBe('high');
    });

    it('应返回 low 当 score 接近 0', () => {
      expect(calculateConfidenceLevel(0.001)).toBe('low');
      expect(calculateConfidenceLevel(0.0001)).toBe('low');
    });

    it('应返回 high 当 score 接近 1', () => {
      expect(calculateConfidenceLevel(0.999)).toBe('high');
      expect(calculateConfidenceLevel(0.9999)).toBe('high');
    });
  });

  // 返回值类型测试
  describe('返回值类型测试', () => {
    it('应返回字符串类型', () => {
      const result = calculateConfidenceLevel(0.5);
      expect(typeof result).toBe('string');
    });

    it('返回值应为 high/medium/low 之一', () => {
      const levels = ['high', 'medium', 'low'];
      expect(levels).toContain(calculateConfidenceLevel(0.8));
      expect(levels).toContain(calculateConfidenceLevel(0.5));
      expect(levels).toContain(calculateConfidenceLevel(0.2));
    });
  });
});

// ============================================================================
// UnifiedResult 接口类型测试
// ============================================================================

describe('UnifiedResult 接口 (R6.1)', () => {
  it('应支持所有必需字段', () => {
    const result: UnifiedResult = {
      id: 'test-id',
      source: 'codemap',
      toolScore: 0.8,
      type: 'file',
      file: 'test.ts',
      content: 'test',
      relevance: 0.9,
      keywords: ['test'],
    };

    expect(result.id).toBe('test-id');
    expect(result.source).toBe('codemap');
    expect(result.toolScore).toBe(0.8);
    expect(result.type).toBe('file');
    expect(result.file).toBe('test.ts');
    expect(result.content).toBe('test');
    expect(result.relevance).toBe(0.9);
    expect(result.keywords).toEqual(['test']);
  });

  it('应支持可选 line 字段', () => {
    const result: UnifiedResult = createMockUnifiedResult({ line: 100 });
    expect(result.line).toBe(100);

    const resultWithoutLine: UnifiedResult = createMockUnifiedResult({ line: undefined });
    expect(resultWithoutLine.line).toBeUndefined();
  });

  it('应支持可选 metadata 字段', () => {
    const result: UnifiedResult = createMockUnifiedResult({
      metadata: {
        symbolType: 'class',
        dependencies: ['a.ts'],
        testFile: 'test.spec.ts',
        commitCount: 5,
        gravity: 0.5,
        heatScore: createMockHeatScore(),
        impactCount: 3,
        stability: false,
        riskLevel: 'high',
      },
    });

    expect(result.metadata?.symbolType).toBe('class');
    expect(result.metadata?.dependencies).toEqual(['a.ts']);
    expect(result.metadata?.riskLevel).toBe('high');
  });

  it('应支持所有 source 类型', () => {
    const sources: UnifiedResult['source'][] = ['codemap', 'ast-grep', 'rg-internal', 'ai-feed', 'codemap-fallback'];
    
    for (const source of sources) {
      const result = createMockUnifiedResult({ source });
      expect(result.source).toBe(source);
    }
  });

  it('应支持所有 type 类型', () => {
    const types: UnifiedResult['type'][] = ['file', 'symbol', 'code', 'documentation', 'risk-assessment'];
    
    for (const type of types) {
      const result = createMockUnifiedResult({ type });
      expect(result.type).toBe(type);
    }
  });

  it('应支持所有 symbolType 类型', () => {
    const symbolTypes: Array<'class' | 'function' | 'interface' | 'variable'> = [
      'class', 'function', 'interface', 'variable'
    ];
    
    for (const symbolType of symbolTypes) {
      const result = createMockUnifiedResult({
        metadata: { symbolType },
      });
      expect(result.metadata?.symbolType).toBe(symbolType);
    }
  });

  it('应支持所有 riskLevel 类型', () => {
    const riskLevels: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
    
    for (const riskLevel of riskLevels) {
      const result = createMockUnifiedResult({
        metadata: { riskLevel },
      });
      expect(result.metadata?.riskLevel).toBe(riskLevel);
    }
  });
});

// ============================================================================
// CodemapOutput 接口类型测试
// ============================================================================

describe('CodemapOutput 接口 (R6.2)', () => {
  it('应支持所有必需字段', () => {
    const output: CodemapOutput = {
      schemaVersion: 'v1.0.0',
      intent: 'find',
      tool: 'codemap',
      confidence: {
        score: 0.85,
        level: 'high',
      },
      results: [createMockUnifiedResult()],
    };

    expect(output.schemaVersion).toBe('v1.0.0');
    expect(output.intent).toBe('find');
    expect(output.tool).toBe('codemap');
    expect(output.confidence.score).toBe(0.85);
    expect(output.confidence.level).toBe('high');
    expect(output.results).toHaveLength(1);
  });

  it('应支持可选 metadata 字段', () => {
    const output: CodemapOutput = createMockCodemapOutput({
      metadata: {
        executionTime: 200,
        resultCount: 5,
        total: 10,
        scope: 'transitive',
      },
    });

    expect(output.metadata?.executionTime).toBe(200);
    expect(output.metadata?.resultCount).toBe(5);
    expect(output.metadata?.total).toBe(10);
    expect(output.metadata?.scope).toBe('transitive');
  });

  it('应支持部分 metadata 字段', () => {
    const output: CodemapOutput = createMockCodemapOutput({
      metadata: {
        executionTime: 100,
      },
    });

    expect(output.metadata?.executionTime).toBe(100);
    expect(output.metadata?.resultCount).toBeUndefined();
  });

  it('应支持空 results 数组', () => {
    const output: CodemapOutput = createMockCodemapOutput({ results: [] });
    expect(output.results).toEqual([]);
  });

  it('应支持多个 results', () => {
    const output: CodemapOutput = createMockCodemapOutput({
      results: [createMockUnifiedResult(), createMockUnifiedResult(), createMockUnifiedResult()],
    });
    expect(output.results).toHaveLength(3);
  });

  it('应支持所有 intent 字符串值', () => {
    const intents: IntentType[] = ['find', 'read', 'link', 'show'];
    
    for (const intent of intents) {
      const output = createMockCodemapOutput({ intent });
      expect(output.intent).toBe(intent);
    }
  });

  it('应支持结构化 warnings 与 analysis', () => {
    const output: CodemapOutput = createMockCodemapOutput({
      intent: 'read',
      warnings: [{
        code: 'deprecated-intent',
        severity: 'warning',
        message: 'legacy intent "impact" 已弃用，请改用 "read"',
        deprecatedIntent: 'impact',
        replacementIntent: 'read',
        sunsetPolicy: '2-minor-window',
      }],
      analysis: {
        intent: 'read',
        impact: [{
          file: 'src/cli/index.ts',
          changedFiles: ['src/cli/index.ts'],
          transitiveDependencies: ['src/cli/commands/analyze.ts'],
          impactCount: 1,
          risk: 'medium',
        }],
        complexity: [{
          file: 'src/cli/index.ts',
          metrics: {
            cyclomatic: 3,
            cognitive: 5,
            maintainability: 88,
          },
          risk: 'low',
        }],
      },
    });

    expect(output.warnings?.[0]?.deprecatedIntent).toBe('impact');
    expect(output.analysis?.intent).toBe('read');
  });
});

// ============================================================================
// HeatScore 接口类型测试
// ============================================================================

describe('HeatScore 接口 (R6.3)', () => {
  it('应支持所有必需字段', () => {
    const heatScore: HeatScore = {
      freq30d: 10,
      lastType: 'feat',
      lastDate: '2026-03-01T00:00:00Z',
      stability: true,
    };

    expect(heatScore.freq30d).toBe(10);
    expect(heatScore.lastType).toBe('feat');
    expect(heatScore.lastDate).toBe('2026-03-01T00:00:00Z');
    expect(heatScore.stability).toBe(true);
  });

  it('应支持 lastDate 为 null', () => {
    const heatScore: HeatScore = createMockHeatScore({ lastDate: null });
    expect(heatScore.lastDate).toBeNull();
  });

  it('应支持不同 lastType 值', () => {
    const lastTypes = ['feat', 'fix', 'refactor', 'docs', 'test'];
    
    for (const lastType of lastTypes) {
      const heatScore = createMockHeatScore({ lastType });
      expect(heatScore.lastType).toBe(lastType);
    }
  });

  it('应支持不同 freq30d 值', () => {
    const freqs = [0, 1, 10, 100, 1000];
    
    for (const freq of freqs) {
      const heatScore = createMockHeatScore({ freq30d: freq });
      expect(heatScore.freq30d).toBe(freq);
    }
  });

  it('应支持不同 stability 值', () => {
    const heatScoreTrue = createMockHeatScore({ stability: true });
    expect(heatScoreTrue.stability).toBe(true);

    const heatScoreFalse = createMockHeatScore({ stability: false });
    expect(heatScoreFalse.stability).toBe(false);
  });

  it('应能在 UnifiedResult metadata 中使用', () => {
    const result: UnifiedResult = createMockUnifiedResult({
      metadata: {
        heatScore: createMockHeatScore({
          freq30d: 20,
          lastType: 'fix',
          lastDate: '2026-02-15T00:00:00Z',
          stability: false,
        }),
      },
    });

    expect(result.metadata?.heatScore?.freq30d).toBe(20);
    expect(result.metadata?.heatScore?.lastType).toBe('fix');
    expect(result.metadata?.heatScore?.stability).toBe(false);
  });
});

// ============================================================================
// 其他接口类型兼容性测试
// ============================================================================

describe('其他接口类型兼容性', () => {
  it('Confidence 接口应正确', () => {
    const confidence: Confidence = {
      score: 0.8,
      level: 'high',
    };

    expect(confidence.score).toBe(0.8);
    expect(confidence.level).toBe('high');
  });

  it('ConfidenceResult 接口应正确', () => {
    const result: ConfidenceResult = {
      score: 0.75,
      level: 'medium',
      reasons: ['reason 1', 'reason 2'],
    };

    expect(result.score).toBe(0.75);
    expect(result.level).toBe('medium');
    expect(result.reasons).toEqual(['reason 1', 'reason 2']);
  });

  it('IntentType 应包含所有 4 种 public 类型', () => {
    const intents: IntentType[] = [
      'find',
      'read',
      'link',
      'show',
    ];

    expect(intents).toHaveLength(4);
  });

  it('ToolOptions 应支持可选字段和扩展', () => {
    const options: ToolOptions = {
      timeout: 5000,
      topK: 10,
      includeTests: true,
      customField: 'custom',
    };

    expect(options.timeout).toBe(5000);
    expect(options.topK).toBe(10);
    expect(options.includeTests).toBe(true);
  });

  it('CodemapIntent 接口应正确', () => {
    const intent: CodemapIntent = {
      intent: 'find',
      targets: ['src/'],
      keywords: ['test'],
      scope: 'direct',
      tool: 'codemap',
    };

    expect(intent.intent).toBe('find');
    expect(intent.targets).toEqual(['src/']);
    expect(intent.scope).toBe('direct');
  });

  it('AnalyzeArgs 接口应正确', () => {
    const args: AnalyzeArgs = {
      intent: 'find',
      targets: ['src/'],
      keywords: ['test'],
      scope: 'direct',
      topK: 5,
      includeTests: true,
      includeGitHistory: false,
      json: true,
      outputMode: 'machine',
    };

    expect(args.intent).toBe('find');
    expect(args.topK).toBe(5);
    expect(args.json).toBe(true);
  });

  it('AnalyzeArgs 应支持部分字段', () => {
    const args: AnalyzeArgs = {
      intent: 'find',
    };

    expect(args.intent).toBe('find');
    expect(args.targets).toBeUndefined();
  });
});
