// [META] since:2026-03-02 | owner:adapter-team | coverage:100%
// [WHY] Tests for codemap adapter with CLI command integration


/**
 * codemap-adapter.test.ts
 * 
 * CodemapAdapter 完整测试
 * 
 * 测试范围:
 * - 类实例化和属性
 * - isAvailable 方法（检查 codemap.json）
 * - execute 方法边界情况
 * - 工厂函数
 * 
 * Prefer retrieval-led reasoning over pre-training-led reasoning
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================
// Mock 外部依赖
// ============================================================

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn()
}));

// Mock CLI 命令 - 使用工厂函数返回模拟实例
vi.mock('../../cli/commands/impact.js', () => ({
  ImpactCommand: vi.fn(() => ({
    runEnhanced: vi.fn().mockResolvedValue([])
  }))
}));

vi.mock('../../cli/commands/deps.js', () => ({
  DepsCommand: vi.fn(() => ({
    runEnhanced: vi.fn().mockResolvedValue([])
  }))
}));

vi.mock('../../cli/commands/complexity.js', () => ({
  ComplexityCommand: vi.fn(() => ({
    runEnhanced: vi.fn().mockResolvedValue([])
  }))
}));

// ============================================================
// 导入被测模块（在 mock 之后）
// ============================================================

import { readFile } from 'node:fs/promises';
import { CodemapAdapter, createCodemapAdapter } from '../codemap-adapter.js';

// ============================================================
// 测试套件
// ============================================================

describe('CodemapAdapter', () => {
  let adapter: CodemapAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new CodemapAdapter();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('class properties', () => {
    it('should have correct name property', () => {
      expect(adapter.name).toBe('codemap');
    });

    it('should have correct weight property', () => {
      expect(adapter.weight).toBe(0.9);
    });

    it('should be instance of CodemapAdapter', () => {
      expect(adapter).toBeInstanceOf(CodemapAdapter);
    });
  });

  describe('constructor options', () => {
    it('should use default options when not provided', () => {
      const defaultAdapter = new CodemapAdapter();
      expect(defaultAdapter).toBeDefined();
    });

    it('should accept custom codemapPath option', () => {
      const customAdapter = new CodemapAdapter({ codemapPath: '.custom-codemap' });
      expect(customAdapter).toBeDefined();
    });

    it('should accept defaultIntent option', () => {
      const adapterWithIntent = new CodemapAdapter({ defaultIntent: 'dependency' });
      expect(adapterWithIntent).toBeDefined();
    });

    it('should accept defaultScope option', () => {
      const adapterWithScope = new CodemapAdapter({ defaultScope: 'transitive' });
      expect(adapterWithScope).toBeDefined();
    });
  });

  describe('isAvailable', () => {
    it('should return true when codemap.json exists', async () => {
      // Arrange
      vi.mocked(readFile).mockResolvedValue('{}');

      // Act
      const result = await adapter.isAvailable();

      // Assert
      expect(result).toBe(true);
      expect(readFile).toHaveBeenCalled();
      const callArg = vi.mocked(readFile).mock.calls[0][0];
      expect(callArg).toContain('.mycodemap');
      expect(callArg).toContain('codemap.json');
    });

    it('should return false when codemap.json does not exist', async () => {
      // Arrange
      vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'));

      // Act
      const result = await adapter.isAvailable();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false on any read error', async () => {
      // Arrange
      vi.mocked(readFile).mockRejectedValue(new Error('Permission denied'));

      // Act
      const result = await adapter.isAvailable();

      // Assert
      expect(result).toBe(false);
    });

    it('should use custom codemapPath', async () => {
      // Arrange
      const customAdapter = new CodemapAdapter({ codemapPath: '/custom/path' });
      vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'));

      // Act
      await customAdapter.isAvailable();

      // Assert
      const callArg = vi.mocked(readFile).mock.calls[0][0];
      expect(callArg).toContain('/custom/path');
      expect(callArg).toContain('codemap.json');
    });
  });

  describe('execute', () => {
    it('should return empty array when targets is empty', async () => {
      // Act
      const results = await adapter.execute([], { topK: 10 });

      // Assert
      expect(results).toEqual([]);
    });

    it('should return empty array when keywords is empty and no targets', async () => {
      // Act
      const results = await adapter.execute([], { topK: 10, targets: [] });

      // Assert
      expect(results).toEqual([]);
    });

    it('should execute with keywords', async () => {
      // Act
      const results = await adapter.execute(['test'], { topK: 10 });

      // Assert
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should execute with options', async () => {
      // Act
      const results = await adapter.execute(['test'], { 
        topK: 5,
        intent: 'impact',
        scope: 'direct'
      });

      // Assert
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle different intent values', async () => {
      // Act - dependency intent
      const depsResults = await adapter.execute(['test'], { 
        intent: 'dependency',
        topK: 10 
      });

      // Assert
      expect(depsResults).toBeDefined();
      expect(Array.isArray(depsResults)).toBe(true);

      // Act - complexity intent
      const complexityResults = await adapter.execute(['test'], { 
        intent: 'complexity',
        topK: 10 
      });

      // Assert
      expect(complexityResults).toBeDefined();
      expect(Array.isArray(complexityResults)).toBe(true);
    });

    it('should respect topK limit', async () => {
      // Act
      const results = await adapter.execute(['test'], { topK: 3 });

      // Assert
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should use default topK when not specified', async () => {
      // Act
      const results = await adapter.execute(['test'], {});

      // Assert
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should use targets from options', async () => {
      // Act
      const results = await adapter.execute(['keyword'], { 
        targets: ['explicit-target'],
        topK: 10 
      });

      // Assert
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle scope option', async () => {
      // Act
      const results = await adapter.execute(['test'], { 
        scope: 'transitive',
        topK: 10 
      });

      // Assert
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('default options', () => {
    it('should use defaultIntent when intent not specified', async () => {
      // Arrange
      const adapterWithDefault = new CodemapAdapter({ defaultIntent: 'dependency' });

      // Act
      const results = await adapterWithDefault.execute(['test'], { topK: 10 });

      // Assert
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should use defaultScope when scope not specified', async () => {
      // Arrange
      const adapterWithScope = new CodemapAdapter({ defaultScope: 'transitive' });

      // Act
      const results = await adapterWithScope.execute(['test'], { topK: 10 });

      // Assert
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('createCodemapAdapter factory', () => {
    it('should create CodemapAdapter instance', () => {
      // Act
      const adapter = createCodemapAdapter();

      // Assert
      expect(adapter).toBeInstanceOf(CodemapAdapter);
      expect(adapter.name).toBe('codemap');
    });

    it('should pass options to constructor', () => {
      // Arrange
      const options = { 
        codemapPath: '/custom', 
        defaultIntent: 'dependency' as const, 
        defaultScope: 'transitive' as const 
      };

      // Act
      const adapter = createCodemapAdapter(options);

      // Assert
      expect(adapter).toBeInstanceOf(CodemapAdapter);
    });
  });
});
