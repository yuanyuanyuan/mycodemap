/**
 * [META] Generate CLI Command Test
 * [WHY] Ensure code generation command correctness
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Simple mock setup
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    text: '',
  })),
}));

vi.mock('chalk', () => ({
  default: {
    blue: (text: string) => text,
    gray: (text: string) => text,
    yellow: (text: string) => text,
    green: (text: string) => text,
    red: (text: string) => text,
    cyan: (text: string) => text,
  },
}));

const mockAnalyze = vi.fn();
const mockGenerateAIMap = vi.fn();
const mockGenerateJSON = vi.fn();
const mockGenerateContext = vi.fn();
const mockGenerateMermaidGraph = vi.fn();
const mockLoadCodemapConfig = vi.fn();
const mockCreateForProject = vi.fn();
const mockStorageSaveCodeGraph = vi.fn();
const mockStorageClose = vi.fn();

vi.mock('../../../core/analyzer.js', () => ({
  analyze: (...args: unknown[]) => mockAnalyze(...args),
}));

vi.mock('../../../generator/index.js', () => ({
  generateAIMap: (...args: unknown[]) => mockGenerateAIMap(...args),
  generateJSON: (...args: unknown[]) => mockGenerateJSON(...args),
  generateContext: (...args: unknown[]) => mockGenerateContext(...args),
  generateMermaidGraph: (...args: unknown[]) => mockGenerateMermaidGraph(...args),
}));

vi.mock('../../config-loader.js', () => ({
  loadCodemapConfig: (...args: unknown[]) => mockLoadCodemapConfig(...args),
}));

vi.mock('../../../infrastructure/storage/StorageFactory.js', () => ({
  storageFactory: {
    createForProject: (...args: unknown[]) => mockCreateForProject(...args),
  },
}));

import { generateCommand } from '../generate.js';

describe('Generate CLI', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;
  let mockExitCode: number | undefined;
  let originalEnv: NodeJS.ProcessEnv;
  const tempDirs: string[] = [];

  const createMockCodeMap = () => ({
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    project: {
      name: 'test-project',
      rootDir: '/project',
      packageManager: 'npm' as const,
    },
    summary: {
      totalFiles: 10,
      totalLines: 1000,
      totalModules: 10,
      totalExports: 20,
    },
    modules: [],
    dependencies: { nodes: [], edges: [] },
  });

  const createMockConfig = () => ({
    mode: 'hybrid' as const,
    include: ['src/**/*.ts'],
    exclude: ['node_modules/**', 'dist/**'],
      output: '.mycodemap',
      watch: false,
      storage: {
        type: 'filesystem' as const,
        outputPath: '.codemap/storage',
      },
      plugins: {
        builtInPlugins: true,
        plugins: [],
        debug: false,
      },
  });

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockExitCode = undefined;
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null) => {
      mockExitCode = typeof code === 'number' ? code : 1;
      throw new Error(`Process exit with code: ${code}`);
    });
    originalEnv = { ...process.env };
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockAnalyze.mockResolvedValue(createMockCodeMap());
    mockGenerateAIMap.mockResolvedValue(undefined);
    mockGenerateJSON.mockResolvedValue(undefined);
    mockGenerateContext.mockResolvedValue(undefined);
    mockGenerateMermaidGraph.mockResolvedValue(undefined);
    mockStorageSaveCodeGraph.mockResolvedValue(undefined);
    mockStorageClose.mockResolvedValue(undefined);
    mockCreateForProject.mockResolvedValue({
      type: 'filesystem',
      saveCodeGraph: mockStorageSaveCodeGraph,
      close: mockStorageClose,
    });
    mockLoadCodemapConfig.mockResolvedValue({
      config: createMockConfig(),
      configPath: '/project/mycodemap.config.json',
      exists: false,
      isLegacy: false,
      hasExplicitPluginConfig: false,
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    process.env = originalEnv;
    return Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  describe('generateCommand', () => {
    it('should generate with default options', async () => {
      await generateCommand({});
      expect(mockAnalyze).toHaveBeenCalled();
    }, 30000);

    it('should generate with fast mode', async () => {
      await generateCommand({ mode: 'fast' });
      expect(mockAnalyze).toHaveBeenCalledWith(expect.objectContaining({ mode: 'fast' }));
    }, 30000);

    it('should generate with smart mode', async () => {
      await generateCommand({ mode: 'smart' });
      expect(mockAnalyze).toHaveBeenCalledWith(expect.objectContaining({ mode: 'smart' }));
    }, 30000);

    it('should use custom output directory', async () => {
      await generateCommand({ output: 'custom-output' });
      expect(mockAnalyze).toHaveBeenCalledWith(expect.objectContaining({ output: 'custom-output' }));
    }, 30000);

    it('should use config file defaults when CLI flags are omitted', async () => {
      mockLoadCodemapConfig.mockResolvedValue({
        config: {
          ...createMockConfig(),
          mode: 'fast',
          include: ['lib/**/*.ts'],
          exclude: ['dist/**', 'coverage/**'],
          output: '.from-config',
        },
        configPath: '/project/mycodemap.config.json',
        exists: true,
        isLegacy: false,
        hasExplicitPluginConfig: false,
      });

      await generateCommand({});

      expect(mockAnalyze).toHaveBeenCalledWith(expect.objectContaining({
        mode: 'fast',
        include: ['lib/**/*.ts'],
        exclude: ['dist/**', 'coverage/**'],
        output: '.from-config',
      }));
    }, 30000);

    it('should let explicit CLI flags override config file defaults', async () => {
      mockLoadCodemapConfig.mockResolvedValue({
        config: {
          ...createMockConfig(),
          mode: 'fast',
          output: '.from-config',
        },
        configPath: '/project/mycodemap.config.json',
        exists: true,
        isLegacy: false,
        hasExplicitPluginConfig: false,
      });

      await generateCommand({ mode: 'smart', output: 'cli-output' });

      expect(mockAnalyze).toHaveBeenCalledWith(expect.objectContaining({
        mode: 'smart',
        output: 'cli-output',
      }));
    }, 30000);

    it('should pass configured storage backend into MVP3 storage save path', async () => {
      mockCreateForProject.mockResolvedValueOnce({
        type: 'kuzudb',
        saveCodeGraph: mockStorageSaveCodeGraph,
        close: mockStorageClose,
      });
      mockLoadCodemapConfig.mockResolvedValue({
        config: {
          ...createMockConfig(),
          storage: {
            type: 'kuzudb',
            databasePath: '.codemap/kuzu',
          },
        },
        configPath: '/project/mycodemap.config.json',
        exists: true,
        isLegacy: false,
        hasExplicitPluginConfig: false,
      });

      await generateCommand({});

      expect(mockCreateForProject).toHaveBeenCalledWith(process.cwd(), {
        type: 'kuzudb',
        databasePath: '.codemap/kuzu',
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('MVP3 Storage (kuzudb)'));
    }, 30000);

    it('should handle analysis error', async () => {
      mockAnalyze.mockRejectedValue(new Error('Analysis failed'));
      await expect(generateCommand({})).rejects.toThrow('Process exit');
      expect(mockExitCode).toBe(1);
    }, 30000);

    it('should fail fast on invalid plugin config', async () => {
      mockLoadCodemapConfig.mockRejectedValue(new Error('配置文件中的 "plugins" 必须是对象'));

      await expect(generateCommand({})).rejects.toThrow('Process exit');

      expect(mockExitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('"plugins" 必须是对象'));
    }, 30000);

    it('should surface built-in plugin metrics when explicitly enabled', async () => {
      mockLoadCodemapConfig.mockResolvedValue({
        config: {
          ...createMockConfig(),
          plugins: {
            builtInPlugins: false,
            plugins: ['complexity-analyzer'],
            debug: false,
          },
        },
        configPath: '/project/mycodemap.config.json',
        exists: true,
        isLegacy: false,
        hasExplicitPluginConfig: true,
      });

      await generateCommand({});

      const generatedCodeMap = mockGenerateJSON.mock.calls[0]?.[0];
      expect(generatedCodeMap?.pluginReport?.loadedPlugins).toContain('complexity-analyzer');
      expect(generatedCodeMap?.pluginReport?.metrics['complexity-analyzer']).toBeDefined();
    }, 30000);

    it('should isolate failing user plugins and keep generate alive', async () => {
      const pluginDir = await fs.mkdtemp(path.join(tmpdir(), 'codemap-plugin-fixture-'));
      tempDirs.push(pluginDir);
      const outputDir = path.join(pluginDir, 'generated');

      await fs.writeFile(
        path.join(pluginDir, 'good-plugin.js'),
        `export default {
  metadata: { name: 'good-plugin', version: '1.0.0' },
  async initialize() {},
  async analyze(modules) {
    return {
      metrics: { pluginSummary: { moduleCount: modules.length } },
      warnings: ['good-plugin warning']
    };
  },
  async generate() {
    return {
      files: [{ path: 'plugins/good.txt', content: 'generated by good-plugin' }]
    };
  },
  async dispose() {}
};`
      );

      await fs.writeFile(
        path.join(pluginDir, 'broken-plugin.js'),
        `export default {
  metadata: { name: 'broken-plugin', version: '1.0.0' },
  async initialize() {
    throw new Error('broken-plugin init failed');
  },
  async dispose() {}
};`
      );

      mockLoadCodemapConfig.mockResolvedValue({
        config: {
          ...createMockConfig(),
          output: outputDir,
          plugins: {
            builtInPlugins: false,
            pluginDir,
            plugins: ['good-plugin', 'broken-plugin'],
            debug: false,
          },
        },
        configPath: '/project/mycodemap.config.json',
        exists: true,
        isLegacy: false,
        hasExplicitPluginConfig: true,
      });

      await generateCommand({});

      const generatedCodeMap = mockGenerateJSON.mock.calls[0]?.[0];
      const pluginReport = generatedCodeMap?.pluginReport;

      expect(pluginReport?.loadedPlugins).toContain('good-plugin');
      expect(pluginReport?.loadedPlugins).not.toContain('broken-plugin');
      expect(pluginReport?.diagnostics).toEqual(expect.arrayContaining([
        expect.objectContaining({
          plugin: 'broken-plugin',
          stage: 'initialize',
          level: 'error',
        }),
        expect.objectContaining({
          plugin: 'good-plugin',
          stage: 'analyze',
          level: 'warning',
        }),
      ]));
      expect(pluginReport?.generatedFiles).toContain(path.join('plugins', 'good.txt'));
      await expect(fs.readFile(path.join(outputDir, 'plugins', 'good.txt'), 'utf8')).resolves.toBe('generated by good-plugin');
    }, 30000);

    it('should display project statistics', async () => {
      await generateCommand({});
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('文件总数'));
    }, 30000);

    it('should display actual mode when available', async () => {
      mockAnalyze.mockResolvedValue({ ...createMockCodeMap(), actualMode: 'smart' });
      await generateCommand({ mode: 'hybrid' });
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('解析模式'));
    }, 30000);
  });
});
