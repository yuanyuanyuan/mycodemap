// [META] since:2026-03 | owner:plugin-team | stable:true
// [WHY] Plugin module exports the public runtime surface for CodeMap plugins
// ============================================
// CodeMap 插件系统入口
// ============================================

// 导出类型
export type {
  CodeMapPlugin,
  PluginContext,
  PluginLogger,
  PluginCache,
  PluginMetadata,
  PluginHooks,
  PluginLoadOptions,
  PluginStatus,
  PluginInstance,
  AnalysisResult,
  GeneratedOutput,
} from './types.js';

// 导出类
export { PluginRegistry } from './plugin-registry.js';
export { PluginLoader } from './plugin-loader.js';

// 导出便捷函数
export { createPluginLoader } from './plugin-loader.js';

// 导出内置插件
export { default as complexityAnalyzerPlugin } from './built-in/complexity-analyzer.js';
export { default as callGraphPlugin } from './built-in/call-graph.js';

// 插件系统主类
import type { PluginLoadOptions } from './types.js';
import type { CodemapConfig, ModuleInfo, CodeMap, DependencyEdge, PluginDiagnostic } from '../types/index.js';
import { PluginLoader } from './plugin-loader.js';
import type { AnalysisResult as BaseAnalysisResult, GeneratedOutput as BaseGeneratedOutput } from './types.js';

export class PluginSystem {
  private loader: PluginLoader | null = null;
  private config: CodemapConfig;

  constructor(config: CodemapConfig) {
    this.config = config;
  }

  // 初始化插件系统
  async initialize(options: PluginLoadOptions = {}): Promise<PluginDiagnostic[]> {
    this.loader = new PluginLoader(this.config, undefined, options.debug);
    return this.loader.load(options);
  }

  // 获取注册表
  getRegistry() {
    if (!this.loader) {
      throw new Error('Plugin system not initialized');
    }
    return this.loader.getRegistry();
  }

  // 运行分析钩子
  async runAnalyze(modules: ModuleInfo[]): Promise<{
    results: Map<string, BaseAnalysisResult>;
    mergedMetrics: Record<string, unknown>;
    additionalEdges: DependencyEdge[];
    warnings: string[];
    diagnostics: PluginDiagnostic[];
  }> {
    if (!this.loader) {
      throw new Error('Plugin system not initialized');
    }

    const run = await this.loader.getRegistry().runAnalyze(modules);
    const results = run.results;

    // 合并结果
    const mergedMetrics: Record<string, unknown> = {};
    const additionalEdges: DependencyEdge[] = [];
    const warnings: string[] = [];
    const diagnostics = [...run.diagnostics];

    for (const [name, result] of results) {
      if (result.metrics) {
        mergedMetrics[name] = result.metrics;
      }

      if (result.additionalEdges) {
        // 转换类型以兼容 DependencyEdge
        for (const edge of result.additionalEdges) {
          additionalEdges.push({
            from: edge.from,
            to: edge.to,
            type: (edge.type as DependencyEdge['type']) || 'call',
            weight: edge.weight || 1,
          });
        }
      }

      if (result.warnings) {
        warnings.push(...result.warnings);
        diagnostics.push(
          ...result.warnings.map((message) => ({
            plugin: name,
            stage: 'analyze' as const,
            level: 'warning' as const,
            message,
          }))
        );
      }
    }

    return { results, mergedMetrics, additionalEdges, warnings, diagnostics };
  }

  // 运行生成钩子
  async runGenerate(codeMap: CodeMap): Promise<{
    results: Map<string, BaseGeneratedOutput>;
    allFiles: Array<{ path: string; content: string }>;
    diagnostics: PluginDiagnostic[];
  }> {
    if (!this.loader) {
      throw new Error('Plugin system not initialized');
    }

    const run = await this.loader.getRegistry().runGenerate(codeMap);
    const results = run.results;

    // 收集所有生成的文件
    const allFiles: Array<{ path: string; content: string }> = [];

    for (const result of results.values()) {
      if (result.files) {
        allFiles.push(...result.files);
      }
    }

    return { results, allFiles, diagnostics: run.diagnostics };
  }

  // 检查插件是否已加载
  hasPlugin(name: string): boolean {
    if (!this.loader) return false;
    return this.loader.getRegistry().has(name);
  }

  // 获取已加载插件列表
  getLoadedPlugins(): string[] {
    if (!this.loader) return [];
    return this.loader.getRegistry().getInitialized();
  }

  // 销毁插件系统
  async dispose(): Promise<void> {
    if (this.loader) {
      await this.loader.dispose();
      this.loader = null;
    }
  }
}

// 创建插件系统便捷函数
export async function createPluginSystem(config: CodemapConfig, options?: PluginLoadOptions): Promise<PluginSystem> {
  const system = new PluginSystem(config);
  await system.initialize(options);
  return system;
}
