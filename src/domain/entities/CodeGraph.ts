// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Domain aggregate: CodeGraph - root entity containing project, modules, symbols and dependencies
// ============================================
// 领域聚合根：代码图 - 包含项目、模块、符号和依赖的根实体
// ============================================

import type { CodeGraph as CodeGraphInterface } from '../../interface/types/index.js';
import { Project } from './Project.js';
import { Module } from './Module.js';
import { Symbol } from './Symbol.js';
import { Dependency } from './Dependency.js';

/**
 * 代码图聚合根
 *
 * 职责：
 * - 作为领域聚合根维护一致性边界
 * - 提供对模块、符号、依赖的集中管理
 * - 实现领域业务规则（如删除模块时级联删除相关符号）
 * - 提供查询和分析方法
 */
export class CodeGraph implements CodeGraphInterface {
  project: Project;
  modules: Module[];
  symbols: Symbol[];
  dependencies: Dependency[];
  graphStatus?: CodeGraphInterface['graphStatus'];
  failedFileCount?: number;
  parseFailureFiles?: string[];

  constructor(
    project: Project,
    modules: Module[] = [],
    symbols: Symbol[] = [],
    dependencies: Dependency[] = [],
    graphStatus: CodeGraphInterface['graphStatus'] = 'complete',
    failedFileCount = 0,
    parseFailureFiles: string[] = []
  ) {
    this.project = project;
    this.modules = [...modules];
    this.symbols = [...symbols];
    this.dependencies = [...dependencies];
    this.graphStatus = graphStatus;
    this.failedFileCount = failedFileCount;
    this.parseFailureFiles = [...parseFailureFiles];
  }

  /**
   * 从接口数据创建代码图实体
   */
  static fromInterface(data: CodeGraphInterface): CodeGraph {
    return new CodeGraph(
      Project.fromInterface(data.project),
      data.modules.map(m => Module.fromInterface(m)),
      data.symbols.map(s => Symbol.fromInterface(s)),
      data.dependencies.map(d => Dependency.fromInterface(d)),
      data.graphStatus ?? 'complete',
      data.failedFileCount ?? 0,
      data.parseFailureFiles ?? []
    );
  }

  /**
   * 转换为接口数据
   */
  toInterface(): CodeGraphInterface {
    return {
      project: this.project.toInterface(),
      modules: this.modules.map(m => m.toInterface()),
      symbols: this.symbols.map(s => s.toInterface()),
      dependencies: this.dependencies.map(d => d.toInterface()),
      graphStatus: this.graphStatus ?? 'complete',
      failedFileCount: this.failedFileCount ?? 0,
      parseFailureFiles: [...(this.parseFailureFiles ?? [])],
    };
  }

  // ============================================
  // 模块管理
  // ============================================

  /**
   * 添加模块
   */
  addModule(module: Module): void {
    if (this.findModuleById(module.id)) {
      throw new Error(`Module with ID ${module.id} already exists`);
    }
    this.modules.push(module);
  }

  /**
   * 移除模块（级联删除相关符号和依赖）
   */
  removeModule(moduleId: string): void {
    this.modules = this.modules.filter(m => m.id !== moduleId);
    
    // 级联删除符号
    this.symbols = this.symbols.filter(s => s.moduleId !== moduleId);
    
    // 级联删除依赖
    this.dependencies = this.dependencies.filter(
      d => d.sourceId !== moduleId && d.targetId !== moduleId
    );
  }

  /**
   * 根据 ID 查找模块
   */
  findModuleById(id: string): Module | undefined {
    return this.modules.find(m => m.id === id);
  }

  /**
   * 根据路径查找模块
   */
  findModuleByPath(path: string): Module | undefined {
    return this.modules.find(m => m.path === path);
  }

  /**
   * 根据路径模式查找模块
   */
  findModulesByPathPattern(pattern: string | RegExp): Module[] {
    const regex = typeof pattern === 'string' 
      ? new RegExp(pattern.replace(/\*/g, '.*')) 
      : pattern;
    return this.modules.filter(m => regex.test(m.path));
  }

  // ============================================
  // 符号管理
  // ============================================

  /**
   * 添加符号
   */
  addSymbol(symbol: Symbol): void {
    if (this.findSymbolById(symbol.id)) {
      throw new Error(`Symbol with ID ${symbol.id} already exists`);
    }
    // 验证所属模块存在
    if (!this.findModuleById(symbol.moduleId)) {
      throw new Error(`Module ${symbol.moduleId} does not exist`);
    }
    this.symbols.push(symbol);
  }

  /**
   * 移除符号
   */
  removeSymbol(symbolId: string): void {
    this.symbols = this.symbols.filter(s => s.id !== symbolId);
  }

  /**
   * 根据 ID 查找符号
   */
  findSymbolById(id: string): Symbol | undefined {
    return this.symbols.find(s => s.id === id);
  }

  /**
   * 根据名称查找符号
   */
  findSymbolsByName(name: string): Symbol[] {
    return this.symbols.filter(s => s.name === name);
  }

