// [META] since:2026-04 | owner:architecture-team | stable:false
// [WHY] SQLite storage adapter - normalized governance truth source for Phase 26
// ============================================
// SQLite 存储适配器 - Phase 26 的规范化治理真相源
// ============================================

import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type {
  StorageConfig,
  Cycle,
  GraphMetadata,
  ImpactResult,
  ProjectStatistics,
  SymbolImpactResult,
} from '../../../interface/types/storage.js';
import type {
  CodeGraph,
  Module,
  Symbol,
  Dependency,
} from '../../../interface/types/index.js';
import type {
  FileHistorySignal,
  HistoryRiskSnapshotPayload,
  HistoryRiskSnapshotRecord,
  HistorySignalDiagnostics,
  HistorySymbolCandidate,
  HistoryTimelineEntry,
  SymbolHistoryResult,
} from '../../../interface/types/history-risk.js';
import { StorageBase, StorageError } from '../interfaces/StorageBase.js';
import {
  calculateImpactInGraph,
  cloneCodeGraph,
  createEmptyCodeGraph,
  deserializeCodeGraphSnapshot,
  detectCyclesInGraph,
  findCalleesInGraph,
  findCallersInGraph,
  getProjectStatisticsFromGraph,
  serializeCodeGraphSnapshot,
  upsertModuleInGraph,
} from '../graph-helpers.js';
import {
  CURRENT_SQLITE_SCHEMA_VERSION,
  SQLITE_GOVERNANCE_SCHEMA_SQL,
  SQLITE_SCHEMA_VERSION_UPSERT_SQL,
} from '../sqlite/schema.js';
import {
  GovernanceGraphCache,
  readGovernanceGraphFromSQLite,
} from '../sqlite/GovernanceGraphCache.js';
import {
  DEFAULT_GOVERNANCE_GRAPH_PERF_THRESHOLDS,
  type GovernanceGraphPerfThresholds,
  type GovernanceGraphRuntimeStats,
} from '../sqlite/perf-thresholds.js';

interface SQLiteStatementLike {
  run: (...params: unknown[]) => unknown;
  get: (...params: unknown[]) => Record<string, unknown> | undefined;
  all: (...params: unknown[]) => Array<Record<string, unknown>>;
}

interface SQLiteDatabaseLike {
  exec: (sql: string) => unknown;
  prepare: (sql: string) => SQLiteStatementLike;
  pragma?: (pragma: string) => unknown;
  close: () => void;
}

type SQLiteConstructor = new (filename: string) => SQLiteDatabaseLike;
type SQLiteEntityType = 'module' | 'symbol';

interface FileHistorySignalMetadata {
  file: string;
  risk: FileHistorySignal['risk'];
  diagnostics: HistorySignalDiagnostics;
}

interface SymbolHistorySignalMetadata {
  query: string;
  candidates: HistorySymbolCandidate[];
  symbol: HistorySymbolCandidate | null;
  files: string[];
  risk: SymbolHistoryResult['risk'];
  diagnostics: HistorySignalDiagnostics;
}

const GRAPH_STATUS_METADATA_KEY = 'graph_status';
const FAILED_FILE_COUNT_METADATA_KEY = 'failed_file_count';
const PARSE_FAILURE_FILES_METADATA_KEY = 'parse_failure_files_json';
const LAST_GRAPH_SYNC_AT_METADATA_KEY = 'last_graph_sync_at';

export interface SQLiteStorageRuntimeOptions {
  readonly governanceGraphThresholds?: GovernanceGraphPerfThresholds;
}

import { loadSQLite } from './sqlite-loader.js';

async function loadSQLiteModule(): Promise<SQLiteConstructor> {
  return loadSQLite();
}

function toStringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toNumberValue(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : Number(value ?? fallback);
}

