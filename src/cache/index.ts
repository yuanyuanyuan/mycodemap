// ============================================
// Cache Module - 缓存系统入口
// ============================================

import path from 'path';
import fs from 'fs/promises';
import { LRUCacheWithTTL } from './lru-cache.js';
import { FileHashCache } from './file-hash-cache.js';
import { ParseCache } from './parse-cache.js';
import type { ModuleInfo } from '../types/index.js';

// 导出类型
export { LRUCache, LRUCacheWithTTL } from './lru-cache.js';
export { FileHashCache, computeFileHash, computeFileHashes } from './file-hash-cache.js';
export { ParseCache } from './parse-cache.js';
export type { ParseCacheEntry } from './parse-cache.js';

// 缓存配置接口
export interface CacheConfig {
  /** 内存缓存最大大小 */
  maxSize?: number;
  /** 缓存过期时间（毫秒） */
  ttl?: number;
  /** 缓存目录 */
  cacheDir?: string;
  /** 是否启用持久化缓存 */
  persistent?: boolean;
}

/**
 * 默认缓存配置
 */
export const DEFAULT_CACHE_CONFIG: Required<CacheConfig> = {
  maxSize: 200,
  ttl: 3600000, // 1 小时
  cacheDir: path.join(process.cwd(), '.codemap', 'cache'),
  persistent: true
};

/**
 * 缓存管理器
 * 统一管理所有类型的缓存
 */
export class CacheManager {
  private lruCache: LRUCacheWithTTL<string, unknown>;
  private fileHashCache: FileHashCache;
  private parseCache: ParseCache;
  private config: Required<CacheConfig>;
  // 依赖图缓存: modulePath -> 依赖该模块的文件列表
  private dependencyGraph: Map<string, Set<string>> = new Map();

  constructor(config: CacheConfig = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.lruCache = new LRUCacheWithTTL(this.config.maxSize, this.config.ttl);
    this.fileHashCache = new FileHashCache();
    this.parseCache = new ParseCache(this.config.cacheDir, this.config.ttl);
  }

  /**
   * 初始化缓存目录
   */
  async initialize(): Promise<void> {
    if (this.config.persistent) {
      await fs.mkdir(this.config.cacheDir, { recursive: true });
    }
  }

  /**
   * 获取通用 LRU 缓存
   */
  getLRUCache<K, V>(): LRUCacheWithTTL<K, V> {
    return this.lruCache as unknown as LRUCacheWithTTL<K, V>;
  }

  /**
   * 获取文件哈希缓存
   */
  getFileHashCache(): FileHashCache {
    return this.fileHashCache;
  }

  /**
   * 获取解析结果缓存
   */
  getParseCache(): ParseCache {
    return this.parseCache;
  }

  /**
   * 解析文件并使用缓存
   * @param filePath 文件路径
   * @param parseFn 解析函数
   * @returns 解析结果
   */
  async parseWithCache(
    filePath: string,
    parseFn: (filePath: string) => Promise<ModuleInfo>
  ): Promise<ModuleInfo> {
    // 尝试从缓存获取
    const cached = await this.parseCache.get(filePath);
    if (cached) {
      return cached;
    }

    // 执行解析
    const result = await parseFn(filePath);

    // 存入缓存
    await this.parseCache.set(filePath, result);

    return result;
  }

  /**
   * 批量解析文件并使用缓存
   * @param filePaths 文件路径数组
   * @param parseFn 解析函数
   * @returns 解析结果数组
   */
  /**
   * 批量解析文件并使用缓存（并行优化版）
   * @param filePaths 文件路径数组
   * @param parseFn 解析函数
   * @param concurrency 并发数限制（默认 10）
   * @returns 解析结果数组
   */
  async parseBatchWithCache(
    filePaths: string[],
    parseFn: (filePath: string) => Promise<ModuleInfo>,
    concurrency: number = 10
  ): Promise<ModuleInfo[]> {
    // 并行获取所有缓存
    const cacheResults = await Promise.all(
      filePaths.map(async (filePath) => {
        const cached = await this.parseCache.get(filePath);
        return { filePath, cached };
      })
    );

    const results: ModuleInfo[] = [];
    const uncachedFiles: string[] = [];

    // 分类缓存命中和未命中
    for (const result of cacheResults) {
      if (result.cached) {
        results.push(result.cached);
      } else {
        uncachedFiles.push(result.filePath);
      }
    }

    // 并行解析未缓存的文件（带并发控制）
    if (uncachedFiles.length > 0) {
      const parseResults = await this.parseWithConcurrency(
        uncachedFiles,
        parseFn,
        concurrency
      );

      // 并行存入缓存
      await Promise.all(
        uncachedFiles.map((filePath, index) =>
          this.parseCache.set(filePath, parseResults[index])
        )
      );

      results.push(...parseResults);
    }

    return results;
  }

