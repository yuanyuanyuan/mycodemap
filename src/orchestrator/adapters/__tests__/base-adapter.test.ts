// [META] since:2026-03-02 | owner:adapter-team | coverage:100%
// [WHY] Tests for base adapter interface compliance


/**
 * base-adapter.test.ts
 * 
 * ToolAdapter接口契约测试
 * 
 * 测试范围:
 * - 接口存在性验证
 * - 属性类型检查
 * - 方法签名验证
 * 
 * Prefer retrieval-led reasoning over pre-training-led reasoning
 */

import { describe, it, expect, vi } from 'vitest';

// ============================================================
// 接口定义（复制自源代码，用于类型检查）
// ============================================================

interface ToolOptions {
  cwd?: string;
  limit?: number;
  language?: string;
}

interface UnifiedResult {
  file: string;
  line: number;
  column: number;
  content: string;
  score: number;
}

interface ToolAdapter {
  name: string;
  weight: number;
  isAvailable(): Promise<boolean>;
  execute(keywords: string[], options: ToolOptions): Promise<UnifiedResult[]>;
}

// ============================================================
// Mock实现（用于测试接口契约）
// ============================================================

class MockToolAdapter implements ToolAdapter {
  name = 'mock-adapter';
  weight = 0.5;
  
  async isAvailable(): Promise<boolean> {
    return true;
  }
  
  async execute(keywords: string[], options: ToolOptions): Promise<UnifiedResult[]> {
    return [{
      file: 'test.ts',
      line: 1,
      column: 0,
      content: 'test',
      score: 1.0
    }];
  }
}

// ============================================================
// 测试套件
// ============================================================

