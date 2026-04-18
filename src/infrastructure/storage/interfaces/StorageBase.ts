// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Storage abstraction base class - provides common functionality for all storage backends
// ============================================
// 存储抽象基类 - 为所有存储后端提供通用功能
// ============================================

import type {
  IStorage,
  StorageType,
  StorageConfig,
  SearchOptions,
  SearchResult,
  Cycle,
  ImpactResult,
  GraphMetadata,
  ProjectStatistics,
  SymbolImpactResult,
} from '../../../interface/types/storage.js';
import type { CodeGraph, Module, Symbol, Dependency } from '../../../interface/types/index.js';

/**
 * 存储操作错误
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * 存储抽象基类
 * 
 * 为所有存储后端提供：
 * - 通用的错误处理
 * - 连接状态管理
 * - 生命周期管理
 * - 默认实现的可选方法
 */
export abstract class StorageBase implements IStorage {
  /** 存储类型标识 */
  abstract readonly type: StorageType;

  /** 项目路径 */
  protected projectPath: string | null = null;

  /** 初始化状态 */
  protected isInitialized = false;

  /** 存储配置 */
  protected config: StorageConfig | null = null;

  // ============================================
  // 生命周期管理
  // ============================================

  /**
   * 初始化存储
   * @param projectPath - 项目路径
   */
  async initialize(projectPath: string): Promise<void> {
    this.projectPath = projectPath;
    await this.doInitialize();
    this.isInitialized = true;
  }

  /**
   * 子类实现的具体初始化逻辑
   */
  protected abstract doInitialize(): Promise<void>;

  /**
   * 关闭存储连接
   */
  async close(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }
    await this.doClose();
    this.isInitialized = false;
    this.projectPath = null;
  }

  /**
   * 子类实现的具体关闭逻辑
   */
  protected abstract doClose(): Promise<void>;

  /**
   * 确保已初始化
   */
  protected ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new StorageError(
        'Storage not initialized. Call initialize() first.',
        'STORAGE_NOT_INITIALIZED'
      );
    }
  }

  // ============================================
  // 项目级别操作 (必须实现)
  // ============================================

  abstract saveCodeGraph(graph: CodeGraph): Promise<void>;
  abstract loadCodeGraph(): Promise<CodeGraph>;
  abstract loadGraphMetadata(): Promise<GraphMetadata>;
  abstract deleteProject(): Promise<void>;

  // ============================================
  // 增量更新 (必须实现)
  // ============================================

  abstract updateModule(module: Module): Promise<void>;
  abstract deleteModule(moduleId: string): Promise<void>;

  // ============================================
  // 查询操作 (必须实现)
  // ============================================

  abstract findModuleById(id: string): Promise<Module | null>;
  abstract findModulesByPath(path: string): Promise<Module[]>;
  abstract findSymbolByName(name: string): Promise<Symbol[]>;
  abstract findSymbolById(id: string): Promise<Symbol | null>;
  abstract findDependencies(moduleId: string): Promise<Dependency[]>;
  abstract findDependents(moduleId: string): Promise<Dependency[]>;
  abstract findCallers(functionId: string): Promise<Symbol[]>;
  abstract findCallees(functionId: string): Promise<Symbol[]>;

  // ============================================
  // 搜索操作 (默认实现)
  // ============================================

  /**
   * 模糊搜索 - 默认实现基于符号名称
   * 子类可以覆盖以提供更高效的实现
   */
  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    this.ensureInitialized();
    
    const symbols = await this.findSymbolByName(query);
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    
    let results: SearchResult[] = symbols.map(symbol => ({
      id: symbol.id,
      name: symbol.name,
      type: 'symbol' as const,
      path: symbol.location?.file,
      score: this.calculateRelevanceScore(symbol.name, query),
    }));

    // 过滤
    if (options.type && options.type !== 'symbol') {
      results = results.filter(r => r.type === options.type);
    }

    // 排序和分页
    results = results
      .sort((a, b) => b.score - a.score)
      .slice(offset, offset + limit);

    return results;
  }

  /**
   * 计算相关性分数
   */
  protected calculateRelevanceScore(name: string, query: string): number {
    const lowerName = name.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    if (name === query) return 1.0;
    if (lowerName === lowerQuery) return 0.95;
    if (name.startsWith(query)) return 0.9;
    if (lowerName.startsWith(lowerQuery)) return 0.85;
    if (name.includes(query)) return 0.7;
    if (lowerName.includes(lowerQuery)) return 0.6;
    return 0.5;
  }

  // ============================================
  // 分析操作 (必须实现)
  // ============================================

  abstract detectCycles(): Promise<Cycle[]>;
  abstract calculateImpact(moduleId: string, depth: number): Promise<ImpactResult>;
  abstract calculateSymbolImpact(symbolId: string, depth: number, limit: number): Promise<SymbolImpactResult>;
  abstract getStatistics(): Promise<ProjectStatistics>;
}
