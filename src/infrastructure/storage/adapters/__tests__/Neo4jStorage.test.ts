import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CodeGraph } from '../../../../interface/types/index.js';

let neo4jSnapshot: string | null = null;

class FakeNeo4jRecord {
  constructor(private readonly values: Record<string, unknown>) {}

  get(key: string): unknown {
    return this.values[key];
  }
}

class FakeNeo4jSession {
  async run(query: string, params: Record<string, unknown> = {}): Promise<{ records: FakeNeo4jRecord[] }> {
    if (query.includes('MATCH (s:CodeMapSnapshot) DETACH DELETE s')) {
      neo4jSnapshot = null;
      return { records: [] };
    }

    if (query.includes('CREATE (s:CodeMapSnapshot')) {
      neo4jSnapshot = String(params.graph ?? '');
      return { records: [] };
    }

    if (query.includes('MATCH (s:CodeMapSnapshot) RETURN s.graph AS graph LIMIT 1')) {
      return {
        records: neo4jSnapshot ? [new FakeNeo4jRecord({ graph: neo4jSnapshot })] : [],
      };
    }

    if (query.includes('RETURN 1')) {
      return { records: [] };
    }

    throw new Error(`Unexpected Neo4j query: ${query}`);
  }

  async close(): Promise<void> {}
}

const fakeDriver = {
  verifyConnectivity: vi.fn(async () => undefined),
  session: vi.fn(() => new FakeNeo4jSession()),
  close: vi.fn(async () => undefined),
};

const fakeNeo4jModule = {
  driver: vi.fn(() => fakeDriver),
  auth: {
    basic: vi.fn((username: string, password: string) => ({ username, password })),
  },
};

vi.mock('neo4j-driver', () => ({
  ...fakeNeo4jModule,
  default: fakeNeo4jModule,
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
      { id: 'dep-2', sourceId: 'sym-a', targetId: 'sym-b', type: 'call' },
    ],
  };
}

describe('Neo4jStorage', () => {
  beforeEach(() => {
    neo4jSnapshot = null;
    fakeDriver.verifyConnectivity.mockClear();
    fakeDriver.session.mockClear();
    fakeDriver.close.mockClear();
    fakeNeo4jModule.driver.mockClear();
  });

  it('persists and loads a CodeGraph snapshot through Neo4j', async () => {
    const { Neo4jStorage } = await import('../Neo4jStorage.js');
    const storage = new Neo4jStorage({
      type: 'neo4j',
      uri: 'bolt://localhost:7687',
      username: 'neo4j',
      password: 'secret',
    });

    await storage.initialize('/project');
    await storage.saveCodeGraph(createGraphFixture());

    const loadedGraph = await storage.loadCodeGraph();
    expect(fakeDriver.verifyConnectivity).toHaveBeenCalled();
    expect(loadedGraph.modules).toHaveLength(2);
    expect(loadedGraph.project.updatedAt).toBeInstanceOf(Date);
  });

  it('supports shared contract methods on top of the snapshot store', async () => {
    const { Neo4jStorage } = await import('../Neo4jStorage.js');
    const storage = new Neo4jStorage({
      type: 'neo4j',
      uri: 'bolt://localhost:7687',
      username: 'neo4j',
      password: 'secret',
    });

    await storage.initialize('/project');
    await storage.saveCodeGraph(createGraphFixture());

    expect(await storage.findSymbolById('sym-a')).toEqual(expect.objectContaining({ id: 'sym-a' }));
    expect((await storage.findCallees('sym-a')).map(symbol => symbol.id)).toEqual(['sym-b']);

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
    expect(await storage.getStatistics()).toEqual({
      totalModules: 0,
      totalSymbols: 0,
      totalDependencies: 0,
      totalLines: 0,
      averageComplexity: 0,
    });
  });

  it('surfaces connectivity failures instead of silently falling back', async () => {
    fakeDriver.verifyConnectivity.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const { Neo4jStorage } = await import('../Neo4jStorage.js');
    const storage = new Neo4jStorage({
      type: 'neo4j',
      uri: 'bolt://localhost:7687',
      username: 'neo4j',
      password: 'secret',
    });

    await expect(storage.initialize('/project')).rejects.toMatchObject({
      name: 'StorageError',
      code: 'NEO4J_INIT_FAILED',
    });
  });
});
