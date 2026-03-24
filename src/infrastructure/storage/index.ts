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
export { FileSystemStorage } from './adapters/FileSystemStorage.js';
export { MemoryStorage } from './adapters/MemoryStorage.js';

// 可选适配器（动态导入避免依赖问题）
// KuzuDBStorage 需要动态导入
// import('./adapters/KuzuDBStorage.js').then(m => m.KuzuDBStorage)

// 重新导出 Interface Layer 的类型
export type {
  IStorage,
  IStorageFactory,
  StorageType,
  StorageConfig,
  SearchOptions,
  SearchResult,
  Cycle,
  ImpactResult,
  ProjectStatistics,
} from '../../interface/types/storage.js';
