// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Domain entity: Project - represents a codebase project with identity and lifecycle
// ============================================
// 领域实体：项目 - 表示具有身份和生命周期的代码库项目
// ============================================

import type { Project as ProjectInterface } from '../../interface/types/index.js';

/**
 * 项目领域实体
 *
 * 职责：
 * - 维护项目身份信息
 * - 管理项目生命周期（创建、更新）
 * - 提供领域行为（重命名、更新路径等）
 */
export class Project implements ProjectInterface {
  readonly id: string;
  name: string;
  rootPath: string;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(
    id: string,
    name: string,
    rootPath: string,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date()
  ) {
    this.id = id;
    this.name = name;
    this.rootPath = rootPath;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    this.validate();
  }

  /**
   * 从接口数据创建项目实体
   */
  static fromInterface(data: ProjectInterface): Project {
    return new Project(
      data.id,
      data.name,
      data.rootPath,
      data.createdAt,
      data.updatedAt
    );
  }

  /**
   * 转换为接口数据
   */
  toInterface(): ProjectInterface {
    return {
      id: this.id,
      name: this.name,
      rootPath: this.rootPath,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * 重命名项目
   */
  rename(newName: string): void {
    if (!newName || newName.trim().length === 0) {
      throw new Error('Project name cannot be empty');
    }
    this.name = newName.trim();
    this.touch();
  }

  /**
   * 更新根路径
   */
  updateRootPath(newPath: string): void {
    if (!newPath || newPath.trim().length === 0) {
      throw new Error('Root path cannot be empty');
    }
    this.rootPath = newPath.trim();
    this.touch();
  }

  /**
   * 验证领域规则
   */
  private validate(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new Error('Project ID cannot be empty');
    }
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Project name cannot be empty');
    }
    if (!this.rootPath || this.rootPath.trim().length === 0) {
      throw new Error('Root path cannot be empty');
    }
  }

  /**
   * 更新时间戳
   */
  private touch(): void {
    this.updatedAt = new Date();
  }

  /**
   * 检查两个项目是否相同（基于 ID）
   */
  equals(other: Project): boolean {
    return this.id === other.id;
  }

  /**
   * 创建项目快照（克隆）
   */
  snapshot(): Project {
    return new Project(
      this.id,
      this.name,
      this.rootPath,
      new Date(this.createdAt),
      new Date(this.updatedAt)
    );
  }
}
