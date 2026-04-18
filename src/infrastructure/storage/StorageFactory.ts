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
import { FileSystemStorage } from './adapters/FileSystemStorage.js';
import { MemoryStorage } from './adapters/MemoryStorage.js';
import { SQLiteStorage } from './adapters/SQLiteStorage.js';

// 延迟加载可选依赖
let KuzuDBStorage: typeof import('./adapters/KuzuDBStorage.js').KuzuDBStorage | null = null;

/**
 * 异步加载 KùzuDB 存储适配器
 */
async function loadKuzuDBStorage(): Promise<typeof KuzuDBStorage> {
  if (!KuzuDBStorage) {
    const module = await import('./adapters/KuzuDBStorage.js');
    KuzuDBStorage = module.KuzuDBStorage;
  }
  return KuzuDBStorage;
}

/**
 * 存储工厂实现
 * 
 * 根据配置自动选择合适的存储后端：
 * - filesystem: 文件系统存储（默认，无需额外依赖）
 * - memory: 内存存储（用于测试）
 * - sqlite: SQLite 治理图存储
 * - kuzudb: KùzuDB 图数据库
 * - auto: 根据项目规模自动选择
 */
export class StorageFactory implements IStorageFactory {
  /**
   * 创建存储实例
   * @param config - 存储配置
   * @returns 存储实例
   */
  async create(config: StorageConfig): Promise<IStorage> {
    let storageType: StorageType;

    try {
      storageType = config.type === 'auto'
        ? await this.determineStorageType(config)
        : config.type;
    } catch (error) {
      // 如果确定类型失败且是 kuzudb 请求，fallback 到 filesystem
      if (config.type === 'kuzudb' && error instanceof StorageError && error.code === 'KUZU_NOT_AVAILABLE') {
        console.warn('[StorageFactory] KùzuDB unavailable, falling back to filesystem');
        storageType = 'filesystem';
      } else {
        throw error;
      }
    }

    switch (storageType) {
      case 'filesystem':
        return new FileSystemStorage(config);
      
      case 'memory':
        return new MemoryStorage();

      case 'sqlite':
        return new SQLiteStorage(config);
      
      case 'kuzudb': {
        const KuzuStorage = await loadKuzuDBStorage();
        if (!KuzuStorage) {
          throw new StorageError(
            'KùzuDB storage adapter not available. Install with: npm install kuzu',
            'ADAPTER_NOT_AVAILABLE'
          );
        }
        return new KuzuStorage(config);
      }

      default:
        if (String(storageType) === 'neo4j') {
          throw new StorageError(
            'Neo4j backend is no longer supported. Use filesystem, sqlite, kuzudb, memory, or auto instead.',
            'UNSUPPORTED_STORAGE_TYPE'
          );
        }
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
   * 检查 KùzuDB 是否可用
   * 尝试动态导入 kuzu 并创建临时数据库验证功能正常
   */
  private async checkKuzuAvailability(): Promise<boolean> {
    try {
      // @ts-ignore kuzu is an optional dependency, not installed in CI
      const kuzu = await import('kuzu');
      const tempDb = new kuzu.Database(':memory:');
      if (typeof tempDb.close === 'function') {
        await tempDb.close();
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 自动确定存储类型
   *
   * 策略（DEC-01）：
   * - 优先尝试 KùzuDB（如果可用）
   * - KùzuDB 不可用时 fallback 到文件系统
   * - 显式配置优先于自动选择
   *
   * 降级策略（DEC-03）：
   * - auto 模式：静默 fallback 到 filesystem
   * - kuzudb 模式：抛出错误，由调用者处理降级
   */
  private async determineStorageType(config: StorageConfig): Promise<StorageType> {
    // 如果明确指定了非 auto 类型，直接返回
    if (config.type !== 'auto' && config.type !== 'kuzudb') {
      return config.type;
    }

    // 优先尝试 KùzuDB
    const kuzuAvailable = await this.checkKuzuAvailability();
    if (kuzuAvailable) {
      return 'kuzudb';
    }

    // 如果明确指定 kuzudb 但不可用，抛出错误让调用者处理降级
    if (config.type === 'kuzudb') {
      throw new StorageError(
        'KùzuDB is not available. Install with: npm install kuzu',
        'KUZU_NOT_AVAILABLE'
      );
    }

    // auto 模式下 fallback 到 filesystem
    return 'filesystem';
  }

  /**
   * 检查存储类型是否可用
   * @param type - 存储类型
   * @returns 是否可用
   */
  static isStorageTypeAvailable(type: StorageType): boolean {
    switch (type) {
      case 'filesystem':
      case 'memory':
      case 'sqlite':
        return true;
      case 'kuzudb':
        // 检查 kuzu 包是否可用
        try {
          require.resolve('kuzu');
          return true;
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  /**
   * 获取可用的存储类型列表
   * @returns 可用存储类型数组
   */
  static getAvailableStorageTypes(): StorageType[] {
    const allTypes: StorageType[] = ['filesystem', 'memory', 'sqlite', 'kuzudb'];
    return allTypes.filter(type => StorageFactory.isStorageTypeAvailable(type));
  }
}

/**
 * 默认存储工厂实例
 */
export const storageFactory = new StorageFactory();
