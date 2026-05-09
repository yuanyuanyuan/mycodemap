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
export type StorageType = 'sqlite' | 'memory';
export type DeprecatedStorageType = 'filesystem' | 'kuzudb' | 'neo4j';
export type StorageTypeInput = StorageType | DeprecatedStorageType | 'auto';

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

export type ImpactEntrypointKind = 'file' | 'symbol';
export type ImpactNodeKind = 'module' | 'symbol';
export type ImpactAnalysisStatus = 'ok' | 'not_found' | 'ambiguous' | 'unavailable';
export type ImpactAnalysisConfidence = 'high' | 'reduced' | 'ambiguous' | 'unavailable';
export type ImpactGraphStatus = GraphMetadata['graphStatus'] | 'missing';

export interface ImpactError {
  code:
    | 'GRAPH_NOT_FOUND'
    | 'FILE_NOT_FOUND'
    | 'SYMBOL_NOT_FOUND'
    | 'AMBIGUOUS_ENTRYPOINT';
  message: string;
  details?: Record<string, unknown>;
}

export interface ImpactWarning {
  code: 'GRAPH_PARTIAL' | 'TRAVERSAL_TRUNCATED';
  message: string;
}

export interface ImpactEntrypointCandidate {
  id: string;
  kind: ImpactNodeKind;
  name: string;
  filePath: string;
  line?: number;
}

export interface ImpactEntrypoint {
  kind: ImpactEntrypointKind;
  id?: string;
  name: string;
  filePath?: string;
  line?: number;
  candidates?: ImpactEntrypointCandidate[];
}

export interface ImpactNode {
  id: string;
  kind: ImpactNodeKind;
  name: string;
  filePath: string;
  depth: number;
  path: string[];
}

export interface ImpactLayer {
  depth: number;
  nodes: ImpactNode[];
}

export interface ImpactSummary {
  requestedDepth: number;
  directCount: number;
  transitiveCount: number;
  totalCount: number;
  maxDepth: number;
  truncated: boolean;
}

export interface SharedImpactResult {
  status: ImpactAnalysisStatus;
  confidence: ImpactAnalysisConfidence;
  graphStatus: ImpactGraphStatus;
  entrypoint: ImpactEntrypoint;
  summary: ImpactSummary;
  direct: ImpactNode[];
  transitiveLayers: ImpactLayer[];
  warnings: ImpactWarning[];
  truncated: boolean;
  remediation?: string;
  error?: ImpactError;
}

export type CommunityAnalysisStatus = 'ok' | 'unavailable';
export type CommunityAnalysisConfidence = 'high' | 'reduced' | 'unavailable';

export interface CommunityError {
  code: 'GRAPH_NOT_FOUND';
  message: string;
  details?: Record<string, unknown>;
}

export interface CommunityWarning {
  code:
    | 'GRAPH_PARTIAL'
    | 'LOW_SIGNAL_SPARSE_GRAPH'
    | 'LOW_SIGNAL_DOMINANT_SINGLE_CLUSTER'
    | 'LOW_SIGNAL_SINGLETON_HEAVY';
  message: string;
}

export interface CommunitySummary {
  totalModules: number;
  totalEdges: number;
  communityCount: number;
  singletonCount: number;
  modularity: number;
  largestCommunitySize: number;
  largestCommunityRatio: number;
}

export interface CommunityCluster {
  id: string;
  label: string;
  moduleIds: string[];
  modulePaths: string[];
  size: number;
  topPaths: string[];
  dominantEdgeKinds: Dependency['type'][];
  cohesion: number;
}

export interface SharedCommunityResult {
  status: CommunityAnalysisStatus;
  confidence: CommunityAnalysisConfidence;
  graphStatus: ImpactGraphStatus;
  summary: CommunitySummary;
  communities: CommunityCluster[];
  warnings: CommunityWarning[];
  remediation?: string;
  error?: CommunityError;
}

export interface FileImpactRequest {
  kind: 'file';
  filePath: string;
  depth: number;
  limit?: number;
}

