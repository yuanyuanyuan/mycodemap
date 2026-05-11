// [META] since:2026-05-10 | owner:orchestrator-team | stable:false
// [WHY] Canonical service for agent-metrics so CLI stays a thin wrapper over fixed-sample measurement and persistence

import { performance } from 'node:perf_hooks';
import type {
  AgentMetricsDetailPayload,
  AgentMetricsDetailRecord,
  IStorage,
} from '../interface/types/storage.js';
import { createConfiguredStorage } from '../cli/storage-runtime.js';
import { executeQueryTool, type QueryOptions } from '../execution/contract-tools/query.js';
import { executeDepsTool, type DepsOptions } from '../execution/contract-tools/deps.js';
import { ImpactCommand, type ImpactArgs } from '../cli/commands/impact.js';

const AGENT_METRICS_TOKEN_SCHEMA_VERSION = 'agent-metrics.token.v1';
const AGENT_METRICS_REPORT_SCHEMA_VERSION = 'agent-metrics.report.v1';
const AGENT_METRICS_SAMPLE_SET_VERSION = 'built-in.v1';
const AGENT_METRICS_ESTIMATOR_VERSION = 'char-v1';

export interface AgentMetricsMeasuredItem {
  id: string;
  sampleId: string;
  queryType: string;
  commandSlug: string;
  responseSizeBytes: number;
  rawCharCount: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedTotalTokens: number;
  executionTimeMs: number;
  metadata?: Record<string, unknown> | null;
}

export interface AgentMetricsTotals {
  queryCount: number;
  responseSizeBytes: number;
  rawCharCount: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedTotalTokens: number;
  executionTimeMs: number;
}

export interface AgentMetricsTokenRunResult {
  schemaVersion: typeof AGENT_METRICS_TOKEN_SCHEMA_VERSION;
  runId: string;
  recordedAt: string;
  projectRoot: string;
  sampleSetVersion: string;
  estimatorVersion: string;
  items: AgentMetricsMeasuredItem[];
  totals: AgentMetricsTotals;
}

export interface AgentMetricsReportResult {
  schemaVersion: typeof AGENT_METRICS_REPORT_SCHEMA_VERSION;
  generatedAt: string;
  runId: string;
  recordedAt: string;
  projectRoot: string;
  sampleSetVersion: string;
  estimatorVersion: string;
  rows: AgentMetricsMeasuredItem[];
  queryTypeSummaries: AgentMetricsQueryTypeSummary[];
  queryTypeTrends: AgentMetricsQueryTypeTrend[];
  highestCostQueryTypes: AgentMetricsHighestCostQueryType[];
  highestCostRows: AgentMetricsHighestCostRow[];
  totals: AgentMetricsTotals;
  gate: AgentMetricsGateResult;
}

type AgentMetricsReportPayload = Omit<AgentMetricsReportResult, 'gate'>;

export type AgentMetricsGateVerdict = 'pass' | 'warn' | 'fail';

export interface AgentMetricsGateResult {
  verdict: AgentMetricsGateVerdict;
  warnOnly: boolean;
  threshold: number | null;
  maxRow: AgentMetricsMeasuredItem | null;
  violationCount: number;
  violations: AgentMetricsMeasuredItem[];
}

export interface AgentMetricsQueryTypeSummary {
  queryType: string;
  queryCount: number;
  historicalSampleCount: number;
  p50EstimatedTotalTokens: number;
  p95EstimatedTotalTokens: number;
  avgResponseSizeBytes: number;
  minResponseSizeBytes: number;
  maxResponseSizeBytes: number;
  avgRawCharCount: number;
  minRawCharCount: number;
  maxRawCharCount: number;
  avgEstimatedTotalTokens: number;
  minEstimatedTotalTokens: number;
  maxEstimatedTotalTokens: number;
  avgExecutionTimeMs: number;
}

