/**
 * IntentRouter 单元测试
 */

import { describe, it, expect } from 'vitest';
import { IntentRouter } from '../intent-router';
import type { AnalyzeArgs } from '../types';

describe('IntentRouter', () => {
  const router = new IntentRouter();

  describe('route', () => {
    it('应该正确路由 find intent', () => {
      const args: AnalyzeArgs = {
        intent: 'find',
        targets: ['src'],
        keywords: ['test'],
        scope: 'direct'
      };

      const result = router.route(args);

      expect(result.intent).toBe('find');
      expect(result.executionIntent).toBe('search');
      expect(result.targets).toEqual(['src']);
      expect(result.keywords).toEqual(['test']);
      expect(result.scope).toBe('direct');
      expect(result.tool).toBe('ast-grep');
      expect(result.secondary).toBeUndefined();
    });

    it('应该将 legacy impact 归一化到 read', () => {
      const args: AnalyzeArgs = {
        intent: 'impact',
        targets: ['src/auth']
      };

      const result = router.route(args);

      expect(result.intent).toBe('read');
      expect(result.executionIntent).toBe('impact');
      expect(result.tool).toBe('codemap');
      expect(result.secondary).toBe('ast-grep');
      expect(result.compatibility).toEqual({
        isDeprecated: true,
        normalizedFrom: 'impact'
      });
    });

    it('无 intent 参数时应抛出错误', () => {
      expect(() => router.route({})).toThrow('缺少必要参数: intent');
    });

    it('应该设置默认 scope 为 direct', () => {
      const args: AnalyzeArgs = {
        intent: 'find'
      };

      const result = router.route(args);

      expect(result.scope).toBe('direct');
    });
  });

  describe('validateIntent', () => {
    it('有效 intent 不应抛出错误', () => {
      expect(() => router.route({ intent: 'find', keywords: ['test'] })).not.toThrow();
      expect(() => router.route({ intent: 'impact', targets: ['src'] })).not.toThrow();
      expect(() => router.route({ intent: 'dependency', targets: ['src'] })).not.toThrow();
    });

    it('无效 intent 应抛出错误', () => {
      expect(() => router.route({ intent: 'invalid' })).toThrow('无效的 intent: invalid');
      expect(() => router.route({ intent: 'refactor' })).toThrow('无效的 intent: refactor');
    });
  });

  describe('isValidIntent', () => {
    it('应正确判断有效 intent', () => {
      expect(router.isValidIntent('find')).toBe(true);
      expect(router.isValidIntent('impact')).toBe(true);
      expect(router.isValidIntent('refactor')).toBe(false);
      expect(router.isValidIntent('invalid')).toBe(false);
    });
  });

  describe('getValidIntents', () => {
    it('应返回所有有效意图类型', () => {
      const intents = router.getValidIntents();

      expect(intents).toContain('find');
      expect(intents).toContain('read');
      expect(intents).toContain('link');
      expect(intents).toContain('show');
      expect(intents).toHaveLength(4);
    });
  });
});
