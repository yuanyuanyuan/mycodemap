// [META] since:2026-04-15 | owner:architecture-team | stable:false
// [WHY] Canonical history/risk service that materializes git signals once and degrades safely when history is missing

import type { Symbol as CodeSymbol } from '../interface/types/index.js';
import path from 'node:path';
import type {
  FileHistoryAnalysisResult,
  FileHistorySignal,
  HistoryConfidence,
  HistoryFreshness,
  HistoryHeatSignal,
  HistoryRiskScore,
  HistoryRiskSnapshotPayload,
  HistoryRiskSnapshotRecord,
  HistorySignalDiagnostics,
  HistorySignalStatus,
  HistorySymbolCandidate,
  HistoryTimelineEntry,
  SymbolHistoryResult,
} from '../interface/types/history-risk.js';
import type { IStorage } from '../interface/types/storage.js';
import type { AIFeed, CommitInfo as GitCommitInfo } from './git-analyzer.js';
import { GitAnalyzer, TAG_WEIGHTS } from './git-analyzer.js';
import type { FileHeat as WorkflowFileHeat, GitAnalysisResult } from './workflow/git-analyzer.js';
import { WorkflowGitAnalyzer } from './workflow/git-analyzer.js';
import type { WorkflowContext } from './workflow/types.js';

interface HistoryRiskStorageAdapter {
  saveHistoryRiskSnapshot(payload: HistoryRiskSnapshotPayload): Promise<HistoryRiskSnapshotRecord>;
  loadLatestFileHistorySignal(file: string): Promise<FileHistorySignal | null>;
  loadLatestSymbolHistoryResult(symbolId: string, query?: string): Promise<SymbolHistoryResult>;
}

type HistoryGitAnalyzer = Pick<GitAnalyzer, 'isGitRepository' | 'findRelatedCommits' | 'calculateRiskScore'>;
type WorkflowHeatAnalyzer = Pick<WorkflowGitAnalyzer, 'analyzeForPhase'>;

interface FileDependencyMetrics {
  file: string;
  moduleIds: string[];
  dependencyIds: string[];
  dependentIds: string[];
  gravity: number;
  impact: number;
}

interface SymbolDependencyMetrics {
  dependencyIds: string[];
  dependentIds: string[];
  gravity: number;
  impact: number;
}

export interface AnalyzeHistoryFilesOptions {
  persist?: boolean;
  maxCommits?: number;
  maxFiles?: number;
}

export interface GitHistoryServiceOptions {
  projectRoot: string;
  storage: IStorage;
  gitAnalyzer?: HistoryGitAnalyzer;
  workflowGitAnalyzer?: WorkflowHeatAnalyzer;
  now?: () => Date;
  maxCommits?: number;
  maxFilesPerRequest?: number;
  precomputeThreshold?: number;
  staleAfterHours?: number;
  expiredAfterHours?: number;
  impactDepth?: number;
}

const DEFAULT_MAX_COMMITS = 20;
const DEFAULT_MAX_FILES_PER_REQUEST = 5;
const DEFAULT_PRECOMPUTE_THRESHOLD = 25;
const DEFAULT_STALE_AFTER_HOURS = 24;
const DEFAULT_EXPIRED_AFTER_HOURS = 24 * 7;
const DEFAULT_IMPACT_DEPTH = 2;

function isHistoryRiskStorageAdapter(storage: IStorage): storage is IStorage & HistoryRiskStorageAdapter {
  const candidate = storage as Partial<HistoryRiskStorageAdapter>;
  return typeof candidate.saveHistoryRiskSnapshot === 'function'
    && typeof candidate.loadLatestFileHistorySignal === 'function'
    && typeof candidate.loadLatestSymbolHistoryResult === 'function';
}

function uniqueValues(values: readonly string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(value => value.length > 0))];
}

function normalizeProjectRelativePath(filePath: string, projectRoot: string): string {
  const normalizedPath = filePath.replace(/\\/g, '/');

  if (!path.isAbsolute(filePath)) {
    return normalizedPath;
  }

  const relativePath = path.relative(projectRoot, filePath).replace(/\\/g, '/');
  return relativePath.length > 0 ? relativePath : normalizedPath;
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string' && value.length > 0) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  return null;
}

