// [META] since:2026-03 | owner:architecture-team | stable:false
// [WHY] KùzuDB storage adapter - graph database backend for large projects
// ============================================
// KùzuDB 存储适配器 - 适用于大型项目的图数据库后端
// ============================================

import { join } from 'path';
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
import { StorageBase, StorageError } from '../interfaces/StorageBase.js';
import {
  calculateImpactInGraph,
  calculateSymbolImpactInGraph,
  createEmptyCodeGraph,
  deleteModuleFromGraph,
  deserializeCodeGraphSnapshot,
  detectCyclesInGraph,
  findCalleesInGraph,
  findCallersInGraph,
  findDependenciesInGraph,
  findDependentsInGraph,
  getGraphMetadataFromGraph,
  getProjectStatisticsFromGraph,
  serializeCodeGraphSnapshot,
  upsertModuleInGraph,
} from '../graph-helpers.js';

interface KuzuDatabaseLike {
  close?: () => Promise<void> | void;
}

interface KuzuPreparedStatementLike {
  isSuccess?: () => boolean;
  getErrorMessage?: () => string;
}

interface KuzuQueryResultLike {
  getAll: () => Promise<Array<Record<string, unknown>>>;
  close?: () => Promise<void> | void;
}

interface KuzuConnectionLike {
  query: (statement: string) => Promise<KuzuQueryResultLike | KuzuQueryResultLike[]>;
  prepare?: (statement: string) => Promise<KuzuPreparedStatementLike>;
  execute?: (
    preparedStatement: KuzuPreparedStatementLike,
    params: Record<string, unknown>
  ) => Promise<KuzuQueryResultLike | KuzuQueryResultLike[]>;
  close?: () => Promise<void> | void;
}

interface KuzuModuleLike {
  Database: new (databasePath: string) => KuzuDatabaseLike;
  Connection: new (database: KuzuDatabaseLike) => KuzuConnectionLike;
}

async function loadKuzuModule(): Promise<KuzuModuleLike> {
  const moduleName = 'kuzu';
  return await import(moduleName) as unknown as KuzuModuleLike;
}

function normalizeKuzuResults(
  result: KuzuQueryResultLike | KuzuQueryResultLike[]
): KuzuQueryResultLike[] {
  return Array.isArray(result) ? result : [result];
}

async function closeKuzuResults(results: KuzuQueryResultLike[]): Promise<void> {
  for (const result of results) {
    if (typeof result.close === 'function') {
      await result.close();
    }
  }
}

/**
 * KùzuDB 存储适配器（可选依赖）
 *
 * 安装：npm install kuzu
 *
 * 特点：
 * - 嵌入式图数据库
 * - 本地持久化，无需单独服务进程
 * - 对 CodeGraph 提供 snapshot-backed persistence
 * - 查询/分析接口与共享 storage contract 保持一致
 */
export class KuzuDBStorage extends StorageBase {
  readonly type = 'kuzudb' as const;

  private db: KuzuDatabaseLike | null = null;
  private conn: KuzuConnectionLike | null = null;
  private readonly dbConfig: StorageConfig;

  constructor(config: StorageConfig) {
    super();
    this.dbConfig = config;
  }

  protected async doInitialize(): Promise<void> {
    if (!this.projectPath) {
      throw new StorageError(
        'Project path not set',
        'PROJECT_PATH_NOT_SET'
      );
    }

    try {
      const kuzu = await loadKuzuModule();
      const dbPath = this.dbConfig.databasePath
        ? join(this.projectPath, this.dbConfig.databasePath)
        : join(this.projectPath, '.codemap', 'kuzudb');

      this.db = new kuzu.Database(dbPath);
      this.conn = new kuzu.Connection(this.db);

      await this.runQuery(
        'CREATE NODE TABLE IF NOT EXISTS Snapshot(id STRING PRIMARY KEY, projectId STRING, graph STRING, updatedAt STRING);'
      );
    } catch (error) {
      throw new StorageError(
        'Failed to initialize KùzuDB storage',
        'KUZU_INIT_FAILED',
        error
      );
    }
  }

  protected async doClose(): Promise<void> {
    if (this.conn && typeof this.conn.close === 'function') {
      await this.conn.close();
    }

    if (this.db && typeof this.db.close === 'function') {
      await this.db.close();
    }

    this.conn = null;
    this.db = null;
  }

  async saveCodeGraph(graph: CodeGraph): Promise<void> {
    this.ensureInitialized();

    await this.runQuery('MATCH (s:Snapshot) DELETE s;');
    await this.executePrepared(
      'CREATE (s:Snapshot {id: $id, projectId: $projectId, graph: $graph, updatedAt: $updatedAt});',
      {
        id: 'codemap-snapshot',
        projectId: graph.project.id,
        graph: serializeCodeGraphSnapshot(graph),
        updatedAt: new Date().toISOString(),
      }
    );
  }

  async loadCodeGraph(): Promise<CodeGraph> {
    this.ensureInitialized();

    const rows = await this.queryRows('MATCH (s:Snapshot) RETURN s.graph AS graph LIMIT 1;');
    const snapshot = typeof rows[0]?.graph === 'string' ? rows[0].graph : null;

    if (!snapshot) {
      return createEmptyCodeGraph(this.projectPath ?? '');
    }

    return deserializeCodeGraphSnapshot(snapshot, this.projectPath ?? '');
  }