function toOptionalNumberValue(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return value;
  }

  if (value === null || value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseJsonValue<T>(value: unknown): T | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function toGraphStatus(value: unknown): NonNullable<CodeGraph['graphStatus']> {
  return toStringValue(value) === 'partial' ? 'partial' : 'complete';
}

function normalizeParseFailureFiles(value: unknown): string[] {
  const parsedValue = parseJsonValue<unknown>(value);
  if (!Array.isArray(parsedValue)) {
    return [];
  }

  return parsedValue.filter((item): item is string => typeof item === 'string');
}

function readGraphIntegrityMetadata(database: SQLiteDatabaseLike): Required<
  Pick<CodeGraph, 'graphStatus' | 'failedFileCount' | 'parseFailureFiles'>
> {
  const metadataRows = database.prepare(`
    SELECT key, value
    FROM metadata
    WHERE key IN (?, ?, ?)
  `).all(
    GRAPH_STATUS_METADATA_KEY,
    FAILED_FILE_COUNT_METADATA_KEY,
    PARSE_FAILURE_FILES_METADATA_KEY
  );
  const metadataMap = new Map(
    metadataRows.map(row => [toStringValue(row.key), row.value])
  );
  const parseFailureFiles = normalizeParseFailureFiles(
    metadataMap.get(PARSE_FAILURE_FILES_METADATA_KEY)
  );

  return {
    graphStatus: toGraphStatus(metadataMap.get(GRAPH_STATUS_METADATA_KEY)),
    failedFileCount: toNumberValue(
      metadataMap.get(FAILED_FILE_COUNT_METADATA_KEY),
      parseFailureFiles.length
    ),
    parseFailureFiles,
  };
}

function readGraphMetadata(database: SQLiteDatabaseLike): GraphMetadata {
  const countsRow = database
    .prepare(`
      SELECT
        (SELECT COUNT(*) FROM modules) AS module_count,
        (SELECT COUNT(*) FROM symbols) AS symbol_count
    `)
    .get();
  const metadataRows = database
    .prepare(`
      SELECT key, value
      FROM metadata
      WHERE key IN (?, ?, ?, ?)
    `)
    .all(
      GRAPH_STATUS_METADATA_KEY,
      FAILED_FILE_COUNT_METADATA_KEY,
      PARSE_FAILURE_FILES_METADATA_KEY,
      LAST_GRAPH_SYNC_AT_METADATA_KEY
    );
  const metadataMap = new Map(
    metadataRows.map(row => [toStringValue(row.key), row.value])
  );
  const parseFailureFiles = normalizeParseFailureFiles(
    metadataMap.get(PARSE_FAILURE_FILES_METADATA_KEY)
  );
  const moduleCount = toNumberValue(countsRow?.module_count);
  const symbolCount = toNumberValue(countsRow?.symbol_count);
  const hasMaterializedGraph = moduleCount > 0 || symbolCount > 0;

  return {
    generatedAt: hasMaterializedGraph
      ? toStringValue(metadataMap.get(LAST_GRAPH_SYNC_AT_METADATA_KEY)) || null
      : null,
    graphStatus: toGraphStatus(metadataMap.get(GRAPH_STATUS_METADATA_KEY)),
    failedFileCount: toNumberValue(
      metadataMap.get(FAILED_FILE_COUNT_METADATA_KEY),
      parseFailureFiles.length
    ),
    parseFailureFiles,
    moduleCount,
    symbolCount,
  };
}

function createHistorySnapshotId(recordedAt: string): string {
  const compactTimestamp = recordedAt.replace(/[^0-9]/g, '');
  const entropy = Math.random().toString(16).slice(2, 10);
  return `history-${compactTimestamp}-${entropy}`;
}

function inferEntityType(entityId: string, symbolIds: ReadonlySet<string>): SQLiteEntityType {
  return symbolIds.has(entityId) ? 'symbol' : 'module';
}

function resolveEntityType(
  entityType: SQLiteEntityType | undefined,
  entityId: string,
  symbolIds: ReadonlySet<string>
): SQLiteEntityType {
  return entityType ?? inferEntityType(entityId, symbolIds);
}

function hasColumn(database: SQLiteDatabaseLike, tableName: string, columnName: string): boolean {
  const rows = database.prepare(`PRAGMA table_info(${tableName})`).all();
  return rows.some((row) => toStringValue(row.name) === columnName);
}

function addColumnIfMissing(
  database: SQLiteDatabaseLike,
  tableName: string,
  columnName: string,
  definition: string
): void {
  if (!hasColumn(database, tableName, columnName)) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
  }
}

function createUnavailableHistoryDiagnostics(reason: string): HistorySignalDiagnostics {
  return {
    status: 'unavailable',
    confidence: 'unavailable',
    freshness: 'unknown',
    source: 'unavailable',
    reasons: [reason],
    analyzedAt: null,
    scopeMode: 'partial',
    requestedFiles: 0,
    analyzedFiles: 0,
    requiresPrecompute: false,
  };
}

function createUnavailableSymbolHistoryResult(query: string, reason: string): SymbolHistoryResult {
  return {
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
      riskFactors: [reason],
    },
    diagnostics: createUnavailableHistoryDiagnostics(reason),
  };
}

function removeModuleAndOwnedRelations(graph: CodeGraph, moduleId: string): CodeGraph {
  const nextGraph = cloneCodeGraph(graph);
  const removedSymbolIds = new Set(
    nextGraph.symbols
      .filter(symbol => symbol.moduleId === moduleId)
      .map(symbol => symbol.id)
  );

  nextGraph.modules = nextGraph.modules.filter(module => module.id !== moduleId);
  nextGraph.symbols = nextGraph.symbols.filter(symbol => symbol.moduleId !== moduleId);
  nextGraph.dependencies = nextGraph.dependencies.filter(
    dependency => dependency.sourceId !== moduleId
      && dependency.targetId !== moduleId
      && !removedSymbolIds.has(dependency.sourceId)
      && !removedSymbolIds.has(dependency.targetId)
  );

  return nextGraph;
}

export class SQLiteStorage extends StorageBase {
  readonly type = 'sqlite' as const;

  private database: SQLiteDatabaseLike | null = null;
  private readonly storageConfig: StorageConfig;
  private readonly runtimeOptions: SQLiteStorageRuntimeOptions;
  private governanceGraphCache: GovernanceGraphCache | null = null;

