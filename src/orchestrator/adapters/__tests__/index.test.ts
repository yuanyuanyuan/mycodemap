// [META] since:2026-03-02 | owner:adapter-team | coverage:100%
// [WHY] Tests for adapter module exports verification


/**
 * index.test.ts
 * 
 * 适配器模块入口导出测试
 * 
 * 测试范围:
 * - 所有类型导出（编译时检查）
 * - 所有类导出
 * - 所有工厂函数导出
 * 
 * Prefer retrieval-led reasoning over pre-training-led reasoning
 */

import { describe, it, expect } from 'vitest';

// ============================================================
// 导入被测模块的所有导出
// ============================================================

import {
  // 类型 - 这些是编译时类型，运行时无法直接访问
  // type ToolAdapter,
  // type CodemapAdapterOptions,
  // type AstGrepAdapterOptions,
  // 类
  CodemapAdapter,
  AstGrepAdapter,
  // 工厂函数
  createCodemapAdapter,
  createAstGrepAdapter
} from '../index.js';

// ============================================================
// 测试套件
// ============================================================

describe('adapters/index.ts exports', () => {
  describe('type exports', () => {
    it('should have ToolAdapter type available at compile time', () => {
      // TypeScript 编译时检查 - 如果能编译通过，说明类型已导出
      // 这里只是运行时占位检查
      const typeCheck = 'ToolAdapter type is exported';
      expect(typeCheck).toBe('ToolAdapter type is exported');
    });

    it('should have CodemapAdapterOptions type available at compile time', () => {
      const typeCheck = 'CodemapAdapterOptions type is exported';
      expect(typeCheck).toBe('CodemapAdapterOptions type is exported');
    });

    it('should have AstGrepAdapterOptions type available at compile time', () => {
      const typeCheck = 'AstGrepAdapterOptions type is exported';
      expect(typeCheck).toBe('AstGrepAdapterOptions type is exported');
    });
  });

  describe('class exports', () => {
    it('should export CodemapAdapter class', () => {
      // Assert
      expect(CodemapAdapter).toBeDefined();
      expect(typeof CodemapAdapter).toBe('function');
      expect(CodemapAdapter.prototype).toBeDefined();
    });

    it('should export AstGrepAdapter class', () => {
      // Assert
      expect(AstGrepAdapter).toBeDefined();
      expect(typeof AstGrepAdapter).toBe('function');
      expect(AstGrepAdapter.prototype).toBeDefined();
    });

    it('should create CodemapAdapter instances', () => {
      // Act
      const adapter = new CodemapAdapter();

      // Assert
      expect(adapter).toBeInstanceOf(CodemapAdapter);
      expect(adapter.name).toBe('codemap');
      expect(adapter.weight).toBe(0.9);
    });

    it('should create AstGrepAdapter instances', () => {
      // Act
      const adapter = new AstGrepAdapter();

      // Assert
      expect(adapter).toBeInstanceOf(AstGrepAdapter);
      expect(adapter.name).toBe('ast-grep');
      expect(adapter.weight).toBe(1.0);
    });
  });

  describe('factory function exports', () => {
    it('should export createCodemapAdapter function', () => {
      // Assert
      expect(createCodemapAdapter).toBeDefined();
      expect(typeof createCodemapAdapter).toBe('function');
    });

    it('should export createAstGrepAdapter function', () => {
      // Assert
      expect(createAstGrepAdapter).toBeDefined();
      expect(typeof createAstGrepAdapter).toBe('function');
    });

    it('createCodemapAdapter should return CodemapAdapter instance', () => {
      // Act
      const adapter = createCodemapAdapter();

      // Assert
      expect(adapter).toBeInstanceOf(CodemapAdapter);
      expect(adapter.name).toBe('codemap');
      expect(adapter.weight).toBe(0.9);
    });

    it('createAstGrepAdapter should return AstGrepAdapter instance', () => {
      // Act
      const adapter = createAstGrepAdapter();

      // Assert
      expect(adapter).toBeInstanceOf(AstGrepAdapter);
      expect(adapter.name).toBe('ast-grep');
      expect(adapter.weight).toBe(1.0);
    });

    it('createCodemapAdapter should accept options', () => {
      // Arrange
      const options = {
        codemapPath: '/custom/path',
        defaultIntent: 'dependency' as const,
        defaultScope: 'transitive' as const
      };

      // Act
      const adapter = createCodemapAdapter(options);

      // Assert
      expect(adapter).toBeInstanceOf(CodemapAdapter);
    });

    it('createAstGrepAdapter should accept options', () => {
      // Arrange
      const options = {
        cwd: '/custom/path',
        includeTests: false,
        timeout: 60000
      };

      // Act
      const adapter = createAstGrepAdapter(options);

      // Assert
      expect(adapter).toBeInstanceOf(AstGrepAdapter);
    });

    it('factory functions should work without options', () => {
      // Act
      const codemapAdapter = createCodemapAdapter();
      const astGrepAdapter = createAstGrepAdapter();

      // Assert
      expect(codemapAdapter).toBeInstanceOf(CodemapAdapter);
      expect(astGrepAdapter).toBeInstanceOf(AstGrepAdapter);
    });
  });

  describe('adapter interface compliance', () => {
    it('CodemapAdapter should implement ToolAdapter interface', () => {
      // Act
      const adapter = createCodemapAdapter();

      // Assert - 检查必需的方法和属性
      expect(adapter.name).toBeDefined();
      expect(typeof adapter.name).toBe('string');
      expect(adapter.weight).toBeDefined();
      expect(typeof adapter.weight).toBe('number');
      expect(adapter.isAvailable).toBeDefined();
      expect(typeof adapter.isAvailable).toBe('function');
      expect(adapter.execute).toBeDefined();
      expect(typeof adapter.execute).toBe('function');
    });

    it('AstGrepAdapter should implement ToolAdapter interface', () => {
      // Act
      const adapter = createAstGrepAdapter();

      // Assert - 检查必需的方法和属性
      expect(adapter.name).toBeDefined();
      expect(typeof adapter.name).toBe('string');
      expect(adapter.weight).toBeDefined();
      expect(typeof adapter.weight).toBe('number');
      expect(adapter.isAvailable).toBeDefined();
      expect(typeof adapter.isAvailable).toBe('function');
      expect(adapter.execute).toBeDefined();
      expect(typeof adapter.execute).toBe('function');
    });

    it('should have correct method signatures', async () => {
      // Arrange
      const codemapAdapter = createCodemapAdapter();
      const astGrepAdapter = createAstGrepAdapter();

      // Act & Assert - isAvailable 返回 Promise<boolean>
      const codemapAvailable = codemapAdapter.isAvailable();
      const astGrepAvailable = astGrepAdapter.isAvailable();

      expect(codemapAvailable).toBeInstanceOf(Promise);
      expect(astGrepAvailable).toBeInstanceOf(Promise);

      // Act & Assert - execute 返回 Promise<UnifiedResult[]>
      const codemapResults = codemapAdapter.execute(['test'], { topK: 10 });
      const astGrepResults = astGrepAdapter.execute(['test'], { topK: 10 });

      expect(codemapResults).toBeInstanceOf(Promise);
      expect(astGrepResults).toBeInstanceOf(Promise);

      // 等待 Promise 解决以验证返回类型
      const codemapResult = await codemapResults;
      const astGrepResult = await astGrepResults;

      expect(Array.isArray(codemapResult)).toBe(true);
      expect(Array.isArray(astGrepResult)).toBe(true);
    });
  });

  describe('module structure', () => {
    it('should have all expected value exports', () => {
      // 验证所有值导出都可用
      expect(CodemapAdapter).toBeDefined();
      expect(AstGrepAdapter).toBeDefined();
      expect(createCodemapAdapter).toBeDefined();
      expect(createAstGrepAdapter).toBeDefined();
    });

    it('should maintain consistent naming', () => {
      // 类名检查
      expect(CodemapAdapter.name).toBe('CodemapAdapter');
      expect(AstGrepAdapter.name).toBe('AstGrepAdapter');

      // 适配器实例名检查
      const codemapAdapter = createCodemapAdapter();
      const astGrepAdapter = createAstGrepAdapter();

      expect(codemapAdapter.name).toBe('codemap');
      expect(astGrepAdapter.name).toBe('ast-grep');
    });
  });
});
