// ============================================
// LRU Cache Implementation - 最近最少使用缓存
// ============================================

/**
 * LRU 缓存类
 * 使用 Map 实现，支持最大容量限制
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * 获取缓存值
   * 访问时会将键移动到末尾（最近使用）
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // 获取值并重新设置，以更新访问顺序
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value!);

    return value;
  }

  /**
   * 设置缓存值
   * 如果缓存已满，会删除最旧的条目
   */
  set(key: K, value: V): void {
    // 如果键已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 如果缓存已满，删除最旧的条目（Map 的迭代顺序即为插入顺序）
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, value);
  }

  /**
   * 检查键是否存在
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * 删除指定的键
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 获取所有键
   */
  keys(): K[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取所有值
   */
  values(): V[] {
    return Array.from(this.cache.values());
  }

  /**
   * 获取所有条目
   */
  entries(): [K, V][] {
    return Array.from(this.cache.entries());
  }
}

/**
 * 带 TTL 功能的 LRU 缓存
 */
export class LRUCacheWithTTL<K, V> {
  private cache = new Map<K, { value: V; expiry: number }>();
  private maxSize: number;
  private defaultTTL: number; // 毫秒

  constructor(maxSize: number = 100, defaultTTL: number = 3600000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * 获取缓存值
   * 检查过期时间
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // 检查是否过期
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    // 更新访问顺序
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * 设置缓存值
   * @param key 键
   * @param value 值
   * @param ttl 可选的 TTL（毫秒），默认使用全局 TTL
   */
  set(key: K, value: V, ttl?: number): void {
    // 如果键已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    const expiry = Date.now() + (ttl ?? this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  /**
   * 检查键是否存在且未过期
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // 检查是否过期
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 删除指定的键
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 清理所有过期条目
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 获取所有键
   */
  keys(): K[] {
    return Array.from(this.cache.keys());
  }
}