export interface SymbolImpactRequest {
  kind: 'symbol';
  symbol: string;
  filePath?: string;
  depth: number;
  limit: number;
}

export type ImpactAnalysisRequest = FileImpactRequest | SymbolImpactRequest;

/** 影响分析结果 */
export interface ImpactResult extends SharedImpactResult {
  rootModule?: string;
  affectedModules: Module[];
  depth: number;
}

/** 图元数据 */
export interface GraphMetadata {
  generatedAt: string | null;
  graphStatus: 'complete' | 'partial';
  failedFileCount: number;
  parseFailureFiles: string[];
  moduleCount: number;
  symbolCount: number;
  lastRefresh?: IncrementalRefreshSummary;
}

export type IncrementalRefreshStatus = 'success' | 'partial' | 'failed';

export type IncrementalRefreshDiagnosticCode =
  | 'INCREMENTAL_CHANGED_FILES_OVERRIDE'
  | 'INCREMENTAL_SCOPE_UNRELIABLE'
  | 'INCREMENTAL_FULL_REBUILD_REQUIRED'
  | 'INCREMENTAL_SCOPE_EMPTY'
  | 'INCREMENTAL_PARTIAL_SLICE_FAILURE'
  | 'INCREMENTAL_WRITEBACK_FAILED'
  | 'INCREMENTAL_SNAPSHOT_REPLACED'
  | 'INCREMENTAL_INVALIDATION_BOUNDARY_UNRESOLVED';

export interface IncrementalRefreshCounts {
  changed: number;
  reused: number;
  recomputed: number;
  invalidated: number;
  failed: number;
}

export interface IncrementalRefreshReason {
  path: string;
  reason: string;
}

export interface IncrementalRefreshDiagnostic {
  code: IncrementalRefreshDiagnosticCode;
  message: string;
}

export interface IncrementalRefreshAffected {
  changed: IncrementalRefreshReason[];
  reused: IncrementalRefreshReason[];
  recomputed: IncrementalRefreshReason[];
  invalidated: IncrementalRefreshReason[];
  failed: IncrementalRefreshReason[];
}

export interface IncrementalRefreshSummary {
  status: IncrementalRefreshStatus;
  scopeSource: 'explicit' | 'git-diff';
  counts: IncrementalRefreshCounts;
  diagnostics: IncrementalRefreshDiagnostic[];
  affected: IncrementalRefreshAffected;
  remediation?: string;
}

/** 符号级影响节点 */
export interface SymbolImpactNode extends ImpactNode {
  symbol: Symbol;
}

/** 符号级影响分析结果 */
export interface SymbolImpactResult extends SharedImpactResult {
  rootSymbol?: Symbol;
  affectedSymbols: SymbolImpactNode[];
  depth: number;
  limit: number;
  truncated: boolean;
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
  /** auto 表示在 SQLite family 内自动选择具体实现 */
  type: StorageTypeInput;

  // 兼容旧配置读取；SQLite-only 持久化将在后续 phase 继续收敛
  outputPath?: string;

  // SQLite 数据库路径；兼容 legacy config 迁移提示
  databasePath?: string;

  // 仅为识别并拒绝遗留配置而保留
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
  readonly type: StorageType | DeprecatedStorageType;
  
  /** 初始化存储 */
  initialize(projectPath: string): Promise<void>;
  
  /** 关闭存储连接 */
  close(): Promise<void>;
  
  // ========== 项目级别操作 ==========
  
  /** 保存完整代码图 */
  saveCodeGraph(graph: CodeGraph): Promise<void>;
  
  /** 加载完整代码图 */
  loadCodeGraph(): Promise<CodeGraph>;

  /** 读取图元数据 */
  loadGraphMetadata(): Promise<GraphMetadata>;
  
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

  /** 计算符号级影响范围 */
  calculateSymbolImpact(symbolId: string, depth: number, limit: number): Promise<SymbolImpactResult>;
  
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
