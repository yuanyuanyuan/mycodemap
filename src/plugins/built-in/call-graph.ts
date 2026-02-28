// ============================================
// 调用图内置插件
// 分析 TypeScript 代码的函数调用关系
// ============================================

import type { CodeMapPlugin, PluginContext, AnalysisResult } from '../types.js';
import type { ModuleInfo } from '../../types/index.js';

// 调用关系边
export interface CallGraphEdge {
  from: string;
  to: string;
  type: 'direct' | 'indirect' | 'callback' | 'async';
  weight: number;
}

// 调用图数据
export interface CallGraphData {
  nodes: Array<{
    id: string;
    name: string;
    kind: 'function' | 'method' | 'class' | 'module';
    moduleId: string;
  }>;
  edges: CallGraphEdge[];
}

// 构建调用图
function buildCallGraph(modules: ModuleInfo[]): CallGraphData {
  const nodes: CallGraphData['nodes'] = [];
  const edges: CallGraphEdge[] = [];
  const nodeMap = new Map<string, number>();

  // 添加模块节点
  for (const mod of modules) {
    const nodeId = nodes.length;
    nodeMap.set(mod.id, nodeId);
    nodes.push({
      id: mod.id,
      name: mod.path,
      kind: 'module',
      moduleId: mod.id,
    });
  }

  // 从导入关系构建调用边
  for (const mod of modules) {
    const fromNodeId = nodeMap.get(mod.id);
    if (fromNodeId === undefined) continue;

    // 分析导入关系作为调用
    for (const imp of mod.imports) {
      // 找到目标模块
      const targetModule = modules.find((m) => {
        return (
          m.path.includes(imp.source) ||
          m.absolutePath.includes(imp.source) ||
          imp.source.includes(m.path)
        );
      });

      if (targetModule && targetModule.id !== mod.id) {
        const toNodeId = nodeMap.get(targetModule.id);
        if (toNodeId !== undefined) {
          edges.push({
            from: mod.id,
            to: targetModule.id,
            type: 'direct',
            weight: imp.specifiers.length,
          });
        }
      }
    }
  }

  // 从依赖关系添加边
  for (const mod of modules) {
    for (const dep of mod.dependencies) {
      const targetModule = modules.find((m) => m.id === dep || m.path === dep);
      if (targetModule && targetModule.id !== mod.id) {
        const fromNodeId = nodeMap.get(mod.id);
        const toNodeId = nodeMap.get(targetModule.id);
        if (fromNodeId !== undefined && toNodeId !== undefined) {
          // 检查是否已存在边
          const exists = edges.some((e) => e.from === mod.id && e.to === targetModule.id);
          if (!exists) {
            edges.push({
              from: mod.id,
              to: targetModule.id,
              type: 'direct',
              weight: 1,
            });
          }
        }
      }
    }
  }

  return { nodes, edges };
}

// 调用分析结果
function analyzeCallGraph(modules: ModuleInfo[]): {
  callGraph: CallGraphData;
  stats: {
    totalCalls: number;
    directCalls: number;
    indirectCalls: number;
    callbackCalls: number;
    asyncCalls: number;
    modulesWithCalls: number;
    isolatedModules: number;
  };
} {
  const callGraph = buildCallGraph(modules);

  const stats = {
    totalCalls: callGraph.edges.length,
    directCalls: callGraph.edges.filter((e) => e.type === 'direct').length,
    indirectCalls: callGraph.edges.filter((e) => e.type === 'indirect').length,
    callbackCalls: callGraph.edges.filter((e) => e.type === 'callback').length,
    asyncCalls: callGraph.edges.filter((e) => e.type === 'async').length,
    modulesWithCalls: new Set(callGraph.edges.map((e) => e.from)).size,
    isolatedModules: modules.length - new Set(callGraph.edges.map((e) => e.from)).size,
  };

  return { callGraph, stats };
}

// 插件实现
class CallGraphPlugin implements CodeMapPlugin {
  metadata = {
    name: 'call-graph',
    version: '1.0.0',
    description: 'Analyzes function call relationships and generates call graphs',
    keywords: ['call-graph', 'dependencies', 'analysis'],
  };

  private context: PluginContext | null = null;

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    this.context.logger.info('CallGraph plugin initialized');
  }

  async analyze(modules: ModuleInfo[]): Promise<AnalysisResult> {
    this.context?.logger.info(`Analyzing call graph for ${modules.length} modules`);

    const { callGraph, stats } = analyzeCallGraph(modules);

    const warnings: string[] = [];

    // 检测孤立模块
    if (stats.isolatedModules > modules.length * 0.3) {
      warnings.push(`High number of isolated modules: ${stats.isolatedModules}`);
    }

    return {
      additionalEdges: callGraph.edges.map((e) => ({
        from: e.from,
        to: e.to,
        type: 'call' as const,
        weight: e.weight,
      })),
      metrics: {
        callGraph: {
          ...callGraph,
          stats,
        },
      },
      warnings,
    };
  }

  async generate(_codeMap: unknown): Promise<{ files?: Array<{ path: string; content: string }> }> {
    // 可以在这里生成 Mermaid 格式的调用图
    return {
      files: [],
    };
  }

  async dispose(): Promise<void> {
    this.context?.logger.info('CallGraph plugin disposed');
    this.context = null;
  }
}

// 导出插件
export default new CallGraphPlugin();