function createUnavailableRiskScore(reason?: string): HistoryRiskScore {
  return {
    level: 'unavailable',
    score: null,
    gravity: null,
    heat: null,
    impact: null,
    riskFactors: reason ? [reason] : [],
  };
}

function downgradeConfidence(confidence: HistoryConfidence): HistoryConfidence {
  if (confidence === 'high') {
    return 'medium';
  }

  if (confidence === 'medium') {
    return 'low';
  }

  return confidence;
}

function pickHigherConfidence(left: HistoryConfidence, right: HistoryConfidence): HistoryConfidence {
  const rank: Record<HistoryConfidence, number> = {
    unavailable: 0,
    low: 1,
    medium: 2,
    high: 3,
  };

  return rank[left] >= rank[right] ? left : right;
}

function calculateFreshness(
  analyzedAt: string | null,
  now: Date,
  staleAfterHours: number,
  expiredAfterHours: number
): HistoryFreshness {
  if (!analyzedAt) {
    return 'unknown';
  }

  const parsed = new Date(analyzedAt);
  if (Number.isNaN(parsed.getTime())) {
    return 'unknown';
  }

  const ageHours = (now.getTime() - parsed.getTime()) / (1000 * 60 * 60);
  if (ageHours <= staleAfterHours) {
    return 'fresh';
  }

  if (ageHours <= expiredAfterHours) {
    return 'stale';
  }

  return 'expired';
}

function refreshDiagnostics(
  diagnostics: HistorySignalDiagnostics,
  now: Date,
  staleAfterHours: number,
  expiredAfterHours: number
): HistorySignalDiagnostics {
  const freshness = calculateFreshness(
    diagnostics.analyzedAt,
    now,
    staleAfterHours,
    expiredAfterHours
  );
  let confidence = diagnostics.confidence;
  const reasons = [...diagnostics.reasons];

  if (freshness === 'stale') {
    confidence = downgradeConfidence(confidence);
    reasons.push('materialized history is stale');
  } else if (freshness === 'expired') {
    confidence = 'low';
    reasons.push('materialized history is expired');
  }

  return {
    ...diagnostics,
    freshness,
    confidence,
    source: diagnostics.source === 'unavailable' ? 'unavailable' : 'sqlite-cache',
    reasons: uniqueValues(reasons),
  };
}

function mapWorkflowHeat(heat?: WorkflowFileHeat): HistoryHeatSignal {
  return {
    freq30d: heat?.freq30d ?? 0,
    lastType: (heat?.lastType ?? 'NEW') as HistoryHeatSignal['lastType'],
    lastDate: toIsoString(heat?.lastDate),
    stability: heat?.stability ?? true,
  };
}

function hasHistoryEvidence(heat: HistoryHeatSignal, timeline: HistoryTimelineEntry[]): boolean {
  return timeline.length > 0 || heat.freq30d > 0 || heat.lastDate !== null;
}

function createDiagnostics(params: {
  status: HistorySignalStatus;
  confidence: HistoryConfidence;
  source: HistorySignalDiagnostics['source'];
  reasons: string[];
  analyzedAt: string | null;
  scopeMode: HistorySignalDiagnostics['scopeMode'];
  requestedFiles: number;
  analyzedFiles: number;
  requiresPrecompute?: boolean;
}): HistorySignalDiagnostics {
  return {
    status: params.status,
    confidence: params.confidence,
    freshness: params.analyzedAt ? 'fresh' : 'unknown',
    source: params.source,
    reasons: uniqueValues(params.reasons),
    analyzedAt: params.analyzedAt,
    scopeMode: params.scopeMode,
    requestedFiles: params.requestedFiles,
    analyzedFiles: params.analyzedFiles,
    requiresPrecompute: params.requiresPrecompute ?? false,
  };
}

function createUnavailableFileSignal(
  file: string,
  reason: string,
  analyzedAt: string | null,
  source: HistorySignalDiagnostics['source'],
  status: HistorySignalStatus = 'unavailable'
): FileHistorySignal {
  return {
    file,
    risk: createUnavailableRiskScore(reason),
    timeline: [],
    diagnostics: createDiagnostics({
      status,
      confidence: status === 'not_found' ? 'low' : 'unavailable',
      source,
      reasons: [reason],
      analyzedAt,
      scopeMode: 'partial',
      requestedFiles: 1,
      analyzedFiles: 0,
    }),
  };
}

