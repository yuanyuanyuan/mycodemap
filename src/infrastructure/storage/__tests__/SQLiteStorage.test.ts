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
        signature: 'callA() => void',
        location: { file: 'src/a.ts', line: 1, column: 1 },
        visibility: 'public',
      },
      {
        id: 'sym-b',
        moduleId: 'mod-b',
        name: 'callB',
        kind: 'function',
        signature: 'callB() => string',
        location: { file: 'src/b.ts', line: 1, column: 1 },
        visibility: 'public',
      },
    ],
    dependencies: [
      {
        id: 'dep-1',
        sourceId: 'mod-a',
        sourceEntityType: 'module',
        targetId: 'mod-b',
        targetEntityType: 'module',
        type: 'import',
      },
      {
        id: 'dep-2',
        sourceId: 'mod-b',
        sourceEntityType: 'module',
        targetId: 'mod-a',
        targetEntityType: 'module',
        type: 'import',
      },
      {
        id: 'dep-3',
        sourceId: 'sym-a',
        sourceEntityType: 'symbol',
        targetId: 'sym-b',
        targetEntityType: 'symbol',
        type: 'call',
        confidence: 'EXTRACTED',
        filePath: 'src/a.ts',
        line: 1,
      },
      {
        id: 'dep-4',
        sourceId: 'mod-a',
        sourceEntityType: 'module',
        targetId: 'sym-b',
        targetEntityType: 'symbol',
        type: 'type-ref',
        confidence: 'INFERRED',
        filePath: 'src/a.ts',
        line: 4,
      },
      {
        id: 'dep-5',
        sourceId: 'mod-b',
        sourceEntityType: 'module',
        targetId: 'sym-a',
        targetEntityType: 'symbol',
        type: 'type-ref',
        confidence: 'AMBIGUOUS',
        filePath: 'src/b.ts',
        line: 8,
      },
    ],
    graphStatus: 'partial',
    failedFileCount: 1,
    parseFailureFiles: ['src/missing.ts'],
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

  it('persists normalized governance rows, graph projection parity, and internal history snapshots', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);
    const storage = new SQLiteStorage({ type: 'sqlite', databasePath: '.codemap/governance.sqlite' });

    await storage.initialize(rootDir);
    await storage.saveCodeGraph(createGraphFixture());

    const loadedGraph = await storage.loadCodeGraph();
    expect(loadedGraph.modules).toHaveLength(2);
    expect(loadedGraph.project.createdAt).toBeInstanceOf(Date);
    expect(loadedGraph.graphStatus).toBe('partial');
    expect(loadedGraph.failedFileCount).toBe(1);
    expect(loadedGraph.parseFailureFiles).toEqual(['src/missing.ts']);

    const inspector = await createSQLiteInspector(rootDir);
    expect(inspector.prepare('SELECT value FROM metadata WHERE key = ?').get('schema_version')?.value)
      .toBe('graph-v1');
    expect(inspector.prepare('SELECT COUNT(*) AS count FROM modules').get()?.count).toBe(2);
    expect(inspector.prepare('SELECT COUNT(*) AS count FROM symbols').get()?.count).toBe(2);
    expect(inspector.prepare('SELECT COUNT(*) AS count FROM dependencies').get()?.count).toBe(5);
    expect(inspector.prepare('SELECT COUNT(*) AS count FROM graph_edges').get()?.count).toBe(5);
    expect(inspector.prepare('SELECT signature FROM symbols WHERE id = ?').get('sym-a')?.signature)
      .toBe('callA() => void');
    expect(inspector.prepare('SELECT confidence FROM dependencies WHERE id = ?').get('dep-3')?.confidence)
      .toBe('EXTRACTED');
    expect(inspector.prepare('SELECT confidence FROM graph_edges WHERE dependency_id = ?').get('dep-4')?.confidence)
      .toBe('INFERRED');
    expect(inspector.prepare('SELECT confidence FROM graph_edges WHERE dependency_id = ?').get('dep-5')?.confidence)
      .toBe('AMBIGUOUS');
    expect(inspector.prepare('SELECT value FROM metadata WHERE key = ?').get('graph_status')?.value)
      .toBe('partial');
    expect(inspector.prepare('SELECT value FROM metadata WHERE key = ?').get('failed_file_count')?.value)
      .toBe('1');
    expect(inspector.prepare('SELECT value FROM metadata WHERE key = ?').get('parse_failure_files_json')?.value)
      .toBe('["src/missing.ts"]');
    expect(inspector.prepare('SELECT snapshot_source FROM history_snapshots LIMIT 1').get()?.snapshot_source)
      .toBe('save-code-graph');
    expect(inspector.prepare('SELECT COUNT(*) AS count FROM history_relations').get()?.count).toBe(9);
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
    expect((await storage.findDependencies('mod-a')).map((dependency) => dependency.id)).toEqual(['dep-1', 'dep-4']);
    expect(await storage.findSymbolById('sym-a')).toEqual(expect.objectContaining({ signature: 'callA() => void' }));
    expect(await storage.findDependencies('sym-a')).toEqual([
      expect.objectContaining({
        id: 'dep-3',
        sourceEntityType: 'symbol',
        targetEntityType: 'symbol',
        confidence: 'EXTRACTED',
        filePath: 'src/a.ts',
        line: 1,
      }),
    ]);
    expect((await storage.findCallers('sym-b')).map((symbol) => symbol.id)).toEqual(['sym-a']);
    expect(await storage.detectCycles()).toEqual([
      {
        modules: ['mod-a', 'mod-b'],
        length: 2,
      },
    ]);
    expect(await storage.calculateImpact('mod-a', 2)).toEqual(expect.objectContaining({
      status: 'ok',
      summary: expect.objectContaining({
        directCount: 1,
        transitiveCount: 0,
      }),
      direct: [
        expect.objectContaining({ id: 'mod-b', depth: 1, path: ['mod-a', 'mod-b'] }),
      ],
      affectedModules: [expect.objectContaining({ id: 'mod-b' })],
    }));
    expect(await storage.loadGraphMetadata()).toEqual(expect.objectContaining({
      generatedAt: expect.any(String),
      graphStatus: 'partial',
      failedFileCount: 1,
      parseFailureFiles: ['src/missing.ts'],
      moduleCount: 2,
      symbolCount: 2,
    }));
    expect(await storage.calculateSymbolImpact('sym-b', 2, 10)).toEqual(expect.objectContaining({
      status: 'ok',
      confidence: 'reduced',
      rootSymbol: expect.objectContaining({ id: 'sym-b' }),
      direct: [
        expect.objectContaining({ id: 'sym-a', depth: 1, path: ['sym-b', 'sym-a'] }),
      ],
      transitiveLayers: [],
      warnings: expect.arrayContaining([
        expect.objectContaining({ code: 'GRAPH_PARTIAL' }),
      ]),
      affectedSymbols: [
        expect.objectContaining({
          symbol: expect.objectContaining({ id: 'sym-a' }),
          depth: 1,
          path: ['sym-b', 'sym-a'],
        }),
      ],
      depth: 2,
      limit: 10,
      truncated: false,
    }));

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
    expect(loadedGraph.graphStatus).toBe('partial');
    expect(loadedGraph.failedFileCount).toBe(1);

    const inspector = await createSQLiteInspector(rootDir, databasePath);
    expect(inspector.prepare('SELECT COUNT(*) AS count FROM modules').get()?.count).toBe(2);
    expect(inspector.prepare('SELECT snapshot_source FROM history_snapshots LIMIT 1').get()?.snapshot_source)
      .toBe('legacy-snapshot-backfill');
    inspector.close();

    await storage.close();
  });

  it('round-trips EXTRACTED, INFERRED, and AMBIGUOUS dependency confidence values', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);
    const storage = new SQLiteStorage({ type: 'sqlite', databasePath: '.codemap/governance.sqlite' });

    await storage.initialize(rootDir);
    await storage.saveCodeGraph(createGraphFixture());

    const loadedGraph = await storage.loadCodeGraph();
    expect(loadedGraph.dependencies.map((dependency) => dependency.confidence)).toEqual([
      undefined,
      undefined,
      'EXTRACTED',
      'INFERRED',
      'AMBIGUOUS',
    ]);

    await storage.close();
  });

  it('fails closed when a materialized governance-v3 database is reopened without rebuilding', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);
    const databasePath = '.codemap/governance.sqlite';
    const staleDatabase = await createSQLiteInspector(rootDir, databasePath);

    staleDatabase.exec(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        root_path TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS dependencies (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        source_entity_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        target_entity_type TEXT NOT NULL,
        dependency_type TEXT NOT NULL,
        file_path TEXT,
        line INTEGER,
        confidence TEXT
      );
    `);
    staleDatabase.prepare(`
      INSERT INTO metadata (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run('schema_version', 'governance-v3');
    staleDatabase.prepare(`
      INSERT INTO projects (id, name, root_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('proj-1', 'fixture', '/fixture', '2026-04-15T00:00:00.000Z', '2026-04-15T00:00:00.000Z');
    staleDatabase.prepare(`
      INSERT INTO dependencies (
        id, source_id, source_entity_type, target_id, target_entity_type, dependency_type, file_path, line, confidence
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('dep-stale', 'mod-a', 'module', 'mod-b', 'module', 'import', 'src/a.ts', 1, 'EXTRACTED');
    staleDatabase.close();

    const storage = new SQLiteStorage({ type: 'sqlite', databasePath });
    await expect(storage.initialize(rootDir)).rejects.toMatchObject({
      code: 'SQLITE_INIT_FAILED',
      cause: expect.objectContaining({
        code: 'GRAPH_SCHEMA_REBUILD_REQUIRED',
      }),
    });
  });

  it('rejects projection drift and invalid confidence rows diagnostically', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);
    const databasePath = '.codemap/governance.sqlite';
    const storage = new SQLiteStorage({ type: 'sqlite', databasePath });

    await storage.initialize(rootDir);
    await storage.saveCodeGraph(createGraphFixture());
    await storage.close();

    const driftInspector = await createSQLiteInspector(rootDir, databasePath);
    driftInspector.prepare('DELETE FROM graph_edges WHERE dependency_id = ?').run('dep-5');
    driftInspector.close();

    const driftStorage = new SQLiteStorage({ type: 'sqlite', databasePath });
    await expect(driftStorage.initialize(rootDir)).rejects.toMatchObject({
      code: 'SQLITE_INIT_FAILED',
      cause: expect.objectContaining({
        code: 'GRAPH_SCHEMA_REBUILD_REQUIRED',
      }),
    });

    const rootDirInvalid = createTempRoot();
    tempRoots.push(rootDirInvalid);
    const invalidStorage = new SQLiteStorage({ type: 'sqlite', databasePath });
    await invalidStorage.initialize(rootDirInvalid);
    await invalidStorage.saveCodeGraph(createGraphFixture());
    await invalidStorage.close();

    const invalidInspector = await createSQLiteInspector(rootDirInvalid, databasePath);
    invalidInspector.prepare('UPDATE dependencies SET confidence = ? WHERE id = ?').run('HIGH', 'dep-3');
    invalidInspector.close();

    const invalidReadStorage = new SQLiteStorage({ type: 'sqlite', databasePath });
    await invalidReadStorage.initialize(rootDirInvalid);
    await expect(invalidReadStorage.loadCodeGraph()).rejects.toMatchObject({
      code: 'GRAPH_INVALID_DEPENDENCY_CONFIDENCE',
    });
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

  it('exposes the last SQLite loader diagnostics after initialize', async () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);
    const storage = new SQLiteStorage({ type: 'sqlite', databasePath: '.codemap/governance.sqlite' });

    await storage.initialize(rootDir);

    expect(SQLiteStorage.getLastLoadDiagnostics()).toEqual(expect.objectContaining({
      module: 'better-sqlite3',
      implementation: expect.stringMatching(/^(native|node:sqlite|sql\.js)$/),
      backend: expect.stringMatching(/^(better-sqlite3|node:sqlite|sql\.js)$/),
      fallbackActivated: expect.any(Boolean),
    }));

    await storage.close();
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
