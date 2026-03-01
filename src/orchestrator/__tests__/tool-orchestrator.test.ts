/**
 * ToolOrchestrator 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolOrchestrator } from '../tool-orchestrator';
import type { CodemapIntent } from '../types';
import type { ToolAdapter } from '../tool-orchestrator';

describe('ToolOrchestrator', () => {
  let orchestrator: ToolOrchestrator;

  // 模拟工具适配器
  const createMockAdapter = (name: string, results: any[]): ToolAdapter => ({
    name,
    weight: 1.0,
    isAvailable: vi.fn().mockResolvedValue(true),
    execute: vi.fn().mockResolvedValue(results)
  });

  beforeEach(() => {
    orchestrator = new ToolOrchestrator();
  });

  describe('runToolWithTimeout', () => {
    it('应该正确执行工具并返回结果', async () => {
      const mockAdapter = createMockAdapter('test-tool', [
        { id: '1', source: 'test-tool', toolScore: 0.9, type: 'code', file: 'src/a.ts', line: 10, content: 'test', relevance: 0.9, keywords: [] }
      ]);
      orchestrator.registerAdapter(mockAdapter);

      const intent: CodemapIntent = {
        intent: 'search',
        targets: [],
        keywords: ['test'],
        scope: 'direct',
        tool: 'test-tool'
      };

      const results = await orchestrator.runToolWithTimeout('test-tool', intent);

      expect(results).toHaveLength(1);
      expect(results[0].file).toBe('src/a.ts');
      // 验证 execute 被调用时传递了 intent 和 AbortSignal
      expect(mockAdapter.execute).toHaveBeenCalledWith(intent, expect.any(AbortSignal));
    });

    it('工具不存在时返回空数组', async () => {
      const intent: CodemapIntent = {
        intent: 'search',
        targets: [],
        keywords: ['test'],
        scope: 'direct',
        tool: 'non-existent'
      };

      const results = await orchestrator.runToolWithTimeout('non-existent', intent);

      expect(results).toHaveLength(0);
    });
  });

  describe('runToolSafely', () => {
    it('应该返回安全结果，不抛出异常', async () => {
      const failingAdapter: ToolAdapter = {
        name: 'failing-tool',
        weight: 1.0,
        isAvailable: vi.fn().mockResolvedValue(true),
        execute: vi.fn().mockRejectedValue(new Error('Tool failed'))
      };
      orchestrator.registerAdapter(failingAdapter);

      const intent: CodemapIntent = {
        intent: 'search',
        targets: [],
        keywords: ['test'],
        scope: 'direct',
        tool: 'failing-tool'
      };

      // runToolSafely 不应抛出异常，应返回空结果
      const result = await orchestrator.runToolSafely('failing-tool', intent);

      // 错误被 runToolWithTimeout 捕获，返回空结果
      expect(result.results).toHaveLength(0);
    });
  });

  describe('executeWithFallback', () => {
    it('置信度高于阈值时不触发回退', async () => {
      const mockAdapter = createMockAdapter('ast-grep', [
        { id: '1', source: 'ast-grep', toolScore: 0.9, type: 'code', file: 'src/a.ts', line: 10, content: 'test', relevance: 0.9, keywords: ['test'], metadata: {} }
      ]);
      orchestrator.registerAdapter(mockAdapter);

      const intent: CodemapIntent = {
        intent: 'search',
        targets: ['src'],
        keywords: ['test'],
        scope: 'direct',
        tool: 'ast-grep'
      };

      const result = await orchestrator.executeWithFallback(intent, 'ast-grep');

      expect(result.results).toHaveLength(1);
      expect(result.tool).toBe('ast-grep');
    });

    it('置信度低于阈值时触发回退', async () => {
      // 创建一个返回低相关度结果的适配器
      const lowQualityAdapter: ToolAdapter = {
        name: 'ast-grep',
        weight: 1.0,
        isAvailable: vi.fn().mockResolvedValue(true),
        execute: vi.fn().mockResolvedValue([
          { id: '1', source: 'ast-grep', toolScore: 0.1, type: 'code', file: 'src/a.ts', line: 10, content: 'test', relevance: 0.1, keywords: [], metadata: {} }
        ])
      };
      orchestrator.registerAdapter(lowQualityAdapter);

      // 添加回退工具
      const fallbackAdapter = createMockAdapter('rg-internal', [
        { id: '2', source: 'rg-internal', toolScore: 0.5, type: 'code', file: 'src/b.ts', line: 20, content: 'test', relevance: 0.5, keywords: [], metadata: {} }
      ]);
      orchestrator.registerAdapter(fallbackAdapter);

      const intent: CodemapIntent = {
        intent: 'search',
        targets: ['src'],
        keywords: ['test'],
        scope: 'direct',
        tool: 'ast-grep'
      };

      const result = await orchestrator.executeWithFallback(intent, 'ast-grep');

      // 结果应包含回退工具的结果
      expect(result.results.length).toBeGreaterThan(0);
    });
  });

  describe('executeParallel', () => {
    it('应该并行执行多个工具', async () => {
      const adapter1 = createMockAdapter('tool1', [
        { id: '1', source: 'tool1', toolScore: 0.9, type: 'code', file: 'src/a.ts', line: 10, content: 'test', relevance: 0.9, keywords: [], metadata: {} }
      ]);
      const adapter2 = createMockAdapter('tool2', [
        { id: '2', source: 'tool2', toolScore: 0.8, type: 'code', file: 'src/b.ts', line: 20, content: 'test', relevance: 0.8, keywords: [], metadata: {} }
      ]);

      orchestrator.registerAdapter(adapter1);
      orchestrator.registerAdapter(adapter2);

      const intent: CodemapIntent = {
        intent: 'search',
        targets: ['src'],
        keywords: ['test'],
        scope: 'direct',
        tool: 'tool1'
      };

      const results = await orchestrator.executeParallel(intent, ['tool1', 'tool2']);

      expect(results.has('tool1')).toBe(true);
      expect(results.has('tool2')).toBe(true);
    });
  });
});
