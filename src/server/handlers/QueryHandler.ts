// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Query handler - handles read-only queries against the code graph
// ============================================
// 查询处理器 - 处理针对代码图的只读查询
// ============================================

import type { IStorage } from '../../infrastructure/storage/index.js';
import type {
  SearchRequest,
  SearchResponse,
  ImpactAnalysisRequest,
  ImpactAnalysisResponse,
  CycleDetectionResponse,
  ProjectStatsResponse,
  ModuleDetailResponse,
  SymbolDetailResponse,
  DependencyGraphResponse,
  PaginationParams,
} from '../types/index.js';

/**
 * 查询处理器
 *
 * 职责：
 * - 处理所有只读查询操作
 * - 协调存储层和响应转换
 * - 支持搜索、过滤、分页
 */
export class QueryHandler {
  constructor(private storage: IStorage) {}

  /**
   * 搜索符号
   */
  async searchSymbols(request: SearchRequest): Promise<SearchResponse<SymbolDetailResponse>> {
    const limit = request.limit ?? 50;
    const symbols = await this.storage.findSymbolByName(request.query);
    
    const items = symbols.slice(0, limit).map(symbol => ({
      id: symbol.id,
      name: symbol.name,
      kind: symbol.kind,
      visibility: symbol.visibility,
      location: symbol.location,
      module: {
        id: symbol.moduleId,
        path: symbol.location.file,
      },
    }));

    return {
      items,
      total: symbols.length,
    };
  }

  /**
   * 搜索模块
   */
  async searchModules(request: SearchRequest): Promise<SearchResponse<ModuleDetailResponse>> {
    const limit = request.limit ?? 50;
    const modules = await this.storage.findModulesByPath(request.query);

    const items: ModuleDetailResponse[] = [];
    for (const module of modules.slice(0, limit)) {
      const detail = await this.getModuleDetail(module.id);
      if (detail) {
        items.push(detail);
      }
    }

    return {
      items,
      total: modules.length,
    };
  }

  /**
   * 获取模块详情
   */
  async getModuleDetail(moduleId: string): Promise<ModuleDetailResponse | null> {
    const module = await this.storage.findModuleById(moduleId);
    if (!module) return null;

    const dependencies = await this.storage.findDependencies(moduleId);
    const dependents = await this.storage.findDependents(moduleId);

    // 获取模块的所有符号
    const graph = await this.storage.loadCodeGraph();
    const symbols = graph.symbols
      .filter(s => s.moduleId === moduleId)
      .map(s => ({
        id: s.id,
        name: s.name,
        kind: s.kind,
        visibility: s.visibility,
      }));

    return {
      id: module.id,
      path: module.path,
      language: module.language,
      stats: module.stats,
      symbols,
      dependencies: dependencies.map(d => ({
        id: d.id,
        targetPath: this.findModulePath(graph, d.targetId) ?? d.targetId,
        type: d.type,
      })),
      dependents: dependents.map(d => ({
        id: d.id,
        sourcePath: this.findModulePath(graph, d.sourceId) ?? d.sourceId,
        type: d.type,
      })),
    };
  }

  /**
   * 获取符号详情
   */
  async getSymbolDetail(symbolId: string): Promise<SymbolDetailResponse | null> {
    const symbol = await this.storage.findSymbolById(symbolId);
    if (!symbol) return null;

    const module = await this.storage.findModuleById(symbol.moduleId);

    return {
      id: symbol.id,
      name: symbol.name,
      kind: symbol.kind,
      visibility: symbol.visibility,
      location: symbol.location,
      module: {
        id: symbol.moduleId,
        path: module?.path ?? symbol.location.file,
      },
    };
  }

