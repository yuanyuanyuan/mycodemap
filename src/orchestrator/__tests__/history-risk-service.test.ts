import { describe, expect, it, vi } from 'vitest';
import type { CodeGraph, Dependency, Module, Symbol as CodeSymbol } from '../../interface/types/index.js';
import type {
  FileHistorySignal,
  HistoryRiskSnapshotPayload,
  SymbolHistoryResult,
} from '../../interface/types/history-risk.js';
import type {
  Cycle,
  IStorage,
  ImpactResult,
  ProjectStatistics,
  SearchOptions,
  SearchResult,
} from '../../interface/types/storage.js';
import type { AIFeed, CommitInfo, RiskScore } from '../git-analyzer.js';
import { GitHistoryService } from '../history-risk-service.js';

interface HistoryRiskStorageAdapter {
  saveHistoryRiskSnapshot(payload: HistoryRiskSnapshotPayload): Promise<{ snapshotId: string; recordedAt: string; source: string }>;
  loadLatestFileHistorySignal(file: string): Promise<FileHistorySignal | null>;
  loadLatestSymbolHistoryResult(symbolId: string, query?: string): Promise<SymbolHistoryResult>;
}

interface MockStorageShape extends IStorage, HistoryRiskStorageAdapter {
  modulesByPath: Map<string, Module[]>;
  dependenciesByModuleId: Map<string, Dependency[]>;
  dependentsByModuleId: Map<string, Dependency[]>;
  impactByModuleId: Map<string, ImpactResult>;
  symbolsByName: Map<string, CodeSymbol[]>;
  symbolById: Map<string, CodeSymbol>;
  callersBySymbolId: Map<string, CodeSymbol[]>;
  calleesBySymbolId: Map<string, CodeSymbol[]>;
}

function createModule(id: string, path: string): Module {
  return {
    id,
    projectId: 'proj-1',
    path,
    language: 'ts',
    stats: {
      lines: 10,
      codeLines: 8,
      commentLines: 1,
      blankLines: 1,
    },
  };
}

function createSymbol(id: string, moduleId: string, name: string, file: string): CodeSymbol {
  return {
    id,
    moduleId,
    name,
    kind: 'function',
    location: {
      file,
      line: 1,
      column: 1,
    },
    visibility: 'public',
  };
}

function createMockStorage(): MockStorageShape {
  return {
    type: 'sqlite',
    modulesByPath: new Map(),
    dependenciesByModuleId: new Map(),
    dependentsByModuleId: new Map(),
    impactByModuleId: new Map(),
    symbolsByName: new Map(),
    symbolById: new Map(),
    callersBySymbolId: new Map(),
    calleesBySymbolId: new Map(),
    initialize: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    saveCodeGraph: vi.fn(async (_graph: CodeGraph) => undefined),
    loadCodeGraph: vi.fn(async () => ({
      project: {
        id: 'proj-1',
        name: 'fixture',
        rootPath: '/fixture',
        createdAt: new Date('2026-04-15T00:00:00Z'),
        updatedAt: new Date('2026-04-15T00:00:00Z'),
      },
      modules: [],
      symbols: [],
      dependencies: [],
    })),
    deleteProject: vi.fn(async () => undefined),
    updateModule: vi.fn(async (_module: Module) => undefined),
    deleteModule: vi.fn(async (_moduleId: string) => undefined),
    findModuleById: vi.fn(async (_id: string) => null),
    findModulesByPath: vi.fn(async function (this: MockStorageShape, path: string) {
      return this.modulesByPath.get(path) ?? [];
    }),
    findSymbolByName: vi.fn(async function (this: MockStorageShape, name: string) {
      return this.symbolsByName.get(name) ?? [];
    }),
    findSymbolById: vi.fn(async function (this: MockStorageShape, id: string) {
      return this.symbolById.get(id) ?? null;
    }),
    findDependencies: vi.fn(async function (this: MockStorageShape, moduleId: string) {
      return this.dependenciesByModuleId.get(moduleId) ?? [];
    }),
    findDependents: vi.fn(async function (this: MockStorageShape, moduleId: string) {
      return this.dependentsByModuleId.get(moduleId) ?? [];
    }),
    findCallers: vi.fn(async function (this: MockStorageShape, functionId: string) {
      return this.callersBySymbolId.get(functionId) ?? [];
    }),
    findCallees: vi.fn(async function (this: MockStorageShape, functionId: string) {
      return this.calleesBySymbolId.get(functionId) ?? [];
    }),
    search: vi.fn(async (_query: string, _options: SearchOptions): Promise<SearchResult[]> => []),
    detectCycles: vi.fn(async (): Promise<Cycle[]> => []),
    calculateImpact: vi.fn(async function (this: MockStorageShape, moduleId: string) {
      return this.impactByModuleId.get(moduleId) ?? {
        rootModule: moduleId,
        affectedModules: [],
        depth: 0,
      };
    }),
    getStatistics: vi.fn(async (): Promise<ProjectStatistics> => ({
      totalModules: 0,
      totalSymbols: 0,
      totalDependencies: 0,
      totalLines: 0,
      averageComplexity: 0,
    })),
    saveHistoryRiskSnapshot: vi.fn(async (payload: HistoryRiskSnapshotPayload) => ({
      snapshotId: 'snapshot-1',
      recordedAt: payload.recordedAt ?? '2026-04-15T00:00:00.000Z',
      source: payload.source,
    })),
    loadLatestFileHistorySignal: vi.fn(async (_file: string) => null),
    loadLatestSymbolHistoryResult: vi.fn(async (symbolId: string, query = symbolId) => ({
      query,
      candidates: [],
      symbol: null,
      files: [],
      timeline: [],
      risk: {
        level: 'unavailable',
        score: null,
        gravity: null,
        heat: null,
        impact: null,
        riskFactors: ['no materialized history snapshot found for symbol'],
      },
      diagnostics: {
        status: 'unavailable',
        confidence: 'unavailable',
        freshness: 'unknown',
        source: 'unavailable',
        reasons: ['no materialized history snapshot found for symbol'],
        analyzedAt: null,
        scopeMode: 'partial',
        requestedFiles: 0,
        analyzedFiles: 0,
        requiresPrecompute: false,
      },
    })),
  };
}

