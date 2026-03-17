// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Domain service: CodeGraphBuilder - builds CodeGraph from analysis results
// ============================================
// 领域服务：代码图构建器 - 从分析结果构建代码图
// ============================================

import { randomUUID } from 'crypto';
import type {
  AnalysisOptions,
  ModuleInfo,
  DependencyEdge,
} from '../../interface/types/index.js';
import { Project } from '../entities/Project.js';
import { Module } from '../entities/Module.js';
import { Symbol as SymbolEntity } from '../entities/Symbol.js';
import { Dependency } from '../entities/Dependency.js';
import { CodeGraph } from '../entities/CodeGraph.js';

/**
 * 模块分析结果
 */
export interface ModuleAnalysisResult {
  info: ModuleInfo;
  dependencies: Array<{
    targetPath: string;
    type: 'import' | 'inherit' | 'implement' | 'call' | 'type-ref';
  }>;
}

/**
 * 代码图构建服务
 *
 * 职责：
 * - 从分析结果构建领域模型
 * - 生成唯一标识符
 * - 建立实体间关系
 * - 确保数据一致性
 */
export class CodeGraphBuilder {
  private moduleIdMap = new Map<string, string>(); // path -> id
  private options: AnalysisOptions;

  constructor(options: AnalysisOptions) {
    this.options = options;
  }

  /**
   * 构建代码图
   * @param projectName - 项目名称
   * @param projectRoot - 项目根路径
   * @param moduleResults - 模块分析结果列表
   */
  build(
    projectName: string,
    projectRoot: string,
    moduleResults: ModuleAnalysisResult[]
  ): CodeGraph {
    // 创建项目
    const project = new Project(
      this.generateId('proj'),
      projectName,
      projectRoot
    );

    // 创建代码图
    const codeGraph = new CodeGraph(project);

    // 第一遍：创建模块并建立路径到 ID 的映射
    for (const result of moduleResults) {
      const moduleId = this.generateId('mod');
      this.moduleIdMap.set(result.info.path, moduleId);

      const module = new Module(
        moduleId,
        project.id,
        result.info.path,
        this.detectLanguage(result.info.path),
        {
          lines: result.info.stats.lines,
          codeLines: result.info.stats.codeLines,
          commentLines: result.info.stats.commentLines,
          blankLines: result.info.stats.blankLines,
        }
      );

      codeGraph.addModule(module);
    }

    // 第二遍：创建符号
    for (const result of moduleResults) {
      const moduleId = this.moduleIdMap.get(result.info.path);
      if (!moduleId) continue;

      for (const symbolInfo of result.info.symbols) {
        const symbol = new SymbolEntity(
          this.generateId('sym'),
          moduleId,
          symbolInfo.name,
          symbolInfo.kind,
          symbolInfo.location,
          symbolInfo.visibility
        );

        codeGraph.addSymbol(symbol);
      }
    }

    // 第三遍：创建依赖关系
    for (const result of moduleResults) {
      const sourceId = this.moduleIdMap.get(result.info.path);
      if (!sourceId) continue;

      for (const dep of result.dependencies) {
        const targetId = this.moduleIdMap.get(dep.targetPath);
        if (!targetId) continue; // 外部依赖，跳过

        const dependency = new Dependency(
          this.generateId('dep'),
          sourceId,
          targetId,
          dep.type
        );

        try {
          codeGraph.addDependency(dependency);
        } catch {
          // 依赖已存在，忽略
        }
      }
    }

    return codeGraph;
  }

  /**
   * 从 CodeMap JSON 重建代码图
   */
  rebuildFromJSON(data: ReturnType<CodeGraph['toInterface']>): CodeGraph {
    return CodeGraph.fromInterface(data);
  }

  /**
   * 生成唯一 ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  }

  /**
   * 根据文件路径检测语言
   */
  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
    
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'go': 'go',
      'java': 'java',
      'rs': 'rust',
      'cpp': 'cpp',
      'cc': 'cpp',
      'c': 'c',
      'h': 'c',
      'hpp': 'cpp',
    };

    return languageMap[ext] ?? 'unknown';
  }

  /**
   * 创建构建器的工厂方法
   */
  static create(options: AnalysisOptions): CodeGraphBuilder {
    return new CodeGraphBuilder(options);
  }
}
