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

/**
 * Neo4j 存储适配器（可选依赖）
 *
 * 安装：npm install neo4j-driver
 *
 * 特点：
 * - 企业级图数据库
 * - Cypher 查询语言
 * - 分布式部署支持
 * - 适合团队协作场景
 *
 * TODO-DEBT [L1] [日期:2026-03-17] [作者:AI] [原因:MVP阶段暂不实现完整功能]
 * 问题：目前使用内存 fallback 实现
 * 风险：无法连接真实 Neo4j 实例
 * 偿还计划：V1.0 实现完整 Neo4j 集成
 */
export class Neo4jStorage extends StorageBase {
  readonly type = 'neo4j' as const;

  /** Neo4j 驱动 */
  private driver: unknown = null;

  /** 内存 fallback */
  private memoryGraph: CodeGraph = this.createEmptyGraph();

  /** 存储配置 */
  private dbConfig: StorageConfig;

  constructor(config: StorageConfig) {
    super();
    this.dbConfig = config;
  }

  // ============================================
  // 生命周期管理
  // ============================================

  protected async doInitialize(): Promise<void> {
    try {
      // 动态导入 neo4j-driver
      // @ts-expect-error neo4j-driver is optional dependency
      const neo4j = await import('neo4j-driver');

      const uri = this.dbConfig.uri ?? 'bolt://localhost:7687';
      const username = this.dbConfig.username ?? 'neo4j';
      const password = this.dbConfig.password ?? 'password';

      this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

      // 验证连接
      const session = (this.driver as { session: () => unknown }).session();
      await (session as { run: (query: string) => Promise<unknown> }).run('RETURN 1');
      await (session as { close: () => Promise<void> }).close();
    } catch {
      // eslint-disable-next-line no-console
      console.warn('Neo4j not available, falling back to memory mode');
      this.memoryGraph = this.createEmptyGraph();
    }
  }

  protected async doClose(): Promise<void> {
    if (this.driver && typeof (this.driver as { close: () => Promise<void> }).close === 'function') {
      await (this.driver as { close: () => Promise<void> }).close();
    }
    this.driver = null;
  }

  // ============================================
  // 项目级别操作
  // ============================================

  async saveCodeGraph(graph: CodeGraph): Promise<void> {
    this.ensureInitialized();

    if (!this.driver) {
      this.memoryGraph = {
        project: { ...graph.project },
        modules: [...graph.modules],
        symbols: [...graph.symbols],
        dependencies: [...graph.dependencies],
      };
      return;
    }

    // TODO: 实现 Neo4j 持久化
    throw new StorageError(
      'Neo4j persistence not yet implemented',
      'NOT_IMPLEMENTED'
    );
  }

  async loadCodeGraph(): Promise<CodeGraph> {
    this.ensureInitialized();

    if (!this.driver) {
      return {
        project: { ...this.memoryGraph.project },
        modules: [...this.memoryGraph.modules],
        symbols: [...this.memoryGraph.symbols],
        dependencies: [...this.memoryGraph.dependencies],
      };
    }

    // TODO: 实现从 Neo4j 加载
    throw new StorageError(
      'Neo4j loading not yet implemented',
      'NOT_IMPLEMENTED'
    );
  }

  async deleteProject(): Promise<void> {
    this.ensureInitialized();
    this.memoryGraph = this.createEmptyGraph();
    // TODO: 删除 Neo4j 数据
  }

  // ============================================
  // 增量更新
  // ============================================

  async updateModule(module: Module): Promise<void> {
    this.ensureInitialized();

    if (!this.driver) {
      const index = this.memoryGraph.modules.findIndex(m => m.id === module.id);
      if (index >= 0) {
        this.memoryGraph.modules[index] = { ...module };
      } else {
        this.memoryGraph.modules.push({ ...module });
      }
      return;
    }

    // TODO: 实现 Neo4j 更新
  }

  async deleteModule(moduleId: string): Promise<void> {
    this.ensureInitialized();

    if (!this.driver) {
      this.memoryGraph.modules = this.memoryGraph.modules.filter(m => m.id !== moduleId);
      this.memoryGraph.symbols = this.memoryGraph.symbols.filter(s => s.moduleId !== moduleId);
      this.memoryGraph.dependencies = this.memoryGraph.dependencies.filter(
        d => d.sourceId !== moduleId && d.targetId !== moduleId
      );
      return;
    }

    // TODO: 实现 Neo4j 删除
  }

  // ============================================
  // 查询操作
  // ============================================

  async findModuleById(id: string): Promise<Module | null> {
    this.ensureInitialized();

    if (!this.driver) {
      return this.memoryGraph.modules.find(m => m.id === id) ?? null;
    }

    return null;
  }

  async findModulesByPath(path: string): Promise<Module[]> {
    this.ensureInitialized();

    if (!this.driver) {
      return this.memoryGraph.modules.filter(m => m.path.includes(path));
    }

    return [];
  }

  async findSymbolByName(name: string): Promise<Symbol[]> {
    this.ensureInitialized();

    if (!this.driver) {
      return this.memoryGraph.symbols.filter(s => s.name.includes(name));
    }

    return [];
  }

  async findSymbolById(id: string): Promise<Symbol | null> {
    this.ensureInitialized();

    if (!this.driver) {
      return this.memoryGraph.symbols.find(s => s.id === id) ?? null;
    }

    return null;
  }

  async findDependencies(moduleId: string): Promise<Dependency[]> {
    this.ensureInitialized();

    if (!this.driver) {
      return this.memoryGraph.dependencies.filter(d => d.sourceId === moduleId);
    }

    return [];
  }

  async findDependents(moduleId: string): Promise<Dependency[]> {
    this.ensureInitialized();

    if (!this.driver) {
      return this.memoryGraph.dependencies.filter(d => d.targetId === moduleId);
    }

    return [];
  }

  async findCallers(_functionId: string): Promise<Symbol[]> {
    this.ensureInitialized();
    return []; // TODO
  }

  async findCallees(_functionId: string): Promise<Symbol[]> {
    this.ensureInitialized();
    return []; // TODO
  }

  // ============================================
  // 分析操作
  // ============================================

  async detectCycles(): Promise<Cycle[]> {
    this.ensureInitialized();
    return []; // TODO
  }

  async calculateImpact(moduleId: string, depth: number): Promise<ImpactResult> {
    this.ensureInitialized();
    return {
      rootModule: moduleId,
      affectedModules: [],
      depth,
    };
  }

  async getStatistics(): Promise<ProjectStatistics> {
    this.ensureInitialized();

    return {
      totalModules: this.memoryGraph.modules.length,
      totalSymbols: this.memoryGraph.symbols.length,
      totalDependencies: this.memoryGraph.dependencies.length,
      totalLines: this.memoryGraph.modules.reduce((sum, m) => sum + m.stats.lines, 0),
      averageComplexity: 0,
    };
  }

  // ============================================
  // 私有方法
  // ============================================

  private createEmptyGraph(): CodeGraph {
    return {
      project: {
        id: '',
        name: '',
        rootPath: this.projectPath ?? '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      modules: [],
      symbols: [],
      dependencies: [],
    };
  }
}
