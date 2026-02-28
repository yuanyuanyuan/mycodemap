// ============================================
// Parse Cache - 解析结果缓存
// ============================================

import fs from 'fs/promises';
import path from 'path';
import type { ModuleInfo } from '../types/index.js';
import { LRUCacheWithTTL } from './lru-cache.js';
import { FileHashCache, generateCacheKey } from './file-hash-cache.js';

// 缓存条目接口
export interface ParseCacheEntry {
  moduleInfo: ModuleInfo;
  hash: string;
  timestamp: number;
}

/**
 * 解析结果缓存类
 * 基于文件哈希缓存解析结果
 */
export class ParseCache {
  private memoryCache: LRUCacheWithTTL<string, ParseCacheEntry>;
  private fileHashCache: FileHashCache;
  private cacheDir: string;
  private ttl: number;

  /**
   * @param cacheDir 缓存目录路径
   * @param ttl 缓存过期时间（毫秒），默认 1 小时
   */
  constructor(cacheDir: string, ttl: number = 3600000) {
    this.cacheDir = cacheDir;
    this.ttl = ttl;
    this.memoryCache = new LRUCacheWithTTL<string, ParseCacheEntry>(200, ttl);
    this.fileHashCache = new FileHashCache();
  }

  /**
   * 获取解析结果
   * 如果文件未修改且缓存有效，返回缓存的解析结果
   * @param filePath 文件路径
   * @returns 解析结果，如果缓存无效则返回 null
   */
  async get(filePath: string): Promise<ModuleInfo | null> {
    try {
      // 检查内存缓存
      const hash = await this.fileHashCache.getHash(filePath);
      const cacheKey = generateCacheKey(filePath, hash);

      const cached = this.memoryCache.get(cacheKey);
      if (cached) {
        return cached.moduleInfo;
      }

      // 尝试从磁盘加载
      const diskCached = await this.loadFromDisk(filePath, hash);
      if (diskCached) {
        // 存入内存缓存
        this.memoryCache.set(cacheKey, {
          moduleInfo: diskCached,
          hash,
          timestamp: Date.now()
        });
        return diskCached;
      }

      return null;
    } catch (error) {
      console.warn(`Warning: Failed to get cache for ${filePath}: ${error}`);
      return null;
    }
  }

  /**
   * 设置解析结果
   * @param filePath 文件路径
   * @param moduleInfo 解析结果
   */
  async set(filePath: string, moduleInfo: ModuleInfo): Promise<void> {
    try {
      const hash = await this.fileHashCache.getHash(filePath);
      const cacheKey = generateCacheKey(filePath, hash);

      // 存入内存缓存
      const entry: ParseCacheEntry = {
        moduleInfo,
        hash,
        timestamp: Date.now()
      };
      this.memoryCache.set(cacheKey, entry);

      // 存入磁盘缓存
      await this.saveToDisk(filePath, entry);
    } catch (error) {
      console.warn(`Warning: Failed to set cache for ${filePath}: ${error}`);
    }
  }

  /**
   * 使缓存失效
   * @param filePath 文件路径
   */
  invalidate(filePath: string): void {
    const cached = this.memoryCache.keys().filter(key =>
      key.includes(path.basename(filePath))
    );
    cached.forEach(key => this.memoryCache.delete(key));

    this.fileHashCache.invalidate(filePath);
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.memoryCache.clear();
    this.fileHashCache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { memorySize: number; ttl: number; cacheDir: string } {
    return {
      memorySize: this.memoryCache.size,
      ttl: this.ttl,
      cacheDir: this.cacheDir
    };
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    return this.memoryCache.cleanup();
  }

  /**
   * 保存到磁盘
   */
  private async saveToDisk(
    filePath: string,
    entry: ParseCacheEntry
  ): Promise<void> {
    try {
      // 创建缓存目录
      await fs.mkdir(this.cacheDir, { recursive: true });

      // 生成缓存文件名
      const cacheFileName = this.getCacheFileName(filePath);
      const cacheFilePath = path.join(this.cacheDir, cacheFileName);

      // 保存缓存数据
      const data = JSON.stringify({
        moduleInfo: entry.moduleInfo,
        hash: entry.hash,
        timestamp: entry.timestamp
      });

      await fs.writeFile(cacheFilePath, data, 'utf-8');
    } catch (error) {
      console.warn(`Warning: Failed to save cache to disk for ${filePath}: ${error}`);
    }
  }

  /**
   * 从磁盘加载
   */
  private async loadFromDisk(
    filePath: string,
    currentHash: string
  ): Promise<ModuleInfo | null> {
    try {
      const cacheFileName = this.getCacheFileName(filePath);
      const cacheFilePath = path.join(this.cacheDir, cacheFileName);

      // 检查文件是否存在
      await fs.access(cacheFilePath);

      // 读取缓存数据
      const data = await fs.readFile(cacheFilePath, 'utf-8');
      const cached = JSON.parse(data) as {
        moduleInfo: ModuleInfo;
        hash: string;
        timestamp: number;
      };

      // 检查哈希是否匹配
      if (cached.hash !== currentHash) {
        return null;
      }

      // 检查是否过期
      if (Date.now() - cached.timestamp > this.ttl) {
        return null;
      }

      return cached.moduleInfo;
    } catch {
      return null;
    }
  }

  /**
   * 生成缓存文件名
   */
  private getCacheFileName(filePath: string): string {
    const hash = crypto.createHash('md5').update(filePath).digest('hex');
    return `${hash}.json`;
  }
}

// 导入 crypto 用于生成缓存文件名
import crypto from 'crypto';
