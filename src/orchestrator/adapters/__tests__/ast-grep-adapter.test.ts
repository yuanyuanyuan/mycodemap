// [META] since:2026-03-02 | owner:adapter-team | coverage:100%
// [WHY] Tests for ast-grep adapter with proper ESM mock strategy


/**
 * ast-grep-adapter.test.ts
 * 
 * AstGrepAdapter 完整测试
 * 
 * 测试范围:
 * - 类实例化和属性
 * - isAvailable 方法（调用 sg --version）
 * - execute 方法（空数组、多关键词、topK 限制）
 * - 错误处理（返回空数组而非抛出异常）
 * 
 * Prefer retrieval-led reasoning over pre-training-led reasoning
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockLoadCodemapConfig = vi.fn();
const mockDiscoverProjectFiles = vi.fn();

// ============================================================
// Mock 外部依赖 - 必须使用 node: 前缀
// ============================================================

vi.mock('node:child_process', () => ({
  spawn: vi.fn()
}));

vi.mock('../../../cli/config-loader.js', () => ({
  loadCodemapConfig: (...args: unknown[]) => mockLoadCodemapConfig(...args)
}));

vi.mock('../../../core/file-discovery.js', () => ({
  discoverProjectFiles: (...args: unknown[]) => mockDiscoverProjectFiles(...args)
}));

// ============================================================
// 导入被测模块（在 mock 之后）
// ============================================================

import { spawn } from 'node:child_process';
import { AstGrepAdapter, AstGrepAdapterError, createAstGrepAdapter } from '../ast-grep-adapter.js';
import type { ToolOptions } from '../../types.js';

// ============================================================
// 辅助函数：创建 mock spawn 返回值
// ============================================================

function createMockSpawn(stdoutData: string, stderrData: string = '', exitCode: number = 0) {
  const stdoutHandlers: Map<string, Function> = new Map();
  const stderrHandlers: Map<string, Function> = new Map();
  const closeHandlers: Function[] = [];
  const errorHandlers: Function[] = [];

  const mockStdout = {
    on: vi.fn((event: string, handler: Function) => {
      stdoutHandlers.set(event, handler);
    })
  };

  const mockStderr = {
    on: vi.fn((event: string, handler: Function) => {
      stderrHandlers.set(event, handler);
    })
  };

  const mockProc = {
    stdout: mockStdout,
    stderr: mockStderr,
    on: vi.fn((event: string, handler: Function) => {
      if (event === 'close') {
        closeHandlers.push(handler);
        // 模拟异步触发 close 事件
        setTimeout(() => handler(exitCode), 0);
      } else if (event === 'error') {
        errorHandlers.push(handler);
      }
    })
  };

  // 触发 stdout/stderr 数据事件
  setTimeout(() => {
    if (stdoutHandlers.has('data')) {
      stdoutHandlers.get('data')!(Buffer.from(stdoutData));
    }
    if (stderrHandlers.has('data')) {
      stderrHandlers.get('data')!(Buffer.from(stderrData));
    }
  }, 0);

  return { mockProc, mockStdout, mockStderr, closeHandlers, errorHandlers };
}

function createMockSpawnError(error: Error) {
  const mockProc = {
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn((event: string, handler: Function) => {
      if (event === 'error') {
        setTimeout(() => handler(error), 0);
      }
    })
  };
  return { mockProc };
}

// ============================================================
// 测试套件
// ============================================================

describe('AstGrepAdapter', () => {
  let adapter: AstGrepAdapter;

  beforeEach(() => {
    adapter = new AstGrepAdapter();
    vi.clearAllMocks();
    mockLoadCodemapConfig.mockResolvedValue({
      config: {
        include: ['src/**/*.ts'],
        exclude: ['dist/**']
      }
    });
    mockDiscoverProjectFiles.mockResolvedValue(['/test/file.ts']);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('class properties', () => {
    it('should have correct name property', () => {
      expect(adapter.name).toBe('ast-grep');
    });

    it('should have correct weight property', () => {
      expect(adapter.weight).toBe(1.0);
    });

    it('should be instance of AstGrepAdapter', () => {
      expect(adapter).toBeInstanceOf(AstGrepAdapter);
    });
  });

  describe('constructor options', () => {
    it('should use default options when not provided', () => {
      const defaultAdapter = new AstGrepAdapter();
      expect(defaultAdapter).toBeDefined();
    });

    it('should accept custom cwd option', () => {
      const customAdapter = new AstGrepAdapter({ cwd: '/custom/path' });
      expect(customAdapter).toBeDefined();
    });

    it('should accept includeTests option', () => {
      const adapterWithTests = new AstGrepAdapter({ includeTests: false });
      expect(adapterWithTests).toBeDefined();
    });

    it('should accept timeout option', () => {
      const adapterWithTimeout = new AstGrepAdapter({ timeout: 60000 });
      expect(adapterWithTimeout).toBeDefined();
    });
  });

  describe('isAvailable', () => {
    it('should return true when sg --version succeeds', async () => {
      // Arrange
      const { mockProc } = createMockSpawn('ast-grep 0.1.0');
      vi.mocked(spawn).mockReturnValue(mockProc as any);

      // Act
      const result = await adapter.isAvailable();

      // Assert
      expect(result).toBe(true);
      expect(spawn).toHaveBeenCalledWith('npx', ['ast-grep', '--version'], expect.any(Object));
    });

    it('should return false when sg --version fails', async () => {
      // Arrange
      const { mockProc } = createMockSpawn('', 'command not found', 1);
      vi.mocked(spawn).mockReturnValue(mockProc as any);

      // Act
      const result = await adapter.isAvailable();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when spawn throws error', async () => {
      // Arrange
      const { mockProc } = createMockSpawnError(new Error('spawn error'));
      vi.mocked(spawn).mockReturnValue(mockProc as any);

      // Act
      const result = await adapter.isAvailable();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('execute', () => {
    const defaultOptions: ToolOptions = { topK: 10 };

    it('should return empty array when keywords is empty', async () => {
      // Act
      const results = await adapter.execute([], defaultOptions);

      // Assert
      expect(results).toEqual([]);
    });

    it('should execute search with single keyword', async () => {
      // Arrange
      const mockOutput = JSON.stringify([
        { file_path: 'test.ts', line: 10, matched_text: 'function test() {}' }
      ]);
      const { mockProc } = createMockSpawn(mockOutput);
      vi.mocked(spawn).mockReturnValue(mockProc as any);
      mockDiscoverProjectFiles.mockResolvedValue(['/test/file.ts']);

      // Act
      const results = await adapter.execute(['function'], defaultOptions);

      // Assert
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should execute search with multiple keywords', async () => {
      // Arrange
      const mockOutput = JSON.stringify([
        { file_path: 'test.ts', line: 10, matched_text: 'function test() {}' }
      ]);
      const { mockProc } = createMockSpawn(mockOutput);
      vi.mocked(spawn).mockReturnValue(mockProc as any);
      mockDiscoverProjectFiles.mockResolvedValue(['/test/file.ts']);

      // Act
      const results = await adapter.execute(['function', 'class'], defaultOptions);

      // Assert
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should respect topK limit', async () => {
      // Arrange
      const mockResults = Array(20).fill(null).map((_, i) => ({
        file_path: `test${i}.ts`,
        line: i + 1,
        matched_text: `function test${i}() {}`
      }));
      const mockOutput = JSON.stringify(mockResults);
      const { mockProc } = createMockSpawn(mockOutput);
      vi.mocked(spawn).mockReturnValue(mockProc as any);
      mockDiscoverProjectFiles.mockResolvedValue(['/test/file.ts']);

      // Act
      const results = await adapter.execute(['function'], { topK: 5 });

      // Assert
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array on error', async () => {
      // Arrange
      vi.mocked(spawn).mockImplementation(() => {
        throw new Error('spawn error');
      });

      // Act
      const results = await adapter.execute(['test'], defaultOptions);

      // Assert
      expect(results).toEqual([]);
    });

    it('should use default topK when not specified', async () => {
      // Arrange
      const mockOutput = JSON.stringify([
        { file_path: 'test.ts', line: 10, matched_text: 'test' }
      ]);
      const { mockProc } = createMockSpawn(mockOutput);
      vi.mocked(spawn).mockReturnValue(mockProc as any);
      mockDiscoverProjectFiles.mockResolvedValue(['/test/file.ts']);

      // Act
      const results = await adapter.execute(['test'], {});

      // Assert
      expect(results).toBeDefined();
    });
  });

  describe('search method', () => {
    it('should return empty array for empty pattern', async () => {
      // Act
      const results = await (adapter as any).search('');

      // Assert
      expect(results).toEqual([]);
    });

    it('should return empty array when no files found', async () => {
      // Arrange
      mockDiscoverProjectFiles.mockResolvedValue([]);

      // Act
      const results = await (adapter as any).search('pattern');

      // Assert
      expect(results).toEqual([]);
    });

    it('should handle globby errors gracefully', async () => {
      // Arrange
      mockDiscoverProjectFiles.mockRejectedValue(new Error('discovery error'));

      // Act
      const results = await (adapter as any).search('pattern');

      // Assert
      expect(results).toEqual([]);
    });
  });

  describe('parseAstGrepOutput', () => {
    it('should parse valid JSON array output', () => {
      // Arrange
      const output = JSON.stringify([
        { file_path: 'test.ts', line: 10, matched_text: 'function test() {}', score: 0.9 }
      ]);

      // Act
      const results = (adapter as any).parseAstGrepOutput(output, 'function');

      // Assert
      expect(results.length).toBe(1);
      expect(results[0].source).toBe('ast-grep');
      expect(results[0].file).toBe('test.ts');
      expect(results[0].line).toBe(10);
    });

    it('should parse JSON object with results field', () => {
      // Arrange
      const output = JSON.stringify({
        results: [
          { file_path: 'test.ts', line: 10, matched_text: 'test' }
        ]
      });

      // Act
      const results = (adapter as any).parseAstGrepOutput(output, 'test');

      // Assert
      expect(results.length).toBe(1);
    });

    it('should handle alternative field names', () => {
      // Arrange
      const output = JSON.stringify([
        { path: 'test.ts', start: { line: 5 }, code: 'const x = 1' }
      ]);

      // Act
      const results = (adapter as any).parseAstGrepOutput(output, 'const');

      // Assert
      expect(results.length).toBe(1);
      expect(results[0].file).toBe('test.ts');
      expect(results[0].line).toBe(5);
    });

    it('should skip entries without file', () => {
      // Arrange
      const output = JSON.stringify([
        { line: 10, matched_text: 'test' },
        { file_path: 'valid.ts', line: 5, matched_text: 'valid' }
      ]);

      // Act
      const results = (adapter as any).parseAstGrepOutput(output, 'test');

      // Assert
      expect(results.length).toBe(1);
      expect(results[0].file).toBe('valid.ts');
    });

    it('should handle invalid JSON gracefully', () => {
      // Arrange
      const output = 'invalid json';

      // Act
      const results = (adapter as any).parseAstGrepOutput(output, 'test');

      // Assert
      expect(results).toEqual([]);
    });

    it('should truncate long content', () => {
      // Arrange
      const longText = 'a'.repeat(300);
      const output = JSON.stringify([
        { file_path: 'test.ts', line: 1, matched_text: longText }
      ]);

      // Act
      const results = (adapter as any).parseAstGrepOutput(output, 'test');

      // Assert
      expect(results[0].content.length).toBeLessThanOrEqual(200);
    });
  });

  describe('inferSymbolType', () => {
    it('should identify class definitions', () => {
      // Act & Assert
      expect((adapter as any).inferSymbolType('class TestClass {')).toBe('class');
      expect((adapter as any).inferSymbolType('  class AnotherClass')).toBe('class');
    });

    it('should identify function definitions', () => {
      // Act & Assert
      expect((adapter as any).inferSymbolType('function test() {')).toBe('function');
      expect((adapter as any).inferSymbolType('const arrow = () => {')).toBe('function');
    });

    it('should identify interface definitions', () => {
      // Act & Assert
      expect((adapter as any).inferSymbolType('interface Test {')).toBe('interface');
    });

    it('should default to variable for other content', () => {
      // Act & Assert
      expect((adapter as any).inferSymbolType('const x = 1')).toBe('variable');
      expect((adapter as any).inferSymbolType('let y = "test"')).toBe('variable');
    });
  });

  describe('getTargetFiles', () => {
    it('should use config-aware discovery include and exclude patterns', async () => {
      // Arrange
      mockLoadCodemapConfig.mockResolvedValue({
        config: {
          include: ['packages/**/*.ts', 'scripts/**/*.js'],
          exclude: ['dist/**', 'coverage/**']
        }
      });
      mockDiscoverProjectFiles.mockResolvedValue(['/test/file.ts', '/test/file.js']);

      // Act
      const files = await (adapter as any).getTargetFiles();

      // Assert
      expect(files).toContain('/test/file.ts');
      expect(files).toContain('/test/file.js');
      expect(mockLoadCodemapConfig).toHaveBeenCalledWith(process.cwd());
      expect(mockDiscoverProjectFiles).toHaveBeenCalledWith({
        rootDir: process.cwd(),
        include: ['packages/**/*.ts', 'scripts/**/*.js'],
        exclude: ['dist/**', 'coverage/**'],
        absolute: true,
        gitignore: true
      });
    });

    it('should exclude test files when includeTests is false', async () => {
      // Arrange
      const adapterNoTests = new AstGrepAdapter({ includeTests: false });
      mockDiscoverProjectFiles.mockResolvedValue(['/test/file.ts']);

      // Act
      await (adapterNoTests as any).getTargetFiles();

      // Assert
      const discoveryOptions = mockDiscoverProjectFiles.mock.calls[0]?.[0] as { exclude: string[] };
      expect(discoveryOptions.exclude).toContain('**/*.test.ts');
      expect(discoveryOptions.exclude).toContain('**/*.spec.tsx');
    });

    it('should handle globby errors gracefully', async () => {
      // Arrange
      mockDiscoverProjectFiles.mockRejectedValue(new Error('discovery error'));

      // Act
      const files = await (adapter as any).getTargetFiles();

      // Assert
      expect(files).toEqual([]);
    });

    it('should reject discovery errors in strict mode', async () => {
      // Arrange
      const strictAdapter = new AstGrepAdapter({ failOnScanError: true });
      mockDiscoverProjectFiles.mockRejectedValue(new Error('discovery error'));

      // Act & Assert
      await expect((strictAdapter as any).getTargetFiles()).rejects.toMatchObject({
        code: 'file-discovery-failed'
      });
    });
  });

  describe('strict failure mode', () => {
    it('should return empty results on scan error by default', async () => {
      // Arrange
      const { mockProc } = createMockSpawn('', 'syntax error', 1);
      vi.mocked(spawn).mockReturnValue(mockProc as any);
      mockDiscoverProjectFiles.mockResolvedValue(['/test/file.ts']);

      // Act
      const results = await adapter.execute(['SourceLocation'], { topK: 5 });

      // Assert
      expect(results).toEqual([]);
    });

    it('should reject scan errors with scan-failed code in strict mode', async () => {
      // Arrange
      const strictAdapter = new AstGrepAdapter({ failOnScanError: true });
      const { mockProc } = createMockSpawn('', 'syntax error', 1);
      vi.mocked(spawn).mockReturnValue(mockProc as any);
      mockDiscoverProjectFiles.mockResolvedValue(['/test/file.ts']);

      // Act & Assert
      await expect(strictAdapter.execute(['SourceLocation'], { topK: 5 })).rejects.toMatchObject({
        code: 'scan-failed'
      });
      await expect(strictAdapter.execute(['SourceLocation'], { topK: 5 })).rejects.toBeInstanceOf(AstGrepAdapterError);
    });
  });

  describe('createAstGrepAdapter factory', () => {
    it('should create AstGrepAdapter instance', () => {
      // Act
      const adapter = createAstGrepAdapter();

      // Assert
      expect(adapter).toBeInstanceOf(AstGrepAdapter);
      expect(adapter.name).toBe('ast-grep');
    });

    it('should pass options to constructor', () => {
      // Arrange
      const options = { cwd: '/custom', includeTests: false, timeout: 5000 };

      // Act
      const adapter = createAstGrepAdapter(options);

      // Assert
      expect(adapter).toBeInstanceOf(AstGrepAdapter);
    });
  });
});