export interface AgentMetricsQueryTypeTrend {
  queryType: string;
  latestEstimatedTotalTokens: number;
  previousEstimatedTotalTokens: number | null;
  deltaEstimatedTotalTokens: number | null;
  deltaPercent: number | null;
  baselineAvailable: boolean;
}

export interface AgentMetricsHighestCostQueryType {
  queryType: string;
  estimatedTotalTokens: number;
  riskNote: string;
}

export interface AgentMetricsHighestCostRow {
  queryType: string;
  commandSlug: string;
  estimatedTotalTokens: number;
  riskNote: string;
}

interface AgentMetricsStorage extends IStorage {
  saveAgentMetricsRun: NonNullable<IStorage['saveAgentMetricsRun']>;
  loadLatestAgentMetricsRun: NonNullable<IStorage['loadLatestAgentMetricsRun']>;
  listRecentAgentMetricsRuns: NonNullable<IStorage['listRecentAgentMetricsRuns']>;
  listAgentMetricsByRun: NonNullable<IStorage['listAgentMetricsByRun']>;
  listAgentMetricsHistoryByQueryType: NonNullable<IStorage['listAgentMetricsHistoryByQueryType']>;
}

interface LoadedStorageLike {
  storage: IStorage;
}

export interface AgentMetricsServiceDependencies {
  createStorage?: (rootDir: string) => Promise<LoadedStorageLike>;
  executeQuery?: (options: QueryOptions, rootDir: string) => ReturnType<typeof executeQueryTool>;
  executeDeps?: (options: DepsOptions, rootDir: string) => ReturnType<typeof executeDepsTool>;
  executeImpact?: (args: ImpactArgs) => ReturnType<ImpactCommand['run']>;
  now?: () => Date;
  randomId?: () => string;
}

interface BuiltInSample {
  sampleId: string;
  queryType: string;
  commandSlug: string;
  execute: (rootDir: string) => Promise<unknown>;
}

function createAgentMetricsError(
  code: string,
  message: string,
  remediation?: string,
  cause?: unknown,
): Error {
  const error = new Error(message) as Error & {
    code?: string;
    remediation?: string;
    cause?: unknown;
  };

  error.code = code;
  error.remediation = remediation;
  error.cause = cause;
  return error;
}

function estimateTokens(charCount: number): number {
  return Math.ceil(charCount / 4);
}

function serializeMeasuredResult(result: unknown): string {
  return JSON.stringify(result);
}

function calculateTotals(items: AgentMetricsMeasuredItem[]): AgentMetricsTotals {
  return items.reduce<AgentMetricsTotals>((totals, item) => ({
    queryCount: totals.queryCount + 1,
    responseSizeBytes: totals.responseSizeBytes + item.responseSizeBytes,
    rawCharCount: totals.rawCharCount + item.rawCharCount,
    estimatedInputTokens: totals.estimatedInputTokens + item.estimatedInputTokens,
    estimatedOutputTokens: totals.estimatedOutputTokens + item.estimatedOutputTokens,
    estimatedTotalTokens: totals.estimatedTotalTokens + item.estimatedTotalTokens,
    executionTimeMs: totals.executionTimeMs + item.executionTimeMs,
  }), {
    queryCount: 0,
    responseSizeBytes: 0,
    rawCharCount: 0,
    estimatedInputTokens: 0,
    estimatedOutputTokens: 0,
    estimatedTotalTokens: 0,
    executionTimeMs: 0,
  });
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function groupRowsByQueryType(items: AgentMetricsMeasuredItem[]): Map<string, AgentMetricsMeasuredItem[]> {
  const grouped = new Map<string, AgentMetricsMeasuredItem[]>();

  for (const item of items) {
    const existing = grouped.get(item.queryType);
    if (existing) {
      existing.push(item);
    } else {
      grouped.set(item.queryType, [item]);
    }
  }

  return grouped;
}

function sumEstimatedTotalTokens(items: AgentMetricsMeasuredItem[]): number {
  return items.reduce((sum, item) => sum + item.estimatedTotalTokens, 0);
}

function nearestRank(values: number[], percentile: number): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const rank = Math.max(1, Math.min(sorted.length, Math.ceil((percentile / 100) * sorted.length)));
  return sorted[rank - 1] ?? sorted[sorted.length - 1] ?? null;
}

