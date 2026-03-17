// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] CodeGraphRepository implementation - bridges Domain and Infrastructure layers
// ============================================
// CodeGraphRepository 实现 - 连接 Domain 层和 Infrastructure 层
// ============================================

import type { IStorage } from '../storage/index.js';
import { CodeGraph } from '../../domain/entities/CodeGraph.js';
import type { CodeGraphRepository } from '../../domain/repositories/CodeGraphRepository.js';
import { RepositoryError, EntityNotFoundError } from '../../domain/repositories/CodeGraphRepository.js';

/**
 * CodeGraphRepository 实现
 *
 * 职责：
 * - 实现领域层定义的仓库接口
 * - 使用 Infrastructure 层的存储适配器进行持久化
 * - 处理实体转换和一致性维护
 */
export class CodeGraphRepositoryImpl implements CodeGraphRepository {
  constructor(private storage: IStorage) {}

  /**
   * 保存代码图
   */
  async save(graph: CodeGraph): Promise<void> {
    try {
      await this.storage.saveCodeGraph(graph.toInterface());
    } catch (error) {
      throw new RepositoryError(
        'Failed to save code graph',
        'SAVE_FAILED',
        error
      );
    }
  }

  /**
   * 根据项目 ID 查找代码图
   */
  async findByProjectId(projectId: string): Promise<CodeGraph | null> {
    try {
      // 加载完整图数据
      const graphData = await this.storage.loadCodeGraph();
      
      // 检查项目 ID 是否匹配
      if (graphData.project.id !== projectId) {
        return null;
      }

      // 转换为领域实体
      return CodeGraph.fromInterface(graphData);
    } catch (error) {
      if ((error as { code?: string }).code === 'ENOENT' ||
          (error as Error).message?.includes('not found')) {
        return null;
      }
      throw new RepositoryError(
        `Failed to find code graph for project ${projectId}`,
        'FIND_FAILED',
        error
      );
    }
  }

  /**
   * 根据项目路径查找代码图
   */
  async findByProjectPath(projectPath: string): Promise<CodeGraph | null> {
    try {
      const graphData = await this.storage.loadCodeGraph();
      
      // 检查项目路径是否匹配
      if (graphData.project.rootPath !== projectPath) {
        return null;
      }

      return CodeGraph.fromInterface(graphData);
    } catch (error) {
      if ((error as { code?: string }).code === 'ENOENT' ||
          (error as Error).message?.includes('not found')) {
        return null;
      }
      throw new RepositoryError(
        `Failed to find code graph for path ${projectPath}`,
        'FIND_FAILED',
        error
      );
    }
  }

  /**
   * 检查项目是否存在
   */
  async exists(projectId: string): Promise<boolean> {
    try {
      const graph = await this.findByProjectId(projectId);
      return graph !== null;
    } catch {
      return false;
    }
  }

  /**
   * 删除项目代码图
   */
  async delete(projectId: string): Promise<void> {
    try {
      // 验证项目存在
      const exists = await this.exists(projectId);
      if (!exists) {
        throw new EntityNotFoundError('Project', projectId);
      }

      await this.storage.deleteProject();
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw error;
      }
      throw new RepositoryError(
        `Failed to delete project ${projectId}`,
        'DELETE_FAILED',
        error
      );
    }
  }

  /**
   * 获取所有保存的项目 ID
   */
  async getAllProjectIds(): Promise<string[]> {
    try {
      const graphData = await this.storage.loadCodeGraph();
      // 单个存储实例只对应一个项目
      return [graphData.project.id];
    } catch {
      return [];
    }
  }

  /**
   * 创建仓库实例的工厂方法
   */
  static create(storage: IStorage): CodeGraphRepositoryImpl {
    return new CodeGraphRepositoryImpl(storage);
  }
}
