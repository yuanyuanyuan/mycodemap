// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Analysis handler - handles code analysis operations and graph updates
// ============================================
// 分析处理器 - 处理代码分析操作和图更新
// ============================================

import type { IStorage } from '../../infrastructure/storage/index.js';
import type { CodeGraphBuilder } from '../../domain/services/CodeGraphBuilder.js';


/**
 * 分析请求
 */
export interface AnalyzeRequest {
  projectPath: string;
  options?: {
    mode?: 'fast' | 'smart';
  };
}

/**
 * 分析响应
 */
export interface AnalyzeResponse {
  projectId: string;
  modulesAnalyzed: number;
  symbolsFound: number;
  dependenciesFound: number;
  duration: number;
  mode: 'fast' | 'smart';
}

/**
 * 增量更新请求
 */
export interface IncrementalUpdateRequest {
  changedFiles: Array<{
    path: string;
    changeType: 'added' | 'modified' | 'deleted';
  }>;
}

type UnsupportedAnalysisOperation = 'analyze' | 'incrementalUpdate' | 'refresh';

const UNSUPPORTED_ANALYSIS_ERROR_CODES = {
  analyze: 'ANALYSIS_NOT_SUPPORTED',
  incrementalUpdate: 'INCREMENTAL_UPDATE_NOT_SUPPORTED',
  refresh: 'REFRESH_NOT_SUPPORTED',
} as const;

export class UnsupportedAnalysisOperationError extends Error {
  readonly name = 'UnsupportedAnalysisOperationError';
  readonly statusCode = 501;
  readonly code: typeof UNSUPPORTED_ANALYSIS_ERROR_CODES[UnsupportedAnalysisOperation];
  readonly operation: UnsupportedAnalysisOperation;

  constructor(operation: UnsupportedAnalysisOperation) {
    super(`Server Layer 当前仅保留 query / validate / export 能力，"${operation}" 尚未作为公共能力开放`);
    this.operation = operation;
    this.code = UNSUPPORTED_ANALYSIS_ERROR_CODES[operation];
  }
}

export function isUnsupportedAnalysisOperationError(
  error: unknown
): error is UnsupportedAnalysisOperationError {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'statusCode' in error &&
    'code' in error &&
    'operation' in error &&
    (error as { statusCode: unknown }).statusCode === 501
  );
}

/**
 * 分析处理器
 *
 * 职责：
 * - 执行代码分析
 * - 管理代码图构建和更新
 * - 处理增量更新
 * - 协调 Domain 和 Infrastructure 层
 */
export class AnalysisHandler {
  constructor(
    private storage: IStorage,
    _builder: CodeGraphBuilder
  ) {}

  /**
   * 执行完整分析
   */
  async analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    void request;
    throw new UnsupportedAnalysisOperationError('analyze');
  }

  /**
   * 执行增量更新
   */
  async incrementalUpdate(request: IncrementalUpdateRequest): Promise<{
    updated: number;
    added: number;
    removed: number;
    errors: string[];
  }> {
    void request;
    throw new UnsupportedAnalysisOperationError('incrementalUpdate');
  }

  /**
   * 刷新项目数据（重新分析整个项目）
   */
  async refresh(projectPath: string): Promise<AnalyzeResponse> {
    void projectPath;
    throw new UnsupportedAnalysisOperationError('refresh');
  }

  /**
   * 验证项目数据一致性
   */
  async validate(): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const graph = await this.storage.loadCodeGraph();

      // 验证符号引用的模块存在
      for (const symbol of graph.symbols) {
        const module = await this.storage.findModuleById(symbol.moduleId);
        if (!module) {
          errors.push(`Symbol ${symbol.id} references non-existent module ${symbol.moduleId}`);
        }
      }

      // 验证依赖引用的模块存在
      for (const dep of graph.dependencies) {
        const sourceModule = await this.storage.findModuleById(dep.sourceId);
        const targetModule = await this.storage.findModuleById(dep.targetId);
        
        if (!sourceModule) {
          errors.push(`Dependency ${dep.id} references non-existent source ${dep.sourceId}`);
        }
        if (!targetModule) {
          errors.push(`Dependency ${dep.id} references non-existent target ${dep.targetId}`);
        }
      }

      // 警告：孤立模块
      const moduleIds = new Set(graph.modules.map(m => m.id));
      const connectedModules = new Set<string>();
      
      for (const dep of graph.dependencies) {
        connectedModules.add(dep.sourceId);
        connectedModules.add(dep.targetId);
      }

      for (const moduleId of moduleIds) {
        if (!connectedModules.has(moduleId) && graph.modules.length > 1) {
          const module = graph.modules.find(m => m.id === moduleId);
          warnings.push(`Module ${module?.path ?? moduleId} is isolated (no dependencies)`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Failed to validate: ${String(error)}`],
        warnings,
      };
    }
  }

  /**
   * 导出项目数据
   */
  async export(format: 'json' | 'graphml' | 'dot'): Promise<{
    data: string;
    contentType: string;
    filename: string;
  }> {
    const graph = await this.storage.loadCodeGraph();

    switch (format) {
      case 'json':
        return {
          data: JSON.stringify(graph, null, 2),
          contentType: 'application/json',
          filename: 'codemap.json',
        };

      case 'graphml':
        return {
          data: this.toGraphML(graph),
          contentType: 'application/xml',
          filename: 'codemap.graphml',
        };

      case 'dot':
        return {
          data: this.toDOT(graph),
          contentType: 'text/vnd.graphviz',
          filename: 'codemap.dot',
        };

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // ============================================
  // 私有方法
  // ============================================

  private toGraphML(graph: { modules: Array<{ id: string; path: string }>; dependencies: Array<{ sourceId: string; targetId: string; type: string }> }): string {
    const nodes = graph.modules.map(m => 
      `    <node id="${m.id}"><data key="path">${this.escapeXml(m.path)}</data></node>`
    ).join('\n');

    const edges = graph.dependencies.map(d =>
      `    <edge source="${d.sourceId}" target="${d.targetId}"><data key="type">${d.type}</data></edge>`
    ).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="path" for="node" attr.name="path" attr.type="string"/>
  <key id="type" for="edge" attr.name="type" attr.type="string"/>
  <graph id="G" edgedefault="directed">
${nodes}
${edges}
  </graph>
</graphml>`;
  }

  private toDOT(graph: { modules: Array<{ id: string; path: string }>; dependencies: Array<{ sourceId: string; targetId: string; type: string }> }): string {
    const nodes = graph.modules.map(m => 
      `  "${m.id}" [label="${m.path.replace(/"/g, '\\"')}"];`
    ).join('\n');

    const edges = graph.dependencies.map(d =>
      `  "${d.sourceId}" -> "${d.targetId}" [label="${d.type}"];`
    ).join('\n');

    return `digraph CodeGraph {
  rankdir=TB;
${nodes}
${edges}
}`;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
