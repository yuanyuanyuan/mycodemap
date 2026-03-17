// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Memory storage adapter - in-memory storage for testing and lightweight usage
// ============================================
// 内存存储适配器 - 用于测试和轻量级场景的内存存储
// ============================================

import type {
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
 * 内存存储适配器
 *
 * 特点：
 * - 纯内存存储，无持久化
 * - 速度最快
 * - 进程结束数据丢失
 * - 适合单元测试和临时分析
 */
export class MemoryStorage extends StorageBase {
  readonly type = 'memory' as const;

  /** 内存中的代码图 */
  private graph: CodeGraph = this.createEmptyGraph();

  // ============================================
  // 生命周期管理
  // ============================================

  protected async doInitialize(): Promise<void> {
    // 内存存储无需特殊初始化
    this.graph = this.createEmptyGraph();
  }

  protected async doClose(): Promise<void> {
    // 清理内存
    this.graph = this.createEmptyGraph();
  }

  // ============================================
  // 项目级别操作
  // ============================================

  async saveCodeGraph(graph: CodeGraph): Promise<void> {
    this.ensureInitialized();
    this.graph = {
      project: { ...graph.project },
      modules: [...graph.modules],
      symbols: [...graph.symbols],
      dependencies: [...graph.dependencies],
    };
  }

  async loadCodeGraph(): Promise<CodeGraph> {
    this.ensureInitialized();
    return {
      project: { ...this.graph.project },
      modules: [...this.graph.modules],
      symbols: [...this.graph.symbols],
      dependencies: [...this.graph.dependencies],
    };
  }

  async deleteProject(): Promise<void> {
    this.ensureInitialized();
    this.graph = this.createEmptyGraph();
  }

  // ============================================
  // 增量更新
  // ============================================

  async updateModule(module: Module): Promise<void> {
    this.ensureInitialized();

    const index = this.graph.modules.findIndex(m => m.id === module.id);
    if (index >= 0) {
      this.graph.modules[index] = { ...module };
    } else {
      this.graph.modules.push({ ...module });
    }
  }

  async deleteModule(moduleId: string): Promise<void> {
    this.ensureInitialized();

    this.graph.modules = this.graph.modules.filter(m => m.id !== moduleId);
    this.graph.symbols = this.graph.symbols.filter(s => s.moduleId !== moduleId);
    this.graph.dependencies = this.graph.dependencies.filter(
      d => d.sourceId !== moduleId && d.targetId !== moduleId
    );
  }

  // ============================================
  // 查询操作
  // ============================================

  async findModuleById(id: string): Promise<Module | null> {
    this.ensureInitialized();
    return this.graph.modules.find(m => m.id === id) ?? null;
  }

  async findModulesByPath(path: string): Promise<Module[]> {
    this.ensureInitialized();
    return this.graph.modules.filter(m => m.path.includes(path));
  }

  async findSymbolByName(name: string): Promise<Symbol[]> {
    this.ensureInitialized();
    return this.graph.symbols.filter(s => s.name.includes(name));
  }

  async findSymbolById(id: string): Promise<Symbol | null> {
    this.ensureInitialized();
    return this.graph.symbols.find(s => s.id === id) ?? null;
  }

  async findDependencies(moduleId: string): Promise<Dependency[]> {
    this.ensureInitialized();
    return this.graph.dependencies.filter(d => d.sourceId === moduleId);
  }

  async findDependents(moduleId: string): Promise<Dependency[]> {
    this.ensureInitialized();
    return this.graph.dependencies.filter(d => d.targetId === moduleId);
  }

  async findCallers(functionId: string): Promise<Symbol[]> {
    this.ensureInitialized();

    const callerIds = new Set<string>();
    for (const dep of this.graph.dependencies) {
      if (dep.targetId === functionId && dep.type === 'call') {
        callerIds.add(dep.sourceId);
      }
    }

    const results: Symbol[] = [];
    for (const id of callerIds) {
      const symbol = this.graph.symbols.find(s => s.id === id);
      if (symbol) results.push(symbol);
    }

    return results;
  }

  async findCallees(functionId: string): Promise<Symbol[]> {
    this.ensureInitialized();

    const calleeIds = new Set<string>();
    for (const dep of this.graph.dependencies) {
      if (dep.sourceId === functionId && dep.type === 'call') {
        calleeIds.add(dep.targetId);
      }
    }

    const results: Symbol[] = [];
    for (const id of calleeIds) {
      const symbol = this.graph.symbols.find(s => s.id === id);
      if (symbol) results.push(symbol);
    }

    return results;
  }

  // ============================================
  // 分析操作
  // ============================================

  async detectCycles(): Promise<Cycle[]> {
    this.ensureInitialized();

    const cycles: Cycle[] = [];
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const dfs = (nodeId: string, path: string[]): void => {
      if (inStack.has(nodeId)) {
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

      for (const dep of this.graph.dependencies) {
        if (dep.sourceId === nodeId) {
          dfs(dep.targetId, [...path, nodeId]);
        }
      }

      inStack.delete(nodeId);
    };

    for (const module of this.graph.modules) {
      if (!visited.has(module.id)) {
        dfs(module.id, []);
      }
    }

    return cycles;
  }

  async calculateImpact(moduleId: string, depth: number): Promise<ImpactResult> {
    this.ensureInitialized();

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
        const module = this.graph.modules.find(m => m.id === id);
        if (module) {
          affectedModules.push({ ...module });
        }
      }

      for (const dep of this.graph.dependencies) {
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

    const totalLines = this.graph.modules.reduce((sum, m) => sum + m.stats.lines, 0);

    return {
      totalModules: this.graph.modules.length,
      totalSymbols: this.graph.symbols.length,
      totalDependencies: this.graph.dependencies.length,
      totalLines,
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
