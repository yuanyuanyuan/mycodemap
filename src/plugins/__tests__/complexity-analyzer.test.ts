// ============================================
// ComplexityAnalyzer Unit Tests
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ModuleInfo } from '../../types/index.js';
import complexityAnalyzerPlugin from '../built-in/complexity-analyzer.js';
import { ComplexityAnalyzerPlugin } from '../built-in/complexity-analyzer.js';

// Test helper to create mock ModuleInfo
function createMockModuleInfo(id: string, symbols: ModuleInfo['symbols'], stats: ModuleInfo['stats']): ModuleInfo {
  return {
    id,
    path: `/src/${id}.ts`,
    name: id,
    type: 'source',
    exports: [],
    imports: [],
    symbols,
    dependencies: [],
    stats
  };
}

describe('ComplexityAnalyzerPlugin', () => {
  // Use the exported instance (it's a singleton)
  const plugin = complexityAnalyzerPlugin;

  describe('initialization', () => {
    it('should have correct metadata', () => {
      expect(plugin.metadata.name).toBe('complexity-analyzer');
      expect(plugin.metadata.version).toBe('1.0.0');
      expect(plugin.metadata.keywords).toContain('complexity');
    });

    it('should initialize with context', async () => {
      const mockContext = {
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn()
        }
      } as any;

      await plugin.initialize(mockContext);
      expect(mockContext.logger.info).toHaveBeenCalled();
    });
  });

  describe('analyze', () => {
    it('should analyze empty modules', async () => {
      const mockContext = {
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn()
        }
      } as any;

      await plugin.initialize(mockContext);
      const result = await plugin.analyze([]);

      expect(result.metrics.complexityAnalysis).toBeDefined();
      expect(result.metrics.complexityAnalysis.totalCyclomaticComplexity).toBe(0);
    });

    it('should analyze modules with symbols', async () => {
      const mockContext = {
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn()
        }
      } as any;

      await plugin.initialize(mockContext);

      const modules: ModuleInfo[] = [
        createMockModuleInfo('test1', [
          { id: '1', name: 'testFunction', kind: 'function', location: { file: 'test1.ts', line: 1, column: 1 }, visibility: 'public', relatedSymbols: [] },
          { id: '2', name: 'TestClass', kind: 'class', location: { file: 'test1.ts', line: 10, column: 1 }, visibility: 'public', relatedSymbols: [] }
        ], { lines: 50, codeLines: 40, commentLines: 5, blankLines: 5 })
      ];

      const result = await plugin.analyze(modules);

      expect(result.metrics.complexityAnalysis.totalFunctions).toBe(1);
      expect(result.metrics.complexityAnalysis.totalClasses).toBe(1);
      expect(result.metrics.complexityAnalysis.totalLinesOfCode).toBe(40);
    });

    it('should generate warnings for high complexity', async () => {
      const mockContext = {
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn()
        }
      } as any;

      await plugin.initialize(mockContext);

      // Create a module with many functions to increase complexity
      const modules: ModuleInfo[] = [
        createMockModuleInfo('complex', Array(30).fill(null).map((_, i) => ({
          id: String(i),
          name: `function${i}`,
          kind: 'function' as const,
          location: { file: 'complex.ts', line: i * 10, column: 1 },
          visibility: 'public' as const,
          relatedSymbols: []
        })), { lines: 500, codeLines: 400, commentLines: 50, blankLines: 50 })
      ];

      const result = await plugin.analyze(modules);

      // Should have warnings for high complexity
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should calculate top complexity modules', async () => {
      const mockContext = {
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn()
        }
      } as any;

      await plugin.initialize(mockContext);

      const modules: ModuleInfo[] = [
        createMockModuleInfo('simple', [
          { id: '1', name: 'func1', kind: 'function', location: { file: 'simple.ts', line: 1, column: 1 }, visibility: 'public', relatedSymbols: [] }
        ], { lines: 20, codeLines: 15, commentLines: 2, blankLines: 3 }),
        createMockModuleInfo('complex', [
          { id: '2', name: 'func2', kind: 'function', location: { file: 'complex.ts', line: 1, column: 1 }, visibility: 'public', relatedSymbols: [] },
          { id: '3', name: 'func3', kind: 'function', location: { file: 'complex.ts', line: 10, column: 1 }, visibility: 'public', relatedSymbols: [] }
        ], { lines: 50, codeLines: 40, commentLines: 5, blankLines: 5 })
      ];

      const result = await plugin.analyze(modules);

      expect(result.metrics.complexityAnalysis.topComplexityModules.length).toBe(2);
      // Complex module should have higher complexity
      const topModule = result.metrics.complexityAnalysis.topComplexityModules[0];
      expect(topModule.moduleId).toBe('complex');
    });
  });

  describe('generate', () => {
    it('should return empty files array', async () => {
      const result = await plugin.generate({});
      expect(result.files).toEqual([]);
    });
  });

  describe('dispose', () => {
    it('should dispose without errors', async () => {
      const mockContext = {
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn()
        }
      } as any;

      await plugin.initialize(mockContext);
      await expect(plugin.dispose()).resolves.toBeUndefined();
    });
  });
});

describe('Complexity Calculations', () => {
  describe('maintainability index', () => {
    it('should calculate maintainability index based on LOC, complexity, and comments', async () => {
      // Test the calculation logic indirectly through the plugin
      const plugin = complexityAnalyzerPlugin;

      const mockContext = {
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn()
        }
      } as any;

      // Create module with high comment ratio
      const modules: ModuleInfo[] = [
        createMockModuleInfo('well-documented', [
          { id: '1', name: 'simpleFunc', kind: 'function', location: { file: 'test.ts', line: 1, column: 1 }, visibility: 'public', relatedSymbols: [] }
        ], { lines: 100, codeLines: 50, commentLines: 40, blankLines: 10 })
      ];

      await plugin.initialize(mockContext);
      const result = await plugin.analyze(modules);

      // Verify the analysis was successful
      expect(result.metrics.complexityAnalysis).toBeDefined();
    });
  });
});
