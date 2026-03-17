// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Storage abstraction layer type definitions
// ============================================
// 存储抽象层类型定义
// ============================================

import type { CodeGraph, Module, Symbol, Dependency } from './index.js';

// ============================================
// Section 1: 存储类型
// ============================================

/** 存储后端类型 */
export type StorageType = 'filesystem' | 'kuzudb' | 'neo4j' | 'memory';

// ============================================
// Section 2: 搜索选项
// ============================================

/** 搜索选项 */
export interface SearchOptions {
  type?: 'symbol' | 'module' | 'file';
  language?: string;
  limit?: number;
  offset?: number;
}

/** 搜索结果 */
export interface SearchResult {
  id: string;
  name: string;
  type: 'symbol' | 'module' | 'file';
  path?: string;
  score: number;
}

// ============================================
// Section 3: 分析结果
// ============================================

/** 循环依赖 */
export interface Cycle {
  modules: string[];
  length: number;
}

/** 影响分析结果 */
export interface ImpactResult {
  rootModule: string;
  affectedModules: Module[];
  depth: number;
}

/** 项目统计 */
export interface ProjectStatistics {
  totalModules: number;
  totalSymbols: number;
  totalDependencies: number;
  totalLines: number;
  averageComplexity: number;
}

// ============================================
// Section 4: 存储配置
// ============================================

/** 存储配置 */
export interface StorageConfig {
  type: StorageType | 'auto';
  
  // FileSystem 配置
  outputPath?: string;
  
  // KùzuDB 配置
  databasePath?: string;
  
  // Neo4j 配置
  uri?: string;
  username?: string;
  password?: string;
  
  // 自动选择配置
  autoThresholds?: {
    useGraphDBWhenFileCount: number;
    useGraphDBWhenNodeCount: number;
  };
}

// ============================================
// Section 5: 存储接口
// ============================================

/**
 * 存储抽象接口
 * 定义所有存储后端必须实现的能力
 */
export interface IStorage {
  /** 存储类型标识 */
  readonly type: StorageType;
  
  /** 初始化存储 */
  initialize(projectPath: string): Promise<void>;
  
  /** 关闭存储连接 */
  close(): Promise<void>;
  
  // ========== 项目级别操作 ==========
  
  /** 保存完整代码图 */
  saveCodeGraph(graph: CodeGraph): Promise<void>;
  
  /** 加载完整代码图 */
  loadCodeGraph(): Promise<CodeGraph>;
  
  /** 删除项目数据 */
  deleteProject(): Promise<void>;
  
  // ========== 增量更新 ==========
  
  /** 更新单个模块 */
  updateModule(module: Module): Promise<void>;
  
  /** 删除模块 */
  deleteModule(moduleId: string): Promise<void>;
  
  // ========== 查询操作 ==========
  
  /** 查询模块 */
  findModuleById(id: string): Promise<Module | null>;
  findModulesByPath(path: string): Promise<Module[]>;
  
  /** 查询符号 */
  findSymbolByName(name: string): Promise<Symbol[]>;
  findSymbolById(id: string): Promise<Symbol | null>;
  
  /** 查询依赖 */
  findDependencies(moduleId: string): Promise<Dependency[]>;
  findDependents(moduleId: string): Promise<Dependency[]>;
  
  /** 查询调用关系 */
  findCallers(functionId: string): Promise<Symbol[]>;
  findCallees(functionId: string): Promise<Symbol[]>;
  
  /** 模糊搜索 */
  search(query: string, options: SearchOptions): Promise<SearchResult[]>;
  
  // ========== 分析操作 ==========
  
  /** 检测循环依赖 */
  detectCycles(): Promise<Cycle[]>;
  
  /** 计算影响范围 */
  calculateImpact(moduleId: string, depth: number): Promise<ImpactResult>;
  
  /** 获取项目统计 */
  getStatistics(): Promise<ProjectStatistics>;
}

// ============================================
// Section 6: 存储工厂接口
// ============================================

/** 存储工厂 */
export interface IStorageFactory {
  create(config: StorageConfig): Promise<IStorage>;
  createForProject(projectPath: string, config: StorageConfig): Promise<IStorage>;
}
