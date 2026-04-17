import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { CodeGraph } from '../../../interface/types/index.js';
import { SQLiteStorage } from '../../../infrastructure/storage/adapters/SQLiteStorage.js';
import { QueryHandler } from '../QueryHandler.js';

function createTempRoot(): string {
  return mkdtempSync(path.join(tmpdir(), 'codemap-query-handler-'));
}

function createImpactFixture(): CodeGraph {
  return {
    project: {
      id: 'proj-impact',
      name: 'impact-fixture',
      rootPath: '/fixture',
      createdAt: new Date('2026-04-15T00:00:00Z'),
      updatedAt: new Date('2026-04-15T00:00:00Z'),
    },
    modules: [
      {
        id: 'leaf',
        projectId: 'proj-impact',
        path: 'src/leaf.ts',
        language: 'ts',
        stats: { lines: 10, codeLines: 8, commentLines: 1, blankLines: 1 },
      },
      {
        id: 'mid',
        projectId: 'proj-impact',
        path: 'src/mid.ts',
        language: 'ts',
        stats: { lines: 10, codeLines: 8, commentLines: 1, blankLines: 1 },
      },
      {
        id: 'root',
        projectId: 'proj-impact',
        path: 'src/root.ts',
        language: 'ts',
        stats: { lines: 10, codeLines: 8, commentLines: 1, blankLines: 1 },
      },
    ],
    symbols: [],
    dependencies: [
      { id: 'dep-1', sourceId: 'mid', targetId: 'leaf', type: 'import' },
      { id: 'dep-2', sourceId: 'root', targetId: 'mid', type: 'import' },
    ],
  };
}

describe('QueryHandler', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const tempRoot = tempRoots.pop();
      if (tempRoot) {
        rmSync(tempRoot, { recursive: true, force: true });
      }
    }
  });

  it('returns the same impact analysis in memory-eager and sqlite-direct modes', async () => {
    const eagerRoot = createTempRoot();
    const directRoot = createTempRoot();
    tempRoots.push(eagerRoot, directRoot);
    const graph = createImpactFixture();
    const eagerStorage = new SQLiteStorage({
      type: 'sqlite',
      databasePath: '.codemap/governance.sqlite',
    });
    const directStorage = new SQLiteStorage(
      {
        type: 'sqlite',
        databasePath: '.codemap/governance.sqlite',
      },
      {
        governanceGraphThresholds: {
          maxFiles: 1,
          maxLoadMs: 1_000,
          maxRssMb: 200,
        },
      }
    );

    await eagerStorage.initialize(eagerRoot);
    await directStorage.initialize(directRoot);
    await eagerStorage.saveCodeGraph(graph);
    await directStorage.saveCodeGraph(graph);

    const eagerHandler = new QueryHandler(eagerStorage);
    const directHandler = new QueryHandler(directStorage);
    const eagerResult = await eagerHandler.analyzeImpact({ moduleId: 'leaf', depth: 3 });
    const directResult = await directHandler.analyzeImpact({ moduleId: 'leaf', depth: 3 });

    expect(eagerStorage.getGovernanceGraphRuntimeStats().cacheMode).toBe('memory-eager');
    expect(directStorage.getGovernanceGraphRuntimeStats().cacheMode).toBe('sqlite-direct');
    expect(eagerResult).toEqual(directResult);
    expect(eagerResult).toEqual({
      rootModule: 'leaf',
      affectedModules: [
        { id: 'mid', path: 'src/mid.ts', depth: 1 },
        { id: 'root', path: 'src/root.ts', depth: 2 },
      ],
      totalAffected: 2,
      maxDepth: 2,
    });

    await eagerStorage.close();
    await directStorage.close();
  });
});
