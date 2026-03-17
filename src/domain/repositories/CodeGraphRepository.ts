// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Repository interface - abstracts persistence for CodeGraph aggregate
// ============================================
// 仓库接口：代码图聚合的持久化抽象
// ============================================

import type { CodeGraph } from '../entities/CodeGraph.js';

/**
 * 代码图仓库接口
 *
 * 职责：
 * - 抽象代码图的持久化机制
 * - 定义领域对象的存储和检索契约
 * - 支持领域驱动设计的仓库模式
 *
 * 注意：实际实现由 Infrastructure 层提供
 */
export interface CodeGraphRepository {
  /**
   * 保存代码图
   */
  save(graph: CodeGraph): Promise<void>;

  /**
   * 根据项目 ID 加载代码图
   */
  findByProjectId(projectId: string): Promise<CodeGraph | null>;

  /**
   * 根据项目路径加载代码图
   */
  findByProjectPath(projectPath: string): Promise<CodeGraph | null>;

  /**
   * 检查项目是否存在
   */
  exists(projectId: string): Promise<boolean>;

  /**
   * 删除项目代码图
   */
  delete(projectId: string): Promise<void>;

  /**
   * 获取所有保存的项目 ID
   */
  getAllProjectIds(): Promise<string[]>;
}

/**
 * 仓库错误
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

/**
 * 实体未找到错误
 */
export class EntityNotFoundError extends RepositoryError {
  constructor(entityType: string, entityId: string) {
    super(
      `${entityType} with ID ${entityId} not found`,
      'ENTITY_NOT_FOUND'
    );
    this.name = 'EntityNotFoundError';
  }
}

/**
 * 并发冲突错误
 */
export class ConcurrencyConflictError extends RepositoryError {
  constructor(entityType: string, entityId: string) {
    super(
      `${entityType} with ID ${entityId} has been modified by another process`,
      'CONCURRENCY_CONFLICT'
    );
    this.name = 'ConcurrencyConflictError';
  }
}
