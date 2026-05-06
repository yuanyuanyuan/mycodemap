// [META] since:2026-03 | owner:architecture-team | stable:false
// [WHY] SQLite-family fallback tests prove native success, family-internal fallback, and total-failure remediation

import { describe, expect, it, vi, afterEach } from 'vitest';
import { ErrorCodes } from '../../../cli/output/error-codes.js';
import {
  getLastSQLiteLoadDiagnostics,
  loadSQLiteWithDiagnostics,
} from '../adapters/sqlite-loader.js';

class NativeSQLiteMock {
  exec(): void {}
  prepare(): { run: () => void; get: () => undefined; all: () => [] } {
    return {
      run: () => {},
      get: () => undefined,
      all: () => [],
    };
  }
  close(): void {}
}

class FallbackSQLiteMock extends NativeSQLiteMock {}

describe('SQLite-family fallback mechanism', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses better-sqlite3 when native loading succeeds', async () => {
    const result = await loadSQLiteWithDiagnostics({
      nativeLoader: () => NativeSQLiteMock,
      nodeSqliteLoader: () => {
        throw new Error('node:sqlite should not be used');
      },
      sqlJsLoader: async () => {
        throw new Error('sql.js should not be used');
      },
    });

    expect(result.SQLite).toBe(NativeSQLiteMock);
    expect(result.diagnostics).toMatchObject({
      nativeAvailable: true,
      wasmAvailable: false,
      fallbackActivated: false,
      implementation: 'native',
      backend: 'better-sqlite3',
      module: 'better-sqlite3',
    });
    expect(getLastSQLiteLoadDiagnostics()?.backend).toBe('better-sqlite3');
  });

  it('falls back inside the SQLite family when native loading fails', async () => {
    const warn = vi.fn();
    const result = await loadSQLiteWithDiagnostics({
      nativeLoader: () => {
        throw new Error('native build missing');
      },
      nodeSqliteLoader: () => FallbackSQLiteMock,
      sqlJsLoader: async () => {
        throw new Error('sql.js should not be used');
      },
      nodeMajorVersion: 22,
      warn,
    });

    expect(result.SQLite).toBe(FallbackSQLiteMock);
    expect(result.diagnostics).toMatchObject({
      nativeAvailable: false,
      wasmAvailable: true,
      fallbackActivated: true,
      implementation: 'node:sqlite',
      backend: 'node:sqlite',
      module: 'better-sqlite3',
    });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('SQLite-family fallback via node:sqlite'));
  });

  it('surfaces actionable remediation when both native and fallback loading fail', async () => {
    await expect(loadSQLiteWithDiagnostics({
      nativeLoader: () => {
        throw new Error('better-sqlite3 compile failed');
      },
      nodeSqliteLoader: () => {
        throw new Error('node:sqlite unavailable');
      },
      sqlJsLoader: async () => {
        throw new Error('sql.js unavailable');
      },
      nodeMajorVersion: 22,
    })).rejects.toMatchObject({
      code: ErrorCodes.DEP_NATIVE_MISSING,
      nextCommand: 'mycodemap --wasm-fallback',
    });

    await expect(loadSQLiteWithDiagnostics({
      nativeLoader: () => {
        throw new Error('better-sqlite3 compile failed');
      },
      nodeSqliteLoader: () => {
        throw new Error('node:sqlite unavailable');
      },
      sqlJsLoader: async () => {
        throw new Error('sql.js unavailable');
      },
      nodeMajorVersion: 22,
    })).rejects.toThrow('better-sqlite3 compile failed');
  });
});
