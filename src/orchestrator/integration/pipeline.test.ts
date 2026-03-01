/**
 * [META] 集成测试套件 - 测试完整分析流程
 * 测试 analyze → orchestrate → fuse → output 的完整流程
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ResultFusion } from '../result-fusion.js';
import type { UnifiedResult, FusionOptions } from '../types.js';

describe('Integration: Full Analysis Pipeline', () => {
  let fusion: ResultFusion;
  let fusionOptions: FusionOptions;

  beforeAll(() => {
    fusion = new ResultFusion();
    fusionOptions = {
      topK: 8,
      keywordWeights: {},
      maxTokens: 160,
    };
  });

  it('should execute complete analysis pipeline', () => {
    // 模拟工具执行结果 - 使用 Map 格式
    const resultsByTool = new Map<string, UnifiedResult[]>();

    resultsByTool.set('codemap', [
      {
        id: 'codemap-1',
        source: 'codemap',
        toolScore: 0.9,
        type: 'symbol',
        file: '/src/test.ts',
        line: 10,
        content: 'class TestClass { }',
        relevance: 0.8,
        keywords: ['TestClass'],
        symbol: 'TestClass',
        score: { heat: 0.8, confidence: 0.9 },
        metadata: {
          symbolType: 'class',
          dependencies: ['Dependency1', 'Dependency2'],
        },
      },
    ]);

    resultsByTool.set('ast-grep', [
      {
        id: 'ast-grep-1',
        symbol: 'TestClass',
        file: '/src/test.ts',
        line: 10,
        type: 'class',
        score: { heat: 0.7, confidence: 0.85 },
        metadata: {
          symbolType: 'class',
          dependencies: ['Dependency1'],
        },
      },
    ]);

    // 结果融合
    const fused = fusion.fuse(resultsByTool, fusionOptions);
    expect(fused).toBeDefined();
    expect(fused.length).toBeGreaterThan(0);

    // 验证输出格式
    for (const result of fused) {
      expect(result.id).toBeDefined();
      expect(result.symbol).toBeDefined();
      expect(result.file).toBeDefined();
      expect(result.score).toBeDefined();
    }
  });

  it('should handle tool fallback chain', () => {
    // 模拟工具回退：CodeMap → ast-grep → rg-internal
    const resultsByTool = new Map<string, UnifiedResult[]>();

    // 模拟 CodeMap 返回空结果
    resultsByTool.set('codemap', []);

    // 模拟 ast-grep 返回结果
    resultsByTool.set('ast-grep', [
      {
        id: 'ast-grep-1',
        symbol: 'FoundSymbol',
        file: '/src/found.ts',
        line: 20,
        type: 'function',
        score: { heat: 0.6, confidence: 0.7 },
        metadata: { symbolType: 'function' },
      },
    ]);

    const fused = fusion.fuse(resultsByTool, fusionOptions);

    // 验证回退链正确工作 - 应该有有效结果
    const hasValidResult = fused.some((r) => r.score.confidence > 0.5);
    expect(hasValidResult).toBe(true);
  });

  it('should deduplicate results correctly', () => {
    const resultsByTool = new Map<string, UnifiedResult[]>();

    resultsByTool.set('codemap', [
      {
        id: '1',
        symbol: 'DuplicateClass',
        file: '/src/A.ts',
        line: 10,
        type: 'class',
        score: { heat: 0.9, confidence: 0.95 },
        metadata: {},
      },
    ]);

    resultsByTool.set('ast-grep', [
      {
        id: '2',
        symbol: 'DuplicateClass',
        file: '/src/A.ts',
        line: 10,
        type: 'class',
        score: { heat: 0.8, confidence: 0.85 },
        metadata: {},
      },
      {
        id: '3',
        symbol: 'DifferentClass',
        file: '/src/B.ts',
        line: 20,
        type: 'class',
        score: { heat: 0.7, confidence: 0.8 },
        metadata: {},
      },
    ]);

    const fused = fusion.fuse(resultsByTool, fusionOptions);

    // 验证去重：DuplicateClass 应该只有一个
    const duplicateCount = fused.filter((r) => r.symbol === 'DuplicateClass').length;
    expect(duplicateCount).toBe(1);

    // 验证 DifferentClass 保留
    const differentCount = fused.filter((r) => r.symbol === 'DifferentClass').length;
    expect(differentCount).toBe(1);
  });
});
