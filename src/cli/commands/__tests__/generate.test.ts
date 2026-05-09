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
  let processCwdSpy: ReturnType<typeof vi.spyOn>;
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

  const createIncrementalModules = (rootDir: string) => ([
    {
      id: 'mod-a',
      path: path.join(rootDir, 'src/a.ts'),
      absolutePath: path.join(rootDir, 'src/a.ts'),
      type: 'source' as const,
      stats: { lines: 4, codeLines: 3, commentLines: 0, blankLines: 1 },
      exports: [],
      imports: [],
      symbols: [],
      dependencies: [path.join(rootDir, 'src/b.ts')],
      dependents: [],
    },
    {
      id: 'mod-b',
      path: path.join(rootDir, 'src/b.ts'),
      absolutePath: path.join(rootDir, 'src/b.ts'),
      type: 'source' as const,
      stats: { lines: 4, codeLines: 3, commentLines: 0, blankLines: 1 },
      exports: [],
      imports: [],
      symbols: [],
      dependencies: [],
      dependents: [path.join(rootDir, 'src/a.ts')],
    },
  ]);

  const createStoredGraph = (rootDir: string) => ({
    project: {
      id: 'proj-1',
      name: 'test-project',
      rootPath: rootDir,
      createdAt: new Date('2026-05-08T00:00:00.000Z'),
      updatedAt: new Date('2026-05-08T00:00:00.000Z'),
    },
    modules: [
      {
        id: 'graph-mod-a',
        projectId: 'proj-1',
        path: path.join(rootDir, 'src/a.ts'),
        language: 'typescript',
        stats: { lines: 4, codeLines: 3, commentLines: 0, blankLines: 1 },
      },
      {
        id: 'graph-mod-b',
        projectId: 'proj-1',
        path: path.join(rootDir, 'src/b.ts'),
        language: 'typescript',
        stats: { lines: 4, codeLines: 3, commentLines: 0, blankLines: 1 },
      },
    ],
    symbols: [],
    dependencies: [
      {
        id: 'dep-1',
        sourceId: 'graph-mod-a',
        sourceEntityType: 'module',
        targetId: 'graph-mod-b',
        targetEntityType: 'module',
        type: 'import',
        confidence: 'EXTRACTED' as const,
      },
    ],
    graphStatus: 'complete' as const,
    failedFileCount: 0,
    parseFailureFiles: [],
  });

  const createMockConfig = () => ({
    mode: 'tree-sitter' as const,
    include: ['src/**/*.ts'],
    exclude: ['node_modules/**', 'dist/**'],
      output: '.mycodemap',
      watch: false,
      storage: {
        type: 'sqlite' as const,
        databasePath: '.mycodemap/governance.sqlite',
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
    processCwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/project');
    
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
      type: 'sqlite',
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
    processCwdSpy.mockRestore();
    process.env = originalEnv;
    return Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  describe('generateCommand', () => {
    it('should generate with default options', async () => {
      await generateCommand({});
      expect(mockAnalyze).toHaveBeenCalled();
    }, 30000);

    it('should generate with tree-sitter mode', async () => {
      await generateCommand({ mode: 'tree-sitter' });
      expect(mockAnalyze).toHaveBeenCalledWith(expect.objectContaining({ mode: 'tree-sitter' }));
    }, 30000);

    it('should use custom output directory', async () => {
      await generateCommand({ output: 'custom-output' });
      expect(mockAnalyze).toHaveBeenCalledWith(expect.objectContaining({ output: 'custom-output' }));
    }, 30000);

    it('should use config file defaults when CLI flags are omitted', async () => {
      mockLoadCodemapConfig.mockResolvedValue({
        config: {
          ...createMockConfig(),
          mode: 'tree-sitter',
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
        mode: 'tree-sitter',
        include: ['lib/**/*.ts'],
        exclude: ['dist/**', 'coverage/**'],
        output: '.from-config',
      }));
    }, 30000);

    it('should let explicit CLI flags override config file defaults', async () => {
      mockLoadCodemapConfig.mockResolvedValue({
        config: {
          ...createMockConfig(),
          mode: 'tree-sitter',
          output: '.from-config',
        },
        configPath: '/project/mycodemap.config.json',
        exists: true,
        isLegacy: false,
        hasExplicitPluginConfig: false,
      });

      await generateCommand({ mode: 'tree-sitter', output: 'cli-output' });

      expect(mockAnalyze).toHaveBeenCalledWith(expect.objectContaining({
        mode: 'tree-sitter',
        output: 'cli-output',
      }));
    }, 30000);

    it('should pass configured sqlite storage into governance graph save path', async () => {
      mockCreateForProject.mockResolvedValueOnce({
        type: 'sqlite',
        saveCodeGraph: mockStorageSaveCodeGraph,
        close: mockStorageClose,
      });
      mockLoadCodemapConfig.mockResolvedValue({
        config: {
          ...createMockConfig(),
          storage: {
            type: 'sqlite',
            databasePath: '.mycodemap/governance.sqlite',
          },
        },
        configPath: '/project/mycodemap.config.json',
        exists: true,
        isLegacy: false,
        hasExplicitPluginConfig: false,
      });

      await generateCommand({});

      expect(mockCreateForProject).toHaveBeenCalledWith(process.cwd(), {
        type: 'sqlite',
        databasePath: '.mycodemap/governance.sqlite',
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('治理图存储 (sqlite)'));
    }, 30000);

    it('should persist EXTRACTED confidence for parser-backed module and symbol dependencies', async () => {
      mockAnalyze.mockResolvedValue({
        ...createMockCodeMap(),
        project: {
          name: 'test-project',
          rootDir: process.cwd(),
          packageManager: 'npm',
        },
        modules: [
          {
            id: 'src/a.ts',
            path: 'src/a.ts',
            absolutePath: path.join(process.cwd(), 'src/a.ts'),
            type: 'source',
            stats: {
              lines: 10,
              codeLines: 8,
              commentLines: 1,
              blankLines: 1,
            },
            exports: [],
            imports: [],
            dependencies: ['src/b.ts'],
            dependents: [],
            symbols: [{
              id: 'sym-a',
              name: 'callA',
              kind: 'function',
              location: { file: 'src/a.ts', line: 1, column: 1 },
              visibility: 'public',
              relatedSymbols: [],
              signature: {
                parameters: [],
                returnType: 'void',
                async: false,
                calls: [{ callee: 'callB', line: 2 }],
              },
            }],
            callGraph: {
              crossFileCalls: [{
                caller: 'callA',
                callee: 'callB',
                resolved: true,
                calleeLocation: { file: 'src/b.ts', line: 1, column: 1 },
              }],
            },
          },
          {
            id: 'src/b.ts',
            path: 'src/b.ts',
            absolutePath: path.join(process.cwd(), 'src/b.ts'),
            type: 'source',
            stats: {
              lines: 10,
              codeLines: 8,
              commentLines: 1,
              blankLines: 1,
            },
            exports: [],
            imports: [],
            dependencies: [],
            dependents: [],
            symbols: [{
              id: 'sym-b',
              name: 'callB',
              kind: 'function',
              location: { file: 'src/b.ts', line: 1, column: 1 },
              visibility: 'public',
              relatedSymbols: [],
              signature: {
                parameters: [],
                returnType: 'void',
                async: false,
              },
            }],
          },
        ],
      });

      await generateCommand({ symbolLevel: true });

      const savedGraph = mockStorageSaveCodeGraph.mock.calls[0]?.[0] as {
        dependencies: Array<{ type: string; confidence?: string }>;
      };
      expect(savedGraph.dependencies).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'import', confidence: 'EXTRACTED' }),
        expect.objectContaining({ type: 'call', confidence: 'EXTRACTED' }),
      ]));
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

    it('should surface actionable unsupported-storage remediation for deprecated backends', async () => {
      const error = new Error('配置文件中的 "storage.type"="filesystem" 已不再受支持') as Error & {
        code: string;
        remediation: string;
        nextCommand: string;
      };
      error.code = 'UNSUPPORTED_STORAGE_TYPE';
      error.remediation = '将 "storage.type" 改为 "sqlite"（推荐）或 "auto"。';
      error.nextCommand = 'mycodemap doctor';
      mockLoadCodemapConfig.mockRejectedValue(error);

      await expect(generateCommand({})).rejects.toThrow('Process exit');

      expect(mockExitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[UNSUPPORTED_STORAGE_TYPE]'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('mycodemap doctor'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('"sqlite"（推荐）或 "auto"'));
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

    it('should announce the single parser main path', async () => {
      await generateCommand({});
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('默认 parser 主路径'));
    }, 30000);

    it('should run incremental refresh, keep changed-files precedence, and persist refresh metadata', async () => {
      const rootDir = await fs.mkdtemp(path.join(tmpdir(), 'codemap-incremental-generate-'));
      tempDirs.push(rootDir);
      processCwdSpy.mockReturnValue(rootDir);
      await fs.mkdir(path.join(rootDir, '.mycodemap'), { recursive: true });
      await fs.writeFile(
        path.join(rootDir, '.mycodemap', 'codemap.json'),
        JSON.stringify({
          ...createMockCodeMap(),
          project: {
            name: 'test-project',
            rootDir,
            packageManager: 'npm',
          },
          modules: createIncrementalModules(rootDir),
        }),
        'utf8'
      );
      mockAnalyze.mockResolvedValue({
        ...createMockCodeMap(),
        project: {
          name: 'test-project',
          rootDir,
          packageManager: 'npm',
        },
        modules: createIncrementalModules(rootDir),
      });
      mockCreateForProject.mockResolvedValue({
        type: 'sqlite',
        loadCodeGraph: vi.fn().mockResolvedValue(createStoredGraph(rootDir)),
        saveCodeGraph: mockStorageSaveCodeGraph,
        close: mockStorageClose,
      });

      const result = await generateCommand({
        incremental: true,
        changedFiles: ['src/a.ts'],
        base: 'main',
        against: 'HEAD',
        json: true,
        structured: true,
      });

      expect(result).toEqual(expect.objectContaining({
        status: 'success',
        mode: 'incremental',
      }));
      expect(result.refresh?.diagnostics).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'INCREMENTAL_CHANGED_FILES_OVERRIDE' }),
        expect.objectContaining({ code: 'INCREMENTAL_SNAPSHOT_REPLACED' }),
      ]));
      expect(mockStorageSaveCodeGraph).toHaveBeenCalledWith(expect.objectContaining({
        lastRefresh: expect.objectContaining({
          status: 'success',
        }),
      }));
      expect(mockGenerateJSON).toHaveBeenCalledWith(
        expect.objectContaining({
          lastRefresh: expect.objectContaining({
            status: 'success',
          }),
        }),
        expect.any(String)
      );
    }, 30000);

    it('should fail closed when incremental changed file is outside persisted graph truth', async () => {
      const rootDir = await fs.mkdtemp(path.join(tmpdir(), 'codemap-incremental-fail-'));
      tempDirs.push(rootDir);
      processCwdSpy.mockReturnValue(rootDir);
      await fs.mkdir(path.join(rootDir, '.mycodemap'), { recursive: true });
      await fs.writeFile(
        path.join(rootDir, '.mycodemap', 'codemap.json'),
        JSON.stringify({
          ...createMockCodeMap(),
          project: {
            name: 'test-project',
            rootDir,
            packageManager: 'npm',
          },
          modules: createIncrementalModules(rootDir),
        }),
        'utf8'
      );
      mockCreateForProject.mockResolvedValue({
        type: 'sqlite',
        loadCodeGraph: vi.fn().mockResolvedValue(createStoredGraph(rootDir)),
        saveCodeGraph: mockStorageSaveCodeGraph,
        close: mockStorageClose,
      });

      await expect(generateCommand({
        incremental: true,
        changedFiles: ['src/missing.ts'],
        json: true,
        structured: true,
      })).rejects.toThrow('Process exit');
      expect(mockExitCode).toBe(1);
      expect(mockStorageSaveCodeGraph).not.toHaveBeenCalled();
    }, 30000);
  });
});
