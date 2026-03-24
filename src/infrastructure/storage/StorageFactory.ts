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
import { StorageBase, StorageError } from './interfaces/StorageBase.js';
import { FileSystemStorage } from './adapters/FileSystemStorage.js';
import { MemoryStorage } from './adapters/MemoryStorage.js';

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
    const storageType = config.type === 'auto' 
      ? await this.determineStorageType(config)
      : config.type;

    switch (storageType) {
      case 'filesystem':
        return new FileSystemStorage(config);
      
      case 'memory':
        return new MemoryStorage();
      
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
            'Neo4j backend is no longer supported. Use filesystem, kuzudb, memory, or auto instead.',
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
   * 自动确定存储类型
   * 
   * 策略：
   * - 小项目（<100文件）: 文件系统
   * - 中等项目（100-1000文件）: 文件系统
   * - 大项目（>1000文件）: KùzuDB
   * 
   * 可通过配置调整阈值
   */
  private async determineStorageType(config: StorageConfig): Promise<StorageType> {
    const thresholds = config.autoThresholds ?? {
      useGraphDBWhenFileCount: 1000,
      useGraphDBWhenNodeCount: 10000,
    };

    // 默认使用文件系统，因为它最简单可靠
    // 实际项目分析后可能需要更复杂的启发式算法
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
    const allTypes: StorageType[] = ['filesystem', 'memory', 'kuzudb'];
    return allTypes.filter(type => StorageFactory.isStorageTypeAvailable(type));
  }
}

/**
 * 默认存储工厂实例
 */
export const storageFactory = new StorageFactory();
