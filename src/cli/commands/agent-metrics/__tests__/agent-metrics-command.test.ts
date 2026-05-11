import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { commandContracts } from '../../../interface-contract/commands/index.js';
import { createAgentMetricsCommand } from '../index.js';
import { formatAgentMetricsReportHuman } from '../human.js';

const worstRow = {
  id: 'detail-1',
  sampleId: 'query-symbol-history-command',
  queryType: 'query-symbol',
  commandSlug: 'codemap query --symbol createHistoryCommand',
  responseSizeBytes: 120,
  rawCharCount: 100,
  estimatedInputTokens: 8,
  estimatedOutputTokens: 25,
  estimatedTotalTokens: 33,
  executionTimeMs: 5,
  metadata: { estimated: true },
};

function createWarnOnlyGate() {
  return {
    verdict: 'warn' as const,
    warnOnly: true,
    threshold: null,
    violationCount: 0,
    maxRow: worstRow,
    violations: [],
  };
}

function createReportResult(overrides: Partial<{
  rows: typeof worstRow[];
  gate: ReturnType<typeof createWarnOnlyGate>;
}> = {}) {
  const rows = overrides.rows ?? [worstRow];
  return {
    schemaVersion: 'agent-metrics.report.v1' as const,
    generatedAt: '2026-05-10T12:00:01.000Z',
    runId: 'run-1',
    recordedAt: '2026-05-10T12:00:00.000Z',
    projectRoot: '/repo',
    sampleSetVersion: 'built-in.v1',
    estimatorVersion: 'char-v1',
    rows,
    queryTypeSummaries: [{
      queryType: 'query-symbol',
      queryCount: 1,
      historicalSampleCount: 1,
      p50EstimatedTotalTokens: 33,
      p95EstimatedTotalTokens: 33,
      avgEstimatedTotalTokens: 33,
      minEstimatedTotalTokens: 33,
      maxEstimatedTotalTokens: 33,
      avgResponseSizeBytes: 120,
      minResponseSizeBytes: 120,
      maxResponseSizeBytes: 120,
      avgRawCharCount: 100,
      minRawCharCount: 100,
      maxRawCharCount: 100,
      avgExecutionTimeMs: 5,
    }],
    queryTypeTrends: [{
      queryType: 'query-symbol',
      latestEstimatedTotalTokens: 33,
      previousEstimatedTotalTokens: null,
      deltaEstimatedTotalTokens: null,
      deltaPercent: null,
      baselineAvailable: false,
    }],
    highestCostQueryTypes: [{
      queryType: 'query-symbol',
      estimatedTotalTokens: 33,
      riskNote: 'Absolute token cost remains large enough to dilute call-count savings.',
    }],
    highestCostRows: [{
      queryType: 'query-symbol',
      commandSlug: worstRow.commandSlug,
      estimatedTotalTokens: 33,
      riskNote: 'Absolute token cost remains large enough to dilute call-count savings.',
    }],
    totals: {
      queryCount: 1,
      responseSizeBytes: 120,
      rawCharCount: 100,
      estimatedInputTokens: 8,
      estimatedOutputTokens: 25,
      estimatedTotalTokens: 33,
      executionTimeMs: 5,
    },
    gate: overrides.gate ?? createWarnOnlyGate(),
  };
}

function createEmptyReportResult() {
  return {
    schemaVersion: 'agent-metrics.report.v1' as const,
    generatedAt: '2026-05-10T12:00:01.000Z',
    runId: 'run-1',
    recordedAt: '2026-05-10T12:00:00.000Z',
    projectRoot: '/repo',
    sampleSetVersion: 'built-in.v1',
    estimatorVersion: 'char-v1',
    rows: [],
    queryTypeSummaries: [],
    totals: {
      queryCount: 0,
      responseSizeBytes: 0,
      rawCharCount: 0,
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      estimatedTotalTokens: 0,
      executionTimeMs: 0,
    },
    gate: {
      verdict: 'warn' as const,
      warnOnly: true,
      threshold: null,
      violationCount: 0,
      maxRow: null,
      violations: [],
    },
  };
}

