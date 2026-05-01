/**
 * [META] Analyze CLI Command Test
 * [WHY] 回归保护 analyze 四意图、legacy compat warning 与错误码行为
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CodeMap, ModuleInfo } from '../../../interface/types/index.js';
import type { CodemapOutput, UnifiedResult } from '../../../orchestrator/types.js';
import { ANALYZE_HELP_EXAMPLES, getAnalyzeHelpText } from '../analyze-options.js';

const mockImpactRunEnhanced = vi.fn<() => Promise<UnifiedResult[]>>();
const mockDepsRunEnhanced = vi.fn<() => Promise<UnifiedResult[]>>();
const mockComplexityRunEnhanced = vi.fn<() => Promise<UnifiedResult[]>>();
const mockResolveTestFile = vi.fn<() => Promise<string | null>>();
const mockExecuteWithFallback = vi.fn();
const mockAstGrepExecute = vi.fn();
const mockLoadCodemapConfig = vi.fn();
const mockDiscoverProjectFiles = vi.fn();

vi.mock('chalk', () => ({
  default: {
    bold: (text: string) => text,
    yellow: (text: string) => text,
    cyan: (text: string) => text,
    gray: (text: string) => text,
    green: (text: string) => text,
    red: (text: string) => text,
  },
}));

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

vi.mock('../../config-loader.js', () => ({
  loadCodemapConfig: (...args: unknown[]) => mockLoadCodemapConfig(...args),
}));

vi.mock('../../../core/file-discovery.js', () => ({
  discoverProjectFiles: (...args: unknown[]) => mockDiscoverProjectFiles(...args),
}));

vi.mock('../impact.js', () => ({
  ImpactCommand: vi.fn(() => ({
    runEnhanced: (...args: unknown[]) => mockImpactRunEnhanced(...args),
  })),
}));

vi.mock('../deps.js', () => ({
  DepsCommand: vi.fn(() => ({
    runEnhanced: (...args: unknown[]) => mockDepsRunEnhanced(...args),
  })),
}));

vi.mock('../complexity.js', () => ({
  ComplexityCommand: vi.fn(() => ({
    runEnhanced: (...args: unknown[]) => mockComplexityRunEnhanced(...args),
  })),
}));

vi.mock('../../../orchestrator/test-linker.js', () => ({
  resolveTestFile: (...args: unknown[]) => mockResolveTestFile(...args),
}));

vi.mock('../../../orchestrator/tool-orchestrator.js', () => ({
  ToolOrchestrator: vi.fn(() => ({
    registerAdapter: vi.fn(),
    executeWithFallback: (...args: unknown[]) => mockExecuteWithFallback(...args),
    executeParallel: vi.fn(),
  })),
}));

vi.mock('../../../orchestrator/result-fusion.js', () => ({
  ResultFusion: vi.fn(() => ({
    fuse: vi.fn(),
  })),
}));

vi.mock('../../../orchestrator/adapters/codemap-adapter.js', () => ({
  CodemapAdapter: vi.fn(() => ({})),
}));

vi.mock('../../../orchestrator/adapters/ast-grep-adapter.js', () => ({
  AstGrepAdapter: vi.fn(() => ({
    execute: (...args: unknown[]) => mockAstGrepExecute(...args),
  })),
}));

vi.mock('../../paths.js', () => ({
  resolveDataPath: vi.fn(() => '/tmp/mock-codemap.json'),
  resolveOutputDir: vi.fn(() => ({
    outputDir: '/tmp/mock-output',
    isLegacy: false,
    configPath: '/tmp/mock-output/mycodemap.config.json',
    dataPath: '/tmp/mock-output/codemap.json',
  })),
}));

import {
  AnalyzeCommand,
  AnalyzeErrorCode,
  ERROR_MESSAGES,
  analyzeCommand,
  parseAnalyzeArgs,
} from '../analyze.js';

function createResult(overrides: Partial<UnifiedResult> = {}): UnifiedResult {
  return {
    id: 'result-1',
    source: 'codemap',
    toolScore: 0.9,
    type: 'file',
    file: 'src/cli/index.ts',
    line: 12,
    content: '示例结果',
    relevance: 0.9,
    keywords: ['sample'],
    metadata: {
      riskLevel: 'low',
      stability: true,
    },
    ...overrides,
  };
}

function createModule(overrides: Partial<ModuleInfo> = {}): ModuleInfo {
  return {
    id: 'src/cli/index.ts',
    path: 'src/cli/index.ts',
    absolutePath: '/repo/src/cli/index.ts',
    type: 'source',
    stats: {
      lines: 10,
      codeLines: 8,
      commentLines: 1,
      blankLines: 1,
    },
    exports: [],
    imports: [],
    symbols: [],
    dependencies: [],
    dependents: [],
    ...overrides,
  };
}

function createCodeMap(modules: ModuleInfo[]): CodeMap {
  return {
    version: '1.0.0',
    generatedAt: '2026-03-24T00:00:00.000Z',
    project: {
      name: 'codemap',
      rootDir: '/repo',
      packageManager: 'pnpm',
    },
    summary: {
      totalFiles: modules.length,
      totalLines: 100,
      totalModules: modules.length,
      totalExports: 3,
      totalTypes: 1,
    },
    modules,
    dependencies: {
      nodes: [],
      edges: [],
    },
  };
}

describe('Analyze CLI Command', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;
  let mockExitCode: number | undefined;
  let originalArgv: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockExitCode = undefined;
    process.exitCode = undefined;
    originalArgv = [...process.argv];
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null) => {
      mockExitCode = typeof code === 'number' ? code : 1;
      throw new Error(`process.exit:${code ?? 0}`);
    });

    mockImpactRunEnhanced.mockResolvedValue([]);
    mockDepsRunEnhanced.mockResolvedValue([]);
    mockComplexityRunEnhanced.mockResolvedValue([]);
    mockResolveTestFile.mockResolvedValue(null);
    mockAstGrepExecute.mockResolvedValue([
      createResult({
        id: 'ast-grep-1',
        source: 'ast-grep',
        type: 'symbol',
        file: 'src/interface/types.ts',
        line: 21,
        content: 'AstGrep fallback 结果',
        keywords: ['SourceLocation'],
      }),
    ]);
    mockExecuteWithFallback.mockResolvedValue({
      results: [
        createResult({
          id: 'find-1',
          source: 'ast-grep',
          type: 'symbol',
          file: 'src/interface/types.ts',
          line: 18,
          content: '找到 SourceLocation 定义',
          keywords: ['SourceLocation'],
        }),
      ],
      confidence: {
        score: 0.88,
        level: 'high',
      },
    });
    mockLoadCodemapConfig.mockResolvedValue({
      config: {
        include: ['src/**/*.ts'],
        exclude: ['dist/**'],
      },
    });
    mockDiscoverProjectFiles.mockResolvedValue([path.join(process.cwd(), 'src/interface/types.ts')]);
    vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'));
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    processExitSpy.mockRestore();
    process.argv = originalArgv;
  });

  it('parseAnalyzeArgs 应直接解析传入 argv', () => {
    const parsed = parseAnalyzeArgs([
      '--intent', 'read',
      '--targets', 'src/cli/index.ts',
      '--keywords', 'IntentRouter',
      '--scope', 'transitive',
      '--topK', '5',
      '--include-tests',
      '--json',
      '--structured',
      '--output-mode', 'machine',
    ]);

    expect(parsed).toEqual({
      intent: 'read',
      targets: ['src/cli/index.ts'],
      keywords: ['IntentRouter'],
      scope: 'transitive',
      topK: 5,
      includeTests: true,
      includeGitHistory: false,
      json: true,
      human: false,
      structured: true,
      outputMode: 'machine',
    });
  });

  it('无 intent 时应输出共享 help 示例', async () => {
    await analyzeCommand(['analyze']);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const helpOutput = consoleLogSpy.mock.calls[0]?.[0];
    expect(typeof helpOutput).toBe('string');
    expect(helpOutput).toBe(getAnalyzeHelpText());

    for (const example of ANALYZE_HELP_EXAMPLES) {
      expect(helpOutput).toContain(example);
    }
  });

  it('覆盖 public find intent', async () => {
    const output = await new AnalyzeCommand({
      intent: 'find',
      keywords: ['SourceLocation'],
    }).execute() as CodemapOutput;

    expect(output.intent).toBe('find');
    expect(output.tool).toBe('codemap-orchestrated');
    expect(output.diagnostics?.status).toBe('success');
    expect(output.results[0]?.file).toBe('src/interface/types.ts');
    expect(output.results[0]?.location).toEqual({
      file: 'src/interface/types.ts',
      line: 18,
      column: 1,
    });
  });

  it('在 orchestrator 不可用时回退到 AstGrep find', async () => {
    mockExecuteWithFallback.mockRejectedValueOnce(new Error('orchestrator down'));

    const output = await new AnalyzeCommand({
      intent: 'find',
      keywords: ['SourceLocation'],
    }).execute() as CodemapOutput;

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[Analyze] Orchestrator not available, falling back to AstGrep search'
    );
    expect(output.intent).toBe('find');
    expect(output.tool).toBe('ast-grep-find');
    expect(output.diagnostics?.status).toBe('success');
    expect(output.results[0]?.file).toBe('src/interface/types.ts');
  });

  it('scanner failure 后有文本 fallback 命中时输出 partialFailure diagnostics', async () => {
    mockExecuteWithFallback.mockResolvedValueOnce({
      results: [],
      confidence: {
        score: 0,
        level: 'low',
      },
    });
    mockAstGrepExecute.mockRejectedValueOnce(new Error('ast-grep scan failed'));
    mockDiscoverProjectFiles.mockResolvedValueOnce([path.join(process.cwd(), 'src/interface/types.ts')]);
    vi.mocked(readFile).mockResolvedValueOnce('export interface SourceLocation {\n  line: number;\n}');

    const output = await new AnalyzeCommand({
      intent: 'find',
      keywords: ['SourceLocation'],
      json: true,
      structured: true,
    }).execute() as CodemapOutput;

    expect(output.tool).toBe('codemap-find-fallback');
    expect(output.diagnostics?.status).toBe('partialFailure');
    expect(output.diagnostics?.degradedTools).toContain('ast-grep');
    expect(output.results[0]?.source).toBe('codemap-fallback');
    expect(output.results[0]?.file).toBe('src/interface/types.ts');
  });

  it('scanner 与 fallback 都失败时输出 failure diagnostics 并设置 machine exitCode', async () => {
    mockExecuteWithFallback.mockResolvedValueOnce({
      results: [],
      confidence: {
        score: 0,
        level: 'low',
      },
    });
    mockAstGrepExecute.mockRejectedValueOnce(new Error('ast-grep scan failed'));
    mockDiscoverProjectFiles.mockRejectedValueOnce(new Error('discovery failed'));

    const output = await new AnalyzeCommand({
      intent: 'find',
      keywords: ['SourceLocation'],
      json: true,
      structured: true,
    }).execute() as CodemapOutput;

    expect(output.tool).toBe('codemap-find-fallback');
    expect(output.confidence.score).toBe(0);
    expect(output.results).toEqual([]);
    expect(output.diagnostics?.status).toBe('failure');
    expect(output.diagnostics?.failedTools).toEqual(['ast-grep', 'codemap-find-fallback']);
    expect(process.exitCode).toBe(1);
  });

  it('scanner 成功但真实 0 命中时输出 success diagnostics', async () => {
    mockExecuteWithFallback.mockResolvedValueOnce({
      results: [],
      confidence: {
        score: 0,
        level: 'low',
      },
    });
    mockAstGrepExecute.mockResolvedValueOnce([]);

    const output = await new AnalyzeCommand({
      intent: 'find',
      keywords: ['DefinitelyMissingSymbol'],
      json: true,
      structured: true,
    }).execute() as CodemapOutput;

    expect(output.tool).toBe('codemap-orchestrated');
    expect(output.results).toEqual([]);
    expect(output.diagnostics?.status).toBe('success');
    expect(process.exitCode).toBeUndefined();
  });

  it('显式文件路径输入在 scanner 失败时按 path anchor fallback', async () => {
    mockExecuteWithFallback.mockResolvedValueOnce({
      results: [],
      confidence: {
        score: 0,
        level: 'low',
      },
    });
    mockAstGrepExecute.mockRejectedValueOnce(new Error('ast-grep scan failed'));
    mockDiscoverProjectFiles.mockResolvedValueOnce([
      path.join(process.cwd(), 'src/interface/types.ts'),
      path.join(process.cwd(), 'src/cli/index.ts'),
    ]);
    vi.mocked(readFile)
      .mockResolvedValueOnce('export interface SourceLocation {\n  line: number;\n}')
      .mockResolvedValueOnce('export interface SourceLocation {\n  line: number;\n}');

    const output = await new AnalyzeCommand({
      intent: 'find',
      targets: ['src/interface/types.ts'],
      json: true,
      structured: true,
    }).execute() as CodemapOutput;

    expect(output.tool).toBe('codemap-find-fallback');
    expect(output.diagnostics?.status).toBe('partialFailure');
    expect(output.results).toHaveLength(1);
    expect(output.results[0]?.file).toBe('src/interface/types.ts');
    expect(readFile).toHaveBeenCalledTimes(2);
    expect(readFile).toHaveBeenCalledWith(path.join(process.cwd(), 'src/interface/types.ts'), 'utf-8');
  });

  it('覆盖 public read intent', async () => {
    mockImpactRunEnhanced.mockResolvedValue([
      createResult({
        id: 'impact-1',
        file: 'src/cli/index.ts',
        line: 8,
        content: '被 2 个模块依赖',
        metadata: {
          dependencies: ['src/server/index.ts'],
          impactCount: 2,
          riskLevel: 'medium',
          stability: true,
        },
      }),
    ]);
    mockComplexityRunEnhanced.mockResolvedValue([
      createResult({
        id: 'complexity-1',
        file: 'src/cli/analyze.ts',
        line: 20,
        content: '复杂度偏高',
        relevance: 0.82,
        metadata: {
          complexityMetrics: {
            cyclomatic: 7,
            cognitive: 5,
            maintainability: 72,
          },
          riskLevel: 'medium',
          stability: true,
        },
      }),
    ]);

    const output = await new AnalyzeCommand({
      intent: 'read',
      targets: ['src/cli/index.ts'],
    }).execute() as CodemapOutput;

    expect(output.intent).toBe('read');
    expect(output.tool).toBe('codemap-read');
    expect(output.analysis?.intent).toBe('read');
    expect(output.analysis && 'impact' in output.analysis ? output.analysis.impact?.[0]?.impactCount : 0).toBe(2);
    expect(output.analysis && 'complexity' in output.analysis ? output.analysis.complexity?.[0]?.metrics.cyclomatic : 0).toBe(7);
  });

  it('覆盖 public link intent', async () => {
    const targetModule = createModule({
      id: 'src/cli/index.ts',
      path: 'src/cli/index.ts',
      absolutePath: '/repo/src/cli/index.ts',
      exports: [
        { name: 'runCli', kind: 'function', isDefault: false, isTypeOnly: false },
      ],
      dependencies: ['src/server/index.ts'],
      dependents: ['src/server/app.ts'],
    });
    const callerModule = createModule({
      id: 'src/server/app.ts',
      path: 'src/server/app.ts',
      absolutePath: '/repo/src/server/app.ts',
      imports: [
        {
          source: '../cli/index.js',
          specifiers: [{ name: 'runCli', isTypeOnly: false }],
          isTypeOnly: false,
        },
      ],
    });

    mockDepsRunEnhanced.mockResolvedValue([
      createResult({
        id: 'deps-1',
        file: 'src/cli/index.ts',
        line: 1,
        content: '依赖 1 个模块',
        metadata: {
          dependencies: ['src/server/index.ts'],
          stability: true,
          riskLevel: 'low',
        },
      }),
    ]);
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(createCodeMap([targetModule, callerModule])));

    const output = await new AnalyzeCommand({
      intent: 'link',
      targets: ['src/cli/index.ts'],
    }).execute() as CodemapOutput;

    expect(output.intent).toBe('link');
    expect(output.tool).toBe('codemap-link');
    expect(output.analysis?.intent).toBe('link');
    expect(output.analysis && 'dependency' in output.analysis ? output.analysis.dependency?.[0]?.imports : []).toContain('src/server/index.ts');
    expect(output.analysis && 'reference' in output.analysis ? output.analysis.reference?.[0]?.callers : []).toContain('src/server/app.ts');
  });

  it('覆盖 public show intent', async () => {
    const serviceModule = createModule({
      id: 'src/domain/service.ts',
      path: 'src/domain/service.ts',
      absolutePath: '/repo/src/domain/service.ts',
      overview: '模块 src/domain/service.ts，导出 1 个符号，依赖 0 个模块',
      exports: [
        { name: 'buildService', kind: 'function', isDefault: false, isTypeOnly: false },
      ],
    });
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(createCodeMap([serviceModule])));

    const output = await new AnalyzeCommand({
      intent: 'show',
      targets: ['src/domain/service.ts'],
    }).execute() as CodemapOutput;

    expect(output.intent).toBe('show');
    expect(output.tool).toBe('codemap-show');
    expect(output.analysis?.intent).toBe('show');
    expect(output.analysis && 'overview' in output.analysis ? output.analysis.overview?.[0]?.file : '').toBe('src/domain/service.ts');
    expect(output.analysis && 'documentation' in output.analysis ? output.analysis.documentation?.[0]?.content : '').toContain('导出 1 个符号');
  });

  it('对 legacy search 输出兼容 warning', async () => {
    const output = await new AnalyzeCommand({
      intent: 'search',
      keywords: ['UnifiedResult'],
    }).execute() as CodemapOutput;

    expect(output.intent).toBe('find');
    expect(output.warnings?.[0]).toEqual({
      code: 'deprecated-intent',
      severity: 'warning',
      message: 'legacy intent "search" 已弃用，请改用 "find"',
      deprecatedIntent: 'search',
      replacementIntent: 'find',
      sunsetPolicy: '2-minor-window',
    });
  });

  it('对 legacy documentation 输出兼容 warning', async () => {
    const docModule = createModule({
      id: 'src/domain/services/index.ts',
      path: 'src/domain/services/index.ts',
      absolutePath: '/repo/src/domain/services/index.ts',
      overview: '服务层模块说明',
    });
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(createCodeMap([docModule])));

    const output = await new AnalyzeCommand({
      intent: 'documentation',
      targets: ['src/domain/services/index.ts'],
    }).execute() as CodemapOutput;

    expect(output.intent).toBe('show');
    expect(output.warnings?.[0]?.replacementIntent).toBe('show');
    expect(output.warnings?.[0]?.deprecatedIntent).toBe('documentation');
  });

  it('对 legacy refactor 输出错误并设置 exitCode', async () => {
    await analyzeCommand(['analyze', '--intent', 'refactor', '--targets', 'src/cache']);

    expect(process.exitCode).toBe(1);
  });

  it('缺少 targets 时输出错误并设置 exitCode', async () => {
    await analyzeCommand(['analyze', '--intent', 'read']);

    expect(process.exitCode).toBe(1);
  });
});