function compareQueryTypeTotals(
  left: { queryType: string; latestEstimatedTotalTokens: number },
  right: { queryType: string; latestEstimatedTotalTokens: number },
): number {
  const tokenDifference = right.latestEstimatedTotalTokens - left.latestEstimatedTotalTokens;
  if (tokenDifference !== 0) {
    return tokenDifference;
  }

  return left.queryType.localeCompare(right.queryType);
}

function buildRiskNote(input: {
  deltaEstimatedTotalTokens: number | null;
  p50EstimatedTotalTokens: number | null;
  p95EstimatedTotalTokens: number | null;
}): string {
  if (input.deltaEstimatedTotalTokens !== null && input.deltaEstimatedTotalTokens > 0) {
    return 'Absolute token cost is rising versus the previous run.';
  }

  if (
    input.p95EstimatedTotalTokens !== null
    && input.p50EstimatedTotalTokens !== null
    && input.p95EstimatedTotalTokens > input.p50EstimatedTotalTokens * 2
  ) {
    return 'Outlier-heavy distribution suggests occasional expensive responses.';
  }

  return 'Absolute token cost remains large enough to dilute call-count savings.';
}

interface AgentMetricsQueryTypeIntelligenceEntry {
  queryType: string;
  rows: AgentMetricsMeasuredItem[];
  latestEstimatedTotalTokens: number;
  previousEstimatedTotalTokens: number | null;
  deltaEstimatedTotalTokens: number | null;
  deltaPercent: number | null;
  baselineAvailable: boolean;
  historicalSampleCount: number;
  p50EstimatedTotalTokens: number;
  p95EstimatedTotalTokens: number;
  riskNote: string;
}

interface AgentMetricsIntelligenceResult {
  queryTypeSummaries: AgentMetricsQueryTypeSummary[];
  queryTypeTrends: AgentMetricsQueryTypeTrend[];
  highestCostQueryTypes: AgentMetricsHighestCostQueryType[];
  highestCostRows: AgentMetricsHighestCostRow[];
}

