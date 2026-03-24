// [META] since:2026-03 | owner:plugin-team | stable:true
// [WHY] Plugin loader resolves configured plugins and manages runtime loading lifecycle
// ============================================
// CodeMap 插件加载器
// 负责动态加载插件
// ============================================

import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import type {
  CodeMapPlugin,
  PluginLoadOptions,
  PluginContext,
  PluginLogger,
  PluginCache,
  PluginLoadAttempt,
} from './types.js';
import { PluginRegistry } from './plugin-registry.js';
import type { CodemapConfig } from '../types/index.js';
import type { PluginDiagnostic } from '../types/index.js';

type PluginExport = CodeMapPlugin | (() => Promise<CodeMapPlugin> | CodeMapPlugin);
type PluginModule = { default?: PluginExport; plugin?: PluginExport };
type PluginLoadContext = { bustCache?: boolean };
type LoadedPluginSource =
  | { kind: 'builtin'; pluginName: string }
  | { kind: 'file'; pluginPath: string }
  | { kind: 'module'; pluginName: string; pluginDir?: string };

const BUILT_IN_PLUGIN_MODULES: Record<string, URL> = {
  'complexity-analyzer': new URL('./built-in/complexity-analyzer.js', import.meta.url),
  'call-graph': new URL('./built-in/call-graph.js', import.meta.url),
};
const require = createRequire(import.meta.url);

