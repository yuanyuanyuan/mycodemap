// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] CodeMapServer - main server class that orchestrates HTTP API and WebSocket support
// ============================================
// CodeMapServer - 主服务器类，协调 HTTP API 和 WebSocket 支持
// ============================================

import { Hono } from 'hono';
import { serve, type ServerType } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

import type { IStorage } from '../infrastructure/storage/index.js';
import type { CodeGraphBuilder } from '../domain/services/CodeGraphBuilder.js';
import type { ServerConfig } from './types/index.js';
import { QueryHandler } from './handlers/QueryHandler.js';
import { AnalysisHandler } from './handlers/AnalysisHandler.js';
import { createApiRoutes } from './routes/api.js';

/**
 * CodeMap 服务器
 *
 * 职责：
 * - 管理 HTTP 服务器生命周期
 * - 协调查询和分析处理器
 * - 配置中间件和路由
 * - 提供优雅的启动和关闭
 */
export class CodeMapServer {
  private app: Hono;
  private server: ServerType | null = null;
  private queryHandler: QueryHandler;
  private analysisHandler: AnalysisHandler;

  constructor(
    private storage: IStorage,
    private builder: CodeGraphBuilder,
    private config: ServerConfig = { port: 3000, host: '0.0.0.0' }
  ) {
    this.queryHandler = new QueryHandler(storage);
    this.analysisHandler = new AnalysisHandler(storage, builder);
    this.app = this.createApp();
  }

  /**
   * 创建 Hono 应用实例
   */
  private createApp(): Hono {
    const app = new Hono();

    // 全局中间件
    app.use(logger());
    app.use(prettyJSON());

    // CORS 配置
    if (this.config.cors) {
      app.use(cors({
        origin: this.config.cors.origin,
        credentials: this.config.cors.credentials,
      }));
    }

    // API 路由
    const apiRoutes = createApiRoutes(this.queryHandler, this.analysisHandler);
    app.route('/api/v1', apiRoutes);

    // 404 处理
    app.notFound((c) => {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Route ${c.req.path} not found`,
        },
      }, 404);
    });

    // 错误处理
    app.onError((err, c) => {
      console.error('Server error:', err);
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      }, 500);
    });

    return app;
  }

  /**
   * 启动服务器
   */
  async start(): Promise<{ url: string; port: number }> {
    return new Promise((resolve, reject) => {
      try {
        this.server = serve({
          fetch: this.app.fetch,
          port: this.config.port,
          hostname: this.config.host,
        }, (info) => {
          const url = `http://${this.config.host}:${info.port}`;
          console.log(`🚀 CodeMap Server running at ${url}`);
          console.log(`📊 API documentation: ${url}/api/v1/health`);
          resolve({ url, port: info.port });
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('👋 CodeMap Server stopped');
          this.server = null;
          resolve();
        }
      });
    });
  }

  /**
   * 获取应用实例（用于测试）
   */
  getApp(): Hono {
    return this.app;
  }

  /**
   * 检查服务器是否正在运行
   */
  isRunning(): boolean {
    return this.server !== null;
  }

  /**
   * 创建服务器实例的工厂方法
   */
  static create(
    storage: IStorage,
    builder: CodeGraphBuilder,
    config?: Partial<ServerConfig>
  ): CodeMapServer {
    const defaultConfig: ServerConfig = {
      port: 3000,
      host: '0.0.0.0',
    };

    return new CodeMapServer(
      storage,
      builder,
      { ...defaultConfig, ...config }
    );
  }
}