  /**
   * 模糊搜索符号
   */
  searchSymbols(query: string): Symbol[] {
    const lowerQuery = query.toLowerCase();
    return this.symbols.filter(s => 
      s.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 获取模块的所有符号
   */
  getModuleSymbols(moduleId: string): Symbol[] {
    return this.symbols.filter(s => s.moduleId === moduleId);
  }

  // ============================================
  // 依赖管理
  // ============================================

  /**
   * 添加依赖
   */
  addDependency(dependency: Dependency): void {
    if (!this.hasDependencyEntity(dependency.sourceId, dependency.sourceEntityType)) {
      throw new Error(`Source ${dependency.sourceEntityType} ${dependency.sourceId} does not exist`);
    }
    if (!this.hasDependencyEntity(dependency.targetId, dependency.targetEntityType)) {
      throw new Error(`Target ${dependency.targetEntityType} ${dependency.targetId} does not exist`);
    }
    
    // 检查是否已存在相同依赖
    const existing = this.dependencies.find(d => d.getKey() === dependency.getKey());
    if (existing) {
      return; // 已存在，静默忽略
    }
    
    this.dependencies.push(dependency);
  }

  /**
   * 移除依赖
   */
  removeDependency(dependencyId: string): void {
    this.dependencies = this.dependencies.filter(d => d.id !== dependencyId);
  }

  /**
   * 根据 ID 查找依赖
   */
  findDependencyById(id: string): Dependency | undefined {
    return this.dependencies.find(d => d.id === id);
  }

  /**
   * 获取模块的所有依赖（作为源）
   */
  getModuleDependencies(moduleId: string): Dependency[] {
    return this.dependencies.filter(d => d.sourceId === moduleId);
  }

  /**
   * 获取模块的所有被依赖（作为目标）
   */
  getModuleDependents(moduleId: string): Dependency[] {
    return this.dependencies.filter(d => d.targetId === moduleId);
  }

  // ============================================
  // 分析操作
  // ============================================

  /**
   * 检测循环依赖
   */
  detectCycles(): Array<{ modules: string[]; length: number }> {
    const cycles: Array<{ modules: string[]; length: number }> = [];
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const dfs = (moduleId: string, path: string[]): void => {
      if (inStack.has(moduleId)) {
        const cycleStart = path.indexOf(moduleId);
        const cycleModules = path.slice(cycleStart);
        cycles.push({
          modules: cycleModules,
          length: cycleModules.length,
        });
        return;
      }

      if (visited.has(moduleId)) {
        return;
      }

      visited.add(moduleId);
      inStack.add(moduleId);

      // 遍历依赖
      for (const dep of this.dependencies) {
        if (dep.sourceId === moduleId) {
          dfs(dep.targetId, [...path, moduleId]);
        }
      }

      inStack.delete(moduleId);
    };

    for (const module of this.modules) {
      if (!visited.has(module.id)) {
        dfs(module.id, []);
      }
    }

    return cycles;
  }

  /**
   * 计算影响范围
   */
  calculateImpact(moduleId: string, depth: number = Infinity): {
    rootModule: string;
    affectedModules: Module[];
    depth: number;
  } {
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
        const module = this.findModuleById(id);
        if (module) {
          affectedModules.push(module);
        }
      }

      // 查找依赖此模块的其他模块
      for (const dep of this.dependencies) {
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

  /**
   * 获取统计信息
   */
  getStatistics(): {
    totalModules: number;
    totalSymbols: number;
    totalDependencies: number;
    totalLines: number;
  } {
    return {
      totalModules: this.modules.length,
      totalSymbols: this.symbols.length,
      totalDependencies: this.dependencies.length,
      totalLines: this.modules.reduce((sum, m) => sum + m.stats.lines, 0),
    };
  }

  /**
   * 获取按语言分组的模块统计
   */
  getLanguageDistribution(): Map<string, number> {
    const distribution = new Map<string, number>();
    for (const module of this.modules) {
      const count = distribution.get(module.language) ?? 0;
      distribution.set(module.language, count + 1);
    }
    return distribution;
  }

  // ============================================
  // 工具方法
  // ============================================

  /**
   * 创建深拷贝
   */
  clone(): CodeGraph {
    return new CodeGraph(
      this.project.snapshot(),
      this.modules.map(m => m.snapshot()),
      this.symbols.map(s => s.snapshot()),
      this.dependencies.map(d => d.snapshot()),
      this.graphStatus ?? 'complete',
      this.failedFileCount ?? 0,
      [...(this.parseFailureFiles ?? [])]
    );
  }

  /**
   * 清空所有数据
   */
  clear(): void {
    this.modules = [];
    this.symbols = [];
    this.dependencies = [];
    this.graphStatus = 'complete';
    this.failedFileCount = 0;
    this.parseFailureFiles = [];
  }

  /**
   * 验证图的一致性
   */
  validate(): string[] {
    const errors: string[] = [];

    // 验证所有符号引用的模块存在
    for (const symbol of this.symbols) {
      if (!this.findModuleById(symbol.moduleId)) {
        errors.push(`Symbol ${symbol.id} references non-existent module ${symbol.moduleId}`);
      }
    }

    // 验证所有依赖引用的模块存在
    for (const dep of this.dependencies) {
      if (!this.hasDependencyEntity(dep.sourceId, dep.sourceEntityType)) {
        errors.push(`Dependency ${dep.id} references non-existent source ${dep.sourceEntityType} ${dep.sourceId}`);
      }
      if (!this.hasDependencyEntity(dep.targetId, dep.targetEntityType)) {
        errors.push(`Dependency ${dep.id} references non-existent target ${dep.targetEntityType} ${dep.targetId}`);
      }
    }

    return errors;
  }

  private hasDependencyEntity(id: string, entityType: Dependency['sourceEntityType']): boolean {
    if (entityType === 'symbol') {
      return Boolean(this.findSymbolById(id));
    }

    return Boolean(this.findModuleById(id));
  }
}
