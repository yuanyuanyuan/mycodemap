/**
 * [META] Watch Foreground CLI Command Test
 * [WHY] Ensure foreground watch mode handles file watching, change events, and SIGINT correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { watchCommandForeground } from '../watch-foreground.js';

// Mock dependencies
vi.mock('chalk', () => ({
  default: {
    blue: vi.fn((text: string) => text),
    gray: vi.fn((text: string) => text),
    yellow: vi.fn((text: string) => text),
    green: vi.fn((text: string) => text),
  },
}));

vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      close: vi.fn().mockResolvedValue(undefined),
    })),
  },
  watch: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../../core/analyzer.js', () => ({
  analyze: vi.fn().mockResolvedValue({
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    project: { name: 'test', rootDir: '/project', packageManager: 'npm' },
    summary: { totalFiles: 1, totalLines: 100, totalModules: 1, totalExports: 1 },
    modules: [],
    dependencies: { nodes: [], edges: [] },
  }),
}));

vi.mock('../../../generator/index.js', () => ({
  generateAIMap: vi.fn().mockResolvedValue(undefined),
  generateJSON: vi.fn().mockResolvedValue(undefined),
  generateContext: vi.fn().mockResolvedValue(undefined),
}));

import chokidar from 'chokidar';
import { analyze } from '../../../core/analyzer.js';
import { generateAIMap, generateJSON, generateContext } from '../../../generator/index.js';

describe('Watch Foreground CLI', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let processOnSpy: ReturnType<typeof vi.spyOn>;
  let setTimeoutSpy: ReturnType<typeof vi.spyOn>;
  let clearTimeoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    processOnSpy = vi.spyOn(process, 'on').mockImplementation(() => process);
    setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation((fn: TimerHandler) => {
      if (typeof fn === 'function') fn();
      return 1 as unknown as NodeJS.Timeout;
    });
    clearTimeoutSpy = vi.spyOn(global, 'clearTimeout').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    processOnSpy.mockRestore();
    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });

  describe('watchCommandForeground', () => {
    it('should perform initial analysis on startup', async () => {
      const mockChokidar = vi.mocked(chokidar);
      const mockWatcher = {
        on: vi.fn().mockReturnThis(),
        close: vi.fn().mockResolvedValue(undefined),
      };
      mockChokidar.watch.mockReturnValue(mockWatcher as unknown as ReturnType<typeof chokidar.watch>);

      const mockAnalyze = vi.mocked(analyze);

      await watchCommandForeground({});

      expect(mockAnalyze).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('启动'));
    });

    it('should setup file watcher with correct pattern', async () => {
      const mockChokidar = vi.mocked(chokidar);
      const mockWatcher = {
        on: vi.fn().mockReturnThis(),
        close: vi.fn().mockResolvedValue(undefined),
      };
      mockChokidar.watch.mockReturnValue(mockWatcher as unknown as ReturnType<typeof chokidar.watch>);

      await watchCommandForeground({});

      expect(mockChokidar.watch).toHaveBeenCalledWith(
        ['src/**/*.ts'],
        expect.objectContaining({
          ignored: expect.any(RegExp),
          persistent: true,
          ignoreInitial: true,
          awaitWriteFinish: expect.objectContaining({
            stabilityThreshold: 500,
            pollInterval: 100,
          }),
        })
      );
    });

    it('should register event handlers for add, change, and unlink', async () => {
      const mockChokidar = vi.mocked(chokidar);
      const mockOn = vi.fn().mockReturnThis();
      const mockWatcher = {
        on: mockOn,
        close: vi.fn().mockResolvedValue(undefined),
      };
      mockChokidar.watch.mockReturnValue(mockWatcher as unknown as ReturnType<typeof chokidar.watch>);

      await watchCommandForeground({});

      expect(mockOn).toHaveBeenCalledWith('add', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('change', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('unlink', expect.any(Function));
    });

    it('should setup SIGINT handler', async () => {
      const mockChokidar = vi.mocked(chokidar);
      const mockWatcher = {
        on: vi.fn().mockReturnThis(),
        close: vi.fn().mockResolvedValue(undefined),
      };
      mockChokidar.watch.mockReturnValue(mockWatcher as unknown as ReturnType<typeof chokidar.watch>);

      await watchCommandForeground({});

      expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });

    it('should display startup information', async () => {
      const mockChokidar = vi.mocked(chokidar);
      const mockWatcher = {
        on: vi.fn().mockReturnThis(),
        close: vi.fn().mockResolvedValue(undefined),
      };
      mockChokidar.watch.mockReturnValue(mockWatcher as unknown as ReturnType<typeof chokidar.watch>);

      await watchCommandForeground({
        mode: 'smart',
        output: 'custom-output',
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Watch 模式'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(process.cwd()));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('custom-output'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('smart'));
    });

    it('should use default options when not specified', async () => {
      const mockChokidar = vi.mocked(chokidar);
      const mockWatcher = {
        on: vi.fn().mockReturnThis(),
        close: vi.fn().mockResolvedValue(undefined),
      };
      mockChokidar.watch.mockReturnValue(mockWatcher as unknown as ReturnType<typeof chokidar.watch>);

      await watchCommandForeground({});

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('fast'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('.mycodemap'));
    });

    it('should call generator functions after analysis', async () => {
      const mockChokidar = vi.mocked(chokidar);
      const mockWatcher = {
        on: vi.fn().mockReturnThis(),
        close: vi.fn().mockResolvedValue(undefined),
      };
      mockChokidar.watch.mockReturnValue(mockWatcher as unknown as ReturnType<typeof chokidar.watch>);

      const mockGenerateAIMap = vi.mocked(generateAIMap);
      const mockGenerateJSON = vi.mocked(generateJSON);
      const mockGenerateContext = vi.mocked(generateContext);

      await watchCommandForeground({});

      expect(mockGenerateAIMap).toHaveBeenCalled();
      expect(mockGenerateJSON).toHaveBeenCalled();
      expect(mockGenerateContext).toHaveBeenCalled();
    });

    it('should handle watcher errors gracefully', async () => {
      const mockChokidar = vi.mocked(chokidar);
      mockChokidar.watch.mockImplementation(() => {
        throw new Error('Watcher setup failed');
      });

      await expect(watchCommandForeground({})).rejects.toThrow('Watcher setup failed');
    });

    it('should handle analysis errors gracefully', async () => {
      const mockChokidar = vi.mocked(chokidar);
      const mockWatcher = {
        on: vi.fn().mockReturnThis(),
        close: vi.fn().mockResolvedValue(undefined),
      };
      mockChokidar.watch.mockReturnValue(mockWatcher as unknown as ReturnType<typeof chokidar.watch>);

      const mockAnalyze = vi.mocked(analyze);
      mockAnalyze.mockRejectedValue(new Error('Analysis failed'));

      await expect(watchCommandForeground({})).rejects.toThrow('Analysis failed');
    });
  });
});
