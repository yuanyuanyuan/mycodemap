import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CodeGraph } from '../../../../interface/types/index.js';

type SnapshotStore = {
  graph: string | null;
};

const kuzuStores = new Map<string, SnapshotStore>();
let kuzuShouldFailInit = false;

class FakeKuzuQueryResult {
  constructor(private readonly rows: Array<Record<string, unknown>>) {}

  async getAll(): Promise<Array<Record<string, unknown>>> {
    return this.rows;
  }

  async close(): Promise<void> {}
}

class FakeKuzuPreparedStatement {
  constructor(private readonly statement: string) {}

  isSuccess(): boolean {
    return true;
  }

  getErrorMessage(): string {
    return '';
  }

  getStatement(): string {
    return this.statement;
  }
}

class FakeKuzuDatabase {
  readonly store: SnapshotStore;

  constructor(databasePath: string) {
    if (kuzuShouldFailInit) {
      throw new Error('kuzu native binding unavailable');
    }

    const existingStore = kuzuStores.get(databasePath) ?? { graph: null };
    kuzuStores.set(databasePath, existingStore);
    this.store = existingStore;
  }

  async close(): Promise<void> {}
}

class FakeKuzuConnection {
  constructor(private readonly database: FakeKuzuDatabase) {}

  async query(statement: string): Promise<FakeKuzuQueryResult> {
    if (statement.includes('CREATE NODE TABLE IF NOT EXISTS Snapshot')) {
      return new FakeKuzuQueryResult([]);
    }

    if (statement.includes('MATCH (s:Snapshot) DELETE s')) {
      this.database.store.graph = null;
      return new FakeKuzuQueryResult([]);
    }

    if (statement.includes('MATCH (s:Snapshot) RETURN s.graph AS graph LIMIT 1')) {
      return new FakeKuzuQueryResult(
        this.database.store.graph ? [{ graph: this.database.store.graph }] : []
      );
    }

    throw new Error(`Unexpected Kuzu query: ${statement}`);
  }

  async prepare(statement: string): Promise<FakeKuzuPreparedStatement> {
    return new FakeKuzuPreparedStatement(statement);
  }

  async execute(
    preparedStatement: FakeKuzuPreparedStatement,
    params: Record<string, unknown>
  ): Promise<FakeKuzuQueryResult> {
    if (preparedStatement.getStatement().includes('CREATE (s:Snapshot')) {
      this.database.store.graph = String(params.graph ?? '');
      return new FakeKuzuQueryResult([]);
    }

    throw new Error(`Unexpected Kuzu prepared statement: ${preparedStatement.getStatement()}`);
  }

  async close(): Promise<void> {}
}

vi.mock('kuzu', () => ({
  Database: FakeKuzuDatabase,
  Connection: FakeKuzuConnection,
}), { virtual: true });

function createGraphFixture(): CodeGraph {
  return {
    project: {
      id: 'proj-1',
      name: 'fixture',
      rootPath: '/fixture',
      createdAt: new Date('2026-03-24T00:00:00Z'),
      updatedAt: new Date('2026-03-24T00:00:00Z'),
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

describe('KuzuDBStorage', () => {
  beforeEach(() => {
    kuzuStores.clear();
    kuzuShouldFailInit = false;
  });

  it('persists and loads a CodeGraph snapshot through KùzuDB', async () => {
    const { KuzuDBStorage } = await import('../KuzuDBStorage.js');
    const storage = new KuzuDBStorage({ type: 'kuzudb', databasePath: '.codemap/kuzu' });
    const graph = createGraphFixture();

    await storage.initialize('/project');
    await storage.saveCodeGraph(graph);

    const loadedGraph = await storage.loadCodeGraph();
    expect(loadedGraph.modules).toHaveLength(2);
    expect(loadedGraph.project.createdAt).toBeInstanceOf(Date);
  });

  it('supports query/update/delete/analysis methods via the shared contract', async () => {
    const { KuzuDBStorage } = await import('../KuzuDBStorage.js');
    const storage = new KuzuDBStorage({ type: 'kuzudb', databasePath: '.codemap/kuzu' });

    await storage.initialize('/project');
    await storage.saveCodeGraph(createGraphFixture());

    expect(await storage.findModuleById('mod-a')).toEqual(expect.objectContaining({ id: 'mod-a' }));
    expect((await storage.findCallers('sym-b')).map(symbol => symbol.id)).toEqual(['sym-a']);
    expect(await storage.detectCycles()).toEqual([
      {
        modules: ['mod-a', 'mod-b'],
        length: 2,
      },
    ]);

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

    await storage.deleteProject();
    expect((await storage.loadCodeGraph()).modules).toHaveLength(0);
  });

  it('surfaces initialization failures instead of silently falling back', async () => {
    kuzuShouldFailInit = true;

    const { KuzuDBStorage } = await import('../KuzuDBStorage.js');
    const storage = new KuzuDBStorage({ type: 'kuzudb', databasePath: '.codemap/kuzu' });

    await expect(storage.initialize('/project')).rejects.toMatchObject({
      name: 'StorageError',
      code: 'KUZU_INIT_FAILED',
    });
  });
});
