// [META] since:2026-03 | owner:plugin-team | stable:true
// [WHY] Plugin registry tracks loaded plugins and coordinates analyze/generate hooks
// ============================================
// CodeMap 插件注册表
// 管理已加载的插件
// ============================================

import type {
  CodeMapPlugin,
  PluginInstance,
  PluginContext,
  PluginStatus,
  AnalysisResult,
  GeneratedOutput,
  PluginAnalysisRun,
  PluginGenerateRun,
} from './types.js';
import type { ModuleInfo, CodeMap } from '../types/index.js';
import type { PluginDiagnostic } from '../types/index.js';

export class PluginRegistry {
  private plugins: Map<string, PluginInstance> = new Map();
  private context: PluginContext | null = null;

  private async initializeInstance(name: string, instance: PluginInstance): Promise<PluginDiagnostic[]> {
    if (!this.context) {
      throw new Error('Plugin context not set');
    }

    const diagnostics: PluginDiagnostic[] = [];

    try {
      this.context.logger.info(`Initializing plugin "${name}"...`);
      await instance.plugin.initialize(this.context);
      instance.status = 'initialized';
      instance.error = undefined;
      this.context.logger.info(`Plugin "${name}" initialized successfully`);
    } catch (error) {
      instance.status = 'error';
      instance.error = error instanceof Error ? error : new Error(String(error));
      this.context.logger.error(`Failed to initialize plugin "${name}": ${instance.error.message}`);
      diagnostics.push({
        plugin: name,
        stage: 'initialize',
        level: 'error',
        message: instance.error.message,
      });
    }

    return diagnostics;
  }

  // 设置插件上下文
  setContext(context: PluginContext): void {
    this.context = context;
  }

  // 注册插件
  async register(plugin: CodeMapPlugin): Promise<void> {
    const name = plugin.metadata.name;

    if (this.plugins.has(name)) {
      this.context?.logger.warn(`Plugin "${name}" is already registered, skipping...`);
      return;
    }

    const instance: PluginInstance = {
      plugin,
      status: 'loaded',
      loadTime: Date.now(),
    };

    this.plugins.set(name, instance);
    this.context?.logger.info(`Plugin "${name}" v${plugin.metadata.version} registered`);
  }

  // 初始化所有插件
  async initializeAll(): Promise<PluginDiagnostic[]> {
    if (!this.context) {
      throw new Error('Plugin context not set');
    }

    const diagnostics: PluginDiagnostic[] = [];

    for (const [name, instance] of this.plugins) {
      diagnostics.push(...await this.initializeInstance(name, instance));
    }

    return diagnostics;
  }

  async initializeByName(name: string): Promise<PluginDiagnostic[]> {
    const instance = this.plugins.get(name);
    if (!instance) {
      return [{
        plugin: name,
        stage: 'initialize',
        level: 'error',
        message: `Plugin "${name}" is not registered`,
      }];
    }

    return this.initializeInstance(name, instance);
  }

  // 运行所有插件的分析钩子
  async runAnalyze(modules: ModuleInfo[]): Promise<PluginAnalysisRun> {
    const results = new Map<string, AnalysisResult>();
    const diagnostics: PluginDiagnostic[] = [];

    for (const [name, instance] of this.plugins) {
      if (instance.status !== 'initialized' || !instance.plugin.analyze) {
        continue;
      }

      try {
        this.context?.logger.info(`Running analyze hook for plugin "${name}"...`);
        const result = await instance.plugin.analyze(modules);
        results.set(name, result);
        instance.status = 'running';
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        instance.status = 'error';
        instance.error = err;
        this.context?.logger.error(`Plugin "${name}" analyze hook failed: ${err.message}`);
        diagnostics.push({
          plugin: name,
          stage: 'analyze',
          level: 'error',
          message: err.message,
        });
      }
    }

    return { results, diagnostics };
  }

  // 运行所有插件的生成钩子
  async runGenerate(codeMap: CodeMap): Promise<PluginGenerateRun> {
    const results = new Map<string, GeneratedOutput>();
    const diagnostics: PluginDiagnostic[] = [];

    for (const [name, instance] of this.plugins) {
      if (instance.status !== 'running' && instance.status !== 'initialized') {
        continue;
      }

      if (!instance.plugin.generate) {
        continue;
      }

      try {
        this.context?.logger.info(`Running generate hook for plugin "${name}"...`);
        const result = await instance.plugin.generate(codeMap);
        results.set(name, result);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        instance.status = 'error';
        instance.error = err;
        this.context?.logger.error(`Plugin "${name}" generate hook failed: ${err.message}`);
        diagnostics.push({
          plugin: name,
          stage: 'generate',
          level: 'error',
          message: err.message,
        });
      }
    }

    return { results, diagnostics };
  }

  // 获取插件实例
  get(name: string): PluginInstance | undefined {
    return this.plugins.get(name);
  }

  // 获取所有插件名称
  getAllNames(): string[] {
    return Array.from(this.plugins.keys());
  }

  // 获取已初始化插件
  getInitialized(): string[] {
    const initialized: string[] = [];
    for (const [name, instance] of this.plugins) {
      if (instance.status === 'initialized' || instance.status === 'running') {
        initialized.push(name);
      }
    }
    return initialized;
  }

  // 获取插件状态
  getStatus(name: string): PluginStatus | undefined {
    return this.plugins.get(name)?.status;
  }

  // 检查插件是否已加载
  has(name: string): boolean {
    return this.plugins.has(name);
  }

  // 移除插件
  async unregister(name: string): Promise<void> {
    const instance = this.plugins.get(name);
    if (!instance) {
      return;
    }

    try {
      await instance.plugin.dispose();
    } catch (error) {
      this.context?.logger.warn(`Error disposing plugin "${name}": ${error}`);
    }

    this.plugins.delete(name);
    this.context?.logger.info(`Plugin "${name}" unregistered`);
  }

  // 销毁所有插件
  async disposeAll(): Promise<void> {
    const names = Array.from(this.plugins.keys());

    for (const name of names) {
      await this.unregister(name);
    }

    this.context?.logger.info('All plugins disposed');
  }

  // 获取插件数量
  size(): number {
    return this.plugins.size;
  }
}
