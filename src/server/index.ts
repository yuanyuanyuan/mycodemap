// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Server layer exports - central entry point for HTTP API server
// ============================================
// Server 层导出 - HTTP API 服务器的中央入口点
// ============================================

// 主服务器类
export { CodeMapServer } from './CodeMapServer.js';

// 处理器
export { QueryHandler } from './handlers/QueryHandler.js';
export { AnalysisHandler } from './handlers/AnalysisHandler.js';

// 路由
export { createApiRoutes } from './routes/api.js';

// 类型
export type {
  ServerConfig,
  ApiResponse,
  SearchRequest,
  SearchResponse,
  ImpactAnalysisRequest,
  ImpactAnalysisResponse,
  CycleDetectionResponse,
  ProjectStatsResponse,
  ModuleDetailResponse,
  SymbolDetailResponse,
  DependencyGraphResponse,
  PaginationParams,
} from './types/index.js';

// 处理器类型
export type { 
  AnalyzeRequest, 
  AnalyzeResponse,
  IncrementalUpdateRequest,
} from './handlers/AnalysisHandler.js';
