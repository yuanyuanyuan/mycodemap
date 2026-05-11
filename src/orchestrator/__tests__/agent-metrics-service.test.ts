import { describe, expect, it, vi } from 'vitest';
import { AgentMetricsService } from '../agent-metrics-service.js';
import type { AgentMetricsRunPayload } from '../../interface/types/storage.js';

function createStorageState() {
  type StoredRun = {
    id: string;
    projectId: string;
    recordedAt: string;
    sampleSetVersion: string;
    estimatorVersion: string;
    detailCount: number;
    metadata?: Record<string, unknown> | null;
  };

  let latestRun: StoredRun | null = null;
  const runs: StoredRun[] = [];
  const rowsByRun = new Map<string, AgentMetricsRunPayload['items']>();

  function compareRunsByRecency(left: StoredRun, right: StoredRun): number {
    const recordedAtComparison = right.recordedAt.localeCompare(left.recordedAt);
    if (recordedAtComparison !== 0) {
      return recordedAtComparison;
    }

    return right.id.localeCompare(left.id);
  }

  return {
    storage: {
      close: vi.fn(async () => undefined),
      saveAgentMetricsRun: vi.fn(async (payload: AgentMetricsRunPayload) => {
        const run = {
          id: payload.id ?? 'run-generated',
          projectId: 'proj-1',
          recordedAt: payload.recordedAt ?? '2026-05-10T12:00:00.000Z',
          sampleSetVersion: payload.sampleSetVersion,
          estimatorVersion: payload.estimatorVersion,
          detailCount: payload.items.length,
          metadata: payload.metadata ?? null,
        };
        latestRun = run;
        runs.push(run);
        rowsByRun.set(run.id, payload.items);
        return run;
      }),
      loadLatestAgentMetricsRun: vi.fn(async () => latestRun),
      listRecentAgentMetricsRuns: vi.fn(async (limit: number) => {
        const normalizedLimit = Math.max(0, Math.floor(limit));
        return [...runs].sort(compareRunsByRecency).slice(0, normalizedLimit);
      }),
      listAgentMetricsByRun: vi.fn(async (runId: string) => {
        return (rowsByRun.get(runId) ?? []).map((item, index) => ({
          id: item.id ?? `${runId}:${index + 1}`,
          runId,
          queryType: item.queryType,
          commandSlug: item.commandSlug,
          responseSizeBytes: item.responseSizeBytes,
          rawCharCount: item.rawCharCount,
          estimatedInputTokens: item.estimatedInputTokens,
          estimatedOutputTokens: item.estimatedOutputTokens,
          estimatedTotalTokens: item.estimatedTotalTokens,
          executionTimeMs: item.executionTimeMs,
          metadata: item.metadata ?? null,
        }));
      }),
      listAgentMetricsHistoryByQueryType: vi.fn(async (queryType: string) => {
        return [...runs]
          .sort(compareRunsByRecency)
          .flatMap((run) => (rowsByRun.get(run.id) ?? [])
            .map((item, index) => ({
              id: item.id ?? `${run.id}:${index + 1}`,
              runId: run.id,
              queryType: item.queryType,
              commandSlug: item.commandSlug,
              responseSizeBytes: item.responseSizeBytes,
              rawCharCount: item.rawCharCount,
              estimatedInputTokens: item.estimatedInputTokens,
              estimatedOutputTokens: item.estimatedOutputTokens,
              estimatedTotalTokens: item.estimatedTotalTokens,
              executionTimeMs: item.executionTimeMs,
              metadata: item.metadata ?? null,
            }))
            .filter((row) => row.queryType === queryType));
      }),
    },
  };
}