function createUnavailableSymbolResult(
  query: string,
  reason: string,
  status: HistorySignalStatus = 'unavailable',
  candidates: HistorySymbolCandidate[] = []
): SymbolHistoryResult {
  return {
    query,
    candidates,
    symbol: null,
    files: [],
    timeline: [],
    risk: createUnavailableRiskScore(reason),
    diagnostics: createDiagnostics({
      status,
      confidence: status === 'not_found' || status === 'ambiguous' ? 'low' : 'unavailable',
      source: status === 'unavailable' ? 'unavailable' : 'git-live',
      reasons: [reason],
      analyzedAt: null,
      scopeMode: 'partial',
      requestedFiles: 0,
      analyzedFiles: 0,
    }),
  };
}

function createSyntheticWorkflowContext(task: string): WorkflowContext {
  const now = new Date();
  return {
    id: 'history-risk-service',
    task,
    currentPhase: 'link',
    phaseStatus: 'running',
    artifacts: new Map(),
    cachedResults: {},
    userConfirmed: new Set(),
    startedAt: now,
    updatedAt: now,
  };
}

function normalizeTimeline(commits: GitCommitInfo[], source: HistoryTimelineEntry['source']): HistoryTimelineEntry[] {
  return commits.map((commit) => {
    const tagType = commit.tag?.type ?? 'UNKNOWN';

    return {
      hash: commit.hash,
      message: commit.message,
      date: toIsoString(commit.date) ?? new Date(0).toISOString(),
      author: commit.author,
      files: commit.files,
      tagType,
      tagScope: commit.tag?.scope ?? 'general',
      subject: commit.tag?.subject ?? commit.message,
      riskWeight: TAG_WEIGHTS[tagType] ?? TAG_WEIGHTS.UNKNOWN,
      source,
    };
  });
}

function filterCommitsForFile(commits: GitCommitInfo[], file: string): GitCommitInfo[] {
  return commits.filter((commit) => commit.files.length === 0 || commit.files.includes(file));
}

function filterCommitsForSymbol(commits: GitCommitInfo[], candidate: HistorySymbolCandidate): GitCommitInfo[] {
  return commits.filter(
    (commit) => commit.files.includes(candidate.file) || commit.message.includes(candidate.name)
  );
}

function buildCandidate(symbol: CodeSymbol, query: string): HistorySymbolCandidate {
  return {
    symbolId: symbol.id,
    moduleId: symbol.moduleId,
    name: symbol.name,
    kind: symbol.kind,
    file: symbol.location.file,
    line: symbol.location.line,
    exactNameMatch: symbol.name === query,
  };
}

export class GitHistoryService {
  private readonly projectRoot: string;
  private readonly storage: IStorage;
  private readonly gitAnalyzer: HistoryGitAnalyzer;
  private readonly workflowGitAnalyzer: WorkflowHeatAnalyzer;
  private readonly now: () => Date;
  private readonly maxCommits: number;
  private readonly maxFilesPerRequest: number;
  private readonly precomputeThreshold: number;
  private readonly staleAfterHours: number;
  private readonly expiredAfterHours: number;
  private readonly impactDepth: number;

  constructor(options: GitHistoryServiceOptions) {
    this.projectRoot = options.projectRoot;
    this.storage = options.storage;
    this.gitAnalyzer = options.gitAnalyzer ?? new GitAnalyzer();
    this.workflowGitAnalyzer = options.workflowGitAnalyzer ?? new WorkflowGitAnalyzer(options.projectRoot);
    this.now = options.now ?? (() => new Date());
    this.maxCommits = options.maxCommits ?? DEFAULT_MAX_COMMITS;
    this.maxFilesPerRequest = options.maxFilesPerRequest ?? DEFAULT_MAX_FILES_PER_REQUEST;
    this.precomputeThreshold = options.precomputeThreshold ?? DEFAULT_PRECOMPUTE_THRESHOLD;
    this.staleAfterHours = options.staleAfterHours ?? DEFAULT_STALE_AFTER_HOURS;
    this.expiredAfterHours = options.expiredAfterHours ?? DEFAULT_EXPIRED_AFTER_HOURS;
    this.impactDepth = options.impactDepth ?? DEFAULT_IMPACT_DEPTH;
  }

