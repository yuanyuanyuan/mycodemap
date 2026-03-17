// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Server layer type definitions - API contracts and request/response types
// ============================================
// Server 层类型定义 - API 契约和请求/响应类型
// ============================================

import type { CodeGraph } from '../../domain/entities/CodeGraph.js';

/**
 * API 响应封装
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * 分页请求参数
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * 分页响应元数据
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * 搜索请求
 */
export interface SearchRequest {
  query: string;
  type?: 'symbol' | 'module' | 'dependency';
  language?: string;
  limit?: number;
}

/**
 * 搜索响应
 */
export interface SearchResponse<T> {
  items: T[];
  total: number;
}

/**
 * 影响分析请求
 */
export interface ImpactAnalysisRequest {
  moduleId: string;
  depth?: number;
}

/**
 * 影响分析响应
 */
export interface ImpactAnalysisResponse {
  rootModule: string;
  affectedModules: Array<{
    id: string;
    path: string;
    depth: number;
  }>;
  totalAffected: number;
  maxDepth: number;
}

/**
 * 循环依赖响应
 */
export interface CycleDetectionResponse {
  cycles: Array<{
    modules: string[];
    length: number;
  }>;
  totalCycles: number;
}

/**
 * 项目统计响应
 */
export interface ProjectStatsResponse {
  totalModules: number;
  totalSymbols: number;
  totalDependencies: number;
  totalLines: number;
  averageComplexity: number;
  languageDistribution: Record<string, number>;
}

/**
 * 模块详情响应
 */
export interface ModuleDetailResponse {
  id: string;
  path: string;
  language: string;
  stats: {
    lines: number;
    codeLines: number;
    commentLines: number;
    blankLines: number;
  };
  symbols: Array<{
    id: string;
    name: string;
    kind: string;
    visibility: string;
  }>;
  dependencies: Array<{
    id: string;
    targetPath: string;
    type: string;
  }>;
  dependents: Array<{
    id: string;
    sourcePath: string;
    type: string;
  }>;
}

/**
 * 符号详情响应
 */
export interface SymbolDetailResponse {
  id: string;
  name: string;
  kind: string;
  visibility: string;
  location: {
    file: string;
    line: number;
    column: number;
  };
  module: {
    id: string;
    path: string;
  };
}

/**
 * 依赖图数据（用于可视化）
 */
export interface DependencyGraphResponse {
  nodes: Array<{
    id: string;
    label: string;
    type: 'module' | 'symbol';
    category?: string;
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: string;
  }>;
}

/**
 * Server 配置
 */
export interface ServerConfig {
  port: number;
  host: string;
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };
  auth?: {
    type: 'none' | 'bearer' | 'api-key';
    secret?: string;
  };
}
