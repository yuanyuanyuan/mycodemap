import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { CodeGraph } from '../../../interface/types/index.js';
import { SQLiteStorage } from '../adapters/SQLiteStorage.js';
import { serializeCodeGraphSnapshot } from '../graph-helpers.js';

function createTempRoot(): string {
  return mkdtempSync(path.join(tmpdir(), 'codemap-sqlite-storage-'));
}

function getDatabaseFilePath(rootDir: string, databasePath = '.codemap/governance.sqlite'): string {
  return path.join(rootDir, databasePath);
}

async function createSQLiteInspector(rootDir: string, databasePath = '.codemap/governance.sqlite') {
  const sqliteModule = await import('better-sqlite3');
  mkdirSync(path.dirname(getDatabaseFilePath(rootDir, databasePath)), { recursive: true });
  return new sqliteModule.default(getDatabaseFilePath(rootDir, databasePath)) as {
    exec: (sql: string) => unknown;
    close: () => void;
    prepare: (sql: string) => {
      run: (...params: unknown[]) => unknown;
      get: (...params: unknown[]) => Record<string, unknown> | undefined;
    };
  };
}

function createGraphFixture(): CodeGraph {
  return {
    project: {
      id: 'proj-1',
      name: 'fixture',
      rootPath: '/fixture',
      createdAt: new Date('2026-04-15T00:00:00Z'),
      updatedAt: new Date('2026-04-15T00:00:00Z'),
    },
    modules: [
      {
        id: 'mod-a',
        projectId: 'proj-1',
        path: 'src/a.ts',
        language: 'ts',
        stats: { lines: 10, codeLines: 8, commentLines: 1, blankLines: 1 },
      },
      {
        id: 'mod-b',
        projectId: 'proj-1',
        path: 'src/b.ts',
        language: 'ts',
        stats: { lines: 20, codeLines: 16, commentLines: 2, blankLines: 2 },
      },
    ],
    symbols: [
      {
        id: 'sym-a',
        moduleId: 'mod-a',
        name: 'callA',
        kind: 'function',
        location: { file: 'src/a.ts', line: 1, column: 1 },
        visibility: 'public',
      },
      {
        id: 'sym-b',
        moduleId: 'mod-b',
        name: 'callB',
        kind: 'function',
        location: { file: 'src/b.ts', line: 1, column: 1 },
        visibility: 'public',
      },
    ],
    dependencies: [
      { id: 'dep-1', sourceId: 'mod-a', targetId: 'mod-b', type: 'import' },
      { id: 'dep-2', sourceId: 'mod-b', targetId: 'mod-a', type: 'import' },
      { id: 'dep-3', sourceId: 'sym-a', targetId: 'sym-b', type: 'call' },
    ],
  };
}

