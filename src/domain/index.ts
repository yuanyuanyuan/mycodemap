// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Domain layer exports - central entry point for domain logic
// ============================================
// Domain 层导出 - 领域逻辑的中央入口点
// ============================================

// 领域实体
export { Project } from './entities/Project.js';
export { Module } from './entities/Module.js';
export { Symbol as SymbolEntity } from './entities/Symbol.js';
export { Dependency } from './entities/Dependency.js';
export { CodeGraph } from './entities/CodeGraph.js';

// 领域服务
export { CodeGraphBuilder } from './services/CodeGraphBuilder.js';

// 领域事件
export {
  DomainEvent,
  ModuleAddedEvent,
  ModuleRemovedEvent,
  SymbolAddedEvent,
  DependencyAddedEvent,
  CycleDetectedEvent,
} from './events/DomainEvent.js';

// 仓库接口
export {
  CodeGraphRepository,
  RepositoryError,
  EntityNotFoundError,
  ConcurrencyConflictError,
} from './repositories/CodeGraphRepository.js';

// 重新导出相关类型
export type { ModuleAnalysisResult } from './services/CodeGraphBuilder.js';