  /**
   * 并发控制解析
   * @param filePaths 文件路径数组
   * @param parseFn 解析函数
   * @param concurrency 并发数限制
   * @returns 解析结果数组
   */
  private async parseWithConcurrency(
    filePaths: string[],
    parseFn: (filePath: string) => Promise<ModuleInfo>,
    concurrency: number
  ): Promise<ModuleInfo[]> {
    const results: ModuleInfo[] = new Array(filePaths.length);
    let currentIndex = 0;

    const workers = Array.from({ length: Math.min(concurrency, filePaths.length) }, async () => {
      while (currentIndex < filePaths.length) {
        const index = currentIndex++;
        const filePath = filePaths[index];
        results[index] = await parseFn(filePath);
      }
    });

    await Promise.all(workers);
    return results;
  }

  /**
   * 检查文件是否需要重新解析
   * @param filePath 文件路径
   * @returns 是否需要重新解析
   */
  async needsReparse(filePath: string): Promise<boolean> {
    return this.fileHashCache.hasChanged(filePath);
  }

  /**
   * 使指定文件缓存失效
   * @param filePath 文件路径
   */
  invalidate(filePath: string): void {
    this.parseCache.invalidate(filePath);
    this.fileHashCache.invalidate(filePath);
  }

  /**
   * 更新依赖图
   * @param modules 模块信息数组，用于构建依赖关系
   */
  updateDependencyGraph(modules: ModuleInfo[]): void {
    this.dependencyGraph.clear();

    for (const mod of modules) {
      const modPath = mod.path;

      // 遍历该模块的依赖
      for (const dep of mod.dependencies || []) {
        // 获取依赖模块的相对路径
        const depPath = this.resolveModulePath(modPath, dep);

        // 将当前模块添加到依赖者的列表中
        if (!this.dependencyGraph.has(depPath)) {
          this.dependencyGraph.set(depPath, new Set());
        }
        this.dependencyGraph.get(depPath)!.add(modPath);
      }
    }
  }

  /**
   * 解析模块路径
   * 将相对依赖路径解析为绝对路径
   */
  private resolveModulePath(fromPath: string, dep: string): string {
    // 去除 .js 后缀
    let normalizedDep = dep.replace(/\.js$/, '');

    // 如果是相对路径，需要解析
    if (normalizedDep.startsWith('.')) {
      const fromDir = fromPath.substring(0, fromPath.lastIndexOf('/'));
      const resolved = fromDir + '/' + normalizedDep;
      // 解析 .. 和 .
      return this.normalizePath(resolved);
    }

    // 外部模块，返回原路径
    return normalizedDep;
  }

  /**
   * 规范化路径
   */
  private normalizePath(path: string): string {
    const parts = path.split('/');
    const result: string[] = [];

    for (const part of parts) {
      if (part === '..') {
        result.pop();
      } else if (part !== '.' && part !== '') {
        result.push(part);
      }
    }

    return result.join('/');
  }

  /**
   * 级联失效 - 当依赖文件变更时，失效所有依赖它的文件
   * @param filePath 变更的文件路径
   * @param cascade 是否级联失效（默认 true）
   * @returns 失效的文件数量
   */
  invalidateWithCascade(filePath: string, cascade: boolean = true): number {
    let invalidatedCount = 0;

    // 首先失效指定文件
    this.invalidate(filePath);
    invalidatedCount++;

    if (cascade) {
      // 查找所有依赖该文件的模块
      const dependents = this.dependencyGraph.get(filePath);

      if (dependents && dependents.size > 0) {
        // 递归失效所有依赖者
        for (const dependent of dependents) {
          invalidatedCount += this.invalidateWithCascade(dependent, true);
        }
      }
    }

    return invalidatedCount;
  }

  /**
   * 批量级联失效
   * @param filePaths 变更的文件路径数组
   * @returns 失效的文件数量
   */
  invalidateBatchWithCascade(filePaths: string[]): number {
    let totalInvalidated = 0;
    const processed = new Set<string>();

    for (const filePath of filePaths) {
      if (!processed.has(filePath)) {
        const count = this.invalidateWithCascade(filePath, true);
        totalInvalidated += count;
        processed.add(filePath);
      }
    }

    return totalInvalidated;
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.lruCache.clear();
    this.fileHashCache.clear();
    this.parseCache.clear();
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    return this.parseCache.cleanup();
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    lruSize: number;
    fileHashSize: number;
    parseCache: { memorySize: number; ttl: number; cacheDir: string };
    config: Required<CacheConfig>;
  } {
    return {
      lruSize: this.lruCache.size,
      fileHashSize: this.fileHashCache.size,
      parseCache: this.parseCache.getStats(),
      config: this.config
    };
  }
}

// 单例实例
let cacheManagerInstance: CacheManager | null = null;

/**
 * 获取缓存管理器单例
 */
export function getCacheManager(config?: CacheConfig): CacheManager {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new CacheManager(config);
  }
  return cacheManagerInstance;
}

/**
 * 重置缓存管理器单例
 */
export function resetCacheManager(): void {
  if (cacheManagerInstance) {
    cacheManagerInstance.clear();
    cacheManagerInstance = null;
  }
}

/**
 * 创建缓存管理器
 */
export function createCacheManager(config?: CacheConfig): CacheManager {
  return new CacheManager(config);
}
