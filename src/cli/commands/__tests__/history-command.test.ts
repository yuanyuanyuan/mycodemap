import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SymbolHistoryResult } from '../../../interface/types/history-risk.js';

const analyzeSymbolMock = vi.fn();
const closeStorageMock = vi.fn(async () => undefined);
const createConfiguredStorageMock = vi.fn(async () => ({
  loadedConfig: {
    config: {
      mode: 'hybrid',
      include: ['src/**/*.ts'],
      exclude: [],
      output: '.mycodemap',
      watch: false,
      storage: {
        type: 'sqlite',
        databasePath: '.codemap/governance.sqlite',
      },
      plugins: {
        builtInPlugins: true,
        plugins: [],
        debug: false,
      },
    },
    configPath: '/repo/mycodemap.config.json',
    exists: true,
    isLegacy: false,
    hasExplicitPluginConfig: false,
  },
  storage: {
    close: closeStorageMock,
  },
}));

vi.mock('../../storage-runtime.js', () => ({
  createConfiguredStorage: createConfiguredStorageMock,
}));

vi.mock('../../../orchestrator/history-risk-service.js', () => ({
  GitHistoryService: class {
    analyzeSymbol = analyzeSymbolMock;
  },
}));

const { createHistoryCommand } = await import('../history.js');

function createResult(
  overrides: Partial<SymbolHistoryResult> = {},
): SymbolHistoryResult {
  return {
    query: 'createCheckCommand',
    candidates: [{
      symbolId: 'sym-1',
      moduleId: 'mod-1',
      name: 'createCheckCommand',
      kind: 'function',
      file: 'src/cli/commands/check.ts',
      line: 92,
      exactNameMatch: true,
    }],
    symbol: {
      symbolId: 'sym-1',
      moduleId: 'mod-1',
      name: 'createCheckCommand',
      kind: 'function',
      file: 'src/cli/commands/check.ts',
      line: 92,
      exactNameMatch: true,
    },
    files: ['src/cli/commands/check.ts'],
    timeline: [{
      hash: 'commit-1',
      message: '[BUGFIX] check: enrich risk',
      date: '2026-04-15T00:00:00.000Z',
      author: 'tester',
      files: ['src/cli/commands/check.ts'],
      tagType: 'BUGFIX',
      tagScope: 'check',
      subject: 'enrich risk',
      riskWeight: 0.9,
      source: 'symbol',
    }],
    risk: {
      level: 'high',
      score: 0.86,
      gravity: 0.7,
      heat: {
        freq30d: 6,
        lastType: 'BUGFIX',
        lastDate: '2026-04-15T00:00:00.000Z',
        stability: false,
      },
      impact: 0.6,
      riskFactors: ['recent bugfixes'],
    },
    diagnostics: {
      status: 'ok',
      confidence: 'high',
      freshness: 'fresh',
      source: 'git-live',
      reasons: [],
      analyzedAt: '2026-04-15T00:00:00.000Z',
      scopeMode: 'full',
      requestedFiles: 1,
      analyzedFiles: 1,
      requiresPrecompute: false,
    },
    ...overrides,
  };
}

describe('history command', () => {
  let command = createHistoryCommand();
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    command = createHistoryCommand();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    analyzeSymbolMock.mockReset();
    createConfiguredStorageMock.mockClear();
    closeStorageMock.mockClear();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('prints structured JSON by default for exact matches', async () => {
    analyzeSymbolMock.mockResolvedValue(createResult());

    await command.parseAsync([
      'node',
      'history',
      '--symbol',
      'createCheckCommand',
    ]);

    const payload = JSON.parse(String(consoleLogSpy.mock.calls[0]?.[0]));
    expect(payload.status).toBe('ok');
    expect(payload.symbol).toEqual(expect.objectContaining({ name: 'createCheckCommand' }));
    expect(payload.risk).toEqual(expect.objectContaining({ level: 'high' }));
    expect(closeStorageMock).toHaveBeenCalledTimes(1);
  });

  it('returns structured candidates for ambiguous matches', async () => {
    analyzeSymbolMock.mockResolvedValue(createResult({
      symbol: null,
      timeline: [],
      risk: {
        level: 'unavailable',
        score: null,
        gravity: null,
        heat: null,
        impact: null,
        riskFactors: ['ambiguous'],
      },
      diagnostics: {
        status: 'ambiguous',
        confidence: 'low',
        freshness: 'unknown',
        source: 'git-live',
        reasons: ['symbol query resolved to multiple candidates'],
        analyzedAt: null,
        scopeMode: 'partial',
        requestedFiles: 0,
        analyzedFiles: 0,
        requiresPrecompute: false,
      },
      candidates: [
        {
          symbolId: 'sym-1',
          moduleId: 'mod-1',
          name: 'dup',
          kind: 'function',
          file: 'src/a.ts',
          line: 1,
          exactNameMatch: true,
        },
        {
          symbolId: 'sym-2',
          moduleId: 'mod-2',
          name: 'dup',
          kind: 'function',
          file: 'src/b.ts',
          line: 2,
          exactNameMatch: true,
        },
      ],
    }));

    await command.parseAsync([
      'node',
      'history',
      '--symbol',
      'dup',
    ]);

    const payload = JSON.parse(String(consoleLogSpy.mock.calls[0]?.[0]));
    expect(payload.status).toBe('ambiguous');
    expect(payload.candidates).toHaveLength(2);
    expect(payload.symbol).toBeNull();
  });

  it('distinguishes not_found from unavailable', async () => {
    analyzeSymbolMock.mockResolvedValueOnce(createResult({
      symbol: null,
      candidates: [],
      files: [],
      timeline: [],
      risk: {
        level: 'unavailable',
        score: null,
        gravity: null,
        heat: null,
        impact: null,
        riskFactors: ['not-found'],
      },
      diagnostics: {
        status: 'not_found',
        confidence: 'low',
        freshness: 'unknown',
        source: 'git-live',
        reasons: ['symbol not found'],
        analyzedAt: null,
        scopeMode: 'partial',
        requestedFiles: 0,
        analyzedFiles: 0,
        requiresPrecompute: false,
      },
    }));

    await command.parseAsync([
      'node',
      'history',
      '--symbol',
      'missingSymbol',
    ]);

    const payload = JSON.parse(String(consoleLogSpy.mock.calls[0]?.[0]));
    expect(payload.status).toBe('not_found');
    expect(payload.warnings).toEqual(['symbol not found']);
  });

  it('renders human output from the same structured result', async () => {
    analyzeSymbolMock.mockResolvedValue(createResult({
      symbol: null,
      candidates: [],
      files: [],
      timeline: [],
      risk: {
        level: 'unavailable',
        score: null,
        gravity: null,
        heat: null,
        impact: null,
        riskFactors: ['storage empty'],
      },
      diagnostics: {
        status: 'unavailable',
        confidence: 'unavailable',
        freshness: 'unknown',
        source: 'unavailable',
        reasons: ['storage empty'],
        analyzedAt: null,
        scopeMode: 'partial',
        requestedFiles: 0,
        analyzedFiles: 0,
        requiresPrecompute: false,
      },
    }));

    await command.parseAsync([
      'node',
      'history',
      '--symbol',
      'createCheckCommand',
      '--human',
    ]);

    const output = String(consoleLogSpy.mock.calls[0]?.[0]);
    expect(output).toContain('History status: unavailable');
    expect(output).toContain('Warnings:');
    expect(output).toContain('storage empty');
  });
});