// 简单内存缓存实现
class SimpleCache implements PluginCache {
  private cache = new Map<string, { value: unknown; ttl?: number }>();

  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    if (item.ttl && Date.now() > item.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value as T;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    this.cache.set(key, {
      value,
      ttl: ttl ? Date.now() + ttl : undefined,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// 控制台日志实现
class ConsoleLogger implements PluginLogger {
  private debugEnabled: boolean;

  constructor(debug = false) {
    this.debugEnabled = debug;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.debugEnabled) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    console.log(`[INFO] ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }
}

// 插件加载器
export class PluginLoader {
  private registry: PluginRegistry;
  private logger: PluginLogger;
  private cache: PluginCache;
  private config: CodemapConfig;
  private loadedSources = new Map<string, LoadedPluginSource>();

  constructor(config: CodemapConfig, logger?: PluginLogger, debug = false) {
    this.config = config;
    this.logger = logger || new ConsoleLogger(debug);
    this.cache = new SimpleCache();
    this.registry = new PluginRegistry();
  }

  private createDiagnostic(
    level: PluginDiagnostic['level'],
    stage: PluginDiagnostic['stage'],
    message: string,
    plugin?: string
  ): PluginDiagnostic {
    return {
      plugin,
      stage,
      level,
      message,
    };
  }

  private resolvePluginExport(module: { default?: PluginExport; plugin?: PluginExport }): PluginExport | undefined {
    return module.default || module.plugin;
  }

  private async instantiatePlugin(plugin: PluginExport): Promise<CodeMapPlugin> {
    return typeof plugin === 'function' ? plugin() : plugin;
  }

  private async importModuleFromUrl(moduleUrl: URL, bustCache = false): Promise<PluginModule> {
    const resolvedUrl = new URL(moduleUrl.href);
    if (bustCache) {
      resolvedUrl.searchParams.set('codemap-reload', `${Date.now()}`);
    }
    return import(resolvedUrl.href) as Promise<PluginModule>;
  }

  private async importModuleFromFile(pluginPath: string, bustCache = false): Promise<PluginModule> {
    const moduleUrl = pathToFileURL(path.resolve(pluginPath));
    if (bustCache) {
      moduleUrl.searchParams.set('codemap-reload', `${Date.now()}`);
    }
    return import(moduleUrl.href) as Promise<PluginModule>;
  }

  private resolveModulePath(pluginName: string, pluginDir?: string): string {
    if (pluginDir) {
      return require.resolve(pluginName, { paths: [pluginDir, process.cwd()] });
    }

    return require.resolve(pluginName);
  }

  private async importModuleByName(
    pluginName: string,
    pluginDir?: string,
    bustCache = false
  ): Promise<PluginModule> {
    const resolvedPath = this.resolveModulePath(pluginName, pluginDir);
    return this.importModuleFromFile(resolvedPath, bustCache);
  }

  private async registerLoadedPlugin(
    module: PluginModule,
    source: LoadedPluginSource,
    missingMessage: string,
    pluginName?: string
  ): Promise<PluginLoadAttempt> {
    const diagnostics: PluginDiagnostic[] = [];

    const plugin = this.resolvePluginExport(module);
    if (!plugin) {
      diagnostics.push(this.createDiagnostic('warning', 'load', missingMessage, pluginName));
      return { diagnostics, loaded: false };
    }

    const instance = await this.instantiatePlugin(plugin);
    await this.registry.register(instance);
    this.loadedSources.set(instance.metadata.name, source);
    return {
      diagnostics,
      loaded: true,
      name: instance.metadata.name,
    };
  }

  private async loadBuiltInPluginByName(
    pluginName: string,
    context: PluginLoadContext = {}
  ): Promise<PluginLoadAttempt> {
    const diagnostics: PluginDiagnostic[] = [];
    const moduleUrl = BUILT_IN_PLUGIN_MODULES[pluginName];

    if (!moduleUrl) {
      return { diagnostics, loaded: false };
    }

    try {
      const pluginModule = await this.importModuleFromUrl(moduleUrl, context.bustCache);
      return this.registerLoadedPlugin(
        pluginModule,
        { kind: 'builtin', pluginName },
        `内置插件 "${pluginName}" 未导出默认插件实例`,
        pluginName
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      diagnostics.push(
        this.createDiagnostic('error', 'load', `加载内置插件失败: ${reason}`, pluginName)
      );
      return { diagnostics, loaded: false };
    }
  }

  // 获取插件上下文
  private createContext(): PluginContext {
    return {
      config: this.config,
      logger: this.logger,
      cache: this.cache,
    };
  }

  // 获取注册表
  getRegistry(): PluginRegistry {
    return this.registry;
  }

  // 加载内置插件
  async loadBuiltInPlugins(): Promise<PluginDiagnostic[]> {
    this.logger.info('Loading built-in plugins...');
    const diagnostics: PluginDiagnostic[] = [];

    for (const name of Object.keys(BUILT_IN_PLUGIN_MODULES)) {
      const result = await this.loadBuiltInPluginByName(name);
      diagnostics.push(...result.diagnostics);
    }

    return diagnostics;
  }

  // 从目录加载插件
  async loadFromDirectory(pluginDir: string): Promise<PluginDiagnostic[]> {
    this.logger.info(`Loading plugins from directory: ${pluginDir}`);
    const diagnostics: PluginDiagnostic[] = [];

    try {
      const entries = await fs.readdir(pluginDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.js')) {
          continue;
        }

        const pluginPath = path.join(pluginDir, entry.name);
        const result = await this.loadPluginFile(pluginPath);
        diagnostics.push(...result.diagnostics);
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to load plugins from directory: ${reason}`);
      diagnostics.push(
        this.createDiagnostic('warning', 'load', `插件目录不可读: ${reason}`)
      );
    }

    return diagnostics;
  }

  // 从文件加载单个插件
  async loadPluginFile(
    pluginPath: string,
    context: PluginLoadContext = {}
  ): Promise<PluginLoadAttempt> {
    const diagnostics: PluginDiagnostic[] = [];

    try {
      this.logger.debug(`Loading plugin from: ${pluginPath}`);

      const module = await this.importModuleFromFile(pluginPath, context.bustCache);
      return this.registerLoadedPlugin(
        module,
        { kind: 'file', pluginPath },
        `插件文件未导出默认插件实例: ${pluginPath}`
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to load plugin from ${pluginPath}: ${reason}`);
      diagnostics.push(
        this.createDiagnostic('error', 'load', `加载插件文件失败: ${reason}`)
      );
      return { diagnostics, loaded: false };
    }
  }

  private async loadPluginModuleByName(
    pluginName: string,
    pluginDir?: string,
    context: PluginLoadContext = {}
  ): Promise<PluginLoadAttempt> {
    const diagnostics: PluginDiagnostic[] = [];

    try {
      const module = await this.importModuleByName(pluginName, pluginDir, context.bustCache);
      return this.registerLoadedPlugin(
        module,
        { kind: 'module', pluginName, pluginDir },
        `插件模块 "${pluginName}" 未导出默认插件实例`,
        pluginName
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Plugin "${pluginName}" not found: ${reason}`);
      diagnostics.push(
        this.createDiagnostic('warning', 'load', `未找到插件 "${pluginName}": ${reason}`, pluginName)
      );
      return { diagnostics, loaded: false };
    }
  }

  // 加载指定名称的插件
  async loadPluginByName(pluginName: string, pluginDir?: string): Promise<PluginDiagnostic[]> {
    const diagnostics: PluginDiagnostic[] = [];

    if (this.registry.has(pluginName)) {
      return diagnostics;
    }

    const builtInResult = await this.loadBuiltInPluginByName(pluginName);
    diagnostics.push(...builtInResult.diagnostics);
    if (builtInResult.loaded) {
      return diagnostics;
    }

    if (pluginDir) {
      const pluginPath = path.join(pluginDir, `${pluginName}.js`);
      const fileResult = await this.loadPluginFile(pluginPath);
      diagnostics.push(...fileResult.diagnostics);
      if (fileResult.loaded) {
        return diagnostics;
      }
    }

    const moduleResult = await this.loadPluginModuleByName(pluginName, pluginDir);
    diagnostics.push(...moduleResult.diagnostics);

    return diagnostics;
  }

  // 加载所有插件
  async load(options: PluginLoadOptions = {}): Promise<PluginDiagnostic[]> {
    const { builtInPlugins = true, pluginDir, plugins = [] } = options;
    const diagnostics: PluginDiagnostic[] = [];

    // 设置插件上下文
    const context = this.createContext();
    this.registry.setContext(context);

    // 加载内置插件
    if (builtInPlugins) {
      diagnostics.push(...await this.loadBuiltInPlugins());
    }

    // 从目录加载
    if (pluginDir) {
      diagnostics.push(...await this.loadFromDirectory(pluginDir));
    }

    // 加载指定插件
    for (const pluginName of plugins) {
      diagnostics.push(...await this.loadPluginByName(pluginName, pluginDir));
    }

    // 初始化所有插件
    diagnostics.push(...await this.registry.initializeAll());

    this.logger.info(`Loaded ${this.registry.size()} plugin(s)`);
    return diagnostics;
  }

  // 重新加载插件
  async reload(name: string): Promise<void> {
    const source = this.loadedSources.get(name);
    if (!source) {
      throw new Error(`Plugin "${name}" is not loaded, cannot reload`);
    }

    await this.registry.unregister(name);
    this.loadedSources.delete(name);

    let result: PluginLoadAttempt;

    switch (source.kind) {
      case 'builtin':
        result = await this.loadBuiltInPluginByName(source.pluginName, { bustCache: true });
        break;
      case 'file':
        result = await this.loadPluginFile(source.pluginPath, { bustCache: true });
        break;
      case 'module':
        result = await this.loadPluginModuleByName(source.pluginName, source.pluginDir, { bustCache: true });
        break;
    }

    if (!result.loaded) {
      const message = result.diagnostics.map((diagnostic) => diagnostic.message).join('; ');
      throw new Error(message || `Plugin "${name}" reload failed`);
    }

    const reloadedName = result.name ?? name;
    if (reloadedName !== name) {
      await this.registry.unregister(reloadedName);
      this.loadedSources.delete(reloadedName);
      throw new Error(`Plugin "${name}" reload changed metadata name to "${reloadedName}"`);
    }

    const diagnostics = await this.registry.initializeByName(reloadedName);
    const fatalDiagnostic = diagnostics.find((diagnostic) => diagnostic.level === 'error');
    if (fatalDiagnostic) {
      throw new Error(fatalDiagnostic.message);
    }

    this.logger.info(`Plugin "${name}" reloaded`);
  }

  // 销毁
  async dispose(): Promise<void> {
    await this.registry.disposeAll();
    this.loadedSources.clear();
    this.logger.info('Plugin loader disposed');
  }
}

// 便捷函数：创建并加载插件
export async function createPluginLoader(
  config: CodemapConfig,
  options: PluginLoadOptions = {}
): Promise<PluginLoader> {
  const loader = new PluginLoader(config, undefined, options.debug);
  await loader.load(options);
  return loader;
}

// 导出 CodeMapPlugin 类型供外部使用
export type { CodeMapPlugin } from './types.js';