  async analyzeFiles(
    files: readonly string[],
    options: AnalyzeHistoryFilesOptions = {}
  ): Promise<FileHistoryAnalysisResult> {
    const requestedFiles = uniqueValues(files);
    if (requestedFiles.length === 0) {
      return {
        requestedFiles: [],
        files: [],
        aggregatedRisk: createUnavailableRiskScore('no target files provided'),
        diagnostics: createDiagnostics({
          status: 'unavailable',
          confidence: 'unavailable',
          source: 'unavailable',
          reasons: ['no target files provided'],
          analyzedAt: null,
          scopeMode: 'partial',
          requestedFiles: 0,
          analyzedFiles: 0,
        }),
      };
    }

    const selection = await this.selectFilesForAnalysis(
      requestedFiles,
      options.maxFiles ?? this.maxFilesPerRequest
    );
    const storageAdapter = this.getHistoryRiskStorageAdapter();
    const analyzedAt = this.now().toISOString();
    const gitAvailable = await this.gitAnalyzer.isGitRepository(this.projectRoot);

    if (!gitAvailable) {
      return this.loadFileAnalysisFromCache(requestedFiles, selection, storageAdapter);
    }

    const workflowAnalysis = await this.workflowGitAnalyzer.analyzeForPhase(
      'link',
      selection.selectedFiles,
      createSyntheticWorkflowContext('history-risk:file')
    );
    const heatMap = this.buildHeatMap(workflowAnalysis);
    const commits = await this.gitAnalyzer.findRelatedCommits([], selection.selectedFiles, {
      maxCommits: options.maxCommits ?? this.maxCommits,
      projectRoot: this.projectRoot,
    });

    const fileSignals = selection.selectedFiles.map((file) => {
      const timeline = normalizeTimeline(filterCommitsForFile(commits, file), 'file');
      const heat = heatMap.get(file) ?? mapWorkflowHeat();
      const metrics = selection.metricsByFile.get(file) ?? {
        file,
        moduleIds: [],
        dependencyIds: [],
        dependentIds: [],
        gravity: 0,
        impact: 0,
      };

      if (!hasHistoryEvidence(heat, timeline)) {
        return {
          file,
          risk: createUnavailableRiskScore('no git history evidence for file'),
          timeline: [],
          diagnostics: createDiagnostics({
            status: 'not_found',
            confidence: selection.scopeReduced || selection.requiresPrecompute ? 'low' : 'medium',
            source: 'git-live',
            reasons: ['no git history evidence for file'],
            analyzedAt,
            scopeMode: selection.scopeMode,
            requestedFiles: 1,
            analyzedFiles: 1,
            requiresPrecompute: selection.requiresPrecompute,
          }),
        } satisfies FileHistorySignal;
      }

      let confidence: HistoryConfidence = timeline.length > 0 && heat.lastDate ? 'high' : 'medium';
      if (selection.scopeReduced || selection.requiresPrecompute) {
        confidence = downgradeConfidence(confidence);
      }

      return {
        file,
        risk: this.calculateRiskFromFeed(file, commits, heat, metrics),
        timeline,
        diagnostics: createDiagnostics({
          status: 'ok',
          confidence,
          source: 'git-live',
          reasons: ['git history materialized from live repository'],
          analyzedAt,
          scopeMode: selection.scopeMode,
          requestedFiles: 1,
          analyzedFiles: 1,
          requiresPrecompute: selection.requiresPrecompute,
        }),
      } satisfies FileHistorySignal;
    });

    let snapshotId: string | undefined;
    if (storageAdapter && options.persist !== false) {
      const snapshot = await storageAdapter.saveHistoryRiskSnapshot({
        recordedAt: analyzedAt,
        source: 'git-live',
        fileSignals,
      });
      snapshotId = snapshot.snapshotId;
    }

    const availableSignals = fileSignals.filter((signal) => signal.risk.score !== null);
    const aggregatedRisk = availableSignals.length > 0
      ? this.calculateAggregatedLiveRisk(availableSignals, commits, selection.metricsByFile, heatMap)
      : createUnavailableRiskScore('no file produced usable history evidence');
    const overallConfidence = this.calculateOverallConfidence(
      fileSignals.map((signal) => signal.diagnostics.confidence),
      selection.scopeReduced || selection.requiresPrecompute
    );

    return {
      requestedFiles,
      files: fileSignals,
      aggregatedRisk,
      diagnostics: createDiagnostics({
        status: availableSignals.length > 0 ? 'ok' : 'not_found',
        confidence: overallConfidence,
        source: 'git-live',
        reasons: [...selection.reasons, 'canonical history risk service completed live materialization'],
        analyzedAt,
        scopeMode: selection.scopeMode,
        requestedFiles: requestedFiles.length,
        analyzedFiles: selection.selectedFiles.length,
        requiresPrecompute: selection.requiresPrecompute,
      }),
      snapshotId,
    };
  }

