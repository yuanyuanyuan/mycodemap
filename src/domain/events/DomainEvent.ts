// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Domain event base class - represents something that happened in the domain
// ============================================
// 领域事件基类 - 表示领域中发生的事情
// ============================================

/**
 * 领域事件基类
 *
 * 职责：
 * - 记录事件发生时间
 * - 提供事件身份标识
 * - 支持事件追溯和审计
 */
export abstract class DomainEvent {
  readonly id: string;
  readonly occurredAt: Date;
  readonly type: string;

  constructor(type: string) {
    this.id = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    this.occurredAt = new Date();
    this.type = type;
  }

  /**
   * 获取事件描述
   */
  abstract getDescription(): string;

  /**
   * 转换为 JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      type: this.type,
      occurredAt: this.occurredAt.toISOString(),
    };
  }
}

/**
 * 模块添加事件
 */
export class ModuleAddedEvent extends DomainEvent {
  constructor(
    readonly moduleId: string,
    readonly path: string
  ) {
    super('MODULE_ADDED');
  }

  getDescription(): string {
    return `Module added: ${this.path} (${this.moduleId})`;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      moduleId: this.moduleId,
      path: this.path,
    };
  }
}

/**
 * 模块移除事件
 */
export class ModuleRemovedEvent extends DomainEvent {
  constructor(
    readonly moduleId: string,
    readonly path: string
  ) {
    super('MODULE_REMOVED');
  }

  getDescription(): string {
    return `Module removed: ${this.path} (${this.moduleId})`;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      moduleId: this.moduleId,
      path: this.path,
    };
  }
}

/**
 * 符号添加事件
 */
export class SymbolAddedEvent extends DomainEvent {
  constructor(
    readonly symbolId: string,
    readonly name: string,
    readonly moduleId: string
  ) {
    super('SYMBOL_ADDED');
  }

  getDescription(): string {
    return `Symbol added: ${this.name} (${this.symbolId}) in module ${this.moduleId}`;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      symbolId: this.symbolId,
      name: this.name,
      moduleId: this.moduleId,
    };
  }
}

/**
 * 依赖添加事件
 */
export class DependencyAddedEvent extends DomainEvent {
  constructor(
    readonly dependencyId: string,
    readonly sourceId: string,
    readonly targetId: string,
    readonly dependencyType: string
  ) {
    super('DEPENDENCY_ADDED');
  }

  getDescription(): string {
    return `Dependency added: ${this.sourceId} -> ${this.targetId} (${this.dependencyType})`;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      dependencyId: this.dependencyId,
      sourceId: this.sourceId,
      targetId: this.targetId,
      dependencyType: this.dependencyType,
    };
  }
}

/**
 * 循环依赖检测事件
 */
export class CycleDetectedEvent extends DomainEvent {
  constructor(
    readonly cycleModules: string[],
    readonly cycleLength: number
  ) {
    super('CYCLE_DETECTED');
  }

  getDescription(): string {
    return `Cycle detected: ${this.cycleModules.join(' -> ')} (${this.cycleLength} modules)`;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      cycleModules: this.cycleModules,
      cycleLength: this.cycleLength,
    };
  }
}