  /**
   * 影响分析
   */
  async analyzeImpact(request: ImpactAnalysisRequest): Promise<ImpactAnalysisResponse> {
    const depth = request.depth ?? Infinity;
    const result = await this.storage.calculateImpact(request.moduleId, depth);
    
    const graph = await this.storage.loadCodeGraph();
    
    // 构建受影响模块的层级信息
    const affectedWithDepth: Array<{ id: string; path: string; depth: number }> = [];
    const visited = new Set<string>();
    const queue: Array<{ id: string; level: number }> = [{ id: request.moduleId, level: 0 }];

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      
      if (visited.has(id) || level > depth) continue;
      visited.add(id);

      if (level > 0) {
        const module = graph.modules.find(m => m.id === id);
        if (module) {
          affectedWithDepth.push({
            id: module.id,
            path: module.path,
            depth: level,
          });
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
      rootModule: result.rootModule,
      affectedModules: affectedWithDepth,
      totalAffected: affectedWithDepth.length,
      maxDepth: Math.max(...affectedWithDepth.map(m => m.depth), 0),
    };
  }

  /**
   * 检测循环依赖
   */
  async detectCycles(): Promise<CycleDetectionResponse> {
    const cycles = await this.storage.detectCycles();
    
    return {
      cycles: cycles.map(cycle => ({
        modules: cycle.modules,
        length: cycle.length,
      })),
      totalCycles: cycles.length,
    };
  }

  /**
   * 获取项目统计
   */
  async getProjectStats(): Promise<ProjectStatsResponse> {
    const stats = await this.storage.getStatistics();
    const graph = await this.storage.loadCodeGraph();

    // 计算语言分布
    const languageDistribution: Record<string, number> = {};
    for (const module of graph.modules) {
      languageDistribution[module.language] = 
        (languageDistribution[module.language] ?? 0) + 1;
    }

    return {
      totalModules: stats.totalModules,
      totalSymbols: stats.totalSymbols,
      totalDependencies: stats.totalDependencies,
      totalLines: stats.totalLines,
      averageComplexity: stats.averageComplexity,
      languageDistribution,
    };
  }

  /**
   * 获取依赖图数据（用于可视化）
   */
  async getDependencyGraph(params: PaginationParams = {}): Promise<DependencyGraphResponse> {
    const graph = await this.storage.loadCodeGraph();
    
    const nodes = graph.modules.map(module => ({
      id: module.id,
      label: module.path.split('/').pop() ?? module.path,
      type: 'module' as const,
      category: this.categorizeModule(module.path),
    }));

    const edges = graph.dependencies.map(dep => ({
      from: dep.sourceId,
      to: dep.targetId,
      type: dep.type,
    }));

    return { nodes, edges };
  }

  /**
   * 获取调用关系
   */
  async getCallers(functionId: string): Promise<SymbolDetailResponse[]> {
    const callers = await this.storage.findCallers(functionId);
    
    return callers.map(symbol => ({
      id: symbol.id,
      name: symbol.name,
      kind: symbol.kind,
      visibility: symbol.visibility,
      location: symbol.location,
      module: {
        id: symbol.moduleId,
        path: symbol.location.file,
      },
    }));
  }

  /**
   * 获取被调用关系
   */
  async getCallees(functionId: string): Promise<SymbolDetailResponse[]> {
    const callees = await this.storage.findCallees(functionId);
    
    return callees.map(symbol => ({
      id: symbol.id,
      name: symbol.name,
      kind: symbol.kind,
      visibility: symbol.visibility,
      location: symbol.location,
      module: {
        id: symbol.moduleId,
        path: symbol.location.file,
      },
    }));
  }

  // ============================================
  // 私有方法
  // ============================================

  private findModulePath(graph: { modules: Array<{ id: string; path: string }> }, moduleId: string): string | undefined {
    return graph.modules.find(m => m.id === moduleId)?.path;
  }

  private categorizeModule(path: string): string {
    if (path.includes('test') || path.includes('spec')) return 'test';
    if (path.includes('config')) return 'config';
    if (path.includes('util') || path.includes('helper')) return 'utility';
    if (path.includes('type') || path.includes('interface')) return 'type';
    return 'source';
  }
}