function calculateQueryTypeIntelligence(
  latestItems: AgentMetricsMeasuredItem[],
  previousItems: AgentMetricsMeasuredItem[],
  historicalRowsByQueryType: Map<string, AgentMetricsMeasuredItem[]>,
): AgentMetricsIntelligenceResult {
  const latestGrouped = groupRowsByQueryType(latestItems);
  const previousGrouped = groupRowsByQueryType(previousItems);

  const entries: AgentMetricsQueryTypeIntelligenceEntry[] = [...latestGrouped.entries()].map(([queryType, rows]) => {
    const latestEstimatedTotalTokens = sumEstimatedTotalTokens(rows);
    const previousRows = previousGrouped.get(queryType) ?? null;
    const previousEstimatedTotalTokens = previousRows ? sumEstimatedTotalTokens(previousRows) : null;
    const deltaEstimatedTotalTokens = previousEstimatedTotalTokens === null
      ? null
      : latestEstimatedTotalTokens - previousEstimatedTotalTokens;
    const deltaPercent = previousEstimatedTotalTokens === null || previousEstimatedTotalTokens === 0
      ? null
      : Math.round((deltaEstimatedTotalTokens! / previousEstimatedTotalTokens) * 100);
    const historicalRows = historicalRowsByQueryType.get(queryType) ?? rows;
    const historicalValues = historicalRows.map((row) => row.estimatedTotalTokens);
    const p50EstimatedTotalTokens = nearestRank(historicalValues, 50) ?? 0;
    const p95EstimatedTotalTokens = nearestRank(historicalValues, 95) ?? 0;
    const riskNote = buildRiskNote({
      deltaEstimatedTotalTokens,
      p50EstimatedTotalTokens,
      p95EstimatedTotalTokens,
    });

    return {
      queryType,
      rows,
      latestEstimatedTotalTokens,
      previousEstimatedTotalTokens,
      deltaEstimatedTotalTokens,
      deltaPercent,
      baselineAvailable: previousEstimatedTotalTokens !== null,
      historicalSampleCount: historicalValues.length,
      p50EstimatedTotalTokens,
      p95EstimatedTotalTokens,
      riskNote,
    };
  });

  const entriesByQueryType = new Map(entries.map((entry) => [entry.queryType, entry]));
  const rankedEntries = [...entries].sort(compareQueryTypeTotals);

  return {
    queryTypeSummaries: [...entries]
      .sort((left, right) => left.queryType.localeCompare(right.queryType))
      .map((entry) => ({
        queryType: entry.queryType,
        queryCount: entry.rows.length,
        historicalSampleCount: entry.historicalSampleCount,
        p50EstimatedTotalTokens: entry.p50EstimatedTotalTokens,
        p95EstimatedTotalTokens: entry.p95EstimatedTotalTokens,
        avgResponseSizeBytes: average(entry.rows.map((row) => row.responseSizeBytes)),
        minResponseSizeBytes: Math.min(...entry.rows.map((row) => row.responseSizeBytes)),
        maxResponseSizeBytes: Math.max(...entry.rows.map((row) => row.responseSizeBytes)),
        avgRawCharCount: average(entry.rows.map((row) => row.rawCharCount)),
        minRawCharCount: Math.min(...entry.rows.map((row) => row.rawCharCount)),
        maxRawCharCount: Math.max(...entry.rows.map((row) => row.rawCharCount)),
        avgEstimatedTotalTokens: average(entry.rows.map((row) => row.estimatedTotalTokens)),
        minEstimatedTotalTokens: Math.min(...entry.rows.map((row) => row.estimatedTotalTokens)),
        maxEstimatedTotalTokens: Math.max(...entry.rows.map((row) => row.estimatedTotalTokens)),
        avgExecutionTimeMs: average(entry.rows.map((row) => row.executionTimeMs)),
      })),
    queryTypeTrends: rankedEntries.map((entry) => ({
      queryType: entry.queryType,
      latestEstimatedTotalTokens: entry.latestEstimatedTotalTokens,
      previousEstimatedTotalTokens: entry.previousEstimatedTotalTokens,
      deltaEstimatedTotalTokens: entry.deltaEstimatedTotalTokens,
      deltaPercent: entry.deltaPercent,
      baselineAvailable: entry.baselineAvailable,
    })),
    highestCostQueryTypes: rankedEntries.slice(0, 3).map((entry) => ({
      queryType: entry.queryType,
      estimatedTotalTokens: entry.latestEstimatedTotalTokens,
      riskNote: entry.riskNote,
    })),
    highestCostRows: [...latestItems]
      .sort(compareRowsByEstimatedTokens)
      .slice(0, 3)
      .map((row) => ({
        queryType: row.queryType,
        commandSlug: row.commandSlug,
        estimatedTotalTokens: row.estimatedTotalTokens,
        riskNote: entriesByQueryType.get(row.queryType)?.riskNote
          ?? 'Absolute token cost remains large enough to dilute call-count savings.',
      })),
  };
}

function compareRowsByEstimatedTokens(left: AgentMetricsMeasuredItem, right: AgentMetricsMeasuredItem): number {
  const tokenDifference = right.estimatedTotalTokens - left.estimatedTotalTokens;
  if (tokenDifference !== 0) {
    return tokenDifference;
  }

  return left.commandSlug.localeCompare(right.commandSlug);
}