describe('AgentMetricsService', () => {
  it('executes fixed built-in samples, persists the run, and returns explicit estimated fields', async () => {
    const state = createStorageState();
    const executeQuery = vi.fn(async (options: Record<string, unknown>) => ({
      status: 'ok' as const,
      result: {
        type: options.symbol ? 'symbol' : 'search',
        query: options.symbol ?? options.search,
        count: 1,
      },
    }));
    const executeDeps = vi.fn(async () => ({
      status: 'ok' as const,
      result: {
        modules: [{ path: '/repo/src/cli/commands/history.ts', relativePath: 'src/cli/commands/history.ts', dependencies: ['src/cli/output/index.ts'], dependents: [] }],
      },
    }));
    const executeImpact = vi.fn(async () => ([{
      status: 'ok',
      confidence: 'high',
      entrypoint: { kind: 'file', filePath: 'src/cli/commands/history.ts' },
      summary: { directCount: 1, transitiveCount: 0, maxDepth: 1, truncated: false },
      direct: [],
      transitiveLayers: [],
      warnings: [],
    }]));

    const service = new AgentMetricsService({
      createStorage: vi.fn(async () => state),
      executeQuery,
      executeDeps,
      executeImpact,
      now: () => new Date('2026-05-10T12:00:00.000Z'),
      randomId: () => 'seeded',
    });

    const result = await service.executeTokenRun('/repo');

    expect(result).toEqual(expect.objectContaining({
      schemaVersion: 'agent-metrics.token.v1',
      runId: 'run-generated',
      sampleSetVersion: 'built-in.v1',
      estimatorVersion: 'char-v1',
      items: expect.arrayContaining([
        expect.objectContaining({
          queryType: 'query-symbol',
          commandSlug: 'codemap query --symbol createHistoryCommand',
          responseSizeBytes: expect.any(Number),
          rawCharCount: expect.any(Number),
          estimatedInputTokens: expect.any(Number),
          estimatedOutputTokens: expect.any(Number),
          estimatedTotalTokens: expect.any(Number),
        }),
      ]),
      totals: expect.objectContaining({
        queryCount: 4,
      }),
    }));
    expect(state.storage.saveAgentMetricsRun).toHaveBeenCalledTimes(1);
    expect(executeQuery).toHaveBeenCalledTimes(2);
    expect(executeDeps).toHaveBeenCalledTimes(1);
    expect(executeImpact).toHaveBeenCalledTimes(1);
  });

  it('builds additive trend, percentile, and ranked advisory truth from persisted runs', async () => {
    const state = createStorageState();
    await state.storage.saveAgentMetricsRun({
      id: 'run-1',
      recordedAt: '2026-05-10T12:00:00.000Z',
      sampleSetVersion: 'built-in.v1',
      estimatorVersion: 'char-v1',
      metadata: { estimated: true },
      items: [
        {
          id: 'prev-search',
          queryType: 'query-search',
          commandSlug: 'codemap query --search env-contract',
          responseSizeBytes: 160,
          rawCharCount: 120,
          estimatedInputTokens: 9,
          estimatedOutputTokens: 61,
          estimatedTotalTokens: 70,
          executionTimeMs: 5,
          metadata: { sampleId: 'prev-search' },
        },
        {
          queryType: 'query-symbol',
          id: 'prev-symbol-small',
          commandSlug: 'codemap query --symbol createHistoryCommand',
          responseSizeBytes: 80,
          rawCharCount: 60,
          estimatedInputTokens: 7,
          estimatedOutputTokens: 13,
          estimatedTotalTokens: 20,
          executionTimeMs: 3,
          metadata: { sampleId: 'prev-symbol-small' },
        },
        {
          id: 'prev-symbol-large',
          queryType: 'query-symbol',
          commandSlug: 'codemap query --symbol createAgentMetricsContract',
          responseSizeBytes: 360,
          rawCharCount: 320,
          estimatedInputTokens: 12,
          estimatedOutputTokens: 188,
          estimatedTotalTokens: 200,
          executionTimeMs: 8,
          metadata: { sampleId: 'prev-symbol-large' },
        },
      ],
    });
    await state.storage.saveAgentMetricsRun({
      id: 'run-2',
      recordedAt: '2026-05-10T12:05:00.000Z',
      sampleSetVersion: 'built-in.v1',
      estimatorVersion: 'char-v1',
      metadata: { estimated: true },
      items: [
        {
          id: 'latest-search',
          queryType: 'query-search',
          commandSlug: 'codemap query --search env-contract',
          responseSizeBytes: 220,
          rawCharCount: 190,
          estimatedInputTokens: 10,
          estimatedOutputTokens: 90,
          estimatedTotalTokens: 100,
          executionTimeMs: 6,
          metadata: { sampleId: 'latest-search' },
        },
        {
          id: 'latest-impact',
          queryType: 'impact-file',
          commandSlug: 'codemap impact --file src/cli/commands/history.ts --transitive',
          responseSizeBytes: 140,
          rawCharCount: 100,
          estimatedInputTokens: 10,
          estimatedOutputTokens: 50,
          estimatedTotalTokens: 60,
          executionTimeMs: 4,
          metadata: { sampleId: 'latest-impact' },
        },
        {
          id: 'latest-symbol',
          queryType: 'query-symbol',
          commandSlug: 'codemap query --symbol createAgentMetricsCommand',
          responseSizeBytes: 120,
          rawCharCount: 90,
          estimatedInputTokens: 9,
          estimatedOutputTokens: 51,
          estimatedTotalTokens: 60,
          executionTimeMs: 7,
          metadata: { sampleId: 'latest-symbol' },
        },
      ],
    });

    const service = new AgentMetricsService({
      createStorage: vi.fn(async () => state),
      now: () => new Date('2026-05-10T12:10:00.000Z'),
    });

    const report = await service.buildLatestReport('/repo');

    expect(report).toEqual(expect.objectContaining({
      schemaVersion: 'agent-metrics.report.v1',
      runId: 'run-2',
      gate: expect.objectContaining({
        verdict: 'warn',
        warnOnly: true,
        threshold: null,
        violationCount: 0,
        maxRow: expect.objectContaining({
          queryType: 'query-search',
          estimatedTotalTokens: 100,
        }),
        violations: [],
      }),
      rows: expect.arrayContaining([
        expect.objectContaining({
          queryType: 'query-search',
          estimatedTotalTokens: 100,
        }),
      ]),
      queryTypeSummaries: expect.arrayContaining([
        expect.objectContaining({
          queryType: 'impact-file',
          queryCount: 1,
          historicalSampleCount: 1,
          p50EstimatedTotalTokens: 60,
          p95EstimatedTotalTokens: 60,
          avgEstimatedTotalTokens: 60,
          minEstimatedTotalTokens: 60,
          maxEstimatedTotalTokens: 60,
        }),
        expect.objectContaining({
          queryType: 'query-search',
          queryCount: 1,
          historicalSampleCount: 2,
          p50EstimatedTotalTokens: 70,
          p95EstimatedTotalTokens: 100,
          avgEstimatedTotalTokens: 100,
          minEstimatedTotalTokens: 100,
          maxEstimatedTotalTokens: 100,
        }),
        expect.objectContaining({
          queryType: 'query-symbol',
          queryCount: 1,
          historicalSampleCount: 3,
          p50EstimatedTotalTokens: 60,
          p95EstimatedTotalTokens: 200,
          avgEstimatedTotalTokens: 60,
          minEstimatedTotalTokens: 60,
          maxEstimatedTotalTokens: 60,
        }),
      ]),
      queryTypeTrends: [
        {
          queryType: 'query-search',
          latestEstimatedTotalTokens: 100,
          previousEstimatedTotalTokens: 70,
          deltaEstimatedTotalTokens: 30,
          deltaPercent: 43,
          baselineAvailable: true,
        },
        {
          queryType: 'impact-file',
          latestEstimatedTotalTokens: 60,
          previousEstimatedTotalTokens: null,
          deltaEstimatedTotalTokens: null,
          deltaPercent: null,
          baselineAvailable: false,
        },
        {
          queryType: 'query-symbol',
          latestEstimatedTotalTokens: 60,
          previousEstimatedTotalTokens: 220,
          deltaEstimatedTotalTokens: -160,
          deltaPercent: -73,
          baselineAvailable: true,
        },
      ],
      highestCostQueryTypes: [
        {
          queryType: 'query-search',
          estimatedTotalTokens: 100,
          riskNote: 'Absolute token cost is rising versus the previous run.',
        },
        {
          queryType: 'impact-file',
          estimatedTotalTokens: 60,
          riskNote: 'Absolute token cost remains large enough to dilute call-count savings.',
        },
        {
          queryType: 'query-symbol',
          estimatedTotalTokens: 60,
          riskNote: 'Outlier-heavy distribution suggests occasional expensive responses.',
        },
      ],
      highestCostRows: [
        {
          queryType: 'query-search',
          commandSlug: 'codemap query --search env-contract',
          estimatedTotalTokens: 100,
          riskNote: 'Absolute token cost is rising versus the previous run.',
        },
        {
          queryType: 'impact-file',
          commandSlug: 'codemap impact --file src/cli/commands/history.ts --transitive',
          estimatedTotalTokens: 60,
          riskNote: 'Absolute token cost remains large enough to dilute call-count savings.',
        },
        {
          queryType: 'query-symbol',
          commandSlug: 'codemap query --symbol createAgentMetricsCommand',
          estimatedTotalTokens: 60,
          riskNote: 'Outlier-heavy distribution suggests occasional expensive responses.',
        },
      ],
      totals: expect.objectContaining({
        queryCount: 3,
        estimatedTotalTokens: 220,
      }),
    }));
  });

  it('reports missing baseline honestly and keeps single-sample percentiles collapsed', async () => {
    const state = createStorageState();
    await state.storage.saveAgentMetricsRun({
      id: 'run-1',
      recordedAt: '2026-05-10T12:00:00.000Z',
      sampleSetVersion: 'built-in.v1',
      estimatorVersion: 'char-v1',
      metadata: { estimated: true },
      items: [
        {
          id: 'single-search',
          queryType: 'query-search',
          commandSlug: 'codemap query --search env-contract',
          responseSizeBytes: 96,
          rawCharCount: 80,
          estimatedInputTokens: 8,
          estimatedOutputTokens: 36,
          estimatedTotalTokens: 44,
          executionTimeMs: 5,
          metadata: { sampleId: 'single-search' },
        },
      ],
    });

    const service = new AgentMetricsService({
      createStorage: vi.fn(async () => state),
      now: () => new Date('2026-05-10T12:10:00.000Z'),
    });

    const report = await service.buildLatestReport('/repo');

    expect(report?.queryTypeSummaries).toEqual([
      expect.objectContaining({
        queryType: 'query-search',
        historicalSampleCount: 1,
        p50EstimatedTotalTokens: 44,
        p95EstimatedTotalTokens: 44,
        maxEstimatedTotalTokens: 44,
      }),
    ]);
    expect(report?.queryTypeTrends).toEqual([
      {
        queryType: 'query-search',
        latestEstimatedTotalTokens: 44,
        previousEstimatedTotalTokens: null,
        deltaEstimatedTotalTokens: null,
        deltaPercent: null,
        baselineAvailable: false,
      },
    ]);
  });

  it('returns warn-only gate truth when no explicit threshold is supplied', async () => {
    const state = createStorageState();
    await state.storage.saveAgentMetricsRun({
      id: 'run-1',
      recordedAt: '2026-05-10T12:00:00.000Z',
      sampleSetVersion: 'built-in.v1',
      estimatorVersion: 'char-v1',
      metadata: { estimated: true },
      items: [
        {
          id: 'detail-1',
          queryType: 'query-symbol',
          commandSlug: 'codemap query --symbol createHistoryCommand',
          responseSizeBytes: 120,
          rawCharCount: 100,
          estimatedInputTokens: 8,
          estimatedOutputTokens: 25,
          estimatedTotalTokens: 33,
          executionTimeMs: 5,
          metadata: { sampleId: 'query-symbol-history-command' },
        },
        {
          id: 'detail-2',
          queryType: 'deps-module',
          commandSlug: 'codemap deps --module src/cli/commands/history.ts',
          responseSizeBytes: 200,
          rawCharCount: 160,
          estimatedInputTokens: 13,
          estimatedOutputTokens: 40,
          estimatedTotalTokens: 53,
          executionTimeMs: 8,
          metadata: { sampleId: 'deps-history-module' },
        },
      ],
    });

    const service = new AgentMetricsService({
      createStorage: vi.fn(async () => state),
      now: () => new Date('2026-05-10T12:10:00.000Z'),
    });

    const report = await service.buildLatestReport('/repo');

    expect(report?.gate).toEqual({
      verdict: 'warn',
      warnOnly: true,
      threshold: null,
      violationCount: 0,
      maxRow: expect.objectContaining({
        queryType: 'deps-module',
        estimatedTotalTokens: 53,
      }),
      violations: [],
    });
  });

  it('allows rows that are exactly equal to the explicit threshold', async () => {
    const state = createStorageState();
    await state.storage.saveAgentMetricsRun({
      id: 'run-1',
      recordedAt: '2026-05-10T12:00:00.000Z',
      sampleSetVersion: 'built-in.v1',
      estimatorVersion: 'char-v1',
      metadata: { estimated: true },
      items: [
        {
          id: 'detail-1',
          queryType: 'impact-file',
          commandSlug: 'codemap impact --file src/cli/commands/history.ts --transitive',
          responseSizeBytes: 250,
          rawCharCount: 200,
          estimatedInputTokens: 12,
          estimatedOutputTokens: 41,
          estimatedTotalTokens: 53,
          executionTimeMs: 9,
          metadata: { sampleId: 'impact-history-file' },
        },
      ],
    });

    const service = new AgentMetricsService({
      createStorage: vi.fn(async () => state),
      now: () => new Date('2026-05-10T12:10:00.000Z'),
    });

    const report = await service.buildLatestReport('/repo');
    const gated = AgentMetricsService.withGate(report!, 53);

    expect(gated.gate).toEqual({
      verdict: 'pass',
      warnOnly: false,
      threshold: 53,
      violationCount: 0,
      maxRow: expect.objectContaining({
        estimatedTotalTokens: 53,
      }),
      violations: [],
    });
  });

  it('fails when any single row exceeds the explicit threshold even if grouped averages would pass', async () => {
    const state = createStorageState();
    await state.storage.saveAgentMetricsRun({
      id: 'run-1',
      recordedAt: '2026-05-10T12:00:00.000Z',
      sampleSetVersion: 'built-in.v1',
      estimatorVersion: 'char-v1',
      metadata: { estimated: true },
      items: [
        {
          id: 'detail-1',
          queryType: 'query-symbol',
          commandSlug: 'codemap query --symbol createHistoryCommand',
          responseSizeBytes: 120,
          rawCharCount: 100,
          estimatedInputTokens: 8,
          estimatedOutputTokens: 25,
          estimatedTotalTokens: 33,
          executionTimeMs: 5,
          metadata: { sampleId: 'query-symbol-history-command' },
        },
        {
          id: 'detail-2',
          queryType: 'query-symbol',
          commandSlug: 'codemap query --symbol createAgentMetricsCommand',
          responseSizeBytes: 80,
          rawCharCount: 60,
          estimatedInputTokens: 7,
          estimatedOutputTokens: 15,
          estimatedTotalTokens: 22,
          executionTimeMs: 3,
          metadata: { sampleId: 'query-symbol-agent-metrics-command' },
        },
        {
          id: 'detail-3',
          queryType: 'query-symbol',
          commandSlug: 'codemap query --symbol createAgentMetricsContract',
          responseSizeBytes: 200,
          rawCharCount: 160,
          estimatedInputTokens: 13,
          estimatedOutputTokens: 40,
          estimatedTotalTokens: 53,
          executionTimeMs: 8,
          metadata: { sampleId: 'query-symbol-contract' },
        },
      ],
    });

    const service = new AgentMetricsService({
      createStorage: vi.fn(async () => state),
      now: () => new Date('2026-05-10T12:10:00.000Z'),
    });

    const report = await service.buildLatestReport('/repo');
    const gated = AgentMetricsService.withGate(report!, 40);

    expect(report?.queryTypeSummaries).toEqual([
      expect.objectContaining({
        queryType: 'query-symbol',
        avgEstimatedTotalTokens: 36,
      }),
    ]);
    expect(gated.gate).toEqual({
      verdict: 'fail',
      warnOnly: false,
      threshold: 40,
      violationCount: 1,
      maxRow: expect.objectContaining({
        estimatedTotalTokens: 53,
      }),
      violations: [
        expect.objectContaining({
          commandSlug: 'codemap query --symbol createAgentMetricsContract',
          estimatedTotalTokens: 53,
        }),
      ],
    });
  });

  it('returns null for latest report when no persisted run exists', async () => {
    const state = createStorageState();
    const service = new AgentMetricsService({
      createStorage: vi.fn(async () => state),
    });

    await expect(service.buildLatestReport('/repo')).resolves.toBeNull();
  });

  it('runs a token measurement first when report flow has no persisted runs yet', async () => {
    const state = createStorageState();
    const service = new AgentMetricsService({
      createStorage: vi.fn(async () => state),
      executeQuery: vi.fn(async () => ({
        status: 'ok' as const,
        result: { count: 1 },
      })),
      executeDeps: vi.fn(async () => ({
        status: 'ok' as const,
        result: { modules: [] },
      })),
      executeImpact: vi.fn(async () => ([{ status: 'ok', summary: { directCount: 0, transitiveCount: 0, maxDepth: 0, truncated: false }, direct: [], transitiveLayers: [], warnings: [], entrypoint: { kind: 'file', filePath: 'src/cli/commands/history.ts' } }])),
      now: () => new Date('2026-05-10T12:00:00.000Z'),
      randomId: () => 'seeded',
    });

    const report = await service.runReportFlow('/repo');

    expect(report).toEqual(expect.objectContaining({
      schemaVersion: 'agent-metrics.report.v1',
      runId: 'run-generated',
      gate: expect.objectContaining({
        verdict: 'warn',
        warnOnly: true,
        threshold: null,
      }),
      totals: expect.objectContaining({ queryCount: 4 }),
    }));
  });

  it('fails loudly when explicit latest-report lookup has no persisted run', async () => {
    const state = createStorageState();
    const service = new AgentMetricsService({
      createStorage: vi.fn(async () => state),
    });

    await expect(service.requireLatestReport('/repo')).rejects.toMatchObject({
      code: 'AGENT_METRICS_REPORT_MISSING',
    });
  });

  it('fails loudly when a built-in sample execution errors instead of returning fake zero rows', async () => {
    const state = createStorageState();
    const service = new AgentMetricsService({
      createStorage: vi.fn(async () => state),
      executeQuery: vi.fn(async () => ({
        status: 'error' as const,
        error: { code: 'INDEX_NOT_FOUND', message: 'missing graph' },
      })),
      executeDeps: vi.fn(async () => ({
        status: 'ok' as const,
        result: { modules: [] },
      })),
      executeImpact: vi.fn(async () => ([])),
      now: () => new Date('2026-05-10T12:00:00.000Z'),
    });

    await expect(service.executeTokenRun('/repo')).rejects.toMatchObject({
      code: 'AGENT_METRICS_SAMPLE_FAILED',
    });
  });
});
