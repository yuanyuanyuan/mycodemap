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
import { StorageBase } from '../interfaces/StorageBase.js';
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
  private graph: CodeGraph = createEmptyCodeGraph();

  // ============================================
  // 生命周期管理
  // ============================================

  protected async doInitialize(): Promise<void> {
    // 内存存储无需特殊初始化
    this.graph = createEmptyCodeGraph(this.projectPath ?? '');
  }

  protected async doClose(): Promise<void> {
    // 清理内存
    this.graph = createEmptyCodeGraph(this.projectPath ?? '');
  }

  // ============================================
  // 项目级别操作
  // ============================================

  async saveCodeGraph(graph: CodeGraph): Promise<void> {
    this.ensureInitialized();
    this.graph = cloneCodeGraph(graph);
  }

  async loadCodeGraph(): Promise<CodeGraph> {
    this.ensureInitialized();
    return cloneCodeGraph(this.graph);
  }

  async deleteProject(): Promise<void> {
    this.ensureInitialized();
    this.graph = createEmptyCodeGraph(this.projectPath ?? '');
  }

  // ============================================
  // 增量更新
  // ============================================

  async updateModule(module: Module): Promise<void> {
    this.ensureInitialized();
    this.graph = upsertModuleInGraph(this.graph, module);
  }

  async deleteModule(moduleId: string): Promise<void> {
    this.ensureInitialized();
    this.graph = deleteModuleFromGraph(this.graph, moduleId);
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
    return findDependenciesInGraph(this.graph, moduleId);
  }

  async findDependents(moduleId: string): Promise<Dependency[]> {
    this.ensureInitialized();
    return findDependentsInGraph(this.graph, moduleId);
  }

  async findCallers(functionId: string): Promise<Symbol[]> {
    this.ensureInitialized();
    return findCallersInGraph(this.graph, functionId);
  }

  async findCallees(functionId: string): Promise<Symbol[]> {
    this.ensureInitialized();
    return findCalleesInGraph(this.graph, functionId);
  }

  // ============================================
  // 分析操作
  // ============================================

  async detectCycles(): Promise<Cycle[]> {
    this.ensureInitialized();
    return detectCyclesInGraph(this.graph);
  }

  async calculateImpact(moduleId: string, depth: number): Promise<ImpactResult> {
    this.ensureInitialized();
    return calculateImpactInGraph(this.graph, moduleId, depth);
  }

  async getStatistics(): Promise<ProjectStatistics> {
    this.ensureInitialized();
    return getProjectStatisticsFromGraph(this.graph);
  }
}