  constructor(config: StorageConfig, runtimeOptions: SQLiteStorageRuntimeOptions = {}) {
    super();
    this.storageConfig = config;
    this.runtimeOptions = runtimeOptions;
  }

  protected async doInitialize(): Promise<void> {
    if (!this.projectPath) {
      throw new StorageError(
        'Project path not set',
        'PROJECT_PATH_NOT_SET'
      );
    }

    try {
      const databasePath = this.storageConfig.databasePath
        ? join(this.projectPath, this.storageConfig.databasePath)
        : join(this.projectPath, '.codemap', 'governance.sqlite');

      await mkdir(dirname(databasePath), { recursive: true });

      const Database = await loadSQLiteModule();
      this.database = new Database(databasePath);
      this.database.pragma?.('journal_mode = WAL');
      this.database.pragma?.('foreign_keys = ON');
      this.database.exec(SQLITE_GOVERNANCE_SCHEMA_SQL);
      this.ensureSchemaColumns(this.database);
      this.database
        .prepare(SQLITE_SCHEMA_VERSION_UPSERT_SQL)
        .run('schema_version', CURRENT_SQLITE_SCHEMA_VERSION);

      this.backfillLegacySnapshotIfNeeded(this.database);
      this.refreshGovernanceGraphCache(this.database);
    } catch (error) {
      throw new StorageError(
        'Failed to initialize SQLite storage',
        'SQLITE_INIT_FAILED',
        error
      );
    }
  }

  protected async doClose(): Promise<void> {
    if (this.database) {
      this.database.close();
      this.database = null;
    }
    this.governanceGraphCache = null;
  }

  async saveCodeGraph(graph: CodeGraph): Promise<void> {
    const database = this.getDatabase();
    this.replaceCurrentGraph(database, graph, 'save-code-graph');
  }

  async loadCodeGraph(): Promise<CodeGraph> {
    return this.readCodeGraph(this.getDatabase());
  }

  async loadGraphMetadata(): Promise<GraphMetadata> {
    return readGraphMetadata(this.getDatabase());
  }

  async deleteProject(): Promise<void> {
    const database = this.getDatabase();
    this.runInTransaction(database, () => {
      database.prepare('DELETE FROM history_relations').run();
      database.prepare('DELETE FROM history_snapshots').run();
      database.prepare('DELETE FROM dependencies').run();
      database.prepare('DELETE FROM symbols').run();
      database.prepare('DELETE FROM modules').run();
      database.prepare('DELETE FROM projects').run();
      database.prepare('DELETE FROM snapshots').run();
    });
    this.refreshGovernanceGraphCache(database);
  }

  async updateModule(module: Module): Promise<void> {
    const currentGraph = await this.loadCodeGraph();
    await this.saveCodeGraph(upsertModuleInGraph(currentGraph, module));
  }

  async deleteModule(moduleId: string): Promise<void> {
    const currentGraph = await this.loadCodeGraph();
    await this.saveCodeGraph(removeModuleAndOwnedRelations(currentGraph, moduleId));
  }

  async findModuleById(id: string): Promise<Module | null> {
    const row = this.getDatabase()
      .prepare(`
        SELECT id, project_id, path, language, lines, code_lines, comment_lines, blank_lines
        FROM modules
        WHERE id = ?
        LIMIT 1
      `)
      .get(id);

    return row ? this.mapModuleRow(row) : null;
  }

  async findModulesByPath(path: string): Promise<Module[]> {
    const rows = this.getDatabase()
      .prepare(`
        SELECT id, project_id, path, language, lines, code_lines, comment_lines, blank_lines
        FROM modules
        WHERE instr(path, ?) > 0
        ORDER BY path, id
      `)
      .all(path);

    return rows.map(row => this.mapModuleRow(row));
  }

  async findSymbolByName(name: string): Promise<Symbol[]> {
    const rows = this.getDatabase()
      .prepare(`
        SELECT id, module_id, name, kind, signature, file_path, line, column_number, end_line, end_column, visibility
        FROM symbols
        WHERE instr(name, ?) > 0
        ORDER BY name, id
      `)
      .all(name);

    return rows.map(row => this.mapSymbolRow(row));
  }

  async findSymbolById(id: string): Promise<Symbol | null> {
    const row = this.getDatabase()
      .prepare(`
        SELECT id, module_id, name, kind, signature, file_path, line, column_number, end_line, end_column, visibility
        FROM symbols
        WHERE id = ?
        LIMIT 1
      `)
      .get(id);

    return row ? this.mapSymbolRow(row) : null;
  }

  async findDependencies(moduleId: string): Promise<Dependency[]> {
    const cachedDependencies = this.governanceGraphCache?.findDependencies(moduleId);
    if (cachedDependencies) {
      return cachedDependencies;
    }

    const rows = this.getDatabase()
      .prepare(`
        SELECT id, source_id, source_entity_type, target_id, target_entity_type, dependency_type, file_path, line, confidence
        FROM dependencies
        WHERE source_id = ?
        ORDER BY id
      `)
      .all(moduleId);

    return rows.map(row => this.mapDependencyRow(row));
  }

