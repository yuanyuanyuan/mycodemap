// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Storage factory - creates appropriate storage backend based on configuration
// ============================================
// 存储工厂 - 根据配置创建适当的存储后端
// ============================================

import type {
  IStorage,
  IStorageFactory,
  StorageConfig,
  StorageType,
} from '../../interface/types/storage.js';
import { StorageError } from './interfaces/StorageBase.js';
import { MemoryStorage } from './adapters/MemoryStorage.js';
import { SQLiteStorage } from './adapters/SQLiteStorage.js';

/**
 * 存储工厂实现
 *
 * 根据配置自动选择合适的存储后端：
 * - sqlite: SQLite 治理图存储
 * - memory: 内存存储（用于测试）
 * - auto: 在 SQLite family 内自动选择实现
 */
export class StorageFactory implements IStorageFactory {
  /**
   * 创建存储实例
   * @param config - 存储配置
   * @returns 存储实例
   */
  async create(config: StorageConfig): Promise<IStorage> {
    const storageType = this.determineStorageType(config);

    switch (storageType) {
      case 'memory':
        return new MemoryStorage();

      case 'sqlite':
        return new SQLiteStorage(config);

      default:
        throw new StorageError(
          `Unknown storage type: ${String(storageType)}`,
          'UNKNOWN_STORAGE_TYPE'
        );
    }
  }

  /**
   * 为项目创建存储实例
   * @param projectPath - 项目路径
   * @param config - 存储配置
   * @returns 初始化的存储实例
   */
  async createForProject(projectPath: string, config: StorageConfig): Promise<IStorage> {
    const storage = await this.create(config);
    await storage.initialize(projectPath);
    return storage;
  }

  /**
   * 自动确定存储类型
   *
   * Phase 60 后，auto 仅在 SQLite family 内自动选择具体实现。
   */
  private determineStorageType(config: StorageConfig): StorageType {
    switch (config.type) {
      case 'auto':
      case 'sqlite':
        return 'sqlite';
      case 'memory':
        return 'memory';
      case 'filesystem':
      case 'kuzudb':
      case 'neo4j':
        throw this.createUnsupportedStorageTypeError(config.type, config);
      default:
        throw new StorageError(
          `Unknown storage type: ${String(config.type)}`,
          'UNKNOWN_STORAGE_TYPE'
        );
    }
  }

  private createUnsupportedStorageTypeError(type: string, config: StorageConfig): StorageError {
    const configuredPath = type === 'filesystem'
      ? config.outputPath
      : config.databasePath;
    const legacyPathHint = configuredPath
      ? ` Legacy path detected in config: ${configuredPath}.`
      : '';

    return new StorageError(
      `${type} backend is no longer supported. ` +
      'Use storage.type="sqlite" or storage.type="auto" for persistent storage, ' +
      'or storage.type="memory" only for tests and ephemeral runs.' +
      legacyPathHint,
      'UNSUPPORTED_STORAGE_TYPE'
    );
  }

  /**
   * 检查存储类型是否可用
   * @param type - 存储类型
   * @returns 是否可用
   */
  static isStorageTypeAvailable(type: string): boolean {
    switch (type) {
      case 'memory':
      case 'sqlite':
        return true;
      default:
        return false;
    }
  }

  /**
   * 获取可用的存储类型列表
   * @returns 可用存储类型数组
   */
  static getAvailableStorageTypes(): StorageType[] {
    return ['sqlite', 'memory'];
  }
}

/**
 * 默认存储工厂实例
 */
export const storageFactory = new StorageFactory();