function evaluateAgentMetricsGate(
  rows: AgentMetricsMeasuredItem[],
  maxTokensPerQuery?: number,
): AgentMetricsGateResult {
  const sortedRows = [...rows].sort(compareRowsByEstimatedTokens);
  const maxRow = sortedRows[0] ?? null;

  if (typeof maxTokensPerQuery !== 'number') {
    return {
      verdict: 'warn',
      warnOnly: true,
      threshold: null,
      maxRow,
      violationCount: 0,
      violations: [],
    };
  }

  const violations = sortedRows.filter((row) => row.estimatedTotalTokens > maxTokensPerQuery);
  return {
    verdict: violations.length > 0 ? 'fail' : 'pass',
    warnOnly: false,
    threshold: maxTokensPerQuery,
    maxRow,
    violationCount: violations.length,
    violations,
  };
}

function toMeasuredItem(
  row: AgentMetricsDetailRecord,
): AgentMetricsMeasuredItem {
  return {
    id: row.id,
    sampleId: String(row.metadata?.sampleId ?? row.id),
    queryType: row.queryType,
    commandSlug: row.commandSlug,
    responseSizeBytes: row.responseSizeBytes,
    rawCharCount: row.rawCharCount,
    estimatedInputTokens: row.estimatedInputTokens,
    estimatedOutputTokens: row.estimatedOutputTokens,
    estimatedTotalTokens: row.estimatedTotalTokens,
    executionTimeMs: row.executionTimeMs ?? 0,
    metadata: row.metadata ?? null,
  };
}

function assertAgentMetricsStorage(storage: IStorage): asserts storage is AgentMetricsStorage {
  if (
    typeof storage.saveAgentMetricsRun !== 'function'
    || typeof storage.loadLatestAgentMetricsRun !== 'function'
    || typeof storage.listRecentAgentMetricsRuns !== 'function'
    || typeof storage.listAgentMetricsByRun !== 'function'
    || typeof storage.listAgentMetricsHistoryByQueryType !== 'function'
  ) {
    throw createAgentMetricsError(
      'AGENT_METRICS_STORAGE_UNSUPPORTED',
      'Configured storage does not support agent-metrics persistence.',
      'Use the SQLite-backed project storage before running codemap agent-metrics.',
    );
  }
}

export class AgentMetricsService {
  private readonly deps: Required<AgentMetricsServiceDependencies>;

  constructor(deps: AgentMetricsServiceDependencies = {}) {
    this.deps = {
      createStorage: deps.createStorage ?? createConfiguredStorage,
      executeQuery: deps.executeQuery ?? executeQueryTool,
      executeDeps: deps.executeDeps ?? executeDepsTool,
      executeImpact: deps.executeImpact ?? ((args) => new ImpactCommand().run(args)),
      now: deps.now ?? (() => new Date()),
      randomId: deps.randomId ?? (() => Math.random().toString(16).slice(2, 10)),
    };
  }