  async findDependents(moduleId: string): Promise<Dependency[]> {
    const cachedDependents = this.governanceGraphCache?.findDependents(moduleId);
    if (cachedDependents) {
      return cachedDependents;
    }

    const rows = this.getDatabase()
      .prepare(`
        SELECT id, source_id, source_entity_type, target_id, target_entity_type, dependency_type, file_path, line, confidence
        FROM dependencies
        WHERE target_id = ?
        ORDER BY id
      `)
      .all(moduleId);

    return rows.map(row => this.mapDependencyRow(row));
  }

  async findCallers(functionId: string): Promise<Symbol[]> {
    const rows = this.getDatabase()
      .prepare(`
        SELECT s.id, s.module_id, s.name, s.kind, s.signature, s.file_path, s.line, s.column_number, s.end_line, s.end_column, s.visibility
        FROM dependencies d
        INNER JOIN symbols s ON s.id = d.source_id
        WHERE d.target_id = ?
          AND d.dependency_type = 'call'
        ORDER BY s.id
      `)
      .all(functionId);

    return rows.map(row => this.mapSymbolRow(row));
  }

  async findCallees(functionId: string): Promise<Symbol[]> {
    const rows = this.getDatabase()
      .prepare(`
        SELECT s.id, s.module_id, s.name, s.kind, s.signature, s.file_path, s.line, s.column_number, s.end_line, s.end_column, s.visibility
        FROM dependencies d
        INNER JOIN symbols s ON s.id = d.target_id
        WHERE d.source_id = ?
          AND d.dependency_type = 'call'
        ORDER BY s.id
      `)
      .all(functionId);

    return rows.map(row => this.mapSymbolRow(row));
  }

  async detectCycles(): Promise<Cycle[]> {
    const cachedCycles = this.governanceGraphCache?.detectCycles();
    if (cachedCycles) {
      return cachedCycles;
    }

    return detectCyclesInGraph(this.readGovernanceGraphForAnalysis(this.getDatabase()));
  }

  async calculateImpact(moduleId: string, depth: number): Promise<ImpactResult> {
    const cachedImpact = this.governanceGraphCache?.calculateImpact(moduleId, depth);
    if (cachedImpact) {
      return cachedImpact;
    }

    return calculateImpactInGraph(
      this.readGovernanceGraphForAnalysis(this.getDatabase()),
      moduleId,
      depth
    );
  }

  async calculateSymbolImpact(
    symbolId: string,
    depth: number,
    limit: number
  ): Promise<SymbolImpactResult> {
    const database = this.getDatabase();
    const rootSymbol = await this.findSymbolById(symbolId);
    if (!rootSymbol) {
      throw new StorageError(
        `Symbol ${symbolId} not found`,
        'SYMBOL_NOT_FOUND'
      );
    }

    const selectCallers = database.prepare(`
      SELECT s.id, s.module_id, s.name, s.kind, s.signature, s.file_path, s.line, s.column_number, s.end_line, s.end_column, s.visibility
      FROM dependencies d
      INNER JOIN symbols s ON s.id = d.source_id
      WHERE d.target_id = ?
        AND d.dependency_type = 'call'
      ORDER BY d.id, s.id
    `);

    const affectedSymbols: SymbolImpactResult['affectedSymbols'] = [];
    const visited = new Set<string>([symbolId]);
    const queue: Array<{ id: string; level: number; path: string[] }> = [{
      id: symbolId,
      level: 0,
      path: [symbolId],
    }];
    let truncated = false;

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }

      if (current.level >= depth) {
        continue;
      }

