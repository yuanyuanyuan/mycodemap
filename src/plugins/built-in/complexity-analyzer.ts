// ============================================
// 复杂度分析内置插件
// 分析 TypeScript 代码的圈复杂度
// ============================================

import type { CodeMapPlugin, PluginContext, AnalysisResult } from '../types.js';
import type { ModuleInfo } from '../../types/index.js';

// 复杂度分析结果
export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  linesOfCode: number;
  functionCount: number;
  classCount: number;
  maxNestingDepth: number;
  maintainabilityIndex: number;
}

// 模块复杂度数据
export interface ModuleComplexity {
  moduleId: string;
  metrics: ComplexityMetrics;
  hotspots: Array<{
    name: string;
    kind: string;
    location: { line: number; column: number };
    complexity: number;
  }>;
}

// 复杂度评分
function calculateMaintainabilityIndex(loc: number, cyclomatic: number, commentRatio: number): number {
  // 基于 Halstead 指标的简化版维持性指数
  const mi = 171 - 5.2 * Math.log(loc) - 0.23 * cyclomatic - 16.2 * Math.log(loc);
  return Math.max(0, Math.min(100, mi + 50 * commentRatio));
}

// 分析单个模块的复杂度
function analyzeModuleComplexity(module: ModuleInfo): ModuleComplexity {
  let cyclomaticComplexity = 1;
  let functionCount = 0;
  let classCount = 0;
  let maxNestingDepth = 0;

  const hotspots: ModuleComplexity['hotspots'] = [];

  // 分析符号
  for (const symbol of module.symbols) {
    if (symbol.kind === 'function' || symbol.kind === 'method') {
      functionCount++;
      // 每个函数基础复杂度为1
      const funcComplexity = 1;
      hotspots.push({
        name: symbol.name,
        kind: symbol.kind,
        location: { line: symbol.location.line, column: symbol.location.column },
        complexity: funcComplexity,
      });
    }

    if (symbol.kind === 'class') {
      classCount++;
    }

    // 简化复杂度计算：基于关键词
    // 实际应该解析 AST，这里是简化实现
    if (symbol.kind === 'function' || symbol.kind === 'method') {
      cyclomaticComplexity += 1; // 每个函数增加基础复杂度
    }
  }

  // 基于模块类型和大小调整复杂度
  const loc = module.stats.codeLines;
  const commentRatio = module.stats.commentLines / Math.max(1, module.stats.lines);

  cyclomaticComplexity = Math.max(1, cyclomaticComplexity + Math.floor(loc / 100));
  const maintainability = calculateMaintainabilityIndex(loc, cyclomaticComplexity, commentRatio);

  return {
    moduleId: module.id,
    metrics: {
      cyclomaticComplexity,
      cognitiveComplexity: cyclomaticComplexity + maxNestingDepth * 2,
      linesOfCode: loc,
      functionCount,
      classCount,
      maxNestingDepth,
      maintainabilityIndex: Math.round(maintainability),
    },
    hotspots: hotspots.slice(0, 10), // 只返回前10个热点
  };
}

// 插件实现
class ComplexityAnalyzerPlugin implements CodeMapPlugin {
  metadata = {
    name: 'complexity-analyzer',
    version: '1.0.0',
    description: 'Analyzes code complexity metrics including cyclomatic complexity and maintainability index',
    keywords: ['complexity', 'metrics', 'analysis'],
  };

  private context: PluginContext | null = null;

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    this.context.logger.info('ComplexityAnalyzer plugin initialized');
  }

  async analyze(modules: ModuleInfo[]): Promise<AnalysisResult> {
    this.context?.logger.info(`Analyzing complexity for ${modules.length} modules`);

    const moduleComplexities: Record<string, ModuleComplexity> = {};
    let totalCyclomatic = 0;
    let totalFunctions = 0;
    let totalClasses = 0;
    let totalLOC = 0;

    for (const module of modules) {
      const complexity = analyzeModuleComplexity(module);
      moduleComplexities[module.id] = complexity;

      totalCyclomatic += complexity.metrics.cyclomaticComplexity;
      totalFunctions += complexity.metrics.functionCount;
      totalClasses += complexity.metrics.classCount;
      totalLOC += complexity.metrics.linesOfCode;
    }

    // 找出复杂度最高的模块
    const sortedModules = Object.values(moduleComplexities).sort(
      (a, b) => b.metrics.cyclomaticComplexity - a.metrics.cyclomaticComplexity
    );

    const warnings: string[] = [];
    const hotspots = sortedModules.slice(0, 5).forEach((mod) => {
      if (mod.metrics.cyclomaticComplexity > 20) {
        warnings.push(`Module "${mod.moduleId}" has high cyclomatic complexity: ${mod.metrics.cyclomaticComplexity}`);
      }
      if (mod.metrics.maintainabilityIndex < 50) {
        warnings.push(`Module "${mod.moduleId}" has low maintainability index: ${mod.metrics.maintainabilityIndex}`);
      }
    });

    return {
      additionalEdges: [],
      metrics: {
        complexityAnalysis: {
          totalCyclomaticComplexity: totalCyclomatic,
          averageCyclomaticComplexity: modules.length > 0 ? totalCyclomatic / modules.length : 0,
          totalFunctions: totalFunctions,
          totalClasses: totalClasses,
          totalLinesOfCode: totalLOC,
          moduleComplexities,
          topComplexityModules: sortedModules.slice(0, 10).map((m) => ({
            moduleId: m.moduleId,
            complexity: m.metrics.cyclomaticComplexity,
            maintainability: m.metrics.maintainabilityIndex,
          })),
        },
      },
      warnings,
    };
  }

  async generate(_codeMap: unknown): Promise<{ files?: Array<{ path: string; content: string }> }> {
    // 生成复杂度报告
    return {
      files: [],
    };
  }

  async dispose(): Promise<void> {
    this.context?.logger.info('ComplexityAnalyzer plugin disposed');
    this.context = null;
  }
}

// 导出插件
export default new ComplexityAnalyzerPlugin();