  async resolveSymbolCandidates(query: string): Promise<HistorySymbolCandidate[]> {
    const symbols = await this.storage.findSymbolByName(query);
    return symbols
      .map((symbol) => buildCandidate(symbol, query))
      .sort((left, right) => {
        if (left.exactNameMatch !== right.exactNameMatch) {
          return left.exactNameMatch ? -1 : 1;
        }

        if (left.name.length !== right.name.length) {
          return left.name.length - right.name.length;
        }

        return left.file.localeCompare(right.file);
      });
  }

  async analyzeSymbol(
    query: string,
    options: AnalyzeHistoryFilesOptions = {}
  ): Promise<SymbolHistoryResult> {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length === 0) {
      return createUnavailableSymbolResult(query, 'symbol query cannot be empty');
    }

    const directSymbol = await this.storage.findSymbolById(trimmedQuery);
    const candidates = directSymbol
      ? [buildCandidate(directSymbol, directSymbol.name)]
      : await this.resolveSymbolCandidates(trimmedQuery);

    if (candidates.length === 0) {
      return createUnavailableSymbolResult(trimmedQuery, 'symbol not found in storage', 'not_found');
    }

    const exactCandidates = directSymbol
      ? candidates
      : candidates.filter((candidate) => candidate.exactNameMatch);
    const isAmbiguous = !directSymbol
      && ((exactCandidates.length > 1) || (exactCandidates.length === 0 && candidates.length > 1));

    if (isAmbiguous) {
      return createUnavailableSymbolResult(
        trimmedQuery,
        'symbol query resolved to multiple candidates',
        'ambiguous',
        candidates
      );
    }

    const selected = directSymbol
      ? candidates[0]
      : (exactCandidates[0] ?? candidates[0] ?? null);

    if (!selected) {
      return createUnavailableSymbolResult(trimmedQuery, 'failed to resolve target symbol', 'not_found');
    }

    const storageAdapter = this.getHistoryRiskStorageAdapter();
    const analyzedAt = this.now().toISOString();
    const gitAvailable = await this.gitAnalyzer.isGitRepository(this.projectRoot);

    if (!gitAvailable) {
      if (storageAdapter) {
        const cached = await storageAdapter.loadLatestSymbolHistoryResult(selected.symbolId, trimmedQuery);
        if (cached.diagnostics.status !== 'unavailable') {
          return {
            ...cached,
            candidates: cached.candidates.length > 0 ? cached.candidates : candidates,
            diagnostics: refreshDiagnostics(
              cached.diagnostics,
              this.now(),
              this.staleAfterHours,
              this.expiredAfterHours
            ),
          };
        }
      }

      return createUnavailableSymbolResult(
        trimmedQuery,
        'git repository unavailable and no materialized symbol history found'
      );
    }

    const workflowAnalysis = await this.workflowGitAnalyzer.analyzeForPhase(
      'link',
      [selected.file],
      createSyntheticWorkflowContext(`history-risk:symbol:${trimmedQuery}`)
    );
    const heat = this.buildHeatMap(workflowAnalysis).get(selected.file) ?? mapWorkflowHeat();
    const commits = await this.gitAnalyzer.findRelatedCommits([selected.name], [selected.file], {
      maxCommits: options.maxCommits ?? this.maxCommits,
      projectRoot: this.projectRoot,
    });
    const timeline = normalizeTimeline(filterCommitsForSymbol(commits, selected), 'symbol');

