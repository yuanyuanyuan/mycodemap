// ============================================
// LRUCache Unit Tests
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LRUCache, LRUCacheWithTTL } from '../lru-cache';

describe('LRUCache', () => {
  let cache: LRUCache<string, number>;

  beforeEach(() => {
    cache = new LRUCache<string, number>(3);
  });

  describe('basic operations', () => {
    it('should set and get values', () => {
      cache.set('a', 1);
      expect(cache.get('a')).toBe(1);
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should check if key exists', () => {
      cache.set('a', 1);
      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(false);
    });

    it('should delete keys', () => {
      cache.set('a', 1);
      expect(cache.delete('a')).toBe(true);
      expect(cache.get('a')).toBeUndefined();
    });

    it('should clear all entries', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used item when capacity is reached', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4); // Should evict 'a'

      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('should update access order on get', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.get('a'); // Access 'a' to update order
      cache.set('d', 4); // Should evict 'b' (least recently used after accessing 'a')

      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('a')).toBe(1);
    });

    it('should update access order on set', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('a', 10); // Update 'a'
      cache.set('d', 4); // Should evict 'b'

      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('a')).toBe(10);
    });
  });

  describe('keys, values, entries', () => {
    it('should return all keys', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.keys()).toEqual(['a', 'b']);
    });

    it('should return all values', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.values()).toEqual([1, 2]);
    });

    it('should return all entries', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.entries()).toEqual([['a', 1], ['b', 2]]);
    });
  });

  describe('size', () => {
    it('should return correct size', () => {
      expect(cache.size).toBe(0);
      cache.set('a', 1);
      expect(cache.size).toBe(1);
    });
  });
});

describe('LRUCacheWithTTL', () => {
  let cache: LRUCacheWithTTL<string, number>;

  beforeEach(() => {
    // Use a short TTL for testing
    cache = new LRUCacheWithTTL<string, number>(3, 100);
  });

  describe('basic operations', () => {
    it('should set and get values', () => {
      cache.set('a', 1);
      expect(cache.get('a')).toBe(1);
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should check if key exists', () => {
      cache.set('a', 1);
      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(false);
    });

    it('should delete keys', () => {
      cache.set('a', 1);
      expect(cache.delete('a')).toBe(true);
      expect(cache.get('a')).toBeUndefined();
    });

    it('should clear all entries', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      cache.set('a', 1);
      expect(cache.get('a')).toBe(1);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(cache.get('a')).toBeUndefined();
    });

    it('should return false for expired entries in has()', async () => {
      cache.set('a', 1);
      expect(cache.has('a')).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(cache.has('a')).toBe(false);
    });

    it('should support custom TTL per entry', async () => {
      cache.set('a', 1, 50); // 50ms TTL
      cache.set('b', 2, 200); // 200ms TTL

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
    });
  });

  describe('cleanup', () => {
    it('should cleanup expired entries', async () => {
      cache.set('a', 1);
      cache.set('b', 2);

      await new Promise(resolve => setTimeout(resolve, 150));

      const cleaned = cache.cleanup();
      expect(cleaned).toBe(2);
      expect(cache.size).toBe(0);
    });

    it('should not remove non-expired entries during cleanup', async () => {
      cache.set('a', 1);
      cache.set('b', 2);

      await new Promise(resolve => setTimeout(resolve, 50));

      const cleaned = cache.cleanup();
      expect(cleaned).toBe(0);
      expect(cache.size).toBe(2);
    });
  });

  describe('LRU eviction with TTL', () => {
    it('should evict least recently used item when capacity is reached', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4); // Should evict 'a'

      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });
  });

  describe('keys', () => {
    it('should return all keys', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.keys()).toEqual(['a', 'b']);
    });
  });
});