  async executeTokenRun(rootDir: string): Promise<AgentMetricsTokenRunResult> {
    const recordedAt = this.deps.now().toISOString();
    const { storage } = await this.deps.createStorage(rootDir);
    assertAgentMetricsStorage(storage);

    try {
      const items: AgentMetricsMeasuredItem[] = [];
      const samples = this.getBuiltInSamples();

      for (const sample of samples) {
        const startedAt = performance.now();
        let result: unknown;
        try {
          result = await sample.execute(rootDir);
        } catch (error) {
          throw createAgentMetricsError(
            'AGENT_METRICS_SAMPLE_FAILED',
            `Built-in sample failed: ${sample.commandSlug}`,
            'Run codemap generate first, then retry codemap agent-metrics token.',
            error,
          );
        }

        const serialized = serializeMeasuredResult(result);
        const rawCharCount = serialized.length;
        const responseSizeBytes = Buffer.byteLength(serialized, 'utf8');
        const estimatedInputTokens = estimateTokens(sample.commandSlug.length);
        const estimatedOutputTokens = estimateTokens(rawCharCount);

        items.push({
          id: `${sample.sampleId}-${this.deps.randomId()}`,
          sampleId: sample.sampleId,
          queryType: sample.queryType,
          commandSlug: sample.commandSlug,
          responseSizeBytes,
          rawCharCount,
          estimatedInputTokens,
          estimatedOutputTokens,
          estimatedTotalTokens: estimatedInputTokens + estimatedOutputTokens,
          executionTimeMs: Math.round(performance.now() - startedAt),
          metadata: {
            sampleId: sample.sampleId,
            estimated: true,
          },
        });
      }

      const persistedRun = await storage.saveAgentMetricsRun({
        recordedAt,
        sampleSetVersion: AGENT_METRICS_SAMPLE_SET_VERSION,
        estimatorVersion: AGENT_METRICS_ESTIMATOR_VERSION,
        metadata: {
          estimated: true,
        },
        items: items.map((item): AgentMetricsDetailPayload => ({
          id: item.id,
          queryType: item.queryType,
          commandSlug: item.commandSlug,
          responseSizeBytes: item.responseSizeBytes,
          rawCharCount: item.rawCharCount,
          estimatedInputTokens: item.estimatedInputTokens,
          estimatedOutputTokens: item.estimatedOutputTokens,
          estimatedTotalTokens: item.estimatedTotalTokens,
          executionTimeMs: item.executionTimeMs,
          metadata: item.metadata,
        })),
      });

      return {
        schemaVersion: AGENT_METRICS_TOKEN_SCHEMA_VERSION,
        runId: persistedRun.id,
        recordedAt,
        projectRoot: rootDir,
        sampleSetVersion: AGENT_METRICS_SAMPLE_SET_VERSION,
        estimatorVersion: AGENT_METRICS_ESTIMATOR_VERSION,
        items,
        totals: calculateTotals(items),
      };
    } finally {
      await storage.close();
    }
  }

  async buildLatestReport(rootDir: string): Promise<AgentMetricsReportResult | null> {
    const { storage } = await this.deps.createStorage(rootDir);
    assertAgentMetricsStorage(storage);

    try {
      const latestRun = await storage.loadLatestAgentMetricsRun();
      if (!latestRun) {
        return null;
      }

      const latestRows = (await storage.listAgentMetricsByRun(latestRun.id)).map(toMeasuredItem);
      const recentRuns = await storage.listRecentAgentMetricsRuns(2);
      const previousRun = recentRuns.find((candidate) => candidate.id !== latestRun.id) ?? null;
      const previousRows = previousRun
        ? (await storage.listAgentMetricsByRun(previousRun.id)).map(toMeasuredItem)
        : [];
      const historicalRowsByQueryType = new Map<string, AgentMetricsMeasuredItem[]>();

      for (const queryType of new Set(latestRows.map((row) => row.queryType))) {
        const historyRows = await storage.listAgentMetricsHistoryByQueryType(queryType);
        historicalRowsByQueryType.set(queryType, historyRows.map(toMeasuredItem));
      }

      return this.buildReport(
        rootDir,
        {
          runId: latestRun.id,
          recordedAt: latestRun.recordedAt,
          sampleSetVersion: latestRun.sampleSetVersion,
          estimatorVersion: latestRun.estimatorVersion,
        },
        latestRows,
        previousRows,
        historicalRowsByQueryType,
      );
    } finally {
      await storage.close();
    }
  }

  async requireLatestReport(rootDir: string): Promise<AgentMetricsReportResult> {
    const report = await this.buildLatestReport(rootDir);
    if (report) {
      return report;
    }

    throw createAgentMetricsError(
      'AGENT_METRICS_REPORT_MISSING',
      'No persisted agent-metrics run exists yet.',
      'Run codemap agent-metrics or codemap agent-metrics token first, then retry codemap agent-metrics report.',
    );
  }

  async runReportFlow(rootDir: string): Promise<AgentMetricsReportResult> {
    const latest = await this.buildLatestReport(rootDir);
    if (latest) {
      return latest;
    }

    await this.executeTokenRun(rootDir);
    const report = await this.buildLatestReport(rootDir);
    if (report) {
      return report;
    }

    throw createAgentMetricsError(
      'AGENT_METRICS_REPORT_MISSING',
      'Token measurement completed but no persisted report could be rebuilt.',
      'Inspect the configured storage and rerun codemap agent-metrics report.',
    );
  }