    if (!hasHistoryEvidence(heat, timeline)) {
      return {
        query: trimmedQuery,
        candidates,
        symbol: selected,
        files: [selected.file],
        timeline: [],
        risk: createUnavailableRiskScore('no git history evidence for symbol'),
        diagnostics: createDiagnostics({
          status: 'not_found',
          confidence: 'low',
          source: 'git-live',
          reasons: ['no git history evidence for symbol'],
          analyzedAt,
          scopeMode: 'full',
          requestedFiles: 1,
          analyzedFiles: 1,
        }),
      };
    }

    const metrics = await this.resolveSymbolMetrics(selected);
    const risk = this.calculateRiskFromFeed(
      selected.file,
      commits,
      heat,
      {
        file: selected.file,
        moduleIds: [selected.moduleId],
        dependencyIds: metrics.dependencyIds,
        dependentIds: metrics.dependentIds,
        gravity: metrics.gravity,
        impact: metrics.impact,
      }
    );

    const result: SymbolHistoryResult = {
      query: trimmedQuery,
      candidates,
      symbol: selected,
      files: [selected.file],
      timeline,
      risk,
      diagnostics: createDiagnostics({
        status: 'ok',
        confidence: selected.exactNameMatch ? 'high' : 'medium',
        source: 'git-live',
        reasons: ['symbol history resolved from live git signals'],
        analyzedAt,
        scopeMode: 'full',
        requestedFiles: 1,
        analyzedFiles: 1,
      }),
    };

    if (storageAdapter && options.persist !== false) {
      const snapshot = await storageAdapter.saveHistoryRiskSnapshot({
        recordedAt: analyzedAt,
        source: 'git-live',
        symbolSignals: [result],
      });
      result.snapshotId = snapshot.snapshotId;
    }

