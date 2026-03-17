// [META] since:2026-03 | owner:architecture-team | stable:false
// [WHY] KùzuDB storage adapter - graph database backend for large projects
// ============================================
// KùzuDB 存储适配器 - 适用于大型项目的图数据库后端
// ============================================

import { join } from 'path';
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
 * KùzuDB 存储适配器（可选依赖）
 *
 * 安装：npm install kuzu
 *
 * 特点：
 * - 嵌入式图数据库
 * - 高性能图查询
 * - 适合大型项目（>1000文件）
 * - 支持复杂关系分析
 *
 * TODO-DEBT [L1] [日期:2026-03-17] [作者:AI] [原因:MVP阶段暂不实现完整功能]
 * 问题：目前使用内存 fallback 实现
 * 风险：无法持久化到 KùzuDB
 * 偿还计划：V1.0 实现完整 KùzuDB 集成
 */
export class KuzuDBStorage extends StorageBase {
  readonly type = 'kuzudb' as const;

  /** KùzuDB 数据库实例 */
  private db: unknown = null;

  /** 连接实例 */
  private conn: unknown = null;

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
      // 动态导入 kuzu 以避免未安装时的错误
      // @ts-expect-error kuzu is optional dependency
      const kuzu = await import('kuzu');

      const dbPath = this.dbConfig.databasePath
        ? join(this.projectPath!, this.dbConfig.databasePath)
        : join(this.projectPath!, '.codemap', 'kuzudb');

      this.db = new kuzu.Database(dbPath);
      this.conn = new kuzu.Connection(this.db);

      // 初始化 schema
      await this.initializeSchema();
    } catch {
      // 如果 kuzu 未安装，回退到内存模式
      // eslint-disable-next-line no-console
      console.warn('KùzuDB not available, falling back to memory mode');
      this.memoryGraph = this.createEmptyGraph();
    }
  }

  protected async doClose(): Promise<void> {
    if (this.conn && typeof (this.conn as { close: () => Promise<void> }).close === 'function') {
      await (this.conn as { close: () => Promise<void> }).close();
    }
    this.db = null;
    this.conn = null;
  }

  // ============================================
  // 项目级别操作
  // ============================================

  async saveCodeGraph(graph: CodeGraph): Promise<void> {
    this.ensureInitialized();

    if (!this.db) {
      // Fallback 到内存
      this.memoryGraph = {
        project: { ...graph.project },
        modules: [...graph.modules],
        symbols: [...graph.symbols],
        dependencies: [...graph.dependencies],
      };
      return;
    }

    // TODO: 实现 KùzuDB 持久化
    throw new StorageError(
      'KùzuDB persistence not yet implemented',
      'NOT_IMPLEMENTED'
    );
  }

  async loadCodeGraph(): Promise<CodeGraph> {
    this.ensureInitialized();

    if (!this.db) {
      return {
        project: { ...this.memoryGraph.project },
        modules: [...this.memoryGraph.modules],
        symbols: [...this.memoryGraph.symbols],
        dependencies: [...this.memoryGraph.dependencies],
      };
    }

    // TODO: 实现从 KùzuDB 加载
    throw new StorageError(
      'KùzuDB loading not yet implemented',
      'NOT_IMPLEMENTED'
    );
  }

  async deleteProject(): Promise<void> {
    this.ensureInitialized();
    this.memoryGraph = this.createEmptyGraph();
    // TODO: 删除 KùzuDB 数据
  }

  // ============================================
  // 增量更新
  // ============================================

  async updateModule(module: Module): Promise<void> {
    this.ensureInitialized();

    if (!this.db) {
      const index = this.memoryGraph.modules.findIndex(m => m.id === module.id);
      if (index >= 0) {
        this.memoryGraph.modules[index] = { ...module };
      } else {
        this.memoryGraph.modules.push({ ...module });
      }
      return;
    }

    // TODO: 实现 KùzuDB 更新
  }

  async deleteModule(moduleId: string): Promise<void> {
    this.ensureInitialized();

    if (!this.db) {
      this.memoryGraph.modules = this.memoryGraph.modules.filter(m => m.id !== moduleId);
      this.memoryGraph.symbols = this.memoryGraph.symbols.filter(s => s.moduleId !== moduleId);
      this.memoryGraph.dependencies = this.memoryGraph.dependencies.filter(
        d => d.sourceId !== moduleId && d.targetId !== moduleId
      );
      return;
    }

    // TODO: 实现 KùzuDB 删除
  }

  // ============================================
  // 查询操作
  // ============================================

  async findModuleById(id: string): Promise<Module | null> {
    this.ensureInitialized();

    if (!this.db) {
      return this.memoryGraph.modules.find(m => m.id === id) ?? null;
    }

    // TODO: 实现 KùzuDB 查询
    return null;
  }

  async findModulesByPath(path: string): Promise<Module[]> {
    this.ensureInitialized();

    if (!this.db) {
      return this.memoryGraph.modules.filter(m => m.path.includes(path));
    }

    return [];
  }

  async findSymbolByName(name: string): Promise<Symbol[]> {
    this.ensureInitialized();

    if (!this.db) {
      return this.memoryGraph.symbols.filter(s => s.name.includes(name));
    }

    return [];
  }

  async findSymbolById(id: string): Promise<Symbol | null> {
    this.ensureInitialized();

    if (!this.db) {
      return this.memoryGraph.symbols.find(s => s.id === id) ?? null;
    }

    return null;
  }

  async findDependencies(moduleId: string): Promise<Dependency[]> {
    this.ensureInitialized();

    if (!this.db) {
      return this.memoryGraph.dependencies.filter(d => d.sourceId === moduleId);
    }

    return [];
  }

  async findDependents(moduleId: string): Promise<Dependency[]> {
    this.ensureInitialized();

    if (!this.db) {
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

  private async initializeSchema(): Promise<void> {
    // TODO: 创建 KùzuDB schema
    // CREATE NODE TABLE Module(...)
    // CREATE NODE TABLE Symbol(...)
    // CREATE REL TABLE DependsOn(...)
    // CREATE REL TABLE Calls(...)
  }

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
