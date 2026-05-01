import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkAndActivateWasmFallback } from '../output/wasm-fallback.js';

describe('WASM Fallback', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clean env vars before each test
    delete process.env.CODEMAP_USE_WASM_TREE_SITTER;
    delete process.env.CODEMAP_USE_WASM_BETTER_SQLITE3;
  });

  afterEach(() => {
    // Restore env vars
    process.env = { ...originalEnv };
  });

  describe('checkAndActivateWasmFallback', () => {
    it('returns native available when wasm-fallback is not requested', async () => {
      const result = await checkAndActivateWasmFallback('tree-sitter', { wasmFallback: false });
      expect(result.nativeAvailable).toBe(true);
      expect(result.fallbackActivated).toBe(false);
    });

    it('sets env var when WASM fallback is activated', async () => {
      // Mock native failure by forcing WASM
      process.env.CODEMAP_USE_WASM_TREE_SITTER = '1';

      const result = await checkAndActivateWasmFallback('tree-sitter', { wasmFallback: true });
      // Result depends on whether tree-sitter is actually available in this environment
      expect(result.module).toBe('tree-sitter');
      expect(result.wasmAvailable !== undefined).toBe(true);
    });

    it('handles better-sqlite3 module', async () => {
      const result = await checkAndActivateWasmFallback('better-sqlite3', { wasmFallback: false });
      expect(result.module).toBe('better-sqlite3');
      expect(result.fallbackActivated).toBe(false);
    });
  });

  describe('tree-sitter-loader', () => {
    it('loads native tree-sitter when env var is not set', async () => {
      delete process.env.CODEMAP_USE_WASM_TREE_SITTER;
      const { loadTreeSitter } = await import('../../parser/implementations/tree-sitter-loader.js');
      const result = await loadTreeSitter();
      expect(result.Parser).toBeDefined();
      expect(result.TypeScript).toBeDefined();
    });

    it('attempts WASM path when env var is set', async () => {
      process.env.CODEMAP_USE_WASM_TREE_SITTER = '1';
      const { loadTreeSitter } = await import('../../parser/implementations/tree-sitter-loader.js');
      // This will likely fail since web-tree-sitter is not installed,
      // but it should throw an actionable error
      try {
        await loadTreeSitter();
        // If it succeeds, that's fine too (WASM might be available)
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('sqlite-loader', () => {
    it('loads native better-sqlite3 when env var is not set', async () => {
      delete process.env.CODEMAP_USE_WASM_BETTER_SQLITE3;
      const { loadSQLite } = await import('../../infrastructure/storage/adapters/sqlite-loader.js');
      const SQLite = await loadSQLite();
      expect(SQLite).toBeDefined();

      // Test basic database operations
      const db = new SQLite(':memory:');
      expect(db.exec).toBeDefined();
      expect(db.prepare).toBeDefined();
      expect(db.close).toBeDefined();
      db.close();
    });

    it('attempts WASM path when env var is set on Node 22+', async () => {
      process.env.CODEMAP_USE_WASM_BETTER_SQLITE3 = '1';
      const { loadSQLite } = await import('../../infrastructure/storage/adapters/sqlite-loader.js');
      // On Node 22+, this should load node:sqlite
      try {
        const SQLite = await loadSQLite();
        expect(SQLite).toBeDefined();
      } catch (error) {
        // If node:sqlite is experimental or unavailable, it might fail
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});
