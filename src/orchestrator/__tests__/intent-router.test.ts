/**
 * IntentRouter 单元测试
 */

import { describe, it, expect } from 'vitest';
import { IntentRouter } from '../intent-router';
import type { AnalyzeArgs } from '../types';

describe('IntentRouter', () => {
  const router = new IntentRouter();

  describe('route', () => {
    it('应该正确路由 search intent', () => {
      const args: AnalyzeArgs = {
        intent: 'search',
        targets: ['src'],
        keywords: ['test'],
        scope: 'direct'
      };

      const result = router.route(args);

      expect(result.intent).toBe('search');
      expect(result.targets).toEqual(['src']);
      expect(result.keywords).toEqual(['test']);
      expect(result.scope).toBe('direct');
      expect(result.tool).toBe('ast-grep');
    });

    it('应该正确路由 impact intent', () => {
      const args: AnalyzeArgs = {
        intent: 'impact',
        targets: ['src/auth']
      };

      const result = router.route(args);

      expect(result.intent).toBe('impact');
      expect(result.tool).toBe('codemap');
    });

    it('无 intent 参数时应使用默认 search', () => {
      const args: AnalyzeArgs = {};

      const result = router.route(args);

      expect(result.intent).toBe('search');
    });

    it('应该设置默认 scope 为 direct', () => {
      const args: AnalyzeArgs = {
        intent: 'search'
      };

      const result = router.route(args);

      expect(result.scope).toBe('direct');
    });
  });

  describe('validateIntent', () => {
    it('有效 intent 不应抛出错误', () => {
      expect(() => router.route({ intent: 'search' })).not.toThrow();
      expect(() => router.route({ intent: 'impact' })).not.toThrow();
      expect(() => router.route({ intent: 'dependency' })).not.toThrow();
    });

    it('无效 intent 应抛出错误', () => {
      expect(() => router.route({ intent: 'invalid' })).toThrow('无效的 intent: invalid');
    });
  });

  describe('isValidIntent', () => {
    it('应正确判断有效 intent', () => {
      expect(router.isValidIntent('search')).toBe(true);
      expect(router.isValidIntent('impact')).toBe(true);
      expect(router.isValidIntent('invalid')).toBe(false);
    });
  });

  describe('getValidIntents', () => {
    it('应返回所有有效意图类型', () => {
      const intents = router.getValidIntents();

      expect(intents).toContain('search');
      expect(intents).toContain('impact');
      expect(intents).toContain('dependency');
      expect(intents).toContain('documentation');
      expect(intents).toContain('complexity');
      expect(intents).toContain('overview');
      expect(intents).toContain('refactor');
      expect(intents).toContain('reference');
      expect(intents).toHaveLength(8);
    });
  });
});
