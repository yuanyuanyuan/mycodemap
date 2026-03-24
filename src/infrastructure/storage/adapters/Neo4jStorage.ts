// [META] since:2026-03 | owner:architecture-team | stable:false
// [WHY] Neo4j storage adapter - enterprise graph database backend
// ============================================
// Neo4j 存储适配器 - 企业级图数据库后端
// ============================================

import type {
  StorageConfig,
  Cycle,
  ImpactResult,
  ProjectStatistics,
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
  createEmptyCodeGraph,
  deleteModuleFromGraph,
  deserializeCodeGraphSnapshot,
  detectCyclesInGraph,
  findCalleesInGraph,
  findCallersInGraph,
  findDependenciesInGraph,
  findDependentsInGraph,
  getProjectStatisticsFromGraph,
  serializeCodeGraphSnapshot,
  upsertModuleInGraph,
} from '../graph-helpers.js';

interface Neo4jRecordLike {
  get: (key: string) => unknown;
}

interface Neo4jResultLike {
  records: Neo4jRecordLike[];
}

interface Neo4jSessionLike {
  run: (query: string, params?: Record<string, unknown>) => Promise<Neo4jResultLike>;
  close: () => Promise<void>;
}

interface Neo4jDriverLike {
  verifyConnectivity: () => Promise<void>;
  session: () => Neo4jSessionLike;
  close: () => Promise<void>;
}

interface Neo4jModuleLike {
  driver: (uri: string, authToken: unknown) => Neo4jDriverLike;
  auth: {
    basic: (username: string, password: string) => unknown;
  };
}

async function loadNeo4jModule(): Promise<Neo4jModuleLike> {
  const moduleName = 'neo4j-driver';
  return await import(moduleName) as unknown as Neo4jModuleLike;
}

function normalizeNeo4jValue<T>(value: T): T | number {
  if (
    typeof value === 'object' &&
    value !== null &&
    'toNumber' in value &&
    typeof value.toNumber === 'function'
  ) {
    return value.toNumber();
  }

  return value;
}

/**
 * Neo4j 存储适配器（可选依赖）
 *
 * 安装：npm install neo4j-driver
 *
 * 特点：
 * - 连接远程/本地 Neo4j 实例
 * - 用 snapshot 节点持久化完整 CodeGraph
 * - 查询/分析接口与共享 storage contract 保持一致
 * - 错误语义显式暴露，不再静默 fallback
 */
export class Neo4jStorage extends StorageBase {
  readonly type = 'neo4j' as const;

  private driver: Neo4jDriverLike | null = null;
  private readonly dbConfig: StorageConfig;

  constructor(config: StorageConfig) {
    super();
    this.dbConfig = config;
  }

  protected async doInitialize(): Promise<void> {
    try {
      const neo4j = await loadNeo4jModule();
      const uri = this.dbConfig.uri ?? 'bolt://localhost:7687';
      const username = this.dbConfig.username ?? 'neo4j';
      const password = this.dbConfig.password ?? 'password';

      this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
      await this.driver.verifyConnectivity();
    } catch (error) {
      throw new StorageError(
        'Failed to initialize Neo4j storage',
        'NEO4J_INIT_FAILED',
        error
      );
    }
  }

  protected async doClose(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
    }

    this.driver = null;
  }

  async saveCodeGraph(graph: CodeGraph): Promise<void> {
    this.ensureInitialized();

    await this.runStatement('MATCH (s:CodeMapSnapshot) DETACH DELETE s');
    await this.runStatement(
      'CREATE (s:CodeMapSnapshot {id: $id, projectId: $projectId, graph: $graph, updatedAt: $updatedAt})',
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

    const result = await this.runStatement(
      'MATCH (s:CodeMapSnapshot) RETURN s.graph AS graph LIMIT 1'
    );
    const record = result.records[0];
    const snapshot = typeof record?.get === 'function'
      ? normalizeNeo4jValue(record.get('graph'))
      : null;

    if (typeof snapshot !== 'string') {
      return createEmptyCodeGraph(this.projectPath ?? '');
    }

    return deserializeCodeGraphSnapshot(snapshot, this.projectPath ?? '');
  }

  async deleteProject(): Promise<void> {
    this.ensureInitialized();
    await this.runStatement('MATCH (s:CodeMapSnapshot) DETACH DELETE s');
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

  async getStatistics(): Promise<ProjectStatistics> {
    this.ensureInitialized();
    return getProjectStatisticsFromGraph(await this.loadCodeGraph());
  }

  private getDriver(): Neo4jDriverLike {
    if (!this.driver) {
      throw new StorageError(
        'Neo4j driver not initialized',
        'NEO4J_DRIVER_NOT_READY'
      );
    }

    return this.driver;
  }

  private async runStatement(
    query: string,
    params?: Record<string, unknown>
  ): Promise<Neo4jResultLike> {
    const session = this.getDriver().session();

    try {
      return await session.run(query, params);
    } catch (error) {
      throw new StorageError(
        'Failed to execute Neo4j query',
        'NEO4J_QUERY_FAILED',
        error
      );
    } finally {
      await session.close();
    }
  }
}
