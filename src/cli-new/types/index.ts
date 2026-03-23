// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] CLI layer type definitions - command options and global config
// ============================================
// CLI 层类型定义 - 命令选项和全局配置
// ============================================

import type { StorageConfig } from '../../interface/types/storage.js';
import type { AnalysisOptions } from '../../interface/types/index.js';
import type { ServerConfig } from '../../server/types/index.js';

/**
 * 全局 CLI 配置
 */
export interface CLIConfig {
  /** 项目根路径 */
  projectPath: string;
  /** 存储配置 */
  storage: StorageConfig;
  /** 分析配置 */
  analysis: AnalysisOptions;
  /** 服务器配置 */
  server?: ServerConfig;
  /** 是否启用详细日志 */
  verbose: boolean;
  /** 是否静默模式 */
  silent: boolean;
  /** 输出格式 */
  outputFormat: 'json' | 'yaml' | 'table' | 'markdown';
}

/**
 * 命令上下文
 * 在命令执行期间共享的数据
 */
export interface CommandContext {
  config: CLIConfig;
  projectPath: string;
}

/**
 * 命令结果
 */
export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
  message?: string;
}

/**
 * 生成命令选项
 */
export interface GenerateOptions {
  mode?: 'fast' | 'smart' | 'hybrid';
  output?: string;
  include?: string[];
  exclude?: string[];
  watch?: boolean;
}

/**
 * 查询命令选项
 */
export interface QueryOptions {
  type?: 'symbol' | 'module' | 'dependency';
  format?: 'json' | 'table' | 'markdown';
  limit?: number;
}

/**
 * 影响分析选项
 */
export interface ImpactOptions {
  depth?: number;
  format?: 'json' | 'tree' | 'table';
}

/**
 * 服务器命令选项
 */
export interface ServerOptions {
  port?: number;
  host?: string;
  cors?: boolean;
  open?: boolean;
}

/**
 * 导出命令选项
 */
export interface ExportOptions {
  format: 'json' | 'graphml' | 'dot' | 'mermaid';
  output?: string;
}

/**
 * 初始化命令选项
 */
export interface InitOptions {
  template?: 'basic' | 'full';
  force?: boolean;
}
