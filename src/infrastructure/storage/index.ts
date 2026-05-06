// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Storage module exports - central entry point for storage layer
// ============================================
// 存储模块导出 - 存储层的中央入口点
// ============================================

// 接口和基类
export { StorageBase, StorageError } from './interfaces/StorageBase.js';

// 工厂
export { StorageFactory, storageFactory } from './StorageFactory.js';

// 适配器
export { MemoryStorage } from './adapters/MemoryStorage.js';
export { SQLiteStorage } from './adapters/SQLiteStorage.js';

// 重新导出 Interface Layer 的类型
export type {
  IStorage,
  IStorageFactory,
  StorageType,
  StorageConfig,
  SearchOptions,
  SearchResult,
  Cycle,
  GraphMetadata,
  ImpactResult,
  ProjectStatistics,
  SymbolImpactNode,
  SymbolImpactResult,
} from '../../interface/types/storage.js';
