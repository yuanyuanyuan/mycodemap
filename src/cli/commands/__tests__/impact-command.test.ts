/**
 * [META] Impact CLI Command Test
 * [WHY] 锁住 shared impact truth 在 CLI JSON / human surface 上的分层与降级语义
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CodeGraph } from '../../../interface/types/index.js';

const mockCreateConfiguredStorage = vi.fn();

vi.mock('chalk', () => ({
  default: {
    cyan: (text: string) => text,
    gray: (text: string) => text,
    yellow: (text: string) => text,
    green: (text: string) => text,
    red: (text: string) => text,
  },
}));

vi.mock('../../storage-runtime.js', () => ({
  createConfiguredStorage: (...args: unknown[]) => mockCreateConfiguredStorage(...args),
}));

import { impactCommand, ImpactCommand } from '../impact.js';

function createGraphFixture(graphStatus: 'complete' | 'partial' = 'complete'): CodeGraph {
  return {
    project: {
      id: 'proj-1',
      name: 'fixture',
      rootPath: '/repo',
      createdAt: new Date('2026-05-08T00:00:00.000Z'),
      updatedAt: new Date('2026-05-08T00:00:00.000Z'),
    },
    modules: [
      {
        id: 'mod-target',
        projectId: 'proj-1',
        path: 'src/target.ts',
        language: 'ts',
        stats: { lines: 5, codeLines: 4, commentLines: 0, blankLines: 1 },
      },
      {
        id: 'mod-caller',
        projectId: 'proj-1',
        path: 'src/caller.ts',
        language: 'ts',
        stats: { lines: 5, codeLines: 4, commentLines: 0, blankLines: 1 },
      },
      {
        id: 'mod-transitive',
        projectId: 'proj-1',
        path: 'src/transitive.ts',
        language: 'ts',
        stats: { lines: 5, codeLines: 4, commentLines: 0, blankLines: 1 },
      },
    ],
    symbols: [
      {
        id: 'sym-target',
        moduleId: 'mod-target',
        name: 'target',
        kind: 'function',
        location: { file: 'src/target.ts', line: 1, column: 1 },
        visibility: 'public',
      },
    ],
    dependencies: [
      {
        id: 'dep-1',
        sourceId: 'mod-caller',
        sourceEntityType: 'module',
        targetId: 'mod-target',
        targetEntityType: 'module',
        type: 'import',
        confidence: 'EXTRACTED',
        filePath: 'src/caller.ts',
        line: 1,
      },
      {
        id: 'dep-2',
        sourceId: 'mod-transitive',
        sourceEntityType: 'module',
        targetId: 'mod-caller',
        targetEntityType: 'module',
        type: 'import',
        confidence: 'EXTRACTED',
        filePath: 'src/transitive.ts',
        line: 1,
      },
    ],
    graphStatus,
    failedFileCount: graphStatus === 'partial' ? 1 : 0,
    parseFailureFiles: graphStatus === 'partial' ? ['src/stale.ts'] : [],
  };
}

function createStorage(graph: CodeGraph) {
  return {
    loadCodeGraph: vi.fn(async () => graph),
    close: vi.fn(async () => undefined),
  };
}

describe('impact command', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;
  let processCwdSpy: ReturnType<typeof vi.spyOn>;
  let originalExitCode: number | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null) => {
      throw new Error(`process.exit:${code ?? 0}`);
    });
    processCwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/repo');
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
    processCwdSpy.mockRestore();
    process.exitCode = originalExitCode;
  });

  it('returns layered shared impact JSON for the CLI surface', async () => {
    mockCreateConfiguredStorage.mockResolvedValue({
      storage: createStorage(createGraphFixture('complete')),
    });

    await impactCommand({ file: 'src/target.ts', json: true, transitive: true });

    const output = consoleLogSpy.mock.calls.at(-1)?.[0];
    const parsed = JSON.parse(String(output)) as Record<string, unknown>;

    expect(parsed).toEqual(expect.objectContaining({
      status: 'ok',
      confidence: 'high',
      entrypoint: expect.objectContaining({ kind: 'file', filePath: 'src/target.ts' }),
      summary: expect.objectContaining({
        directCount: 1,
        transitiveCount: 1,
      }),
      direct: [
        expect.objectContaining({ id: 'mod-caller', depth: 1 }),
      ],
      transitiveLayers: [
        expect.objectContaining({
          depth: 2,
          nodes: [expect.objectContaining({ id: 'mod-transitive', depth: 2 })],
        }),
      ],
    }));
    expect(process.exitCode).toBeUndefined();
  });

  it('marks unavailable impact requests explicitly instead of printing empty success', async () => {
    mockCreateConfiguredStorage.mockResolvedValue({
      storage: createStorage(createGraphFixture('complete')),
    });

    await impactCommand({ file: 'src/missing.ts', json: true });

    const output = consoleLogSpy.mock.calls.at(-1)?.[0];
    const parsed = JSON.parse(String(output)) as Record<string, unknown>;

    expect(parsed).toEqual(expect.objectContaining({
      status: 'not_found',
      error: expect.objectContaining({ code: 'FILE_NOT_FOUND' }),
      remediation: expect.any(String),
    }));
    expect(process.exitCode).toBe(1);
  });

  it('degrades confidence for partial graph truth', async () => {
    const command = new ImpactCommand();
    mockCreateConfiguredStorage.mockResolvedValue({
      storage: createStorage(createGraphFixture('partial')),
    });

    const [result] = await command.run({
      targets: ['src/target.ts'],
      scope: 'transitive',
    });

    expect(result).toEqual(expect.objectContaining({
      status: 'ok',
      confidence: 'reduced',
      warnings: expect.arrayContaining([
        expect.objectContaining({ code: 'GRAPH_PARTIAL' }),
      ]),
    }));
  });
});