      const callerRows = selectCallers.all(current.id);
      for (const row of callerRows) {
        if (affectedSymbols.length >= limit) {
          truncated = true;
          queue.length = 0;
          break;
        }

        const callerId = toStringValue(row.id);
        if (visited.has(callerId)) {
          continue;
        }

        visited.add(callerId);
        const callerSymbol = this.mapSymbolRow(row);
        const nextLevel = current.level + 1;
        const nextPath = [...current.path, callerId];

        affectedSymbols.push({
          symbol: callerSymbol,
          depth: nextLevel,
          path: nextPath,
        });

        queue.push({
          id: callerId,
          level: nextLevel,
          path: nextPath,
        });
      }
    }

    return {
      rootSymbol,
      affectedSymbols,
      depth,
      limit,
      truncated,
    };
  }

  async getStatistics(): Promise<ProjectStatistics> {
    const database = this.getDatabase();
    const row = database
      .prepare(`
        SELECT
          (SELECT COUNT(*) FROM modules) AS total_modules,
          (SELECT COUNT(*) FROM symbols) AS total_symbols,
          (SELECT COUNT(*) FROM dependencies) AS total_dependencies,
          (SELECT COALESCE(SUM(lines), 0) FROM modules) AS total_lines
      `)
      .get();

    if (!row) {
      return getProjectStatisticsFromGraph(createEmptyCodeGraph(this.projectPath ?? ''));
    }

    return {
      totalModules: toNumberValue(row.total_modules),
      totalSymbols: toNumberValue(row.total_symbols),
      totalDependencies: toNumberValue(row.total_dependencies),
      totalLines: toNumberValue(row.total_lines),
      averageComplexity: 0,
    };
  }

  async saveHistoryRiskSnapshot(
    payload: HistoryRiskSnapshotPayload
  ): Promise<HistoryRiskSnapshotRecord> {
    const database = this.getDatabase();
    const recordedAt = payload.recordedAt ?? new Date().toISOString();
    const snapshotId = createHistorySnapshotId(recordedAt);
    const projectId = toStringValue(
      database.prepare('SELECT id FROM projects LIMIT 1').get()?.id,
      'history-risk-project'
    );
    const fileSignals = payload.fileSignals ?? [];
    const symbolSignals = payload.symbolSignals ?? [];
    const relationCount = fileSignals.reduce((sum, signal) => sum + signal.timeline.length + 1, 0)
      + symbolSignals.reduce((sum, signal) => sum + signal.timeline.length + 1, 0);
    const insertSnapshot = database.prepare(`
      INSERT INTO history_snapshots (
        id, project_id, recorded_at, snapshot_source, module_count, symbol_count, dependency_count
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertRelation = database.prepare(`
      INSERT INTO history_relations (
        id, snapshot_id, relation_type, source_id, source_entity_type, target_id, target_entity_type, observed_at, metadata_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.runInTransaction(database, () => {
      insertSnapshot.run(
        snapshotId,
        projectId,
        recordedAt,
        payload.source,
        fileSignals.length,
        symbolSignals.length,
        relationCount
      );

      for (const signal of fileSignals) {
        insertRelation.run(
          `${snapshotId}:file-signal:${signal.file}`,
          snapshotId,
          'file_history_signal',
          signal.file,
          'module',
          null,
          null,
          recordedAt,
          JSON.stringify({
            file: signal.file,
            risk: signal.risk,
            diagnostics: signal.diagnostics,
          } satisfies FileHistorySignalMetadata)
        );

        for (const entry of signal.timeline) {
          insertRelation.run(
            `${snapshotId}:file-commit:${signal.file}:${entry.hash}`,
            snapshotId,
            'file_history_commit',
            signal.file,
            'module',
            entry.hash,
            'commit',
            entry.date,
            JSON.stringify(entry)
          );
        }
      }

      for (const signal of symbolSignals) {
        const symbolId = signal.symbol?.symbolId;
        if (!symbolId) {
          continue;
        }

        insertRelation.run(
          `${snapshotId}:symbol-signal:${symbolId}`,
          snapshotId,
          'symbol_history_signal',
          symbolId,
          'symbol',
          signal.symbol?.moduleId ?? null,
          signal.symbol ? 'module' : null,
          recordedAt,
          JSON.stringify({
            query: signal.query,
            candidates: signal.candidates,
            symbol: signal.symbol,
            files: signal.files,
            risk: signal.risk,
            diagnostics: signal.diagnostics,
          } satisfies SymbolHistorySignalMetadata)
        );

        for (const entry of signal.timeline) {
          insertRelation.run(
            `${snapshotId}:symbol-commit:${symbolId}:${entry.hash}`,
            snapshotId,
            'symbol_history_commit',
            symbolId,
            'symbol',
            entry.hash,
            'commit',
            entry.date,
            JSON.stringify(entry)
          );
        }
      }

      database
        .prepare(SQLITE_SCHEMA_VERSION_UPSERT_SQL)
        .run('last_history_risk_sync_at', recordedAt);
    });

    return {
      snapshotId,
      recordedAt,
      source: payload.source,
    };
  }

  async loadLatestFileHistorySignal(file: string): Promise<FileHistorySignal | null> {
    const database = this.getDatabase();
    const row = database
      .prepare(`
        SELECT snapshot_id, metadata_json
        FROM history_relations
        WHERE relation_type = 'file_history_signal'
          AND source_id = ?
        ORDER BY observed_at DESC
        LIMIT 1
      `)
      .get(file);

    if (!row) {
      return null;
    }

    const metadata = parseJsonValue<FileHistorySignalMetadata>(row.metadata_json);
    if (!metadata) {
      return {
        file,
        risk: {
          level: 'unavailable',
          score: null,
          gravity: null,
          heat: null,
          impact: null,
          riskFactors: ['stored file history metadata is invalid'],
        },
        timeline: [],
        diagnostics: createUnavailableHistoryDiagnostics('stored file history metadata is invalid'),
      };
    }

    const timelineRows = database
      .prepare(`
        SELECT metadata_json
        FROM history_relations
        WHERE relation_type = 'file_history_commit'
          AND source_id = ?
          AND snapshot_id = ?
        ORDER BY observed_at DESC, target_id DESC
      `)
      .all(file, toStringValue(row.snapshot_id));
    const timeline = timelineRows
      .map((timelineRow) => parseJsonValue<HistoryTimelineEntry>(timelineRow.metadata_json))
      .filter((entry): entry is HistoryTimelineEntry => entry !== null)
      .sort((left, right) => right.date.localeCompare(left.date));

    return {
      file: metadata.file,
      risk: metadata.risk,
      timeline,
      diagnostics: metadata.diagnostics,
    };
  }

  async loadLatestSymbolHistoryResult(
    symbolId: string,
    query: string = symbolId
  ): Promise<SymbolHistoryResult> {
    const database = this.getDatabase();
    const row = database
      .prepare(`
        SELECT snapshot_id, metadata_json
        FROM history_relations
        WHERE relation_type = 'symbol_history_signal'
          AND source_id = ?
        ORDER BY observed_at DESC
        LIMIT 1
      `)
      .get(symbolId);

    if (!row) {
      return createUnavailableSymbolHistoryResult(
        query,
        'no materialized history snapshot found for symbol'
      );
    }

    const metadata = parseJsonValue<SymbolHistorySignalMetadata>(row.metadata_json);
    if (!metadata) {
      return createUnavailableSymbolHistoryResult(
        query,
        'stored symbol history metadata is invalid'
      );
    }

    const timelineRows = database
      .prepare(`
        SELECT metadata_json
        FROM history_relations
        WHERE relation_type = 'symbol_history_commit'
          AND source_id = ?
          AND snapshot_id = ?
        ORDER BY observed_at DESC, target_id DESC
      `)
      .all(symbolId, toStringValue(row.snapshot_id));
    const timeline = timelineRows
      .map((timelineRow) => parseJsonValue<HistoryTimelineEntry>(timelineRow.metadata_json))
      .filter((entry): entry is HistoryTimelineEntry => entry !== null)
      .sort((left, right) => right.date.localeCompare(left.date));

    return {
      query: metadata.query || query,
      candidates: metadata.candidates,
      symbol: metadata.symbol,
      files: metadata.files,
      timeline,
      risk: metadata.risk,
      diagnostics: metadata.diagnostics,
    };
  }

  getGovernanceGraphRuntimeStats(): GovernanceGraphRuntimeStats {
    return this.governanceGraphCache?.getStats() ?? {
      cacheMode: 'sqlite-direct',
      thresholds: this.runtimeOptions.governanceGraphThresholds ?? DEFAULT_GOVERNANCE_GRAPH_PERF_THRESHOLDS,
      moduleCount: 0,
      dependencyCount: 0,
      loadMs: 0,
      rssDeltaMb: 0,
      warning: 'governance graph cache not initialized',
    };
  }

  private ensureSchemaColumns(database: SQLiteDatabaseLike): void {
    addColumnIfMissing(database, 'symbols', 'signature', 'signature TEXT');
    addColumnIfMissing(database, 'dependencies', 'file_path', 'file_path TEXT');
    addColumnIfMissing(database, 'dependencies', 'line', 'line INTEGER');
    addColumnIfMissing(database, 'dependencies', 'confidence', 'confidence TEXT');
  }

  private backfillLegacySnapshotIfNeeded(database: SQLiteDatabaseLike): void {
    const hasCurrentProject = toNumberValue(
      database.prepare('SELECT COUNT(*) AS count FROM projects').get()?.count
    ) > 0;

    if (hasCurrentProject) {
      return;
    }

    const legacySnapshot = database
      .prepare(`
        SELECT graph_json, updated_at
        FROM snapshots
        ORDER BY updated_at DESC
        LIMIT 1
      `)
      .get();

    const snapshotJson = toStringValue(legacySnapshot?.graph_json);
    if (!snapshotJson) {
      return;
    }

    const recordedAt = toStringValue(legacySnapshot?.updated_at, new Date().toISOString());
    const graph = deserializeCodeGraphSnapshot(snapshotJson, this.projectPath ?? '');
    this.replaceCurrentGraph(database, graph, 'legacy-snapshot-backfill', recordedAt);
    database
      .prepare(SQLITE_SCHEMA_VERSION_UPSERT_SQL)
      .run('legacy_snapshot_backfilled_at', recordedAt);
  }

  private replaceCurrentGraph(
    database: SQLiteDatabaseLike,
    graph: CodeGraph,
    historySource: string,
    recordedAt: string = new Date().toISOString()
  ): void {
    const normalizedGraph = this.normalizeGraph(graph);
    const symbolIds = new Set(normalizedGraph.symbols.map(symbol => symbol.id));
    const upsertMetadata = database.prepare(SQLITE_SCHEMA_VERSION_UPSERT_SQL);
    const insertProject = database.prepare(`
      INSERT INTO projects (id, name, root_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const insertModule = database.prepare(`
      INSERT INTO modules (
        id, project_id, path, language, lines, code_lines, comment_lines, blank_lines
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertSymbol = database.prepare(`
      INSERT INTO symbols (
        id, module_id, name, kind, signature, file_path, line, column_number, end_line, end_column, visibility
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertDependency = database.prepare(`
      INSERT INTO dependencies (
        id, source_id, source_entity_type, target_id, target_entity_type, dependency_type, file_path, line, confidence
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertSnapshotMirror = database.prepare(`
      INSERT INTO snapshots (id, project_id, graph_json, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    const insertHistorySnapshot = database.prepare(`
      INSERT INTO history_snapshots (
        id, project_id, recorded_at, snapshot_source, module_count, symbol_count, dependency_count
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertHistoryRelation = database.prepare(`
      INSERT INTO history_relations (
        id, snapshot_id, relation_type, source_id, source_entity_type, target_id, target_entity_type, observed_at, metadata_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const snapshotId = createHistorySnapshotId(recordedAt);

    this.runInTransaction(database, () => {
      database.prepare('DELETE FROM dependencies').run();
      database.prepare('DELETE FROM symbols').run();
      database.prepare('DELETE FROM modules').run();
      database.prepare('DELETE FROM projects').run();
      database.prepare('DELETE FROM snapshots').run();

      insertProject.run(
        normalizedGraph.project.id,
        normalizedGraph.project.name,
        normalizedGraph.project.rootPath,
        normalizedGraph.project.createdAt.toISOString(),
        normalizedGraph.project.updatedAt.toISOString()
      );

      for (const module of normalizedGraph.modules) {
        insertModule.run(
          module.id,
          module.projectId,
          module.path,
          module.language,
          module.stats.lines,
          module.stats.codeLines,
          module.stats.commentLines,
          module.stats.blankLines
        );
      }

      for (const symbol of normalizedGraph.symbols) {
        insertSymbol.run(
          symbol.id,
          symbol.moduleId,
          symbol.name,
          symbol.kind,
          symbol.signature ?? null,
          symbol.location.file,
          symbol.location.line,
          symbol.location.column,
          symbol.location.endLine ?? null,
          symbol.location.endColumn ?? null,
          symbol.visibility
        );
      }

      for (const dependency of normalizedGraph.dependencies) {
        const sourceEntityType = resolveEntityType(dependency.sourceEntityType, dependency.sourceId, symbolIds);
        const targetEntityType = resolveEntityType(dependency.targetEntityType, dependency.targetId, symbolIds);
        insertDependency.run(
          dependency.id,
          dependency.sourceId,
          sourceEntityType,
          dependency.targetId,
          targetEntityType,
          dependency.type,
          dependency.filePath ?? null,
          dependency.line ?? null,
          dependency.confidence ?? null
        );
      }

      insertSnapshotMirror.run(
        'codemap-snapshot',
        normalizedGraph.project.id,
        serializeCodeGraphSnapshot(normalizedGraph),
        recordedAt
      );

      insertHistorySnapshot.run(
        snapshotId,
        normalizedGraph.project.id,
        recordedAt,
        historySource,
        normalizedGraph.modules.length,
        normalizedGraph.symbols.length,
        normalizedGraph.dependencies.length
      );

      for (const module of normalizedGraph.modules) {
        insertHistoryRelation.run(
          `${snapshotId}:module:${module.id}`,
          snapshotId,
          'module_snapshot',
          module.id,
          'module',
          null,
          null,
          recordedAt,
          JSON.stringify({
            path: module.path,
            language: module.language,
          })
        );
      }

      for (const symbol of normalizedGraph.symbols) {
        insertHistoryRelation.run(
          `${snapshotId}:symbol:${symbol.id}`,
          snapshotId,
          'symbol_snapshot',
          symbol.id,
          'symbol',
          symbol.moduleId,
          'module',
          recordedAt,
          JSON.stringify({
            name: symbol.name,
            kind: symbol.kind,
            signature: symbol.signature ?? null,
          })
        );
      }

      for (const dependency of normalizedGraph.dependencies) {
        const sourceEntityType = resolveEntityType(dependency.sourceEntityType, dependency.sourceId, symbolIds);
        const targetEntityType = resolveEntityType(dependency.targetEntityType, dependency.targetId, symbolIds);
        insertHistoryRelation.run(
          `${snapshotId}:dependency:${dependency.id}`,
          snapshotId,
          'dependency_snapshot',
          dependency.sourceId,
          sourceEntityType,
          dependency.targetId,
          targetEntityType,
          recordedAt,
          JSON.stringify({
            dependencyId: dependency.id,
            dependencyType: dependency.type,
            confidence: dependency.confidence ?? null,
            filePath: dependency.filePath ?? null,
            line: dependency.line ?? null,
          })
        );
      }

      upsertMetadata.run(GRAPH_STATUS_METADATA_KEY, normalizedGraph.graphStatus ?? 'complete');
      upsertMetadata.run(
        FAILED_FILE_COUNT_METADATA_KEY,
        String(normalizedGraph.failedFileCount ?? 0)
      );
      upsertMetadata.run(
        PARSE_FAILURE_FILES_METADATA_KEY,
        JSON.stringify(normalizedGraph.parseFailureFiles ?? [])
      );
      upsertMetadata.run(LAST_GRAPH_SYNC_AT_METADATA_KEY, recordedAt);
    });

    this.refreshGovernanceGraphCache(database);
  }

  private normalizeGraph(graph: CodeGraph): CodeGraph {
    const projectRootPath = graph.project.rootPath || this.projectPath || '';

    return {
      project: {
        ...graph.project,
        rootPath: projectRootPath,
        createdAt: new Date(graph.project.createdAt),
        updatedAt: new Date(graph.project.updatedAt),
      },
      modules: graph.modules.map(module => ({
        ...module,
        stats: { ...module.stats },
      })),
      symbols: graph.symbols.map(symbol => ({
        ...symbol,
        location: { ...symbol.location },
      })),
      dependencies: graph.dependencies.map(dependency => ({ ...dependency })),
      graphStatus: graph.graphStatus ?? 'complete',
      failedFileCount: graph.failedFileCount ?? 0,
      parseFailureFiles: [...(graph.parseFailureFiles ?? [])],
    };
  }

  private readCodeGraph(database: SQLiteDatabaseLike): CodeGraph {
    const projectRow = database
      .prepare(`
        SELECT id, name, root_path, created_at, updated_at
        FROM projects
        LIMIT 1
      `)
      .get();

    if (!projectRow) {
      return createEmptyCodeGraph(this.projectPath ?? '');
    }

    const modules = database
      .prepare(`
        SELECT id, project_id, path, language, lines, code_lines, comment_lines, blank_lines
        FROM modules
        ORDER BY path, id
      `)
      .all()
      .map(row => this.mapModuleRow(row));
    const symbols = database
      .prepare(`
        SELECT id, module_id, name, kind, signature, file_path, line, column_number, end_line, end_column, visibility
        FROM symbols
        ORDER BY file_path, line, column_number, id
      `)
      .all()
      .map(row => this.mapSymbolRow(row));
    const dependencies = database
      .prepare(`
        SELECT id, source_id, source_entity_type, target_id, target_entity_type, dependency_type, file_path, line, confidence
        FROM dependencies
        ORDER BY id
      `)
      .all()
      .map(row => this.mapDependencyRow(row));
    const graphIntegrity = readGraphIntegrityMetadata(database);

    return {
      project: {
        id: toStringValue(projectRow.id),
        name: toStringValue(projectRow.name),
        rootPath: toStringValue(projectRow.root_path, this.projectPath ?? ''),
        createdAt: new Date(toStringValue(projectRow.created_at)),
        updatedAt: new Date(toStringValue(projectRow.updated_at)),
      },
      modules,
      symbols,
      dependencies,
      graphStatus: graphIntegrity.graphStatus,
      failedFileCount: graphIntegrity.failedFileCount,
      parseFailureFiles: graphIntegrity.parseFailureFiles,
    };
  }

  private mapModuleRow(row: Record<string, unknown>): Module {
    return {
      id: toStringValue(row.id),
      projectId: toStringValue(row.project_id),
      path: toStringValue(row.path),
      language: toStringValue(row.language),
      stats: {
        lines: toNumberValue(row.lines),
        codeLines: toNumberValue(row.code_lines),
        commentLines: toNumberValue(row.comment_lines),
        blankLines: toNumberValue(row.blank_lines),
      },
    };
  }

  private mapSymbolRow(row: Record<string, unknown>): Symbol {
    return {
      id: toStringValue(row.id),
      moduleId: toStringValue(row.module_id),
      name: toStringValue(row.name),
      kind: toStringValue(row.kind) as Symbol['kind'],
      signature: toStringValue(row.signature) || undefined,
      location: {
        file: toStringValue(row.file_path),
        line: toNumberValue(row.line),
        column: toNumberValue(row.column_number),
        endLine: toOptionalNumberValue(row.end_line),
        endColumn: toOptionalNumberValue(row.end_column),
      },
      visibility: toStringValue(row.visibility) as Symbol['visibility'],
    };
  }

  private mapDependencyRow(row: Record<string, unknown>): Dependency {
    return {
      id: toStringValue(row.id),
      sourceId: toStringValue(row.source_id),
      sourceEntityType: toStringValue(row.source_entity_type, 'module') as Dependency['sourceEntityType'],
      targetId: toStringValue(row.target_id),
      targetEntityType: toStringValue(row.target_entity_type, 'module') as Dependency['targetEntityType'],
      type: toStringValue(row.dependency_type) as Dependency['type'],
      filePath: toStringValue(row.file_path) || undefined,
      line: toOptionalNumberValue(row.line),
      confidence: toStringValue(row.confidence) === '' ? undefined : toStringValue(row.confidence) as Dependency['confidence'],
    };
  }

  private runInTransaction(database: SQLiteDatabaseLike, callback: () => void): void {
    database.exec('BEGIN');

    try {
      callback();
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  }

  private getDatabase(): SQLiteDatabaseLike {
    this.ensureInitialized();

    if (!this.database) {
      throw new StorageError(
        'SQLite connection not initialized',
        'SQLITE_CONNECTION_NOT_READY'
      );
    }

    return this.database;
  }

  private readGovernanceGraphForAnalysis(database: SQLiteDatabaseLike): CodeGraph {
    return readGovernanceGraphFromSQLite(database, this.projectPath ?? '');
  }

  private refreshGovernanceGraphCache(database: SQLiteDatabaseLike): void {
    const cache = new GovernanceGraphCache(
      database,
      this.projectPath ?? '',
      this.runtimeOptions.governanceGraphThresholds ?? DEFAULT_GOVERNANCE_GRAPH_PERF_THRESHOLDS
    );
    cache.hydrate();
    this.governanceGraphCache = cache;
  }
}
