// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Domain entity: Dependency - represents a dependency relationship between modules
// ============================================
// 领域实体：依赖 - 表示模块之间的依赖关系
// ============================================

import type { Dependency as DependencyInterface } from '../../interface/types/index.js';

/**
 * 依赖类型
 */
export type DependencyType = 'import' | 'inherit' | 'implement' | 'call' | 'type-ref';

/**
 * 依赖领域实体
 *
 * 职责：
 * - 维护依赖关系身份信息
 * - 记录源模块和目标模块
 * - 分类依赖类型
 */
export class Dependency implements DependencyInterface {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  type: DependencyType;

  constructor(
    id: string,
    sourceId: string,
    targetId: string,
    type: DependencyType = 'import'
  ) {
    this.id = id;
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.type = type;

    this.validate();
  }

  /**
   * 从接口数据创建依赖实体
   */
  static fromInterface(data: DependencyInterface): Dependency {
    return new Dependency(
      data.id,
      data.sourceId,
      data.targetId,
      data.type
    );
  }

  /**
   * 转换为接口数据
   */
  toInterface(): DependencyInterface {
    return {
      id: this.id,
      sourceId: this.sourceId,
      targetId: this.targetId,
      type: this.type,
    };
  }

  /**
   * 更改依赖类型
   */
  setType(type: DependencyType): void {
    this.type = type;
  }

  /**
   * 验证领域规则
   */
  private validate(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new Error('Dependency ID cannot be empty');
    }
    if (!this.sourceId || this.sourceId.trim().length === 0) {
      throw new Error('Source module ID cannot be empty');
    }
    if (!this.targetId || this.targetId.trim().length === 0) {
      throw new Error('Target module ID cannot be empty');
    }
    if (this.sourceId === this.targetId) {
      throw new Error('Source and target cannot be the same');
    }
  }

  /**
   * 检查两个依赖是否相同（基于 ID）
   */
  equals(other: Dependency): boolean {
    return this.id === other.id;
  }

  /**
   * 检查是否涉及指定模块（作为源或目标）
   */
  involvesModule(moduleId: string): boolean {
    return this.sourceId === moduleId || this.targetId === moduleId;
  }

  /**
   * 获取模块的依赖方向
   * @returns 'source' | 'target' | null
   */
  getDirectionFor(moduleId: string): 'source' | 'target' | null {
    if (this.sourceId === moduleId) return 'source';
    if (this.targetId === moduleId) return 'target';
    return null;
  }

  /**
   * 是否是继承关系
   */
  isInheritance(): boolean {
    return this.type === 'inherit' || this.type === 'implement';
  }

  /**
   * 是否是调用关系
   */
  isCall(): boolean {
    return this.type === 'call';
  }

  /**
   * 是否是类型引用
   */
  isTypeReference(): boolean {
    return this.type === 'type-ref';
  }

  /**
   * 创建反向依赖（交换源和目标）
   */
  createReverse(newId: string): Dependency {
    return new Dependency(newId, this.targetId, this.sourceId, this.type);
  }

  /**
   * 创建依赖快照（克隆）
   */
  snapshot(): Dependency {
    return new Dependency(this.id, this.sourceId, this.targetId, this.type);
  }

  /**
   * 创建唯一键（用于去重）
   */
  static createKey(sourceId: string, targetId: string, type: DependencyType): string {
    return `${sourceId}::${targetId}::${type}`;
  }

  /**
   * 获取当前依赖的唯一键
   */
  getKey(): string {
    return Dependency.createKey(this.sourceId, this.targetId, this.type);
  }
}
