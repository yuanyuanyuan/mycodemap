// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] FileSystem storage adapter - persists code graph to JSON files
// ============================================
// 文件系统存储适配器 - 将代码图持久化到 JSON 文件
// ============================================

import { writeFile, readFile, mkdir, rm } from 'fs/promises';
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
import {
  calculateImpactInGraph,
  cloneCodeGraph,
  createEmptyCodeGraph,
  deleteModuleFromGraph,
  detectCyclesInGraph,
  findCalleesInGraph,
  findCallersInGraph,
  findDependenciesInGraph,
  findDependentsInGraph,
  getProjectStatisticsFromGraph,
  upsertModuleInGraph,
} from '../graph-helpers.js';

/**
 * 文件系统存储适配器
 *
 * 特点：
 * - 零依赖，开箱即用
 * - 数据以 JSON 格式存储
 * - 适合小到中型项目
 * - 查询性能一般，但足够用于本地开发
 */
export class FileSystemStorage extends StorageBase {
  readonly type = 'filesystem' as const;

  /** 存储目录路径 */
  private storageDir: string | null = null;

  /** 主数据文件路径 */
  private dataFilePath: string | null = null;

  /** 缓存的代码图 */
  private cachedGraph: CodeGraph | null = null;

  /** 缓存是否已修改 */
  private cacheDirty = false;

  constructor(private storageConfig: StorageConfig) {
    super();
  }

  // ============================================
  // 生命周期管理
  // ============================================

  protected async doInitialize(): Promise<void> {
    if (!this.projectPath) {
      throw new StorageError(
        'Project path not set',
        'PROJECT_PATH_NOT_SET'
      );
    }

    // 确定存储目录
    const defaultDir = join(this.projectPath, '.codemap', 'storage');
    this.storageDir = this.storageConfig.outputPath
      ? join(this.projectPath, this.storageConfig.outputPath)
      : defaultDir;

    this.dataFilePath = join(this.storageDir, 'codegraph.json');

    // 确保存储目录存在
    await mkdir(this.storageDir, { recursive: true });
  }

  protected async doClose(): Promise<void> {
    // 如果有未保存的更改，先保存
    if (this.cacheDirty && this.cachedGraph) {
      await this.persistGraph();
    }
    this.cachedGraph = null;
    this.cacheDirty = false;
  }

  // ============================================
  // 项目级别操作
  // ============================================

  async saveCodeGraph(graph: CodeGraph): Promise<void> {
    this.ensureInitialized();
    this.cachedGraph = cloneCodeGraph(graph);
    this.cacheDirty = true;
    await this.persistGraph();
  }

  async loadCodeGraph(): Promise<CodeGraph> {
    this.ensureInitialized();

    // 优先使用缓存
    if (this.cachedGraph) {
      return cloneCodeGraph(this.cachedGraph);
    }

    // 尝试从文件加载
    try {
      if (!this.dataFilePath) {
        throw new StorageError(
          'Storage data file path not initialized',
          'DATA_FILE_PATH_NOT_SET'
        );
      }

      const data = await readFile(this.dataFilePath, 'utf-8');
      this.cachedGraph = JSON.parse(data) as CodeGraph;
      return cloneCodeGraph(this.cachedGraph);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        // 文件不存在，返回空图
        return this.createEmptyGraph();
      }
      throw new StorageError(
        'Failed to load code graph',
        'LOAD_FAILED',
        error
      );
    }
  }

  async deleteProject(): Promise<void> {
    this.ensureInitialized();

    try {
      if (!this.storageDir) {
        throw new StorageError(
          'Storage directory path not initialized',
          'STORAGE_DIR_NOT_SET'
        );
      }

      await rm(this.storageDir, { recursive: true, force: true });
      this.cachedGraph = null;
      this.cacheDirty = false;
    } catch (error) {
      throw new StorageError(
        'Failed to delete project data',
        'DELETE_FAILED',
        error
      );
    }
  }

  // ============================================
  // 增量更新
  // ============================================

  async updateModule(module: Module): Promise<void> {
    this.ensureInitialized();
    this.cachedGraph = upsertModuleInGraph(await this.loadCodeGraph(), module);
    this.cacheDirty = true;
    await this.persistGraph();
  }

  async deleteModule(moduleId: string): Promise<void> {
    this.ensureInitialized();
    this.cachedGraph = deleteModuleFromGraph(await this.loadCodeGraph(), moduleId);
    this.cacheDirty = true;
    await this.persistGraph();
  }

  // ============================================
  // 查询操作
  // ============================================

  async findModuleById(id: string): Promise<Module | null> {
    this.ensureInitialized();
    const graph = await this.loadCodeGraph();
    return graph.modules.find(m => m.id === id) ?? null;
  }

  async findModulesByPath(path: string): Promise<Module[]> {
    this.ensureInitialized();
    const graph = await this.loadCodeGraph();
    return graph.modules.filter(m => m.path.includes(path));
  }

  async findSymbolByName(name: string): Promise<Symbol[]> {
    this.ensureInitialized();
    const graph = await this.loadCodeGraph();
    return graph.symbols.filter(s => s.name.includes(name));
  }

  async findSymbolById(id: string): Promise<Symbol | null> {
    this.ensureInitialized();
    const graph = await this.loadCodeGraph();
    return graph.symbols.find(s => s.id === id) ?? null;
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

  // ============================================
  // 分析操作
  // ============================================

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

  // ============================================
  // 私有方法
  // ============================================

  /**
   * 将代码图持久化到文件
   */
  private async persistGraph(): Promise<void> {
    if (!this.cachedGraph || !this.dataFilePath) {
      return;
    }

    try {
      const data = JSON.stringify(this.cachedGraph, null, 2);
      await writeFile(this.dataFilePath, data, 'utf-8');
      this.cacheDirty = false;
    } catch (error) {
      throw new StorageError(
        'Failed to persist code graph',
        'PERSIST_FAILED',
        error
      );
    }
  }

  /**
   * 创建空代码图
   */
  private createEmptyGraph(): CodeGraph {
    return createEmptyCodeGraph(this.projectPath ?? '');
  }
}
