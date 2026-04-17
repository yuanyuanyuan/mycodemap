// [META] since:2026-04-15 | owner:architecture-team | stable:false
// [WHY] Define canonical history/risk types shared by history, check, CI, and SQLite materialization

export type HistorySignalStatus = 'ok' | 'ambiguous' | 'not_found' | 'unavailable';

export type HistoryConfidence = 'high' | 'medium' | 'low' | 'unavailable';

export type HistoryFreshness = 'fresh' | 'stale' | 'expired' | 'unknown';

export type HistoryRiskLevel = 'high' | 'medium' | 'low' | 'unavailable';

export type HistorySignalSource = 'git-live' | 'sqlite-materialized' | 'sqlite-cache' | 'unavailable';

export type HistoryScopeMode = 'full' | 'partial' | 'top-files-only' | 'precompute-required';

export type HistoryCommitTagType =
  | 'BUGFIX'
  | 'FEATURE'
  | 'REFACTOR'
  | 'CONFIG'
  | 'DOCS'
  | 'DELETE'
  | 'UNKNOWN';

export type HistoryHeatTagType = HistoryCommitTagType | 'NEW';

export interface HistoryHeatSignal {
  freq30d: number;
  lastType: HistoryHeatTagType;
  lastDate: string | null;
  stability: boolean;
}

export interface HistoryRiskScore {
  level: HistoryRiskLevel;
  score: number | null;
  gravity: number | null;
  heat: HistoryHeatSignal | null;
  impact: number | null;
  riskFactors: string[];
}

export interface HistoryTimelineEntry {
  hash: string;
  message: string;
  date: string;
  author: string;
  files: string[];
  tagType: HistoryCommitTagType;
  tagScope: string;
  subject: string;
  riskWeight: number;
  source: 'file' | 'symbol';
}

export interface HistorySignalDiagnostics {
  status: HistorySignalStatus;
  confidence: HistoryConfidence;
  freshness: HistoryFreshness;
  source: HistorySignalSource;
  reasons: string[];
  analyzedAt: string | null;
  scopeMode: HistoryScopeMode;
  requestedFiles: number;
  analyzedFiles: number;
  requiresPrecompute: boolean;
}

export interface HistorySymbolCandidate {
  symbolId: string;
  moduleId: string;
  name: string;
  kind: string;
  file: string;
  line: number;
  exactNameMatch: boolean;
}

export interface FileHistorySignal {
  file: string;
  risk: HistoryRiskScore;
  timeline: HistoryTimelineEntry[];
  diagnostics: HistorySignalDiagnostics;
}

export interface FileHistoryAnalysisResult {
  requestedFiles: string[];
  files: FileHistorySignal[];
  aggregatedRisk: HistoryRiskScore;
  diagnostics: HistorySignalDiagnostics;
  snapshotId?: string;
}

export interface SymbolHistoryResult {
  query: string;
  candidates: HistorySymbolCandidate[];
  symbol: HistorySymbolCandidate | null;
  files: string[];
  timeline: HistoryTimelineEntry[];
  risk: HistoryRiskScore;
  diagnostics: HistorySignalDiagnostics;
  snapshotId?: string;
}

export interface HistoryRiskSnapshotPayload {
  recordedAt?: string;
  source: Exclude<HistorySignalSource, 'unavailable'>;
  fileSignals?: FileHistorySignal[];
  symbolSignals?: SymbolHistoryResult[];
}

export interface HistoryRiskSnapshotRecord {
  snapshotId: string;
  recordedAt: string;
  source: Exclude<HistorySignalSource, 'unavailable'>;
}