describe('SQLiteStorage', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const tempRoot = tempRoots.pop();
      if (tempRoot) {
        rmSync(tempRoot, { recursive: true, force: true });
      }
    }
  });

  it('persists normalized governance rows and internal history snapshots', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);
    const storage = new SQLiteStorage({ type: 'sqlite', databasePath: '.codemap/governance.sqlite' });

    await storage.initialize(rootDir);
    await storage.saveCodeGraph(createGraphFixture());

    const loadedGraph = await storage.loadCodeGraph();
    expect(loadedGraph.modules).toHaveLength(2);
    expect(loadedGraph.project.createdAt).toBeInstanceOf(Date);

    const inspector = await createSQLiteInspector(rootDir);
    expect(inspector.prepare('SELECT value FROM metadata WHERE key = ?').get('schema_version')?.value)
      .toBe('governance-v2');
    expect(inspector.prepare('SELECT COUNT(*) AS count FROM modules').get()?.count).toBe(2);
    expect(inspector.prepare('SELECT COUNT(*) AS count FROM symbols').get()?.count).toBe(2);
    expect(inspector.prepare('SELECT COUNT(*) AS count FROM dependencies').get()?.count).toBe(3);
    expect(inspector.prepare('SELECT snapshot_source FROM history_snapshots LIMIT 1').get()?.snapshot_source)
      .toBe('save-code-graph');
    expect(inspector.prepare('SELECT COUNT(*) AS count FROM history_relations').get()?.count).toBe(7);
    inspector.close();

    await storage.close();
  });

  it('supports direct relation-table queries and analysis helpers', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);
    const storage = new SQLiteStorage({ type: 'sqlite', databasePath: '.codemap/governance.sqlite' });

    await storage.initialize(rootDir);
    await storage.saveCodeGraph(createGraphFixture());

    expect(await storage.findModuleById('mod-a')).toEqual(expect.objectContaining({ id: 'mod-a' }));
    expect((await storage.findDependencies('mod-a')).map((dependency) => dependency.id)).toEqual(['dep-1']);
    expect((await storage.findCallers('sym-b')).map((symbol) => symbol.id)).toEqual(['sym-a']);
    expect(await storage.detectCycles()).toEqual([
      {
        modules: ['mod-a', 'mod-b'],
        length: 2,
      },
    ]);
    expect((await storage.calculateImpact('mod-a', 2)).affectedModules.map((module) => module.id)).toEqual(['mod-b']);

    await storage.updateModule({
      id: 'mod-c',
      projectId: 'proj-1',
      path: 'src/c.ts',
      language: 'ts',
      stats: { lines: 5, codeLines: 4, commentLines: 0, blankLines: 1 },
    });
    expect((await storage.loadCodeGraph()).modules).toHaveLength(3);

    await storage.deleteModule('mod-b');
    expect(await storage.findModuleById('mod-b')).toBeNull();
    expect((await storage.loadCodeGraph()).dependencies).toHaveLength(0);

    await storage.deleteProject();
    expect((await storage.loadCodeGraph()).modules).toHaveLength(0);

    await storage.close();
  });

  it('backfills legacy bootstrap snapshot rows into normalized tables on initialize', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);
    const databasePath = '.codemap/governance.sqlite';
    const legacyDatabase = await createSQLiteInspector(rootDir, databasePath);

    legacyDatabase.exec(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        graph_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    legacyDatabase.prepare(`
      INSERT INTO metadata (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run('schema_version', 'bootstrap-v1');
    legacyDatabase.prepare(`
      INSERT INTO snapshots (id, project_id, graph_json, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(
      'legacy-snapshot',
      'proj-1',
      serializeCodeGraphSnapshot(createGraphFixture()),
      '2026-04-15T00:00:00.000Z'
    );
    legacyDatabase.close();

    const storage = new SQLiteStorage({ type: 'sqlite', databasePath });
    await storage.initialize(rootDir);

    const loadedGraph = await storage.loadCodeGraph();
    expect(loadedGraph.project.id).toBe('proj-1');
    expect(loadedGraph.modules).toHaveLength(2);

    const inspector = await createSQLiteInspector(rootDir, databasePath);
    expect(inspector.prepare('SELECT COUNT(*) AS count FROM modules').get()?.count).toBe(2);
    expect(inspector.prepare('SELECT snapshot_source FROM history_snapshots LIMIT 1').get()?.snapshot_source)
      .toBe('legacy-snapshot-backfill');
    inspector.close();

    await storage.close();
  });

  it('reopens an existing SQLite database after close', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);
    const databasePath = '.codemap/governance.sqlite';
    const graph = createGraphFixture();

    const firstStorage = new SQLiteStorage({ type: 'sqlite', databasePath });
    await firstStorage.initialize(rootDir);
    await firstStorage.saveCodeGraph(graph);
    await firstStorage.close();

    const secondStorage = new SQLiteStorage({ type: 'sqlite', databasePath });
    await secondStorage.initialize(rootDir);

    const loadedGraph = await secondStorage.loadCodeGraph();
    expect(loadedGraph.project.id).toBe(graph.project.id);
    expect(loadedGraph.modules).toHaveLength(2);

    await secondStorage.close();
  });

  it('round-trips materialized file and symbol history signals', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);
    const storage = new SQLiteStorage({ type: 'sqlite', databasePath: '.codemap/governance.sqlite' });

    await storage.initialize(rootDir);
    await storage.saveCodeGraph(createGraphFixture());

    const snapshot = await storage.saveHistoryRiskSnapshot({
      recordedAt: '2026-04-15T01:00:00.000Z',
      source: 'git-live',
      fileSignals: [{
        file: 'src/a.ts',
        risk: {
          level: 'medium',
          score: 0.62,
          gravity: 0.4,
          heat: {
            freq30d: 4,
            lastType: 'BUGFIX',
            lastDate: '2026-04-14T00:00:00.000Z',
            stability: false,
          },
          impact: 0.2,
          riskFactors: ['history-round-trip'],
        },
        timeline: [{
          hash: 'commit-a',
          message: '[BUGFIX] src/a.ts: fix callA',
          date: '2026-04-14T00:00:00.000Z',
          author: 'tester',
          files: ['src/a.ts'],
          tagType: 'BUGFIX',
          tagScope: 'src/a.ts',
          subject: 'fix callA',
          riskWeight: 0.9,
          source: 'file',
        }],
        diagnostics: {
          status: 'ok',
          confidence: 'high',
          freshness: 'fresh',
          source: 'git-live',
          reasons: ['materialized for test'],
          analyzedAt: '2026-04-15T01:00:00.000Z',
          scopeMode: 'full',
          requestedFiles: 1,
          analyzedFiles: 1,
          requiresPrecompute: false,
        },
      }],
      symbolSignals: [{
        query: 'callA',
        candidates: [{
          symbolId: 'sym-a',
          moduleId: 'mod-a',
          name: 'callA',
          kind: 'function',
          file: 'src/a.ts',
          line: 1,
          exactNameMatch: true,
        }],
        symbol: {
          symbolId: 'sym-a',
          moduleId: 'mod-a',
          name: 'callA',
          kind: 'function',
          file: 'src/a.ts',
          line: 1,
          exactNameMatch: true,
        },
        files: ['src/a.ts'],
        timeline: [{
          hash: 'commit-a',
          message: '[BUGFIX] src/a.ts: fix callA',
          date: '2026-04-14T00:00:00.000Z',
          author: 'tester',
          files: ['src/a.ts'],
          tagType: 'BUGFIX',
          tagScope: 'src/a.ts',
          subject: 'fix callA',
          riskWeight: 0.9,
          source: 'symbol',
        }],
        risk: {
          level: 'high',
          score: 0.83,
          gravity: 0.7,
          heat: {
            freq30d: 6,
            lastType: 'BUGFIX',
            lastDate: '2026-04-14T00:00:00.000Z',
            stability: false,
          },
          impact: 0.4,
          riskFactors: ['symbol-round-trip'],
        },
        diagnostics: {
          status: 'ok',
          confidence: 'high',
          freshness: 'fresh',
          source: 'git-live',
          reasons: ['materialized for test'],
          analyzedAt: '2026-04-15T01:00:00.000Z',
          scopeMode: 'full',
          requestedFiles: 1,
          analyzedFiles: 1,
          requiresPrecompute: false,
        },
      }],
    });

    expect(snapshot.source).toBe('git-live');

    const fileSignal = await storage.loadLatestFileHistorySignal('src/a.ts');
    const symbolSignal = await storage.loadLatestSymbolHistoryResult('sym-a', 'callA');
    const missingSymbolSignal = await storage.loadLatestSymbolHistoryResult('sym-missing', 'missing');

    expect(fileSignal).toEqual(expect.objectContaining({
      file: 'src/a.ts',
      risk: expect.objectContaining({ level: 'medium' }),
    }));
    expect(fileSignal?.timeline).toHaveLength(1);
    expect(symbolSignal.risk.level).toBe('high');
    expect(symbolSignal.timeline).toHaveLength(1);
    expect(missingSymbolSignal.risk.level).toBe('unavailable');
    expect(missingSymbolSignal.diagnostics.status).toBe('unavailable');

    await storage.close();
  });
});
