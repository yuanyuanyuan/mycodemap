// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] API routes - defines HTTP endpoints for the CodeMap server
// ============================================
// API 路由 - 定义 CodeMap 服务器的 HTTP 端点
// ============================================

import { Hono } from 'hono';
import type { QueryHandler } from '../handlers/QueryHandler.js';
import type { AnalysisHandler } from '../handlers/AnalysisHandler.js';
import { isUnsupportedAnalysisOperationError } from '../handlers/AnalysisHandler.js';
import type { 
  ApiResponse, 
  SearchRequest,
  ImpactAnalysisRequest,
  PaginationParams,
} from '../types/index.js';

function toAnalysisErrorResponse(error: unknown, fallbackCode: string): {
  status: 500 | 501;
  code: string;
  message: string;
} {
  if (isUnsupportedAnalysisOperationError(error)) {
    return {
      status: error.statusCode,
      code: error.code,
      message: error.message,
    };
  }

  return {
    status: 500,
    code: fallbackCode,
    message: String(error),
  };
}

/**
 * 创建 API 路由
 */
export function createApiRoutes(
  queryHandler: QueryHandler,
  analysisHandler: AnalysisHandler
): Hono {
  const api = new Hono();

  // ============================================
  // 健康检查
  // ============================================
  api.get('/health', (c) => {
    return c.json<ApiResponse<{ status: string }>>({
      success: true,
      data: { status: 'ok' },
      meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
    });
  });

  // ============================================
  // 查询端点
  // ============================================

  // 搜索符号
  api.get('/search/symbols', async (c) => {
    const query = c.req.query('q') ?? '';
    const limit = parseInt(c.req.query('limit') ?? '50', 10);

    try {
      const result = await queryHandler.searchSymbols({ query, limit });
      return c.json<ApiResponse<typeof result>>({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      });
    } catch (error) {
      return c.json<ApiResponse<never>>({
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: String(error),
        },
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      }, 500);
    }
  });

  // 搜索模块
  api.get('/search/modules', async (c) => {
    const query = c.req.query('q') ?? '';
    const limit = parseInt(c.req.query('limit') ?? '50', 10);

    try {
      const result = await queryHandler.searchModules({ query, limit });
      return c.json<ApiResponse<typeof result>>({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      });
    } catch (error) {
      return c.json<ApiResponse<never>>({
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: String(error),
        },
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      }, 500);
    }
  });

  // 获取模块详情
  api.get('/modules/:id', async (c) => {
    const id = c.req.param('id');

    try {
      const result = await queryHandler.getModuleDetail(id);
      if (!result) {
        return c.json<ApiResponse<never>>({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Module ${id} not found`,
          },
          meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
        }, 404);
      }
      return c.json<ApiResponse<typeof result>>({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      });
    } catch (error) {
      return c.json<ApiResponse<never>>({
        success: false,
        error: {
          code: 'QUERY_ERROR',
          message: String(error),
        },
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      }, 500);
    }
  });

  // 获取符号详情
  api.get('/symbols/:id', async (c) => {
    const id = c.req.param('id');

    try {
      const result = await queryHandler.getSymbolDetail(id);
      if (!result) {
        return c.json<ApiResponse<never>>({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Symbol ${id} not found`,
          },
          meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
        }, 404);
      }
      return c.json<ApiResponse<typeof result>>({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      });
    } catch (error) {
      return c.json<ApiResponse<never>>({
        success: false,
        error: {
          code: 'QUERY_ERROR',
          message: String(error),
        },
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      }, 500);
    }
  });

  // 获取调用者
  api.get('/symbols/:id/callers', async (c) => {
    const id = c.req.param('id');

    try {
      const result = await queryHandler.getCallers(id);
      return c.json<ApiResponse<typeof result>>({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      });
    } catch (error) {
      return c.json<ApiResponse<never>>({
        success: false,
        error: {
          code: 'QUERY_ERROR',
          message: String(error),
        },
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      }, 500);
    }
  });

  // 获取被调用者
  api.get('/symbols/:id/callees', async (c) => {
    const id = c.req.param('id');

    try {
      const result = await queryHandler.getCallees(id);
      return c.json<ApiResponse<typeof result>>({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      });
    } catch (error) {
      return c.json<ApiResponse<never>>({
        success: false,
        error: {
          code: 'QUERY_ERROR',
          message: String(error),
        },
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      }, 500);
    }
  });

  // 影响分析
  api.post('/analysis/impact', async (c) => {
    try {
      const body = await c.req.json<ImpactAnalysisRequest>();
      const result = await queryHandler.analyzeImpact(body);
      return c.json<ApiResponse<typeof result>>({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      });
    } catch (error) {
      const failure = toAnalysisErrorResponse(error, 'ANALYSIS_ERROR');
      return c.json<ApiResponse<never>>({
        success: false,
        error: {
          code: failure.code,
          message: failure.message,
        },
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      }, failure.status);
    }
  });

  // 循环依赖检测
  api.get('/analysis/cycles', async (c) => {
    try {
      const result = await queryHandler.detectCycles();
      return c.json<ApiResponse<typeof result>>({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      });
    } catch (error) {
      const failure = toAnalysisErrorResponse(error, 'ANALYSIS_ERROR');
      return c.json<ApiResponse<never>>({
        success: false,
        error: {
          code: failure.code,
          message: failure.message,
        },
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      }, failure.status);
    }
  });

  // 项目统计
  api.get('/stats', async (c) => {
    try {
      const result = await queryHandler.getProjectStats();
      return c.json<ApiResponse<typeof result>>({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      });
    } catch (error) {
      return c.json<ApiResponse<never>>({
        success: false,
        error: {
          code: 'QUERY_ERROR',
          message: String(error),
        },
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      }, 500);
    }
  });

  // 依赖图数据（用于可视化）
  api.get('/graph', async (c) => {
    const page = parseInt(c.req.query('page') ?? '1', 10);
    const limit = parseInt(c.req.query('limit') ?? '100', 10);

    try {
      const result = await queryHandler.getDependencyGraph({ page, limit });
      return c.json<ApiResponse<typeof result>>({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      });
    } catch (error) {
      return c.json<ApiResponse<never>>({
        success: false,
        error: {
          code: 'QUERY_ERROR',
          message: String(error),
        },
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      }, 500);
    }
  });

  // ============================================
  // 分析操作端点
  // ============================================

  // 执行分析
  api.post('/analysis', async (c) => {
    try {
      const body = await c.req.json<{ projectPath: string; mode?: 'fast' | 'smart' }>();
      const result = await analysisHandler.analyze({
        projectPath: body.projectPath,
        options: { mode: body.mode ?? 'fast' },
      });
      return c.json<ApiResponse<typeof result>>({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      });
    } catch (error) {
      const failure = toAnalysisErrorResponse(error, 'ANALYSIS_ERROR');
      return c.json<ApiResponse<never>>({
        success: false,
        error: {
          code: failure.code,
          message: failure.message,
        },
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      }, failure.status);
    }
  });

  // 刷新项目
  api.post('/analysis/refresh', async (c) => {
    try {
      const body = await c.req.json<{ projectPath: string }>();
      const result = await analysisHandler.refresh(body.projectPath);
      return c.json<ApiResponse<typeof result>>({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      });
    } catch (error) {
      const failure = toAnalysisErrorResponse(error, 'REFRESH_ERROR');
      return c.json<ApiResponse<never>>({
        success: false,
        error: {
          code: failure.code,
          message: failure.message,
        },
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      }, failure.status);
    }
  });

  // 验证数据
  api.get('/analysis/validate', async (c) => {
    try {
      const result = await analysisHandler.validate();
      return c.json<ApiResponse<typeof result>>({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      });
    } catch (error) {
      return c.json<ApiResponse<never>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: String(error),
        },
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      }, 500);
    }
  });

  // 导出数据
  api.get('/export/:format', async (c) => {
    const format = c.req.param('format') as 'json' | 'graphml' | 'dot';

    if (!['json', 'graphml', 'dot'].includes(format)) {
      return c.json<ApiResponse<never>>({
        success: false,
        error: {
          code: 'INVALID_FORMAT',
          message: `Unsupported format: ${format}`,
        },
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      }, 400);
    }

    try {
      const result = await analysisHandler.export(format);
      c.header('Content-Type', result.contentType);
      c.header('Content-Disposition', `attachment; filename="${result.filename}"`);
      return c.body(result.data);
    } catch (error) {
      return c.json<ApiResponse<never>>({
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: String(error),
        },
        meta: { timestamp: new Date().toISOString(), requestId: generateRequestId() },
      }, 500);
    }
  });

  return api;
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
