import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockAnalyzeFiles = vi.fn();
const mockCloseStorage = vi.fn(async () => undefined);
const mockCreateConfiguredStorage = vi.fn(async () => ({
  loadedConfig: {
    config: {
      storage: {
        type: 'sqlite',
        databasePath: '.codemap/governance.sqlite',
      },
    },
  },
  storage: {
    close: mockCloseStorage,
  },
}));

vi.mock('../../storage-runtime.js', () => ({
  createConfiguredStorage: (...args: unknown[]) => mockCreateConfiguredStorage(...args),
}));

vi.mock('../../../orchestrator/history-risk-service.js', () => ({
  GitHistoryService: class {
    analyzeFiles = (...args: unknown[]) => mockAnalyzeFiles(...args);
  },
}));

const { createCICommand, assessHistoryRisk } = await import('../ci.js');

describe('ci assess-risk', () => {
  let command = createCICommand();
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;
  let mockExitCode: number | undefined;

  beforeEach(() => {
    command = createCICommand();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockExitCode = undefined;
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null) => {
      mockExitCode = typeof code === 'number' ? code : 1;
      throw new Error(`process.exit:${code ?? 0}`);
    });
    mockAnalyzeFiles.mockReset();
    mockCreateConfiguredStorage.mockClear();
    mockCloseStorage.mockClear();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it('复用统一 history risk service 输出风险摘要', async () => {
    mockAnalyzeFiles.mockResolvedValue({
      requestedFiles: ['src/cli/index.ts'],
      files: [{
        file: 'src/cli/index.ts',
        risk: {
          level: 'medium',
          score: 0.54,
          gravity: 0.4,
          heat: {
            freq30d: 3,
            lastType: 'BUGFIX',
            lastDate: '2026-04-15T00:00:00.000Z',
            stability: false,
          },
          impact: 0.7,
          riskFactors: ['recent bugfixes'],
        },
        timeline: [],
        diagnostics: {
          status: 'ok',
          confidence: 'high',
          freshness: 'fresh',
          source: 'git-live',
          reasons: ['git history materialized from live repository'],
          analyzedAt: '2026-04-15T00:00:00.000Z',
          scopeMode: 'full',
          requestedFiles: 1,
          analyzedFiles: 1,
          requiresPrecompute: false,
        },
      }],
      aggregatedRisk: {
        level: 'medium',
        score: 0.54,
        gravity: 0.4,
        heat: {
          freq30d: 3,
          lastType: 'BUGFIX',
          lastDate: '2026-04-15T00:00:00.000Z',
          stability: false,
        },
        impact: 0.7,
        riskFactors: ['recent bugfixes'],
      },
      diagnostics: {
        status: 'ok',
        confidence: 'high',
        freshness: 'fresh',
        source: 'git-live',
        reasons: ['canonical history risk service completed live materialization'],
        analyzedAt: '2026-04-15T00:00:00.000Z',
        scopeMode: 'full',
        requestedFiles: 1,
        analyzedFiles: 1,
        requiresPrecompute: false,
      },
    });

    await command.parseAsync([
      'node',
      'ci',
      'assess-risk',
      '--files',
      'src/cli/index.ts',
      '--threshold',
      '0.7',
    ]);

    expect(mockCreateConfiguredStorage).toHaveBeenCalled();
    expect(mockAnalyzeFiles).toHaveBeenCalledWith(['src/cli/index.ts'], { persist: true });
    const output = consoleLogSpy.mock.calls.map((call) => String(call[0])).join('\n');
    expect(output).toContain('Risk assessment summary');
    expect(output).toContain('status=ok');
    expect(output).toContain('level=medium');
    expect(output).toContain('score=0.54');
    expect(output).toContain('riskFactors:');
    expect(mockCloseStorage).toHaveBeenCalledTimes(1);
  });

  it('阈值超出时返回非零退出码', async () => {
    mockAnalyzeFiles.mockResolvedValue({
      requestedFiles: ['src/cli/index.ts'],
      files: [],
      aggregatedRisk: {
        level: 'high',
        score: 0.91,
        gravity: 0.8,
        heat: {
          freq30d: 9,
          lastType: 'BUGFIX',
          lastDate: '2026-04-15T00:00:00.000Z',
          stability: false,
        },
        impact: 0.9,
        riskFactors: ['rollback-heavy'],
      },
      diagnostics: {
        status: 'ok',
        confidence: 'high',
        freshness: 'fresh',
        source: 'git-live',
        reasons: ['canonical history risk service completed live materialization'],
        analyzedAt: '2026-04-15T00:00:00.000Z',
        scopeMode: 'full',
        requestedFiles: 1,
        analyzedFiles: 1,
        requiresPrecompute: false,
      },
    });

    await expect(command.parseAsync([
      'node',
      'ci',
      'assess-risk',
      '--files',
      'src/cli/index.ts',
      '--threshold',
      '0.7',
    ])).rejects.toThrow('process.exit:1');

    expect(mockExitCode).toBe(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Risk score 0.91 exceeds threshold 0.70'));
  });

  it('history unavailable 时显式说明未应用阈值', async () => {
    mockAnalyzeFiles.mockResolvedValue({
      requestedFiles: ['src/cli/index.ts'],
      files: [{
        file: 'src/cli/index.ts',
        risk: {
          level: 'unavailable',
          score: null,
          gravity: null,
          heat: null,
          impact: null,
          riskFactors: ['no git history evidence'],
        },
        timeline: [],
        diagnostics: {
          status: 'unavailable',
          confidence: 'unavailable',
          freshness: 'unknown',
          source: 'unavailable',
          reasons: ['no materialized history snapshot found for file'],
          analyzedAt: null,
          scopeMode: 'full',
          requestedFiles: 1,
          analyzedFiles: 0,
          requiresPrecompute: false,
        },
      }],
      aggregatedRisk: {
        level: 'unavailable',
        score: null,
        gravity: null,
        heat: null,
        impact: null,
        riskFactors: ['no persisted history risk available'],
      },
      diagnostics: {
        status: 'unavailable',
        confidence: 'unavailable',
        freshness: 'unknown',
        source: 'unavailable',
        reasons: ['served materialized history from SQLite cache'],
        analyzedAt: null,
        scopeMode: 'full',
        requestedFiles: 1,
        analyzedFiles: 0,
        requiresPrecompute: false,
      },
    });

    const result = await assessHistoryRisk({
      files: ['src/cli/index.ts', 'src/cli/index.test.ts', 'src/types.d.ts'],
      threshold: 0.7,
      projectRoot: '/repo',
      persist: false,
    });

    expect(result.files).toEqual(['src/cli/index.ts']);

    await command.parseAsync([
      'node',
      'ci',
      'assess-risk',
      '--files',
      'src/cli/index.ts',
    ]);

    const output = consoleLogSpy.mock.calls.map((call) => String(call[0])).join('\n');
    expect(output).toContain('score=unavailable');
    expect(output).toContain('Risk assessment passed with unavailable history signals; threshold was not applied.');
  });
});
