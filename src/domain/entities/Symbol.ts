// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Domain entity: Symbol - represents a code symbol (function, class, interface, etc.)
// ============================================
// 领域实体：符号 - 表示代码符号（函数、类、接口等）
// ============================================

import type {
  Symbol as SymbolInterface,
  SymbolKind,
  SourceLocation,
} from '../../interface/types/index.js';

/**
 * 符号可见性类型
 */
export type SymbolVisibility = 'public' | 'private' | 'protected' | 'internal';

/**
 * 符号领域实体
 *
 * 职责：
 * - 维护符号身份信息
 * - 记录符号类型和位置
 * - 关联到所属模块
 */
export class Symbol implements SymbolInterface {
  readonly id: string;
  readonly moduleId: string;
  name: string;
  kind: SymbolKind;
  location: SourceLocation;
  visibility: SymbolVisibility;
  signature?: string;

  constructor(
    id: string,
    moduleId: string,
    name: string,
    kind: SymbolKind,
    location: SourceLocation,
    visibility: SymbolVisibility = 'public',
    signature?: string
  ) {
    this.id = id;
    this.moduleId = moduleId;
    this.name = name;
    this.kind = kind;
    this.location = location;
    this.visibility = visibility;
    this.signature = signature;

    this.validate();
  }

  /**
   * 从接口数据创建符号实体
   */
  static fromInterface(data: SymbolInterface): Symbol {
    return new Symbol(
      data.id,
      data.moduleId,
      data.name,
      data.kind,
      data.location,
      data.visibility,
      data.signature
    );
  }

  /**
   * 转换为接口数据
   */
  toInterface(): SymbolInterface {
    return {
      id: this.id,
      moduleId: this.moduleId,
      name: this.name,
      kind: this.kind,
      location: this.location,
      visibility: this.visibility,
      signature: this.signature,
    };
  }

  /**
   * 重命名符号
   */
  rename(newName: string): void {
    if (!newName || newName.trim().length === 0) {
      throw new Error('Symbol name cannot be empty');
    }
    this.name = newName.trim();
  }

  /**
   * 更新位置信息
   */
  updateLocation(location: SourceLocation): void {
    this.location = location;
  }

  /**
   * 更改可见性
   */
  setVisibility(visibility: SymbolVisibility): void {
    this.visibility = visibility;
  }

  /**
   * 验证领域规则
   */
  private validate(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new Error('Symbol ID cannot be empty');
    }
    if (!this.moduleId || this.moduleId.trim().length === 0) {
      throw new Error('Module ID cannot be empty');
    }
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Symbol name cannot be empty');
    }
    if (!this.location || !this.location.file) {
      throw new Error('Symbol location cannot be empty');
    }
  }

  /**
   * 检查两个符号是否相同（基于 ID）
   */
  equals(other: Symbol): boolean {
    return this.id === other.id;
  }

  /**
   * 是否是导出符号（公开可见）
   */
  isExported(): boolean {
    return this.visibility === 'public' || this.visibility === 'internal';
  }

  /**
   * 是否是私有符号
   */
  isPrivate(): boolean {
    return this.visibility === 'private';
  }

  /**
   * 是否是类型定义（类、接口、类型别名等）
   */
  isTypeDefinition(): boolean {
    return ['class', 'interface', 'type', 'enum'].includes(this.kind);
  }

  /**
   * 是否是函数或方法
   */
  isFunction(): boolean {
    return this.kind === 'function' || this.kind === 'method';
  }

  /**
   * 获取符号的完全限定名
   */
  getQualifiedName(): string {
    return `${this.location.file}::${this.name}`;
  }

  /**
   * 创建符号快照（克隆）
   */
  snapshot(): Symbol {
    return new Symbol(
      this.id,
      this.moduleId,
      this.name,
      this.kind,
      { ...this.location },
      this.visibility,
      this.signature
    );
  }
}