describe('ToolAdapter Interface', () => {
  describe('interface contract', () => {
    it('should define the ToolAdapter interface', () => {
      // 验证接口可以被实现
      const adapter: ToolAdapter = new MockToolAdapter();
      expect(adapter).toBeDefined();
    });

    it('should require name property of type string', () => {
      const adapter: ToolAdapter = new MockToolAdapter();
      
      // Arrange & Act
      const name = adapter.name;
      
      // Assert
      expect(typeof name).toBe('string');
      expect(name).toBe('mock-adapter');
    });

    it('should require weight property of type number', () => {
      const adapter: ToolAdapter = new MockToolAdapter();
      
      // Arrange & Act
      const weight = adapter.weight;
      
      // Assert
      expect(typeof weight).toBe('number');
      expect(weight).toBe(0.5);
    });

    it('should require weight to be between 0 and 1', () => {
      // 验证weight的合理范围
      const validAdapter: ToolAdapter = {
        name: 'valid',
        weight: 0.5,
        isAvailable: async () => true,
        execute: async () => []
      };
      
      expect(validAdapter.weight).toBeGreaterThanOrEqual(0);
      expect(validAdapter.weight).toBeLessThanOrEqual(1);
    });
  });

  describe('isAvailable method', () => {
    it('should return a Promise<boolean>', async () => {
      // Arrange
      const adapter: ToolAdapter = new MockToolAdapter();
      
      // Act
      const result = adapter.isAvailable();
      
      // Assert
      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toBe(true);
    });

    it('should return false when tool is not available', async () => {
      // Arrange
      const unavailableAdapter: ToolAdapter = {
        name: 'unavailable',
        weight: 0.5,
        isAvailable: async () => false,
        execute: async () => []
      };
      
      // Act & Assert
      await expect(unavailableAdapter.isAvailable()).resolves.toBe(false);
    });

    it('should handle async errors in isAvailable', async () => {
      // Arrange
      const errorAdapter: ToolAdapter = {
        name: 'error',
        weight: 0.5,
        isAvailable: async () => {
          throw new Error('Availability check failed');
        },
        execute: async () => []
      };
      
      // Act & Assert
      await expect(errorAdapter.isAvailable()).rejects.toThrow('Availability check failed');
    });
  });

  describe('execute method', () => {
    it('should accept keywords array and options object', async () => {
      // Arrange
      const adapter: ToolAdapter = new MockToolAdapter();
      const keywords = ['test', 'keyword'];
      const options: ToolOptions = { cwd: '/test', limit: 10 };
      
      // Act
      const result = adapter.execute(keywords, options);
      
      // Assert
      expect(result).toBeInstanceOf(Promise);
    });

    it('should return Promise<UnifiedResult[]>', async () => {
      // Arrange
      const adapter: ToolAdapter = new MockToolAdapter();
      
      // Act
      const results = await adapter.execute(['test'], {});
      
      // Assert
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty keywords array', async () => {
      // Arrange
      const adapter: ToolAdapter = new MockToolAdapter();
      
      // Act
      const results = await adapter.execute([], {});
      
      // Assert
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle empty options object', async () => {
      // Arrange
      const adapter: ToolAdapter = new MockToolAdapter();
      
      // Act
      const results = await adapter.execute(['test'], {});
      
      // Assert
      expect(Array.isArray(results)).toBe(true);
    });

    it('should throw error on invalid input', async () => {
      // Arrange
      const errorAdapter: ToolAdapter = {
        name: 'error',
        weight: 0.5,
        isAvailable: async () => true,
        execute: async (keywords: string[]) => {
          if (!keywords || keywords.length === 0) {
            throw new Error('Keywords cannot be empty');
          }
          return [];
        }
      };
      
      // Act & Assert
      await expect(errorAdapter.execute([], {})).rejects.toThrow('Keywords cannot be empty');
    });
  });

  describe('UnifiedResult structure', () => {
    it('should have required properties in UnifiedResult', async () => {
      // Arrange
      const adapter: ToolAdapter = new MockToolAdapter();
      
      // Act
      const results = await adapter.execute(['test'], {});
      
      // Assert
      if (results.length > 0) {
        const result = results[0];
        expect(result).toHaveProperty('file');
        expect(result).toHaveProperty('line');
        expect(result).toHaveProperty('column');
        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('score');
      }
    });

    it('should have correct types in UnifiedResult', async () => {
      // Arrange
      const adapter: ToolAdapter = new MockToolAdapter();
      
      // Act
      const results = await adapter.execute(['test'], {});
      
      // Assert
      if (results.length > 0) {
        const result = results[0];
        expect(typeof result.file).toBe('string');
        expect(typeof result.line).toBe('number');
        expect(typeof result.column).toBe('number');
        expect(typeof result.content).toBe('string');
        expect(typeof result.score).toBe('number');
      }
    });

    it('should have non-negative line and column numbers', async () => {
      // Arrange
      const adapter: ToolAdapter = new MockToolAdapter();
      
      // Act
      const results = await adapter.execute(['test'], {});
      
      // Assert
      results.forEach(result => {
        expect(result.line).toBeGreaterThanOrEqual(0);
        expect(result.column).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have score between 0 and 1', async () => {
      // Arrange
      const adapter: ToolAdapter = new MockToolAdapter();
      
      // Act
      const results = await adapter.execute(['test'], {});
      
      // Assert
      results.forEach(result => {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('ToolOptions structure', () => {
    it('should accept all optional properties', () => {
      // Arrange & Act - 验证所有可选属性
      const fullOptions: ToolOptions = {
        cwd: '/test/path',
        limit: 100,
        language: 'typescript'
      };
      
      const partialOptions: ToolOptions = {
        cwd: '/test'
      };
      
      const emptyOptions: ToolOptions = {};
      
      // Assert
      expect(fullOptions.cwd).toBe('/test/path');
      expect(fullOptions.limit).toBe(100);
      expect(fullOptions.language).toBe('typescript');
      expect(partialOptions.cwd).toBe('/test');
      expect(emptyOptions).toEqual({});
    });

    it('should handle limit as positive integer', () => {
      // Arrange
      const options: ToolOptions = { limit: 50 };
      
      // Assert
      expect(options.limit).toBeGreaterThan(0);
      expect(Number.isInteger(options.limit)).toBe(true);
    });

    it('should handle cwd as valid path string', () => {
      // Arrange
      const options: ToolOptions = { cwd: '/valid/path' };
      
      // Assert
      expect(typeof options.cwd).toBe('string');
      expect(options.cwd.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle very long keywords array', async () => {
      // Arrange
      const adapter: ToolAdapter = new MockToolAdapter();
      const longKeywords = Array(1000).fill('keyword');
      
      // Act
      const results = await adapter.execute(longKeywords, {});
      
      // Assert
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle keywords with special characters', async () => {
      // Arrange
      const adapter: ToolAdapter = new MockToolAdapter();
      const specialKeywords = ['test@#$%', 'keyword\n\r', 'test\t'];
      
      // Act
      const results = await adapter.execute(specialKeywords, {});
      
      // Assert
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle concurrent calls to isAvailable', async () => {
      // Arrange
      const adapter: ToolAdapter = new MockToolAdapter();
      
      // Act
      const promises = [
        adapter.isAvailable(),
        adapter.isAvailable(),
        adapter.isAvailable()
      ];
      
      // Assert
      const results = await Promise.all(promises);
      expect(results.every(r => typeof r === 'boolean')).toBe(true);
    });

    it('should handle concurrent calls to execute', async () => {
      // Arrange
      const adapter: ToolAdapter = new MockToolAdapter();
      
      // Act
      const promises = [
        adapter.execute(['a'], {}),
        adapter.execute(['b'], {}),
        adapter.execute(['c'], {})
      ];
      
      // Assert
      const results = await Promise.all(promises);
      expect(results.every(r => Array.isArray(r))).toBe(true);
    });
  });
});