function createRiskScore(score: number, level: RiskScore['level'] = 'medium'): RiskScore {
  return {
    level,
    score,
    gravity: 0.4,
    heat: {
      freq30d: 3,
      lastType: 'BUGFIX',
      lastDate: '2026-04-14T00:00:00.000Z',
      stability: false,
    },
    impact: 0.2,
    riskFactors: ['risk-from-test'],
  };
}

describe('GitHistoryService', () => {
  it('falls back to materialized cache when git repository is unavailable', async () => {
    const storage = createMockStorage();
    storage.loadLatestFileHistorySignal = vi.fn(async (file: string) => ({
      file,
      risk: {
        level: 'high',
        score: 0.81,
        gravity: 0.7,
        heat: {
          freq30d: 9,
          lastType: 'BUGFIX',
          lastDate: '2026-04-15T00:00:00.000Z',
          stability: false,
        },
        impact: 0.6,
        riskFactors: ['materialized-cache'],
      },
      timeline: [],
      diagnostics: {
        status: 'ok',
        confidence: 'high',
        freshness: 'fresh',
        source: 'git-live',
        reasons: ['persisted from earlier run'],
        analyzedAt: '2026-04-15T00:00:00.000Z',
        scopeMode: 'full',
        requestedFiles: 1,
        analyzedFiles: 1,
        requiresPrecompute: false,
      },
    }));

    const service = new GitHistoryService({
      projectRoot: '/repo',
      storage,
      gitAnalyzer: {
        isGitRepository: vi.fn(async () => false),
        findRelatedCommits: vi.fn(async () => [] as CommitInfo[]),
        calculateRiskScore: vi.fn((_files: string[], _commits: CommitInfo[], _feed: AIFeed[]) => createRiskScore(0.2)),
      },
      workflowGitAnalyzer: {
        analyzeForPhase: vi.fn(async () => ({ type: 'heat-analysis', fileHeat: [], riskScore: undefined })),
      },
      now: () => new Date('2026-04-15T01:00:00.000Z'),
    });

    const result = await service.analyzeFiles(['src/a.ts']);

    expect(result.diagnostics.source).toBe('sqlite-cache');
    expect(result.files[0]?.risk.level).toBe('high');
    expect(storage.saveHistoryRiskSnapshot).not.toHaveBeenCalled();
  });

  it('shrinks large file requests to top files and marks precompute-needed', async () => {
    const storage = createMockStorage();
    const moduleA = createModule('mod-a', 'src/a.ts');
    const moduleB = createModule('mod-b', 'src/b.ts');
    const moduleC = createModule('mod-c', 'src/c.ts');

    storage.modulesByPath.set('src/a.ts', [moduleA]);
    storage.modulesByPath.set('src/b.ts', [moduleB]);
    storage.modulesByPath.set('src/c.ts', [moduleC]);
    storage.dependenciesByModuleId.set('mod-a', [{ id: 'dep-a', sourceId: 'mod-a', targetId: 'mod-b', type: 'import' }]);
    storage.dependenciesByModuleId.set('mod-b', []);
    storage.dependenciesByModuleId.set('mod-c', []);
    storage.dependentsByModuleId.set('mod-a', [
      { id: 'dep-a2', sourceId: 'mod-b', targetId: 'mod-a', type: 'import' },
      { id: 'dep-a3', sourceId: 'mod-c', targetId: 'mod-a', type: 'import' },
    ]);
    storage.dependentsByModuleId.set('mod-b', [
      { id: 'dep-b2', sourceId: 'mod-c', targetId: 'mod-b', type: 'import' },
    ]);
    storage.dependentsByModuleId.set('mod-c', []);
    storage.impactByModuleId.set('mod-a', { rootModule: 'mod-a', affectedModules: [moduleB, moduleC], depth: 2 });
    storage.impactByModuleId.set('mod-b', { rootModule: 'mod-b', affectedModules: [moduleC], depth: 2 });
    storage.impactByModuleId.set('mod-c', { rootModule: 'mod-c', affectedModules: [], depth: 2 });

    const service = new GitHistoryService({
      projectRoot: '/repo',
      storage,
      gitAnalyzer: {
        isGitRepository: vi.fn(async () => true),
        findRelatedCommits: vi.fn(async (_keywords: string[], files: string[]) => files.map((file, index) => ({
          hash: `commit-${index}`,
          message: `[BUGFIX] ${file}: materialize risk`,
          date: new Date(`2026-04-1${index + 1}T00:00:00.000Z`),
          author: 'tester',
          files: [file],
          tag: {
            type: 'BUGFIX',
            scope: file,
            subject: 'materialize risk',
          },
        } satisfies CommitInfo))),
        calculateRiskScore: vi.fn((files: string[]) => createRiskScore(files[0] === 'src/a.ts' ? 0.7 : 0.5, 'medium')),
      },
      workflowGitAnalyzer: {
        analyzeForPhase: vi.fn(async (_phase, files: string[]) => ({
          type: 'heat-analysis',
          fileHeat: files.map((file, index) => ({
            file,
            freq30d: index + 1,
            lastType: 'BUGFIX',
            lastDate: new Date('2026-04-15T00:00:00.000Z'),
            stability: false,
          })),
          riskScore: undefined,
        })),
      },
      maxFilesPerRequest: 2,
      precomputeThreshold: 2,
    });

    const result = await service.analyzeFiles(['src/a.ts', 'src/b.ts', 'src/c.ts']);

    expect(result.files.map((signal) => signal.file)).toEqual(['src/a.ts', 'src/b.ts']);
    expect(result.diagnostics.scopeMode).toBe('top-files-only');
    expect(result.diagnostics.requiresPrecompute).toBe(true);
    expect(result.diagnostics.confidence).toBe('low');
  });

  it('normalizes absolute module paths before selecting high-impact files', async () => {
    const storage = createMockStorage();
    const moduleA = createModule('mod-a', '/repo/src/a.ts');
    const moduleZ = createModule('mod-z', '/repo/src/z.ts');

    storage.modulesByPath.set('src/a.ts', [moduleA]);
    storage.modulesByPath.set('src/z.ts', [moduleZ]);
    storage.dependenciesByModuleId.set('mod-a', []);
    storage.dependenciesByModuleId.set('mod-z', [
      { id: 'dep-z1', sourceId: 'mod-z', targetId: 'mod-a', type: 'import' },
      { id: 'dep-z2', sourceId: 'mod-z', targetId: 'mod-b', type: 'import' },
    ]);
    storage.dependentsByModuleId.set('mod-a', []);
    storage.dependentsByModuleId.set('mod-z', [
      { id: 'dep-z3', sourceId: 'mod-c', targetId: 'mod-z', type: 'import' },
      { id: 'dep-z4', sourceId: 'mod-d', targetId: 'mod-z', type: 'import' },
    ]);
    storage.impactByModuleId.set('mod-a', { rootModule: 'mod-a', affectedModules: [], depth: 2 });
    storage.impactByModuleId.set('mod-z', { rootModule: 'mod-z', affectedModules: [moduleA], depth: 2 });

    const gitAnalyzer = {
      isGitRepository: vi.fn(async () => true),
      findRelatedCommits: vi.fn(async (_keywords: string[], files: string[]) => files.map((file) => ({
        hash: `commit-${file}`,
        message: `[BUGFIX] ${file}: normalize path`,
        date: new Date('2026-04-15T00:00:00.000Z'),
        author: 'tester',
        files: [file],
        tag: {
          type: 'BUGFIX',
          scope: file,
          subject: 'normalize path',
        },
      } satisfies CommitInfo))),
      calculateRiskScore: vi.fn((_files: string[]) => createRiskScore(0.64, 'medium')),
    };

    const service = new GitHistoryService({
      projectRoot: '/repo',
      storage,
      gitAnalyzer,
      workflowGitAnalyzer: {
        analyzeForPhase: vi.fn(async (_phase, files: string[]) => ({
          type: 'heat-analysis',
          fileHeat: files.map((file) => ({
            file,
            freq30d: 2,
            lastType: 'BUGFIX',
            lastDate: new Date('2026-04-15T00:00:00.000Z'),
            stability: false,
          })),
          riskScore: undefined,
        })),
      },
      maxFilesPerRequest: 1,
      precomputeThreshold: 10,
    });

    const result = await service.analyzeFiles(['src/a.ts', 'src/z.ts'], { maxFiles: 1 });

    expect(result.files.map((signal) => signal.file)).toEqual(['src/z.ts']);
    expect(gitAnalyzer.findRelatedCommits).toHaveBeenCalledWith([], ['src/z.ts'], expect.any(Object));
  });

  it('returns ambiguous for duplicated exact-match symbols', async () => {
    const storage = createMockStorage();
    storage.symbolsByName.set('duplicate', [
      createSymbol('sym-1', 'mod-a', 'duplicate', 'src/a.ts'),
      createSymbol('sym-2', 'mod-b', 'duplicate', 'src/b.ts'),
    ]);

    const service = new GitHistoryService({
      projectRoot: '/repo',
      storage,
      gitAnalyzer: {
        isGitRepository: vi.fn(async () => true),
        findRelatedCommits: vi.fn(async () => [] as CommitInfo[]),
        calculateRiskScore: vi.fn((_files: string[], _commits: CommitInfo[], _feed: AIFeed[]) => createRiskScore(0.4)),
      },
      workflowGitAnalyzer: {
        analyzeForPhase: vi.fn(async () => ({ type: 'heat-analysis', fileHeat: [], riskScore: undefined })),
      },
    });

    const result = await service.analyzeSymbol('duplicate');

    expect(result.diagnostics.status).toBe('ambiguous');
    expect(result.candidates).toHaveLength(2);
    expect(result.risk.level).toBe('unavailable');
  });

  it('persists live history snapshots after successful analysis', async () => {
    const storage = createMockStorage();
    const moduleA = createModule('mod-a', 'src/a.ts');
    storage.modulesByPath.set('src/a.ts', [moduleA]);
    storage.symbolById.set('sym-a', createSymbol('sym-a', 'mod-a', 'callA', 'src/a.ts'));
    storage.symbolsByName.set('callA', [createSymbol('sym-a', 'mod-a', 'callA', 'src/a.ts')]);
    storage.impactByModuleId.set('mod-a', { rootModule: 'mod-a', affectedModules: [], depth: 2 });

    const gitAnalyzer = {
      isGitRepository: vi.fn(async () => true),
      findRelatedCommits: vi.fn(async () => [{
        hash: 'commit-1',
        message: '[BUGFIX] src/a.ts: fix callA',
        date: new Date('2026-04-15T00:00:00.000Z'),
        author: 'tester',
        files: ['src/a.ts'],
        tag: {
          type: 'BUGFIX',
          scope: 'src/a.ts',
          subject: 'fix callA',
        },
      }] satisfies CommitInfo[]),
      calculateRiskScore: vi.fn((_files: string[], _commits: CommitInfo[], _feed: AIFeed[]) => createRiskScore(0.66)),
    };

    const service = new GitHistoryService({
      projectRoot: '/repo',
      storage,
      gitAnalyzer,
      workflowGitAnalyzer: {
        analyzeForPhase: vi.fn(async (_phase, files: string[]) => ({
          type: 'heat-analysis',
          fileHeat: files.map((file) => ({
            file,
            freq30d: 2,
            lastType: 'BUGFIX',
            lastDate: new Date('2026-04-15T00:00:00.000Z'),
            stability: false,
          })),
          riskScore: undefined,
        })),
      },
    });

    const fileResult = await service.analyzeFiles(['src/a.ts']);
    const symbolResult = await service.analyzeSymbol('sym-a');

    expect(fileResult.snapshotId).toBe('snapshot-1');
    expect(symbolResult.snapshotId).toBe('snapshot-1');
    expect(storage.saveHistoryRiskSnapshot).toHaveBeenCalledTimes(2);
  });
});
