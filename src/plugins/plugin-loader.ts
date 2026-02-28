// ============================================
// CodeMap 插件加载器
// 负责动态加载插件
// ============================================

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { CodeMapPlugin, PluginLoadOptions, PluginContext, PluginLogger, PluginCache } from './types.js';
import { PluginRegistry } from './plugin-registry.js';
import type { CodemapConfig } from '../types/index.js';

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 默认插件目录
const DEFAULT_PLUGIN_DIR = path.join(__dirname, 'built-in');

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

  constructor(config: CodemapConfig, logger?: PluginLogger, debug = false) {
    this.config = config;
    this.logger = logger || new ConsoleLogger(debug);
    this.cache = new SimpleCache();
    this.registry = new PluginRegistry();
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
  async loadBuiltInPlugins(): Promise<void> {
    this.logger.info('Loading built-in plugins...');

    // 动态导入内置插件
    const builtInPlugins: Array<{ name: string; plugin: CodeMapPlugin }> = [
      { name: 'complexity-analyzer', plugin: (await import('./built-in/complexity-analyzer.js')).default },
      { name: 'call-graph', plugin: (await import('./built-in/call-graph.js')).default },
    ];

    for (const { name, plugin } of builtInPlugins) {
      try {
        if (plugin && plugin.metadata) {
          await this.registry.register(plugin);
        }
      } catch (error) {
        // 忽略加载失败的内置插件
        this.logger.debug(`Built-in plugin load skipped: ${error}`);
      }
    }
  }

  // 从目录加载插件
  async loadFromDirectory(pluginDir: string): Promise<void> {
    this.logger.info(`Loading plugins from directory: ${pluginDir}`);

    try {
      const entries = await fs.readdir(pluginDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.js')) {
          continue;
        }

        const pluginPath = path.join(pluginDir, entry.name);
        await this.loadPluginFile(pluginPath);
      }
    } catch (error) {
      this.logger.warn(`Failed to load plugins from directory: ${error}`);
    }
  }

  // 从文件加载单个插件
  async loadPluginFile(pluginPath: string): Promise<void> {
    try {
      this.logger.debug(`Loading plugin from: ${pluginPath}`);

      const module = await import(pluginPath);
      const plugin = module.default || module.plugin;

      if (!plugin) {
        this.logger.warn(`No plugin export found in: ${pluginPath}`);
        return;
      }

      const pluginInstance = typeof plugin === 'function' ? await plugin() : plugin;
      await this.registry.register(pluginInstance);
    } catch (error) {
      this.logger.error(`Failed to load plugin from ${pluginPath}: ${error}`);
    }
  }

  // 加载指定名称的插件
  async loadPluginByName(pluginName: string, pluginDir: string): Promise<void> {
    const pluginPath = path.join(pluginDir, `${pluginName}.js`);

    try {
      await this.loadPluginFile(pluginPath);
    } catch (error) {
      // 尝试作为 Node.js 模块加载
      try {
        const module = await import(pluginName);
        const plugin = module.default || module.plugin;
        if (plugin) {
          const pluginInstance = typeof plugin === 'function' ? await plugin() : plugin;
          await this.registry.register(pluginInstance);
        }
      } catch {
        this.logger.warn(`Plugin "${pluginName}" not found`);
      }
    }
  }

  // 加载所有插件
  async load(options: PluginLoadOptions = {}): Promise<void> {
    const { builtInPlugins = true, pluginDir = DEFAULT_PLUGIN_DIR, plugins = [] } = options;

    // 设置插件上下文
    const context = this.createContext();
    this.registry.setContext(context);

    // 加载内置插件
    if (builtInPlugins) {
      await this.loadBuiltInPlugins();
    }

    // 从目录加载
    if (pluginDir) {
      await this.loadFromDirectory(pluginDir);
    }

    // 加载指定插件
    for (const pluginName of plugins) {
      await this.loadPluginByName(pluginName, pluginDir);
    }

    // 初始化所有插件
    await this.registry.initializeAll();

    this.logger.info(`Loaded ${this.registry.size()} plugin(s)`);
  }

  // 重新加载插件
  async reload(name: string): Promise<void> {
    await this.registry.unregister(name);
    // TODO: 实现真正的热重载
    this.logger.info(`Plugin "${name}" reloaded`);
  }

  // 销毁
  async dispose(): Promise<void> {
    await this.registry.disposeAll();
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
