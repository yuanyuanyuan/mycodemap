// ============================================
// FileHashCache Unit Tests
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { FileHashCache, computeFileHash, computeFileHashes, compareFileHashes, generateCacheKey, parseCacheKey } from '../file-hash-cache';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a temporary test file
const testFilePath = path.join(__dirname, 'test-temp-file.txt');
const testFilePath2 = path.join(__dirname, 'test-temp-file2.txt');

describe('computeFileHash', () => {
  beforeEach(async () => {
    // Create test files
    await fs.writeFile(testFilePath, 'hello world', 'utf-8');
    await fs.writeFile(testFilePath2, 'hello world', 'utf-8');
  });

  it('should compute hash for a file', async () => {
    const hash = await computeFileHash(testFilePath);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash.length).toBe(64); // SHA256 produces 64 hex characters
  });

  it('should return same hash for same content', async () => {
    const hash1 = await computeFileHash(testFilePath);
    const hash2 = await computeFileHash(testFilePath2);
    expect(hash1).toBe(hash2);
  });

  it('should return different hash for different content', async () => {
    await fs.writeFile(testFilePath, 'different content', 'utf-8');
    const hash1 = await computeFileHash(testFilePath);
    const hash2 = await computeFileHash(testFilePath2);
    expect(hash1).not.toBe(hash2);
  });
});

describe('computeFileHashes', () => {
  beforeEach(async () => {
    await fs.writeFile(testFilePath, 'hello world', 'utf-8');
    await fs.writeFile(testFilePath2, 'hello world', 'utf-8');
  });

  it('should compute hashes for multiple files', async () => {
    const hashMap = await computeFileHashes([testFilePath, testFilePath2]);
    expect(hashMap.size).toBe(2);
    expect(hashMap.get(testFilePath)).toBeDefined();
    expect(hashMap.get(testFilePath2)).toBeDefined();
  });

  it('should handle non-existent files gracefully', async () => {
    const hashMap = await computeFileHashes([testFilePath, '/non/existent/file']);
    expect(hashMap.get(testFilePath)).toBeDefined();
    expect(hashMap.get('/non/existent/file')).toBe('');
  });
});

describe('compareFileHashes', () => {
  beforeEach(async () => {
    await fs.writeFile(testFilePath, 'hello world', 'utf-8');
    await fs.writeFile(testFilePath2, 'hello world', 'utf-8');
  });

  it('should return true for files with same content', async () => {
    const result = await compareFileHashes(testFilePath, testFilePath2);
    expect(result).toBe(true);
  });

  it('should return false for files with different content', async () => {
    await fs.writeFile(testFilePath2, 'different content', 'utf-8');
    const result = await compareFileHashes(testFilePath, testFilePath2);
    expect(result).toBe(false);
  });
});

describe('FileHashCache', () => {
  let cache: FileHashCache;

  beforeEach(async () => {
    cache = new FileHashCache();
    await fs.writeFile(testFilePath, 'hello world', 'utf-8');
  });

  describe('getHash', () => {
    it('should return hash for a file', async () => {
      const hash = await cache.getHash(testFilePath);
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
    });

    it('should cache hash based on mtime', async () => {
      const hash1 = await cache.getHash(testFilePath);
      const hash2 = await cache.getHash(testFilePath);
      expect(hash1).toBe(hash2);
      expect(cache.size).toBe(1);
    });

    it('should recompute hash when file is modified', async () => {
      const hash1 = await cache.getHash(testFilePath);

      // Modify file
      await fs.writeFile(testFilePath, 'modified content', 'utf-8');
      // Wait to ensure mtime changes
      await new Promise(resolve => setTimeout(resolve, 100));

      // Clear cache to force recomputation
      cache.invalidate(testFilePath);
      const hash2 = await cache.getHash(testFilePath);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('getHashes', () => {
    it('should return hashes for multiple files', async () => {
      const hashMap = await cache.getHashes([testFilePath, testFilePath2]);
      expect(hashMap.size).toBe(2);
    });
  });

  describe('hasChanged', () => {
    it('should return false for unchanged file', async () => {
      await cache.getHash(testFilePath);
      const changed = await cache.hasChanged(testFilePath);
      expect(changed).toBe(false);
    });

    it('should return true for modified file', async () => {
      await cache.getHash(testFilePath);
      await fs.writeFile(testFilePath, 'modified content', 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 10));

      const changed = await cache.hasChanged(testFilePath);
      expect(changed).toBe(true);
    });

    it('should return true for non-existent file', async () => {
      const changed = await cache.hasChanged('/non/existent/file');
      expect(changed).toBe(true);
    });
  });

  describe('invalidate', () => {
    it('should clear cache for specific file', async () => {
      await cache.getHash(testFilePath);
      cache.invalidate(testFilePath);
      // After invalidation, hasChanged should return true
      const changed = await cache.hasChanged(testFilePath);
      expect(changed).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all caches', async () => {
      await cache.getHash(testFilePath);
      await cache.getHash(testFilePath2);
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });
});

describe('generateCacheKey', () => {
  it('should generate cache key with filename and hash', () => {
    const key = generateCacheKey('test.ts', 'abc123');
    expect(key).toBe('test.ts:abc123');
  });

  it('should handle different file extensions', () => {
    const key1 = generateCacheKey('test.ts', 'hash1');
    const key2 = generateCacheKey('test.js', 'hash1');
    expect(key1).not.toBe(key2);
  });
});

describe('parseCacheKey', () => {
  it('should parse cache key correctly', () => {
    const result = parseCacheKey('test.ts:abc123');
    expect(result.filename).toBe('test.ts');
    expect(result.hash).toBe('abc123');
  });

  it('should handle hash with colon', () => {
    // Note: SHA256 hashes don't contain colons, but this tests the lastIndexOf behavior
    const result = parseCacheKey('test.ts:abc:123');
    // lastIndexOf finds the LAST colon, so filename includes 'abc'
    expect(result.filename).toBe('test.ts:abc');
    expect(result.hash).toBe('123');
  });
});

// Cleanup
afterAll(async () => {
  try {
    await fs.unlink(testFilePath);
    await fs.unlink(testFilePath2);
  } catch {
    // Ignore cleanup errors
  }
});
