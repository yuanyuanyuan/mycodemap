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
    this.cachedGraph = graph;
    this.cacheDirty = true;
    await this.persistGraph();
  }

  async loadCodeGraph(): Promise<CodeGraph> {
    this.ensureInitialized();

    // 优先使用缓存
    if (this.cachedGraph) {
      return this.cachedGraph;
    }

    // 尝试从文件加载
    try {
      const data = await readFile(this.dataFilePath!, 'utf-8');
      this.cachedGraph = JSON.parse(data) as CodeGraph;
      return this.cachedGraph;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
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
      await rm(this.storageDir!, { recursive: true, force: true });
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

    const graph = await this.loadCodeGraph();
    const index = graph.modules.findIndex(m => m.id === module.id);

    if (index >= 0) {
      graph.modules[index] = module;
    } else {
      graph.modules.push(module);
    }

    this.cachedGraph = graph;
    this.cacheDirty = true;
    await this.persistGraph();
  }

  async deleteModule(moduleId: string): Promise<void> {
    this.ensureInitialized();

    const graph = await this.loadCodeGraph();
    graph.modules = graph.modules.filter(m => m.id !== moduleId);

    // 同时清理相关的符号和依赖关系
    graph.symbols = graph.symbols.filter(s => s.moduleId !== moduleId);
    graph.dependencies = graph.dependencies.filter(
      d => d.sourceId !== moduleId && d.targetId !== moduleId
    );

    this.cachedGraph = graph;
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
    const graph = await this.loadCodeGraph();
    return graph.dependencies.filter(d => d.sourceId === moduleId);
  }

  async findDependents(moduleId: string): Promise<Dependency[]> {
    this.ensureInitialized();
    const graph = await this.loadCodeGraph();
    return graph.dependencies.filter(d => d.targetId === moduleId);
  }

  async findCallers(functionId: string): Promise<Symbol[]> {
    this.ensureInitialized();
    const graph = await this.loadCodeGraph();

    // 查找从该函数出发的调用依赖
    const callerIds = new Set<string>();
    for (const dep of graph.dependencies) {
      if (dep.targetId === functionId && dep.type === 'call') {
        callerIds.add(dep.sourceId);
      }
    }

    // 返回对应的符号
    const results: Symbol[] = [];
    for (const id of callerIds) {
      const symbol = graph.symbols.find(s => s.id === id);
      if (symbol) results.push(symbol);
    }

    return results;
  }

  async findCallees(functionId: string): Promise<Symbol[]> {
    this.ensureInitialized();
    const graph = await this.loadCodeGraph();

    const calleeIds = new Set<string>();
    for (const dep of graph.dependencies) {
      if (dep.sourceId === functionId && dep.type === 'call') {
        calleeIds.add(dep.targetId);
      }
    }

    const results: Symbol[] = [];
    for (const id of calleeIds) {
      const symbol = graph.symbols.find(s => s.id === id);
      if (symbol) results.push(symbol);
    }

    return results;
  }

  // ============================================
  // 分析操作
  // ============================================

  async detectCycles(): Promise<Cycle[]> {
    this.ensureInitialized();
    const graph = await this.loadCodeGraph();

    // 使用 DFS 检测循环依赖
    const cycles: Cycle[] = [];
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const dfs = (nodeId: string, path: string[]): void => {
      if (inStack.has(nodeId)) {
        // 发现循环
        const cycleStart = path.indexOf(nodeId);
        const cycleModules = path.slice(cycleStart);
        cycles.push({
          modules: cycleModules,
          length: cycleModules.length,
        });
        return;
      }

      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);
      inStack.add(nodeId);

      // 遍历模块间的依赖
      for (const dep of graph.dependencies) {
        if (dep.sourceId === nodeId) {
          dfs(dep.targetId, [...path, nodeId]);
        }
      }

      inStack.delete(nodeId);
    };

    for (const module of graph.modules) {
      if (!visited.has(module.id)) {
        dfs(module.id, []);
      }
    }

    return cycles;
  }

  async calculateImpact(moduleId: string, depth: number): Promise<ImpactResult> {
    this.ensureInitialized();
    const graph = await this.loadCodeGraph();

    const affectedModules: Module[] = [];
    const visited = new Set<string>();
    const queue: Array<{ id: string; level: number }> = [{ id: moduleId, level: 0 }];

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;

      if (visited.has(id) || level > depth) {
        continue;
      }
      visited.add(id);

      if (level > 0) {
        const module = graph.modules.find(m => m.id === id);
        if (module) {
          affectedModules.push(module);
        }
      }

      // 查找依赖此模块的其他模块
      for (const dep of graph.dependencies) {
        if (dep.targetId === id && !visited.has(dep.sourceId)) {
          queue.push({ id: dep.sourceId, level: level + 1 });
        }
      }
    }

    return {
      rootModule: moduleId,
      affectedModules,
      depth,
    };
  }

  async getStatistics(): Promise<ProjectStatistics> {
    this.ensureInitialized();
    const graph = await this.loadCodeGraph();

    const totalLines = graph.modules.reduce((sum, m) => sum + m.stats.lines, 0);

    return {
      totalModules: graph.modules.length,
      totalSymbols: graph.symbols.length,
      totalDependencies: graph.dependencies.length,
      totalLines,
      averageComplexity: 0, // MVP 阶段暂不计算
    };
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
