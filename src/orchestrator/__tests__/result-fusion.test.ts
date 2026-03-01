/**
 * ResultFusion 单元测试
 */

import { describe, it, expect } from 'vitest';
import { ResultFusion, truncateByToken } from '../result-fusion';
import type { UnifiedResult } from '../types';

describe('ResultFusion', () => {
  const fusion = new ResultFusion();

  describe('fuse - 加权合并', () => {
    it('应该按工具权重调整 relevance', () => {
      const resultsByTool = new Map<string, UnifiedResult[]>([
        ['ast-grep', [{
          id: '1',
          source: 'ast-grep',
          toolScore: 0.9,
          type: 'code',
          file: 'src/a.ts',
          line: 10,
          content: 'const a = 1;',
          relevance: 0.9,
          keywords: ['test'],
          metadata: {}
        }]],
        ['codemap', [{
          id: '2',
          source: 'codemap',
          toolScore: 0.9,
          type: 'code',
          file: 'src/b.ts',
          line: 20,
          content: 'const b = 2;',
          relevance: 0.9,
          keywords: ['test'],
          metadata: {}
        }]]
      ]);

      const result = fusion.fuse(resultsByTool, { topK: 10 });

      // ast-grep 权重 1.0, relevance 0.9 * 1.0 = 0.9
      // codemap 权重 0.9, relevance 0.9 * 0.9 = 0.81
      const astGrepResult = result.find(r => r.source === 'ast-grep');
      const codemapResult = result.find(r => r.source === 'codemap');

      expect(astGrepResult?.relevance).toBe(0.9);
      expect(codemapResult?.relevance).toBeCloseTo(0.81, 2);
    });

    it('未知工具应使用默认权重 0.5', () => {
      const resultsByTool = new Map<string, UnifiedResult[]>([
        ['unknown-tool', [{
          id: '1',
          source: 'unknown-tool' as any,
          toolScore: 0.9,
          type: 'code',
          file: 'src/a.ts',
          line: 10,
          content: 'const a = 1;',
          relevance: 0.9,
          keywords: ['test'],
          metadata: {}
        }]]
      ]);

      const result = fusion.fuse(resultsByTool, { topK: 10 });

      // 0.9 * 0.5 = 0.45
      expect(result[0].relevance).toBeCloseTo(0.45, 2);
    });
  });

  describe('fuse - 风险加权', () => {
    it('高风险文件应降权 -0.1', () => {
      const resultsByTool = new Map<string, UnifiedResult[]>([
        ['codemap', [{
          id: '1',
          source: 'codemap',
          toolScore: 0.9,
          type: 'code',
          file: 'src/a.ts',
          line: 10,
          content: 'const a = 1;',
          relevance: 0.9,
          keywords: ['test'],
          metadata: { riskLevel: 'high' as const }
        }]]
      ]);

      const result = fusion.fuse(resultsByTool, { topK: 10 });

      // 0.9 * 0.9(工具权重) - 0.1(风险) = 0.71
      expect(result[0].relevance).toBeCloseTo(0.71, 2);
    });

    it('低风险文件应加权 +0.05', () => {
      const resultsByTool = new Map<string, UnifiedResult[]>([
        ['codemap', [{
          id: '1',
          source: 'codemap',
          toolScore: 0.9,
          type: 'code',
          file: 'src/a.ts',
          line: 10,
          content: 'const a = 1;',
          relevance: 0.9,
          keywords: ['test'],
          metadata: { riskLevel: 'low' as const }
        }]]
      ]);

      const result = fusion.fuse(resultsByTool, { topK: 10 });

      // 0.9 * 0.9(工具权重) + 0.05(风险) = 0.86
      expect(result[0].relevance).toBeCloseTo(0.86, 2);
    });

    it('风险加权后 relevance 应保持在 [0, 1] 范围内', () => {
      const resultsByTool = new Map<string, UnifiedResult[]>([
        ['codemap', [{
          id: '1',
          source: 'codemap',
          toolScore: 0.9,
          type: 'code',
          file: 'src/a.ts',
          line: 10,
          content: 'const a = 1;',
          relevance: 0.1,
          keywords: ['test'],
          metadata: { riskLevel: 'high' as const }
        }]]
      ]);

      const result = fusion.fuse(resultsByTool, { topK: 10 });

      // 0.1 * 0.9 - 0.1 = -0.01 -> clamp to 0
      expect(result[0].relevance).toBeGreaterThanOrEqual(0);
      expect(result[0].relevance).toBeLessThanOrEqual(1);
    });
  });

  describe('fuse - 去重', () => {
    it('相同 file:line 应保留高分结果', () => {
      const resultsByTool = new Map<string, UnifiedResult[]>([
        ['ast-grep', [{
          id: '1',
          source: 'ast-grep',
          toolScore: 0.9,
          type: 'code',
          file: 'src/a.ts',
          line: 10,
          content: 'const a = 1;',
          relevance: 0.5,  // 低分
          keywords: ['test'],
          metadata: {}
        }]],
        ['codemap', [{
          id: '2',
          source: 'codemap',
          toolScore: 0.9,
          type: 'code',
          file: 'src/a.ts',
          line: 10,
          content: 'const a = 1;',
          relevance: 0.9,  // 高分
          keywords: ['test'],
          metadata: {}
        }]]
      ]);

      const result = fusion.fuse(resultsByTool, { topK: 10 });

      expect(result).toHaveLength(1);
      // 应保留 codemap 的高分结果
      expect(result[0].source).toBe('codemap');
      expect(result[0].relevance).toBeCloseTo(0.81, 2); // 0.9 * 0.9
    });

    it('不同 file:line 应分别保留', () => {
      const resultsByTool = new Map<string, UnifiedResult[]>([
        ['codemap', [
          {
            id: '1',
            source: 'codemap',
            toolScore: 0.9,
            type: 'code',
            file: 'src/a.ts',
            line: 10,
            content: 'const a = 1;',
            relevance: 0.9,
            keywords: ['test'],
            metadata: {}
          },
          {
            id: '2',
            source: 'codemap',
            toolScore: 0.9,
            type: 'code',
            file: 'src/b.ts',
            line: 20,
            content: 'const b = 2;',
            relevance: 0.9,
            keywords: ['test'],
            metadata: {}
          }
        ]]
      ]);

      const result = fusion.fuse(resultsByTool, { topK: 10 });

      expect(result).toHaveLength(2);
    });
  });

  describe('fuse - 排序策略', () => {
    it('默认场景应按 relevance 降序排序', () => {
      const resultsByTool = new Map<string, UnifiedResult[]>([
        ['codemap', [
          {
            id: '1',
            source: 'codemap',
            toolScore: 0.9,
            type: 'code',
            file: 'src/a.ts',
            line: 10,
            content: 'const a = 1;',
            relevance: 0.5,
            keywords: ['test'],
            metadata: {}
          },
          {
            id: '2',
            source: 'codemap',
            toolScore: 0.9,
            type: 'code',
            file: 'src/b.ts',
            line: 20,
            content: 'const b = 2;',
            relevance: 0.9,
            keywords: ['test'],
            metadata: {}
          }
        ]]
      ]);

      const result = fusion.fuse(resultsByTool, { topK: 10, intent: 'search' });

      expect(result[0].file).toBe('src/b.ts');
      expect(result[1].file).toBe('src/a.ts');
    });

    it('impact 场景应按风险排序', () => {
      const resultsByTool = new Map<string, UnifiedResult[]>([
        ['codemap', [
          {
            id: '1',
            source: 'codemap',
            toolScore: 0.9,
            type: 'code',
            file: 'src/low.ts',
            line: 10,
            content: 'const a = 1;',
            relevance: 0.9,
            keywords: ['test'],
            metadata: { riskLevel: 'low' as const }
          },
          {
            id: '2',
            source: 'codemap',
            toolScore: 0.9,
            type: 'code',
            file: 'src/high.ts',
            line: 20,
            content: 'const b = 2;',
            relevance: 0.9,
            keywords: ['test'],
            metadata: { riskLevel: 'high' as const }
          }
        ]]
      ]);

      const result = fusion.fuse(resultsByTool, { topK: 10, intent: 'impact' });

      // 高风险应排在前面
      expect(result[0].file).toBe('src/high.ts');
      expect(result[1].file).toBe('src/low.ts');
    });
  });

  describe('fuse - 关键词加权', () => {
    it('应提升匹配关键词的结果', () => {
      const resultsByTool = new Map<string, UnifiedResult[]>([
        ['codemap', [
          {
            id: '1',
            source: 'codemap',
            toolScore: 0.9,
            type: 'code',
            file: 'src/a.ts',
            line: 10,
            content: 'const a = 1;',
            relevance: 0.5,
            keywords: ['test'],
            metadata: {}
          },
          {
            id: '2',
            source: 'codemap',
            toolScore: 0.9,
            type: 'code',
            file: 'src/b.ts',
            line: 20,
            content: 'const b = 2;',
            relevance: 0.9,
            keywords: ['other'],
            metadata: {}
          }
        ]]
      ]);

      const result = fusion.fuse(resultsByTool, {
        topK: 10,
        keywordWeights: { 'test': 0.3 }
      });

      // test 关键词加权后：0.5 * 0.9 + 0.3 = 0.75
      // other 无加权：0.9 * 0.9 = 0.81
      expect(result[0].file).toBe('src/b.ts');
    });
  });

  describe('fuse - Top-K 裁剪', () => {
    it('应限制返回结果数量', () => {
      const results: UnifiedResult[] = [];
      for (let i = 0; i < 20; i++) {
        results.push({
          id: `${i}`,
          source: 'codemap',
          toolScore: 0.9,
          type: 'code',
          file: `src/${i}.ts`,
          line: i * 10,
          content: `const ${i} = ${i};`,
          relevance: 0.9 - i * 0.04,
          keywords: ['test'],
          metadata: {}
        });
      }

      const resultsByTool = new Map<string, UnifiedResult[]>([
        ['codemap', results]
      ]);

      const result = fusion.fuse(resultsByTool, { topK: 5 });

      expect(result).toHaveLength(5);
    });
  });
});

describe('truncateByToken', () => {
  it('不应截断短内容', () => {
    const content = 'const a = 1;';
    const result = truncateByToken(content, 10);
    expect(result).toBe(content);
  });

  it('应按 token 数量截断长内容', () => {
    const content = 'a b c d e f g h i j k l m n o p q r s t u v w x y z';
    const result = truncateByToken(content, 5);
    expect(result).toBe('a b c d e...');
  });

  it('应正确处理中文内容', () => {
    const content = '这是一段很长的中文内容需要被截断';
    const result = truncateByToken(content, 5);
    expect(result).toContain('...');
  });
});