    return result;
  }

  private async loadFileAnalysisFromCache(
    requestedFiles: string[],
    selection: {
      selectedFiles: string[];
      metricsByFile: Map<string, FileDependencyMetrics>;
      scopeReduced: boolean;
      scopeMode: HistorySignalDiagnostics['scopeMode'];
      requiresPrecompute: boolean;
      reasons: string[];
    },
    storageAdapter: HistoryRiskStorageAdapter | null
  ): Promise<FileHistoryAnalysisResult> {
    if (!storageAdapter) {
      return {
        requestedFiles,
        files: selection.selectedFiles.map((file) => createUnavailableFileSignal(
          file,
          'git repository unavailable and storage does not support history materialization',
          null,
          'unavailable'
        )),
        aggregatedRisk: createUnavailableRiskScore('git repository unavailable and no cache adapter present'),
        diagnostics: createDiagnostics({
          status: 'unavailable',
          confidence: 'unavailable',
          source: 'unavailable',
          reasons: [...selection.reasons, 'git repository unavailable and no cache adapter present'],
          analyzedAt: null,
          scopeMode: selection.scopeMode,
          requestedFiles: requestedFiles.length,
          analyzedFiles: 0,
          requiresPrecompute: selection.requiresPrecompute,
        }),
      };
    }

    const cachedSignals = await Promise.all(
      selection.selectedFiles.map(async (file) => {
        const signal = await storageAdapter.loadLatestFileHistorySignal(file);
        if (!signal) {
          return createUnavailableFileSignal(
            file,
            'no materialized history snapshot found for file',
            null,
            'unavailable'
          );
        }

        return {
          ...signal,
          diagnostics: refreshDiagnostics(
            signal.diagnostics,
            this.now(),
            this.staleAfterHours,
            this.expiredAfterHours
          ),
        };
      })
    );

    const availableSignals = cachedSignals.filter((signal) => signal.risk.score !== null);
    const bestConfidence = cachedSignals.reduce<HistoryConfidence>(
      (current, signal) => pickHigherConfidence(current, signal.diagnostics.confidence),
      'unavailable'
    );

    return {
      requestedFiles,
      files: cachedSignals,
      aggregatedRisk: this.combinePersistedRisk(cachedSignals),
      diagnostics: createDiagnostics({
        status: availableSignals.length > 0 ? 'ok' : 'unavailable',
        confidence: selection.scopeReduced || selection.requiresPrecompute
          ? downgradeConfidence(bestConfidence)
          : bestConfidence,
        source: availableSignals.length > 0 ? 'sqlite-cache' : 'unavailable',
        reasons: [...selection.reasons, 'served materialized history from SQLite cache'],
        analyzedAt: availableSignals[0]?.diagnostics.analyzedAt ?? null,
        scopeMode: selection.scopeMode,
        requestedFiles: requestedFiles.length,
        analyzedFiles: availableSignals.length,
        requiresPrecompute: selection.requiresPrecompute,
      }),
    };
  }

  private calculateAggregatedLiveRisk(
    fileSignals: FileHistorySignal[],
    commits: GitCommitInfo[],
    metricsByFile: Map<string, FileDependencyMetrics>,
    heatMap: Map<string, HistoryHeatSignal>
  ): HistoryRiskScore {
    const targetFiles = fileSignals.map((signal) => signal.file);
    const feedData: AIFeed[] = fileSignals.map((signal) => {
      const metrics = metricsByFile.get(signal.file) ?? {
        file: signal.file,
        moduleIds: [],
        dependencyIds: [],
        dependentIds: [],
        gravity: 0,
        impact: 0,
      };
      const heat = heatMap.get(signal.file) ?? mapWorkflowHeat();
      return this.createFeed(signal.file, heat, metrics);
    });

    return this.mapAnalyzerRisk(
      this.gitAnalyzer.calculateRiskScore(targetFiles, commits, feedData),
      heatMap.get(targetFiles[0] ?? '')
    );
  }

  private calculateRiskFromFeed(
    file: string,
    commits: GitCommitInfo[],
    heat: HistoryHeatSignal,
    metrics: FileDependencyMetrics
  ): HistoryRiskScore {
    const risk = this.gitAnalyzer.calculateRiskScore(
      [file],
      commits,
      [this.createFeed(file, heat, metrics)]
    );
    return this.mapAnalyzerRisk(risk, heat);
  }

  private mapAnalyzerRisk(
    risk: ReturnType<HistoryGitAnalyzer['calculateRiskScore']>,
    heat: HistoryHeatSignal | undefined
  ): HistoryRiskScore {
    return {
      level: risk.level,
      score: risk.score,
      gravity: risk.gravity,
      heat: heat ?? {
        freq30d: risk.heat.freq30d,
        lastType: risk.heat.lastType as HistoryHeatSignal['lastType'],
        lastDate: risk.heat.lastDate,
        stability: risk.heat.stability,
      },
      impact: risk.impact,
      riskFactors: [...risk.riskFactors],
    };
  }

  private createFeed(file: string, heat: HistoryHeatSignal, metrics: FileDependencyMetrics): AIFeed {
    return {
      file,
      gravity: metrics.gravity,
      heat: {
        freq30d: heat.freq30d,
        lastType: heat.lastType,
        lastDate: heat.lastDate,
        stability: heat.stability,
      },
      meta: {
        stable: heat.stability,
      },
      deps: metrics.dependencyIds,
      dependents: metrics.dependentIds,
    };
  }

  private buildHeatMap(result: GitAnalysisResult): Map<string, HistoryHeatSignal> {
    const heatMap = new Map<string, HistoryHeatSignal>();
    for (const heat of result.fileHeat ?? []) {
      heatMap.set(heat.file, mapWorkflowHeat(heat));
    }
    return heatMap;
  }

  private async selectFilesForAnalysis(
    requestedFiles: string[],
    maxFiles: number
  ): Promise<{
    selectedFiles: string[];
    metricsByFile: Map<string, FileDependencyMetrics>;
    scopeReduced: boolean;
    scopeMode: HistorySignalDiagnostics['scopeMode'];
    requiresPrecompute: boolean;
    reasons: string[];
  }> {
    const metricsEntries = await Promise.all(
      requestedFiles.map((file) => this.resolveFileMetrics(file))
    );
    metricsEntries.sort((left, right) => {
      const leftScore = left.gravity + left.impact;
      const rightScore = right.gravity + right.impact;
      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }

      return left.file.localeCompare(right.file);
    });

    const selectedEntries = metricsEntries.slice(0, Math.max(1, maxFiles));
    const metricsByFile = new Map(metricsEntries.map((entry) => [entry.file, entry]));
    const scopeReduced = selectedEntries.length < requestedFiles.length;
    const requiresPrecompute = requestedFiles.length > this.precomputeThreshold;
    const reasons: string[] = [];

    if (scopeReduced) {
      reasons.push(`scope shrunk to top ${selectedEntries.length} files out of ${requestedFiles.length}`);
    }

    if (requiresPrecompute) {
      reasons.push('request exceeds live git budget; precompute is recommended');
    }

    return {
      selectedFiles: selectedEntries.map((entry) => entry.file),
      metricsByFile,
      scopeReduced,
      scopeMode: scopeReduced ? 'top-files-only' : 'full',
      requiresPrecompute,
      reasons,
    };
  }

  private async resolveFileMetrics(file: string): Promise<FileDependencyMetrics> {
    const normalizedFile = normalizeProjectRelativePath(file, this.projectRoot);
    const modules = (await this.storage.findModulesByPath(file))
      .filter((module) => normalizeProjectRelativePath(module.path, this.projectRoot) === normalizedFile);
    const dependencyIds = new Set<string>();
    const dependentIds = new Set<string>();

    for (const module of modules) {
      for (const dependency of await this.storage.findDependencies(module.id)) {
        dependencyIds.add(dependency.targetId);
      }

      for (const dependency of await this.storage.findDependents(module.id)) {
        dependentIds.add(dependency.sourceId);
      }

      const impact = await this.storage.calculateImpact(module.id, this.impactDepth);
      for (const impactedModule of impact.affectedModules) {
        dependentIds.add(impactedModule.id);
      }
    }

    return {
      file,
      moduleIds: modules.map((module) => module.id),
      dependencyIds: [...dependencyIds],
      dependentIds: [...dependentIds],
      gravity: dependencyIds.size + dependentIds.size,
      impact: dependentIds.size,
    };
  }

  private async resolveSymbolMetrics(candidate: HistorySymbolCandidate): Promise<SymbolDependencyMetrics> {
    const fileMetrics = await this.resolveFileMetrics(candidate.file);
    const dependencyIds = new Set(fileMetrics.dependencyIds);
    const dependentIds = new Set(fileMetrics.dependentIds);

    for (const callee of await this.storage.findCallees(candidate.symbolId)) {
      dependencyIds.add(callee.id);
    }

    for (const caller of await this.storage.findCallers(candidate.symbolId)) {
      dependentIds.add(caller.id);
    }

    return {
      dependencyIds: [...dependencyIds],
      dependentIds: [...dependentIds],
      gravity: dependencyIds.size + dependentIds.size,
      impact: dependentIds.size,
    };
  }

  private calculateOverallConfidence(
    confidences: HistoryConfidence[],
    requiresDowngrade: boolean
  ): HistoryConfidence {
    const best = confidences.reduce<HistoryConfidence>(
      (current, confidence) => pickHigherConfidence(current, confidence),
      'unavailable'
    );
    return requiresDowngrade ? downgradeConfidence(best) : best;
  }

  private combinePersistedRisk(signals: FileHistorySignal[]): HistoryRiskScore {
    const availableSignals = signals.filter((signal) => signal.risk.score !== null);
    if (availableSignals.length === 0) {
      return createUnavailableRiskScore('no persisted history risk available');
    }

    const topSignal = availableSignals.reduce((current, signal) => (
      (signal.risk.score ?? -1) > (current.risk.score ?? -1) ? signal : current
    ));
    const riskFactors = uniqueValues(
      availableSignals.flatMap((signal) => signal.risk.riskFactors)
    );

    return {
      level: topSignal.risk.level,
      score: Math.max(...availableSignals.map((signal) => signal.risk.score ?? 0)),
      gravity: Math.max(...availableSignals.map((signal) => signal.risk.gravity ?? 0)),
      heat: topSignal.risk.heat,
      impact: Math.max(...availableSignals.map((signal) => signal.risk.impact ?? 0)),
      riskFactors,
    };
  }

  private getHistoryRiskStorageAdapter(): HistoryRiskStorageAdapter | null {
    return isHistoryRiskStorageAdapter(this.storage) ? this.storage : null;
  }
}
