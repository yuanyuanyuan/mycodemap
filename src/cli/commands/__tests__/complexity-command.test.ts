/**
 * [META] Complexity CLI Command Test
 * [WHY] Protect file-scoped JSON output contract for agent-friendly complexity analysis
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'node:path';
import type { CodeMap, ModuleInfo } from '../../../types/index.js';

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  },
}));

vi.mock('../../paths.js', () => ({
  resolveDataPath: vi.fn(() => '/tmp/mock-codemap.json'),
}));

const { complexityCommand } = await import('../complexity.js');

function createModule(overrides: Partial<ModuleInfo>): ModuleInfo {
  return {
    id: overrides.path ?? 'src/example.ts',
    path: overrides.path ?? 'src/example.ts',
    absolutePath: overrides.absolutePath ?? path.join('/repo', overrides.path ?? 'src/example.ts'),
    type: 'source',
    stats: {
      lines: 100,
      codeLines: 80,
      commentLines: 10,
      blankLines: 10,
    },
    exports: [],
    imports: [],
    symbols: [],
    dependencies: [],
    dependents: [],
    ...overrides,
  };
}

function createCodeMap(): CodeMap {
  const modules = [
    createModule({
      id: 'src/cli/commands/analyze.ts',
      path: 'src/cli/commands/analyze.ts',
      absolutePath: '/repo/src/cli/commands/analyze.ts',
      complexity: {
        cyclomatic: 12,
        cognitive: 18,
        maintainability: 70,
      },
    }),
    createModule({
      id: 'src/cli/commands/query.ts',
      path: 'src/cli/commands/query.ts',
      absolutePath: '/repo/src/cli/commands/query.ts',
      complexity: {
        cyclomatic: 5,
        cognitive: 8,
        maintainability: 82,
      },
    }),
  ];

  return {
    version: '1.0.0',
    generatedAt: '2026-04-18T00:00:00.000Z',
    project: {
      name: 'codemap',
      rootDir: '/repo',
      packageManager: 'pnpm',
    },
    summary: {
      totalFiles: modules.length,
      totalLines: 200,
      totalModules: modules.length,
      totalExports: 0,
      totalTypes: 0,
    },
    modules,
    dependencies: {
      nodes: [],
      edges: [],
    },
  };
}

describe('complexityCommand', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null) => {
      throw new Error(`process.exit:${code ?? 0}`);
    });
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(createCodeMap()));
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('outputs a single file object for file-scoped JSON without top-level modules', async () => {
    await complexityCommand({
      file: 'src/cli/commands/analyze.ts',
      json: true,
    });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const output = JSON.parse(String(consoleLogSpy.mock.calls[0]?.[0])) as Record<string, unknown>;

    expect(output).toHaveProperty('file');
    expect(output).not.toHaveProperty('modules');
    expect((output.file as { relativePath: string }).relativePath).toBe('src/cli/commands/analyze.ts');
  });
});
