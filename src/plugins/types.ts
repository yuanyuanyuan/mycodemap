// [META] since:2026-03 | owner:plugin-team | stable:true
// [WHY] Plugin types define the stable contract shared by plugin runtime and user plugins
// ============================================
// CodeMap 插件类型定义
// ============================================

import type { CodemapConfig, ModuleInfo, CodeMap, PluginDiagnostic } from '../types/index.js';
import type { CodemapPluginConfig } from '../interface/config/index.js';

// 插件日志接口
export interface PluginLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

// 插件缓存接口
export interface PluginCache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
}

// 插件上下文
export interface PluginContext {
  config: CodemapConfig;
  logger: PluginLogger;
  cache: PluginCache;
}

// 分析结果
export interface AnalysisResult {
  // 额外的分析数据，会合并到模块信息中
  moduleData?: Record<string, ModuleInfo>;
  // 额外的依赖边
  additionalEdges?: Array<{
    from: string;
    to: string;
    type: string;
    weight?: number;
  }>;
  // 自定义指标
  metrics?: Record<string, unknown>;
  // 警告信息
  warnings?: string[];
}

// 生成输出
export interface GeneratedOutput {
  // 生成的文件路径和内容
  files?: Array<{
    path: string;
    content: string;
  }>;
  // 要追加到现有文件的内容
  append?: Array<{
    path: string;
    content: string;
  }>;
  // 自定义数据
  data?: Record<string, unknown>;
}

// 插件钩子
export interface PluginHooks {
  analyze?: (modules: ModuleInfo[]) => Promise<AnalysisResult>;
  generate?: (codeMap: CodeMap) => Promise<GeneratedOutput>;
}

// 插件元数据
export interface PluginMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
  keywords?: string[];
}

// 插件接口
export interface CodeMapPlugin {
  // 插件元数据
  metadata: PluginMetadata;

  // 初始化插件
  initialize(context: PluginContext): Promise<void>;

  // 分析钩子 - 在主分析完成后调用
  analyze?(modules: ModuleInfo[]): Promise<AnalysisResult>;

  // 生成钩子 - 在生成输出时调用
  generate?(codeMap: CodeMap): Promise<GeneratedOutput>;

  // 销毁插件
  dispose(): Promise<void>;
}

// 插件加载选项
export interface PluginLoadOptions extends CodemapPluginConfig {}

export interface PluginLoadAttempt {
  diagnostics: PluginDiagnostic[];
  loaded: boolean;
}

export interface PluginAnalysisRun {
  results: Map<string, AnalysisResult>;
  diagnostics: PluginDiagnostic[];
}

export interface PluginGenerateRun {
  results: Map<string, GeneratedOutput>;
  diagnostics: PluginDiagnostic[];
}

// 插件状态
export type PluginStatus = 'loaded' | 'initialized' | 'running' | 'disposed' | 'error';

// 插件实例
export interface PluginInstance {
  plugin: CodeMapPlugin;
  status: PluginStatus;
  loadTime: number;
  error?: Error;
}
