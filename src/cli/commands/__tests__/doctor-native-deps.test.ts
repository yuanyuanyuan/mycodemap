import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock tree-sitter-check before importing the module under test
const mockDetectTreeSitterSync = vi.fn();

vi.mock('../../tree-sitter-check.js', () => ({
  detectTreeSitterSync: (...args: unknown[]) => mockDetectTreeSitterSync(...args),
}));

describe('checkNativeDeps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('node:module');
  });

  it('returns ok for tree-sitter when available', async () => {
    mockDetectTreeSitterSync.mockReturnValue({ isAvailable: true, version: '0.21.1' });

    const { checkNativeDeps } = await import('../../doctor/check-native-deps.js');
    const results = checkNativeDeps();

    const treeSitterResult = results.find((r) => r.id === 'tree-sitter-available');
    expect(treeSitterResult).toBeDefined();
    expect(treeSitterResult!.severity).toBe('ok');
    expect(treeSitterResult!.category).toBe('runtime');
  });

  it('returns error for tree-sitter when not available', async () => {
    mockDetectTreeSitterSync.mockReturnValue({ isAvailable: false, error: 'Module not found' });

    const { checkNativeDeps } = await import('../../doctor/check-native-deps.js');
    const results = checkNativeDeps();

    const treeSitterResult = results.find(
      (r) => r.id === 'native-dep-missing' && r.message.includes('tree-sitter')
    );
    expect(treeSitterResult).toBeDefined();
    expect(treeSitterResult!.severity).toBe('error');
  });

  it('returns ok for better-sqlite3 when available', async () => {
    mockDetectTreeSitterSync.mockReturnValue({ isAvailable: true, version: '0.21.1' });

    // In the test environment, better-sqlite3 is installed as a dependency
    const { checkNativeDeps } = await import('../../doctor/check-native-deps.js');
    const results = checkNativeDeps();

    const sqliteResult = results.find((r) => r.id === 'better-sqlite3-available');
    expect(sqliteResult).toBeDefined();
    expect(sqliteResult!.severity).toBe('ok');
  });

  it('returns error for better-sqlite3 when not available', async () => {
    mockDetectTreeSitterSync.mockReturnValue({ isAvailable: true, version: '0.21.1' });

    // Mock node:module to make createRequire throw for better-sqlite3
    // Must reset module cache and use doMock before re-importing
    vi.resetModules();
    vi.doMock('../../tree-sitter-check.js', () => ({
      detectTreeSitterSync: (...args: unknown[]) => mockDetectTreeSitterSync(...args),
    }));
    vi.doMock('node:module', async (importOriginal) => {
      const actual = await importOriginal<typeof import('node:module')>() as Record<string, unknown>;
      return {
        ...actual,
        createRequire: (url: string) => {
          const originalRequire = (actual.createRequire as typeof import('node:module').createRequire)(url);
          return (id: string) => {
            if (id === 'better-sqlite3') {
              throw new Error('Cannot find module better-sqlite3');
            }
            return originalRequire(id);
          };
        },
      };
    });

    const { checkNativeDeps } = await import('../../doctor/check-native-deps.js');
    const results = checkNativeDeps();

    const sqliteResult = results.find(
      (r) => r.id === 'native-dep-missing' && r.message.includes('better-sqlite3')
    );
    expect(sqliteResult).toBeDefined();
    expect(sqliteResult!.severity).toBe('error');
  });
});