describe('agent-metrics command', () => {
  const mockService = {
    executeTokenRun: vi.fn(),
    runReportFlow: vi.fn(),
    requireLatestReport: vi.fn(),
  };
  let command = createAgentMetricsCommand(mockService);
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;
  let originalExitCode: number | undefined;

  beforeEach(() => {
    command = createAgentMetricsCommand(mockService);
    mockService.executeTokenRun.mockReset();
    mockService.runReportFlow.mockReset();
    mockService.requireLatestReport.mockReset();
    stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    stdoutWriteSpy.mockRestore();
    process.exitCode = originalExitCode;
  });

  it('routes token subcommand to the token-run service path', async () => {
    mockService.executeTokenRun.mockResolvedValue({
      schemaVersion: 'agent-metrics.token.v1',
      runId: 'run-1',
      recordedAt: '2026-05-10T12:00:00.000Z',
      projectRoot: '/repo',
      sampleSetVersion: 'built-in.v1',
      estimatorVersion: 'char-v1',
      items: [],
      totals: {
        queryCount: 0,
        responseSizeBytes: 0,
        rawCharCount: 0,
        estimatedInputTokens: 0,
        estimatedOutputTokens: 0,
        estimatedTotalTokens: 0,
        executionTimeMs: 0,
      },
    });

    await command.parseAsync(['node', 'agent-metrics', 'token', '--json']);

    expect(mockService.executeTokenRun).toHaveBeenCalledWith('/data/codemap');
    expect(mockService.runReportFlow).not.toHaveBeenCalled();
  });

  it('routes report subcommand to the report service path', async () => {
    mockService.requireLatestReport.mockResolvedValue(createEmptyReportResult());

    await command.parseAsync(['node', 'agent-metrics', 'report', '--json']);

    expect(mockService.requireLatestReport).toHaveBeenCalledWith('/data/codemap');
    expect(mockService.executeTokenRun).not.toHaveBeenCalled();
  });

  it('routes bare agent-metrics to the same report flow', async () => {
    mockService.runReportFlow.mockResolvedValue(createEmptyReportResult());

    await command.parseAsync(['node', 'agent-metrics', '--json']);

    expect(mockService.runReportFlow).toHaveBeenCalledWith('/data/codemap');
  });

  it('emits JSON output with schemaVersion and explicit estimated-token field names', async () => {
    mockService.runReportFlow.mockResolvedValue(createReportResult());

    await command.parseAsync(['node', 'agent-metrics', '--json']);

    const output = stdoutWriteSpy.mock.calls
      .map((call) => String(call[0]))
      .find((line) => line.includes('agent-metrics.report.v1'));
    const parsed = JSON.parse(String(output).trim()) as Record<string, unknown>;
    expect(parsed.schemaVersion).toBe('agent-metrics.report.v1');
    expect(parsed.rows).toEqual([
      expect.objectContaining({
        responseSizeBytes: 120,
        rawCharCount: 100,
        estimatedInputTokens: 8,
        estimatedOutputTokens: 25,
        estimatedTotalTokens: 33,
      }),
    ]);
    expect(parsed.queryTypeSummaries).toEqual([
      expect.objectContaining({
        queryType: 'query-symbol',
        historicalSampleCount: 1,
        p50EstimatedTotalTokens: 33,
        p95EstimatedTotalTokens: 33,
        avgEstimatedTotalTokens: 33,
      }),
    ]);
    expect(parsed.queryTypeTrends).toEqual([
      expect.objectContaining({
        queryType: 'query-symbol',
        latestEstimatedTotalTokens: 33,
        previousEstimatedTotalTokens: null,
        baselineAvailable: false,
      }),
    ]);
    expect(parsed.highestCostQueryTypes).toEqual([
      expect.objectContaining({
        queryType: 'query-symbol',
        estimatedTotalTokens: 33,
        riskNote: expect.any(String),
      }),
    ]);
    expect(parsed.highestCostRows).toEqual([
      expect.objectContaining({
        queryType: 'query-symbol',
        commandSlug: 'codemap query --symbol createHistoryCommand',
        estimatedTotalTokens: 33,
        riskNote: expect.any(String),
      }),
    ]);
    expect(parsed.gate).toEqual(expect.objectContaining({
      verdict: 'warn',
      warnOnly: true,
      threshold: null,
      violationCount: 0,
    }));
  });

  it('fails explicitly for report subcommand when no persisted run exists', async () => {
    mockService.requireLatestReport.mockRejectedValue({
      code: 'AGENT_METRICS_REPORT_MISSING',
      message: 'No persisted agent-metrics run exists yet.',
      remediation: 'Run codemap agent-metrics or codemap agent-metrics token first, then retry codemap agent-metrics report.',
    });

    await command.parseAsync(['node', 'agent-metrics', 'report', '--json']);

    expect(mockService.requireLatestReport).toHaveBeenCalledWith('/data/codemap');
    expect(mockService.runReportFlow).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('renders the warn-only gate block and additive advisory sections in human output', () => {
    const output = formatAgentMetricsReportHuman(createReportResult());
    expect(output).toContain('Gate:');
    expect(output).toContain('verdict=warn warn_only=true threshold=none');
    expect(output).toContain('No default calibrated threshold yet; showing the worst observed row only.');
    expect(output).toContain(
      'Worst row: query-symbol | codemap query --symbol createHistoryCommand | est_total=33',
    );
    expect(output).toContain('Trend vs previous run:');
    expect(output).toContain('Baseline unavailable for comparison.');
    expect(output).toContain('Highest cost query types:');
    expect(output).toContain('Highest cost samples:');
  });

  it('keeps bare report runs non-blocking without an explicit threshold', async () => {
    mockService.runReportFlow.mockResolvedValue(createReportResult());

    await command.parseAsync(['node', 'agent-metrics', '--json']);

    expect(process.exitCode).toBeUndefined();
  });

  it('applies an explicit threshold on the bare root report path and exits non-zero on fail', async () => {
    mockService.runReportFlow.mockResolvedValue(createReportResult());

    await command.parseAsync(['node', 'agent-metrics', '--json', '--max-tokens-per-query', '32']);

    const output = stdoutWriteSpy.mock.calls
      .map((call) => String(call[0]))
      .find((line) => line.includes('agent-metrics.report.v1'));
    const parsed = JSON.parse(String(output).trim()) as Record<string, unknown>;

    expect(mockService.runReportFlow).toHaveBeenCalledWith('/data/codemap');
    expect(parsed.gate).toEqual(expect.objectContaining({
      verdict: 'fail',
      warnOnly: false,
      threshold: 32,
      violationCount: 1,
    }));
    expect(process.exitCode).toBe(1);
  });

  it('applies an explicit threshold on the report subcommand and treats equality as pass', async () => {
    mockService.requireLatestReport.mockResolvedValue(createReportResult());

    await command.parseAsync(['node', 'agent-metrics', 'report', '--json', '--max-tokens-per-query', '33']);

    const output = stdoutWriteSpy.mock.calls
      .map((call) => String(call[0]))
      .find((line) => line.includes('agent-metrics.report.v1'));
    const parsed = JSON.parse(String(output).trim()) as Record<string, unknown>;

    expect(mockService.requireLatestReport).toHaveBeenCalledWith('/data/codemap');
    expect(parsed.gate).toEqual(expect.objectContaining({
      verdict: 'pass',
      warnOnly: false,
      threshold: 33,
      violationCount: 0,
    }));
    expect(process.exitCode).toBeUndefined();
  });

  it('preserves the missing-report remediation path even when a threshold is requested', async () => {
    mockService.requireLatestReport.mockRejectedValue({
      code: 'AGENT_METRICS_REPORT_MISSING',
      message: 'No persisted agent-metrics run exists yet.',
      remediation: 'Run codemap agent-metrics or codemap agent-metrics token first, then retry codemap agent-metrics report.',
    });

    await command.parseAsync(['node', 'agent-metrics', 'report', '--json', '--max-tokens-per-query', '20']);

    expect(mockService.requireLatestReport).toHaveBeenCalledWith('/data/codemap');
    expect(mockService.runReportFlow).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('rejects invalid threshold input clearly at the CLI edge', async () => {
    mockService.runReportFlow.mockResolvedValue(createReportResult());

    await command.parseAsync(['node', 'agent-metrics', '--json', '--max-tokens-per-query', '-1']);

    const output = stdoutWriteSpy.mock.calls
      .map((call) => String(call[0]))
      .find((line) => line.includes('"type":"error"'));
    const parsed = JSON.parse(String(output).trim()) as Record<string, unknown>;

    expect(mockService.runReportFlow).not.toHaveBeenCalled();
    expect(parsed).toEqual(expect.objectContaining({
      type: 'error',
      code: 'AGENT_METRICS_INVALID_THRESHOLD',
    }));
    expect(process.exitCode).toBe(1);
  });

  it('registers the agent-metrics contract in the command catalog', () => {
    const contract = commandContracts.find((entry) => entry.name === 'agent-metrics');
    expect(contract).toBeDefined();
    expect(contract?.outputShape.properties).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'schemaVersion' }),
    ]));
    expect(contract?.outputShape.properties.find((property) => property.name === 'rows')?.items?.properties)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'estimatedTotalTokens' }),
      ]));
    expect(contract?.outputShape.properties).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'queryTypeSummaries' }),
      expect.objectContaining({ name: 'queryTypeTrends' }),
      expect.objectContaining({ name: 'highestCostQueryTypes' }),
      expect.objectContaining({ name: 'highestCostRows' }),
    ]));
    expect(contract?.outputShape.properties).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'gate' }),
    ]));
  });
});
