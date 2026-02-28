// ============================================
// File Hash Cache - 文件哈希缓存
// ============================================

import fs from 'fs/promises';
import crypto from 'crypto';
import path from 'path';

/**
 * 计算文件的 SHA256 哈希值
 * @param filePath 文件路径
 * @returns 文件内容的 SHA256 哈希值（十六进制字符串）
 */
export async function computeFileHash(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  const hash = crypto.createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
}

/**
 * 计算多个文件的哈希
 * @param filePaths 文件路径数组
 * @returns 文件路径到哈希值的映射
 */
export async function computeFileHashes(filePaths: string[]): Promise<Map<string, string>> {
  const hashMap = new Map<string, string>();

  await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        const hash = await computeFileHash(filePath);
        hashMap.set(filePath, hash);
      } catch (error) {
        console.warn(`Warning: Failed to compute hash for ${filePath}: ${error}`);
        hashMap.set(filePath, '');
      }
    })
  );

  return hashMap;
}

/**
 * 比较两个文件的哈希值
 * @param filePath1 第一个文件路径
 * @param filePath2 第二个文件路径
 * @returns 是否相等
 */
export async function compareFileHashes(
  filePath1: string,
  filePath2: string
): Promise<boolean> {
  const [hash1, hash2] = await Promise.all([
    computeFileHash(filePath1),
    computeFileHash(filePath2)
  ]);

  return hash1 === hash2;
}

/**
 * 文件哈希缓存类
 * 缓存文件的哈希值，避免重复计算
 */
export class FileHashCache {
  private hashCache = new Map<string, { hash: string; mtime: number }>();
  private fsStatCache = new Map<string, { mtime: number; size: number }>();

  /**
   * 获取文件的哈希值
   * 如果文件未修改，返回缓存的哈希值
   * @param filePath 文件路径
   * @returns 文件的 SHA256 哈希值
   */
  async getHash(filePath: string): Promise<string> {
    try {
      const stats = await fs.stat(filePath);
      const cached = this.hashCache.get(filePath);

      // 检查是否使用缓存（基于 mtime）
      if (cached && cached.mtime === stats.mtimeMs) {
        return cached.hash;
      }

      // 重新计算哈希
      const hash = await computeFileHash(filePath);
      this.hashCache.set(filePath, { hash, mtime: stats.mtimeMs });
      this.fsStatCache.set(filePath, { mtime: stats.mtimeMs, size: stats.size });

      return hash;
    } catch (error) {
      console.warn(`Warning: Failed to get hash for ${filePath}: ${error}`);
      return '';
    }
  }

  /**
   * 获取多个文件的哈希值
   * @param filePaths 文件路径数组
   * @returns 文件路径到哈希值的映射
   */
  async getHashes(filePaths: string[]): Promise<Map<string, string>> {
    const hashMap = new Map<string, string>();

    await Promise.all(
      filePaths.map(async (filePath) => {
        const hash = await this.getHash(filePath);
        hashMap.set(filePath, hash);
      })
    );

    return hashMap;
  }

  /**
   * 检查文件是否已修改
   * @param filePath 文件路径
   * @returns 文件是否已修改
   */
  async hasChanged(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      const cached = this.fsStatCache.get(filePath);

      // 如果没有缓存，认为文件已修改
      if (!cached) {
        return true;
      }

      // 比较 mtime 和 size
      return cached.mtime !== stats.mtimeMs || cached.size !== stats.size;
    } catch {
      // 文件不存在或无法访问，认为已修改
      return true;
    }
  }

  /**
   * 清除指定文件的缓存
   * @param filePath 文件路径
   */
  invalidate(filePath: string): void {
    this.hashCache.delete(filePath);
    this.fsStatCache.delete(filePath);
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.hashCache.clear();
    this.fsStatCache.clear();
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.hashCache.size;
  }
}

/**
 * 生成缓存键
 * @param filePath 文件路径
 * @param hash 文件哈希值
 * @returns 缓存键
 */
export function generateCacheKey(filePath: string, hash: string): string {
  return `${path.basename(filePath)}:${hash}`;
}

/**
 * 解析缓存键
 * @param cacheKey 缓存键
 * @returns 文件名和哈希值
 */
export function parseCacheKey(cacheKey: string): { filename: string; hash: string } {
  const colonIndex = cacheKey.lastIndexOf(':');
  return {
    filename: cacheKey.substring(0, colonIndex),
    hash: cacheKey.substring(colonIndex + 1)
  };
}
