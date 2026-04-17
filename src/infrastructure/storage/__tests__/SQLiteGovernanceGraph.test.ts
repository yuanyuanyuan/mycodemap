import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { CodeGraph } from '../../../interface/types/index.js';
import { SQLiteStorage } from '../adapters/SQLiteStorage.js';

function createTempRoot(): string {
  return mkdtempSync(path.join(tmpdir(), 'codemap-sqlite-governance-'));
}

function createGovernanceGraphFixture(moduleCount = 3): CodeGraph {
  const modules = Array.from({ length: moduleCount }, (_, index) => ({
    id: `mod-${index + 1}`,
    projectId: 'proj-graph',
    path: `src/module-${index + 1}.ts`,
    language: 'ts',
    stats: {
      lines: 10 + index,
      codeLines: 8 + index,
      commentLines: 1,
      blankLines: 1,
    },
  }));
  const dependencies = modules.slice(0, -1).map((module, index) => ({
    id: `dep-${index + 1}`,
    sourceId: module.id,
    targetId: modules[index + 1]?.id ?? module.id,
    type: 'import' as const,
  }));

  if (modules.length >= 3) {
    dependencies.push({
      id: 'dep-cycle',
      sourceId: modules[2]!.id,
      targetId: modules[0]!.id,
      type: 'import',
    });
  }

  return {
    project: {
      id: 'proj-graph',
      name: 'governance-fixture',
      rootPath: '/fixture',
      createdAt: new Date('2026-04-15T00:00:00Z'),
      updatedAt: new Date('2026-04-15T00:00:00Z'),
    },
    modules,
    symbols: [],
    dependencies,
  };
}

describe('SQLite governance graph runtime', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const tempRoot = tempRoots.pop();
      if (tempRoot) {
        rmSync(tempRoot, { recursive: true, force: true });
      }
    }
  });

  it('uses memory-eager mode within the default thresholds', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);
    const storage = new SQLiteStorage({ type: 'sqlite', databasePath: '.codemap/governance.sqlite' });

    await storage.initialize(rootDir);
    await storage.saveCodeGraph(createGovernanceGraphFixture());

    const stats = storage.getGovernanceGraphRuntimeStats();
    expect(stats.cacheMode).toBe('memory-eager');
    expect(stats.thresholds.maxFiles).toBe(10_000);
    expect(stats.thresholds.maxLoadMs).toBe(1_000);
    expect(stats.thresholds.maxRssMb).toBe(200);
    expect((await storage.findDependencies('mod-1')).map((dependency) => dependency.id)).toEqual(['dep-1']);
    expect((await storage.findDependents('mod-1')).map((dependency) => dependency.id)).toEqual(['dep-cycle']);

    await storage.close();
  });

  it('keeps dependency and impact behavior identical across memory-eager and sqlite-direct modes', async () => {
    const eagerRoot = createTempRoot();
    const directRoot = createTempRoot();
    tempRoots.push(eagerRoot, directRoot);
    const graph = createGovernanceGraphFixture();
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

    expect(eagerStorage.getGovernanceGraphRuntimeStats().cacheMode).toBe('memory-eager');
    expect(directStorage.getGovernanceGraphRuntimeStats().cacheMode).toBe('sqlite-direct');
    expect(directStorage.getGovernanceGraphRuntimeStats().warning).toContain('maxFiles=1');

    expect(await eagerStorage.findDependencies('mod-1')).toEqual(
      await directStorage.findDependencies('mod-1')
    );
    expect(await eagerStorage.findDependents('mod-2')).toEqual(
      await directStorage.findDependents('mod-2')
    );
    expect(await eagerStorage.detectCycles()).toEqual(
      await directStorage.detectCycles()
    );
    expect(await eagerStorage.calculateImpact('mod-3', 3)).toEqual(
      await directStorage.calculateImpact('mod-3', 3)
    );

    await eagerStorage.close();
    await directStorage.close();
  });

  it('falls back to sqlite-direct for oversized graphs instead of pretending the cache is active', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);
    const storage = new SQLiteStorage({ type: 'sqlite', databasePath: '.codemap/governance.sqlite' });
    const oversizedGraph = createGovernanceGraphFixture(10_001);

    await storage.initialize(rootDir);
    await storage.saveCodeGraph(oversizedGraph);

    const stats = storage.getGovernanceGraphRuntimeStats();
    expect(stats.cacheMode).toBe('sqlite-direct');
    expect(stats.moduleCount).toBe(10_001);
    expect(stats.warning).toContain('maxFiles=10000');
    expect((await storage.calculateImpact('mod-10001', 2)).affectedModules.map((module) => module.id))
      .toEqual(['mod-10000', 'mod-9999']);

    await storage.close();
  });
});