  static withGate(
    report: AgentMetricsReportPayload,
    maxTokensPerQuery?: number,
  ): AgentMetricsReportResult {
    return {
      ...report,
      gate: evaluateAgentMetricsGate(report.rows, maxTokensPerQuery),
    };
  }

  private buildReport(
    rootDir: string,
    run: {
      runId: string;
      recordedAt: string;
      sampleSetVersion: string;
      estimatorVersion: string;
    },
    rows: AgentMetricsMeasuredItem[],
    previousRows: AgentMetricsMeasuredItem[],
    historicalRowsByQueryType: Map<string, AgentMetricsMeasuredItem[]>,
  ): AgentMetricsReportResult {
    if (rows.length === 0) {
      throw createAgentMetricsError(
        'AGENT_METRICS_EMPTY_RUN',
        `Latest agent-metrics run ${run.runId} has no detail rows.`,
        'Re-run codemap agent-metrics token to rebuild the persisted measurement set.',
      );
    }

    const intelligence = calculateQueryTypeIntelligence(rows, previousRows, historicalRowsByQueryType);
    return AgentMetricsService.withGate({
      schemaVersion: AGENT_METRICS_REPORT_SCHEMA_VERSION,
      generatedAt: this.deps.now().toISOString(),
      runId: run.runId,
      recordedAt: run.recordedAt,
      projectRoot: rootDir,
      sampleSetVersion: run.sampleSetVersion,
      estimatorVersion: run.estimatorVersion,
      rows,
      queryTypeSummaries: intelligence.queryTypeSummaries,
      queryTypeTrends: intelligence.queryTypeTrends,
      highestCostQueryTypes: intelligence.highestCostQueryTypes,
      highestCostRows: intelligence.highestCostRows,
      totals: calculateTotals(rows),
    });
  }

  private getBuiltInSamples(): BuiltInSample[] {
    return [
      {
        sampleId: 'query-symbol-history-command',
        queryType: 'query-symbol',
        commandSlug: 'codemap query --symbol createHistoryCommand',
        execute: async (rootDir) => {
          const execution = await this.deps.executeQuery({ symbol: 'createHistoryCommand' }, rootDir);
          if (execution.status !== 'ok' || !execution.result) {
            throw execution.error ?? new Error('query execution failed');
          }
          return execution.result;
        },
      },
      {
        sampleId: 'query-search-env-contract',
        queryType: 'query-search',
        commandSlug: 'codemap query --search env-contract',
        execute: async (rootDir) => {
          const execution = await this.deps.executeQuery({ search: 'env-contract' }, rootDir);
          if (execution.status !== 'ok' || !execution.result) {
            throw execution.error ?? new Error('query search execution failed');
          }
          return execution.result;
        },
      },
      {
        sampleId: 'deps-history-module',
        queryType: 'deps-module',
        commandSlug: 'codemap deps --module src/cli/commands/history.ts',
        execute: async (rootDir) => {
          const execution = await this.deps.executeDeps({ module: 'src/cli/commands/history.ts' }, rootDir);
          if (execution.status !== 'ok' || !execution.result) {
            throw execution.error ?? new Error('deps execution failed');
          }
          return execution.result;
        },
      },
      {
        sampleId: 'impact-history-file',
        queryType: 'impact-file',
        commandSlug: 'codemap impact --file src/cli/commands/history.ts --transitive',
        execute: async () => {
          const [result] = await this.deps.executeImpact({
            targets: ['src/cli/commands/history.ts'],
            scope: 'transitive',
          });
          return result;
        },
      },
    ];
  }
}

export {
  AGENT_METRICS_ESTIMATOR_VERSION,
  AGENT_METRICS_REPORT_SCHEMA_VERSION,
  AGENT_METRICS_SAMPLE_SET_VERSION,
  AGENT_METRICS_TOKEN_SCHEMA_VERSION,
};
