// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Configuration type definitions for CodeMap
// ============================================
// 配置类型定义
// ============================================

import type { StorageConfig } from '../types/storage.js';

// ============================================
// Section 1: CLI 配置
// ============================================

/** CLI 配置 */
export interface CodemapPluginConfig {
  builtInPlugins?: boolean;
  pluginDir?: string;
  plugins?: string[];
  debug?: boolean;
}

/** CLI 配置 */
export interface CodemapConfig {
  mode: 'fast' | 'smart' | 'hybrid';
  include: string[];
  exclude: string[];
  output: string;
  watch: boolean;
  storage?: StorageConfig;
  plugins?: CodemapPluginConfig;
}

// ============================================
// Section 2: 生成请求/响应 (Server Layer)
// ============================================

/** 进度信息 */
export interface ProgressInfo {
  current: number;
  total: number;
  percentage: number;
  currentFile?: string;
}

/** 生成请求 */
export interface GenerateRequest {
  /** 项目根目录 */
  projectPath: string;
  
  /** 包含模式 */
  include?: string[];
  
  /** 排除模式 */
  exclude?: string[];
  
  /** 分析模式 */
  mode: 'fast' | 'smart' | 'hybrid';
  
  /** 存储配置 */
  storage?: StorageConfig;
  
  /** 输出配置 */
  output?: {
    formats: ('aimap' | 'context' | 'json' | 'deps-graph')[];
    directory: string;
  };
  
  /** 是否启用进度回调 */
  enableProgress?: boolean;
  
  /** 进度回调 */
  onProgress?: (progress: ProgressInfo) => void;
}

/** 生成响应 */
export interface GenerateResponse {
  /** 成功状态 */
  success: boolean;
  
  /** 代码图 */
  codeGraph: unknown; // CodeGraph 类型，避免循环引用
  
  /** 生成的文件路径 */
  generatedFiles: string[];
  
  /** 统计信息 */
  statistics: {
    totalFiles: number;
    parsedFiles: number;
    failedFiles: number;
    totalSymbols: number;
    totalDependencies: number;
    duration: number;
  };
  
  /** 警告信息 */
  warnings?: string[];
  
  /** 错误信息 */
  error?: string;
}

// ============================================
// Section 3: 查询请求/响应
// ============================================

/** 查询符号请求 */
export interface QuerySymbolRequest {
  name: string;
  projectPath: string;
  options?: {
    fuzzy?: boolean;
    limit?: number;
  };
}

/** 查询符号响应 */
export interface QuerySymbolResponse {
  success: boolean;
  symbols: unknown[]; // Symbol 类型
  error?: string;
}

// ============================================
// Section 4: 影响分析请求/响应
// ============================================

/** 影响分析请求 */
export interface AnalyzeImpactRequest {
  moduleId: string;
  depth: number;
  projectPath: string;
}

/** 影响分析响应 */
export interface AnalyzeImpactResponse {
  success: boolean;
  result?: {
    rootModule: string;
    affectedModules: unknown[]; // Module 类型
    depth: number;
  };
  error?: string;
}

// ============================================
// Section 5: 循环依赖检测请求/响应
// ============================================

/** 循环依赖检测请求 */
export interface DetectCyclesRequest {
  projectPath: string;
}

/** 循环依赖检测响应 */
export interface DetectCyclesResponse {
  success: boolean;
  cycles?: unknown[]; // Cycle 类型
  error?: string;
}