  async loadGraphMetadata(): Promise<GraphMetadata> {
    this.ensureInitialized();
    return getGraphMetadataFromGraph(await this.loadCodeGraph());
  }

  async deleteProject(): Promise<void> {
    this.ensureInitialized();
    await this.runQuery('MATCH (s:Snapshot) DELETE s;');
  }

  async updateModule(module: Module): Promise<void> {
    this.ensureInitialized();
    const graph = await this.loadCodeGraph();
    await this.saveCodeGraph(upsertModuleInGraph(graph, module));
  }

  async deleteModule(moduleId: string): Promise<void> {
    this.ensureInitialized();
    const graph = await this.loadCodeGraph();
    await this.saveCodeGraph(deleteModuleFromGraph(graph, moduleId));
  }

  async findModuleById(id: string): Promise<Module | null> {
    this.ensureInitialized();
    const graph = await this.loadCodeGraph();
    return graph.modules.find(module => module.id === id) ?? null;
  }

  async findModulesByPath(path: string): Promise<Module[]> {
    this.ensureInitialized();
    const graph = await this.loadCodeGraph();
    return graph.modules.filter(module => module.path.includes(path));
  }

  async findSymbolByName(name: string): Promise<Symbol[]> {
    this.ensureInitialized();
    const graph = await this.loadCodeGraph();
    return graph.symbols.filter(symbol => symbol.name.includes(name));
  }

  async findSymbolById(id: string): Promise<Symbol | null> {
    this.ensureInitialized();
    const graph = await this.loadCodeGraph();
    return graph.symbols.find(symbol => symbol.id === id) ?? null;
  }

  async findDependencies(moduleId: string): Promise<Dependency[]> {
    this.ensureInitialized();
    return findDependenciesInGraph(await this.loadCodeGraph(), moduleId);
  }

  async findDependents(moduleId: string): Promise<Dependency[]> {
    this.ensureInitialized();
    return findDependentsInGraph(await this.loadCodeGraph(), moduleId);
  }

  async findCallers(functionId: string): Promise<Symbol[]> {
    this.ensureInitialized();
    return findCallersInGraph(await this.loadCodeGraph(), functionId);
  }

  async findCallees(functionId: string): Promise<Symbol[]> {
    this.ensureInitialized();
    return findCalleesInGraph(await this.loadCodeGraph(), functionId);
  }

  async detectCycles(): Promise<Cycle[]> {
    this.ensureInitialized();
    return detectCyclesInGraph(await this.loadCodeGraph());
  }

  async calculateImpact(moduleId: string, depth: number): Promise<ImpactResult> {
    this.ensureInitialized();
    return calculateImpactInGraph(await this.loadCodeGraph(), moduleId, depth);
  }

  async calculateSymbolImpact(
    symbolId: string,
    depth: number,
    limit: number
  ): Promise<SymbolImpactResult> {
    this.ensureInitialized();
    return calculateSymbolImpactInGraph(await this.loadCodeGraph(), symbolId, depth, limit);
  }

  async getStatistics(): Promise<ProjectStatistics> {
    this.ensureInitialized();
    return getProjectStatisticsFromGraph(await this.loadCodeGraph());
  }

  private getConnection(): KuzuConnectionLike {
    if (!this.conn) {
      throw new StorageError(
        'KùzuDB connection not initialized',
        'KUZU_CONNECTION_NOT_READY'
      );
    }

    return this.conn;
  }

  private async runQuery(statement: string): Promise<void> {
    const result = await this.getConnection().query(statement);
    await closeKuzuResults(normalizeKuzuResults(result));
  }

  private async executePrepared(
    statement: string,
    params: Record<string, unknown>
  ): Promise<void> {
    const connection = this.getConnection();

    if (typeof connection.prepare !== 'function' || typeof connection.execute !== 'function') {
      throw new StorageError(
        'KùzuDB prepared execution API is unavailable',
        'KUZU_PREPARE_NOT_SUPPORTED'
      );
    }

    const preparedStatement = await connection.prepare(statement);
    if (
      typeof preparedStatement.isSuccess === 'function' &&
      !preparedStatement.isSuccess()
    ) {
      const reason =
        typeof preparedStatement.getErrorMessage === 'function'
          ? preparedStatement.getErrorMessage()
          : 'Unknown Kùzu prepared statement error';

      throw new StorageError(
        `Failed to prepare KùzuDB statement: ${reason}`,
        'KUZU_PREPARE_FAILED'
      );
    }

    const result = await connection.execute(preparedStatement, params);
    await closeKuzuResults(normalizeKuzuResults(result));
  }

  private async queryRows(statement: string): Promise<Array<Record<string, unknown>>> {
    const result = await this.getConnection().query(statement);
    const results = normalizeKuzuResults(result);

    try {
      const firstResult = results[0];
      if (!firstResult) {
        return [];
      }

      return await firstResult.getAll();
    } finally {
      await closeKuzuResults(results);
    }
  }
}
