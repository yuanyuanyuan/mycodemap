// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Repository module exports - persistence layer implementations
// ============================================
// Repository 模块导出 - 持久化层实现
// ============================================

export { CodeGraphRepositoryImpl } from './CodeGraphRepositoryImpl.js';

// 重新导出 Domain 层的仓库类型
export type {
  CodeGraphRepository,
  RepositoryError,
  EntityNotFoundError,
  ConcurrencyConflictError,
} from '../../domain/repositories/CodeGraphRepository.js';
