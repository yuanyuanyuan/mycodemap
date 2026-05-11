import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { PassThrough } from 'node:stream';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { CodeGraph } from '../../../interface/types/index.js';
import { Dependency as DomainDependency } from '../../../domain/entities/Dependency.js';
import { MemoryStorage } from '../../../infrastructure/storage/adapters/MemoryStorage.js';
import { SQLiteStorage } from '../../../infrastructure/storage/adapters/SQLiteStorage.js';
import { createCodeMapMcpServer } from '../server.js';

function createGraphFixture(options: {
  updatedAt?: Date;
  graphStatus?: 'complete' | 'partial';
  failedFileCount?: number;
  parseFailureFiles?: string[];
  communityShape?: 'default' | 'sparse';
} = {}): CodeGraph {
  const updatedAt = options.updatedAt ?? new Date();
  const communityShape = options.communityShape ?? 'default';

  return {
    project: {
      id: 'proj-1',
      name: 'fixture',
      rootPath: '/fixture',
      createdAt: updatedAt,
      updatedAt,
    },
    modules: [
      {
        id: 'mod-target',
        projectId: 'proj-1',
        path: 'src/target.ts',
        language: 'ts',
        stats: { lines: 10, codeLines: 8, commentLines: 1, blankLines: 1 },
      },
      {
        id: 'mod-caller',
        projectId: 'proj-1',
        path: 'src/caller.ts',
        language: 'ts',
        stats: { lines: 10, codeLines: 8, commentLines: 1, blankLines: 1 },
      },
      {
        id: 'mod-transitive',
        projectId: 'proj-1',
        path: 'src/transitive.ts',
        language: 'ts',
        stats: { lines: 10, codeLines: 8, commentLines: 1, blankLines: 1 },
      },
      {
        id: 'mod-amb-a',
        projectId: 'proj-1',
        path: 'src/ambiguous-a.ts',
        language: 'ts',
        stats: { lines: 10, codeLines: 8, commentLines: 1, blankLines: 1 },
      },
      {
        id: 'mod-amb-b',
        projectId: 'proj-1',
        path: 'src/ambiguous-b.ts',
        language: 'ts',
        stats: { lines: 10, codeLines: 8, commentLines: 1, blankLines: 1 },
      },
    ],
    symbols: [
      {
        id: 'sym-target',
        moduleId: 'mod-target',
        name: 'target',
        kind: 'function',
        signature: 'target() => void',
        location: { file: 'src/target.ts', line: 1, column: 1 },
        visibility: 'public',
      },
      {
        id: 'sym-caller',
        moduleId: 'mod-caller',
        name: 'caller',
        kind: 'function',
        signature: 'caller() => void',
        location: { file: 'src/caller.ts', line: 1, column: 1 },
        visibility: 'public',
      },
      {
        id: 'sym-transitive',
        moduleId: 'mod-transitive',
        name: 'transitiveCaller',
        kind: 'function',
        signature: 'transitiveCaller() => void',
        location: { file: 'src/transitive.ts', line: 1, column: 1 },
        visibility: 'public',
      },
      {
        id: 'sym-amb-a',
        moduleId: 'mod-amb-a',
        name: 'duplicate',
        kind: 'function',
        signature: 'duplicate() => void',
        location: { file: 'src/ambiguous-a.ts', line: 1, column: 1 },
        visibility: 'public',
      },
      {
        id: 'sym-amb-b',
        moduleId: 'mod-amb-b',
        name: 'duplicate',
        kind: 'function',
        signature: 'duplicate() => void',
        location: { file: 'src/ambiguous-b.ts', line: 1, column: 1 },
        visibility: 'public',
      },
    ],
    dependencies: communityShape === 'sparse'
      ? [
        {
          id: 'dep-call-1',
          sourceId: 'sym-caller',
          sourceEntityType: 'symbol',
          targetId: 'sym-target',
          targetEntityType: 'symbol',
          type: 'call',
          confidence: 'EXTRACTED',
          filePath: 'src/caller.ts',
          line: 2,
        },
      ]
      : [
        {
          id: 'dep-call-1',
          sourceId: 'sym-caller',
          sourceEntityType: 'symbol',
          targetId: 'sym-target',
          targetEntityType: 'symbol',
          type: 'call',
          confidence: 'EXTRACTED',
          filePath: 'src/caller.ts',
          line: 2,
        },
        {
          id: 'dep-call-2',
          sourceId: 'sym-transitive',
          sourceEntityType: 'symbol',
          targetId: 'sym-caller',
          targetEntityType: 'symbol',
          type: 'call',
          confidence: 'EXTRACTED',
          filePath: 'src/transitive.ts',
          line: 2,
        },
      ],
    graphStatus: options.graphStatus ?? 'complete',
    failedFileCount: options.failedFileCount ?? 0,
    parseFailureFiles: options.parseFailureFiles ?? [],
  };
}

function createCanonicalDependencyId(
  graph: CodeGraph,
  dependency: CodeGraph['dependencies'][number]
): string {
  const modulesById = new Map(graph.modules.map(module => [
    module.id,
    DomainDependency.createModuleReference(module.path),
  ] as const));
  const symbolsById = new Map(graph.symbols.map(symbol => [
    symbol.id,
    DomainDependency.createSymbolReference(
      modulesById.get(symbol.moduleId) ?? symbol.location.file,
      symbol.name,
      symbol.location.line,
      symbol.location.column
    ),
  ] as const));
  const sourceEntityType = dependency.sourceEntityType ?? 'module';
  const targetEntityType = dependency.targetEntityType ?? 'module';

  return DomainDependency.createCanonicalId(
    sourceEntityType === 'symbol'
      ? (symbolsById.get(dependency.sourceId) ?? dependency.sourceId)
      : (modulesById.get(dependency.sourceId) ?? dependency.sourceId),
    targetEntityType === 'symbol'
      ? (symbolsById.get(dependency.targetId) ?? dependency.targetId)
      : (modulesById.get(dependency.targetId) ?? dependency.targetId),
    dependency.type,
    sourceEntityType,
    targetEntityType,
    dependency.filePath
  );
}

async function createConnectedClient(options: {
  withGraph?: boolean;
  updatedAt?: Date;
  graphStatus?: 'complete' | 'partial';
  failedFileCount?: number;
  parseFailureFiles?: string[];
  communityShape?: 'default' | 'sparse';
} = {}) {
  const storage = new MemoryStorage();
  await storage.initialize('/fixture');
  if (options.withGraph ?? true) {
    await storage.saveCodeGraph(createGraphFixture(options));
  }

  const server = createCodeMapMcpServer(storage);
  const clientToServer = new PassThrough();
  const serverToClient = new PassThrough();
  let rawStdout = '';
  serverToClient.on('data', chunk => {
    rawStdout += chunk.toString('utf8');
  });

  await server.connect(new StdioServerTransport(clientToServer, serverToClient));

  const client = new Client({
    name: 'mcp-test-client',
    version: '1.0.0',
  });
  await client.connect(new StdioServerTransport(serverToClient, clientToServer));

  return {
    client,
    server,
    storage,
    getRawStdout: () => rawStdout,
  };
}

async function createSQLiteInspector(rootDir: string, databasePath = '.codemap/governance.sqlite') {
  const sqliteModule = await import('better-sqlite3');
  mkdirSync(path.dirname(path.join(rootDir, databasePath)), { recursive: true });
  return new sqliteModule.default(path.join(rootDir, databasePath)) as {
    close: () => void;
    prepare: (sql: string) => {
      run: (...params: unknown[]) => unknown;
    };
  };
}

const openResources: Array<{
  client: Client;
  server: ReturnType<typeof createCodeMapMcpServer>;
  storage: MemoryStorage | SQLiteStorage;
}> = [];
const tempRoots: string[] = [];

afterEach(async () => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) {
      rmSync(root, { recursive: true, force: true });
    }
  }

  while (openResources.length > 0) {
    const resource = openResources.pop();
    if (!resource) {
      continue;
    }

    await resource.client.close();
    await resource.server.close();
    await resource.storage.close();
  }
});

describe('CodeMap experimental MCP server', () => {
  it('lists the expected experimental tools and keeps stdout protocol-clean', async () => {
    const connection = await createConnectedClient();
    openResources.push(connection);

    const tools = await connection.client.listTools();
    const toolNames = tools.tools.map(tool => tool.name);
    expect(toolNames).toEqual(expect.arrayContaining([
      'codemap_query',
      'codemap_env_contract',
      'codemap_impact',
      'codemap_communities',
      'codemap_context',
      'codemap_analyze',
      'codemap_deps',
      'codemap_doctor',
      'codemap_benchmark',
      'codemap_init',
      'codemap_preview',
      'codemap_env_contract_contract',
    ]));
    expect(toolNames).not.toContain('codemap_query_contract');

    await connection.client.callTool({
      name: 'codemap_query',
      arguments: { search: 'resolveDataPath', limit: 1 },
    });

    const stdoutFrames = connection.getRawStdout().trim().split('\n').filter(Boolean);
    expect(stdoutFrames.length).toBeGreaterThan(0);
    for (const frame of stdoutFrames) {
      expect(() => JSON.parse(frame)).not.toThrow();
    }
  });

  it('returns contract-backed direct execution for codemap_query', async () => {
    const connection = await createConnectedClient();
    openResources.push(connection);

    const result = await connection.client.callTool({
      name: 'codemap_query',
      arguments: { search: 'resolveDataPath', limit: 5 },
    });
    const structured = result.structuredContent as Record<string, unknown>;
    const directResult = structured.result as Record<string, unknown>;
    const items = directResult.results as Array<Record<string, unknown>>;

    expect(structured.status).toBe('ok');
    expect((structured.diagnostics as Record<string, unknown>).tool).toBe('query');
    expect(directResult).toEqual(expect.objectContaining({
      type: 'search',
      query: 'resolveDataPath',
    }));
    expect(items.length).toBeGreaterThan(0);
  });

  it('returns layered shared impact truth without a second tool-layer graph walk', async () => {
    const connection = await createConnectedClient();
    openResources.push(connection);

    const result = await connection.client.callTool({
      name: 'codemap_impact',
      arguments: { symbol: 'target', depth: 4, limit: 10 },
    });
    const structured = result.structuredContent as Record<string, unknown>;
    const direct = structured.direct as Array<Record<string, unknown>>;
    const transitiveLayers = structured.transitive_layers as Array<Record<string, unknown>>;

    expect(structured.status).toBe('ok');
    expect(structured.entrypoint).toEqual(expect.objectContaining({
      kind: 'symbol',
      id: 'sym-target',
      file_path: 'src/target.ts',
    }));
    expect(structured.summary).toEqual(expect.objectContaining({
      requested_depth: 4,
      direct_count: 1,
      transitive_count: 1,
      total_count: 2,
    }));
    expect(direct).toEqual([
      expect.objectContaining({
        id: 'sym-caller',
        kind: 'symbol',
        name: 'caller',
        file_path: 'src/caller.ts',
        depth: 1,
        path: ['sym-target', 'sym-caller'],
      }),
    ]);
    expect(transitiveLayers).toEqual([
      expect.objectContaining({
        depth: 2,
        nodes: [expect.objectContaining({
          id: 'sym-transitive',
          depth: 2,
          path: ['sym-target', 'sym-caller', 'sym-transitive'],
        })],
      }),
    ]);
    expect(structured.graph_status).toBe('complete');
  });

  it('returns interpretable community summaries through the native MCP tool', async () => {
    const connection = await createConnectedClient();
    openResources.push(connection);

    const result = await connection.client.callTool({
      name: 'codemap_communities',
      arguments: {},
    });
    const structured = result.structuredContent as Record<string, unknown>;
    const communities = structured.communities as Array<Record<string, unknown>>;

    expect(result.isError).toBe(false);
    expect(structured.status).toBe('ok');
    expect(structured.summary).toEqual(expect.objectContaining({
      total_modules: 5,
      community_count: 3,
    }));
    expect(communities[0]).toEqual(expect.objectContaining({
      label: 'community-1',
      top_paths: ['src/caller.ts', 'src/target.ts', 'src/transitive.ts'],
      dominant_edge_kinds: ['call'],
    }));
    expect(structured.topology).toEqual(expect.objectContaining({
      deduped_dependency_count: 2,
      duplicate_dependency_count: 0,
      hubs: expect.arrayContaining([
        expect.objectContaining({
          module_id: 'mod-caller',
          module_path: 'src/caller.ts',
          connected_module_count: 2,
          dominant_edge_kinds: ['call'],
        }),
      ]),
    }));
    expect(communities).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'src',
        dominant_edge_kinds: [],
      }),
    ]));
  });

  it('returns GRAPH_NOT_FOUND when the symbol graph has not been generated', async () => {
    const connection = await createConnectedClient({ withGraph: false });
    openResources.push(connection);

    const result = await connection.client.callTool({
      name: 'codemap_impact',
      arguments: { symbol: 'target' },
    });
    const structured = result.structuredContent as Record<string, unknown>;

    expect(result.isError).toBe(true);
    expect(structured.status).toBe('unavailable');
    expect(structured.graph_status).toBe('missing');
    expect(structured.error).toEqual(expect.objectContaining({
      code: 'GRAPH_NOT_FOUND',
    }));
  });

  it('returns SYMBOL_NOT_FOUND and AMBIGUOUS_ENTRYPOINT explicitly', async () => {
    const connection = await createConnectedClient();
    openResources.push(connection);

    const notFoundResult = await connection.client.callTool({
      name: 'codemap_impact',
      arguments: { symbol: 'missingSymbol' },
    });
    const ambiguousResult = await connection.client.callTool({
      name: 'codemap_impact',
      arguments: { symbol: 'duplicate' },
    });

    expect((notFoundResult.structuredContent as Record<string, unknown>).error)
      .toEqual(expect.objectContaining({ code: 'SYMBOL_NOT_FOUND' }));
    expect((ambiguousResult.structuredContent as Record<string, unknown>).error)
      .toEqual(expect.objectContaining({ code: 'AMBIGUOUS_ENTRYPOINT' }));
  });

  it('returns structured direct-execution failures for the Phase 61 family', async () => {
    const connection = await createConnectedClient();
    openResources.push(connection);

    const result = await connection.client.callTool({
      name: 'codemap_query',
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toEqual(expect.objectContaining({
      status: 'error',
      error: expect.objectContaining({ code: 'MISSING_QUERY_TYPE' }),
      diagnostics: expect.objectContaining({ tool: 'query' }),
    }));
  });

  it('returns routing context through the native codemap_context tool', async () => {
    const connection = await createConnectedClient();
    openResources.push(connection);

    const result = await connection.client.callTool({
      name: 'codemap_context',
      arguments: {
        task: 'review',
        detailLevel: 'minimal',
        allowedTools: ['codemap_query', 'codemap_impact', 'codemap_analyze'],
      },
    });
    const structured = result.structuredContent as Record<string, unknown>;

    expect(result.isError).toBe(false);
    expect(structured.status).toBe('ok');
    expect(structured.task).toBe('review');
    expect(structured.detailLevel).toBe('minimal');
    expect(structured.graphStats).toEqual(expect.objectContaining({
      modules: 5,
      symbols: 5,
      edges: 2,
    }));
    expect(structured.nextToolSuggestions).toEqual([
      expect.objectContaining({ tool: 'codemap_query' }),
      expect.objectContaining({ tool: 'codemap_impact' }),
      expect.objectContaining({ tool: 'codemap_analyze' }),
    ]);
  });

  it('surfaces degraded routing truth when codemap_context runs without graph data', async () => {
    const connection = await createConnectedClient({ withGraph: false });
    openResources.push(connection);

    const standard = await connection.client.callTool({
      name: 'codemap_context',
      arguments: { task: 'debug', detailLevel: 'standard' },
    });
    const minimal = await connection.client.callTool({
      name: 'codemap_context',
      arguments: { task: 'debug', detailLevel: 'minimal' },
    });
    const structured = standard.structuredContent as Record<string, unknown>;
    const suggestions = structured.nextToolSuggestions as Array<Record<string, unknown>>;

    expect(standard.isError).toBe(false);
    expect(structured.confidence).toBe('reduced');
    expect(structured.graph_status).toBe('missing');
    expect(structured.warnings).toEqual(expect.arrayContaining([
      'Graph truth missing; run mycodemap generate --symbol-level before relying on impact-heavy routing.',
    ]));
    expect(suggestions[0]).toEqual(expect.objectContaining({ tool: 'codemap_doctor' }));
    expect(JSON.stringify(minimal.structuredContent).length).toBeLessThan(JSON.stringify(standard.structuredContent).length);
  });

  it('returns INVALID_TASK when codemap_context receives an unsupported task', async () => {
    const connection = await createConnectedClient();
    openResources.push(connection);

    const result = await connection.client.callTool({
      name: 'codemap_context',
      arguments: { task: 'triage' },
    });
    const structured = result.structuredContent as Record<string, unknown>;

    expect(result.isError).toBe(true);
    expect(structured.status).toBe('invalid_input');
    expect(structured.error).toEqual(expect.objectContaining({
      code: 'INVALID_TASK',
    }));
  });

  it('surfaces stale/partial truth and rejects broken tool filters through MCP transport', async () => {
    const connection = await createConnectedClient({
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      graphStatus: 'partial',
      failedFileCount: 1,
      parseFailureFiles: ['src/stale.ts'],
    });
    openResources.push(connection);

    const staleResult = await connection.client.callTool({
      name: 'codemap_context',
      arguments: { task: 'default', detailLevel: 'standard' },
    });
    const staleStructured = staleResult.structuredContent as Record<string, unknown>;
    expect(staleStructured.warnings).toEqual(expect.arrayContaining([
      'Graph truth is partial; parse failures may hide affected files or symbols.',
      'Graph truth is stale relative to the current workspace; refresh before relying on precise routing.',
    ]));

    const brokenFilter = await connection.client.callTool({
      name: 'codemap_context',
      arguments: { task: 'review', allowedTools: ['codemap_query'] },
    });
    expect(brokenFilter.isError).toBe(true);
    expect(brokenFilter.structuredContent).toEqual(expect.objectContaining({
      status: 'invalid_input',
      error: expect.objectContaining({ code: 'FILTER_CONFLICT' }),
    }));
  });

  it('keeps codemap_query stable and degrades codemap_impact explicitly on partial graph truth', async () => {
    const connection = await createConnectedClient({
      graphStatus: 'partial',
      failedFileCount: 1,
      parseFailureFiles: ['src/stale.ts'],
    });
    openResources.push(connection);

    const queryResult = await connection.client.callTool({
      name: 'codemap_query',
      arguments: { search: 'target', limit: 5 },
    });
    const impactResult = await connection.client.callTool({
      name: 'codemap_impact',
      arguments: { symbol: 'target', depth: 3, limit: 10 },
    });

    expect(queryResult.structuredContent).toEqual(expect.objectContaining({
      status: 'ok',
      diagnostics: expect.objectContaining({ tool: 'query' }),
      result: expect.objectContaining({
        type: 'search',
        query: 'target',
      }),
    }));
    expect(impactResult.structuredContent).toEqual(expect.objectContaining({
      status: 'ok',
      confidence: 'reduced',
      graph_status: 'partial',
      failed_file_count: 1,
      parse_failure_files: ['src/stale.ts'],
      entrypoint: expect.objectContaining({ id: 'sym-target' }),
      direct: expect.arrayContaining([
        expect.objectContaining({
          id: 'sym-caller',
        }),
      ]),
      warnings: expect.arrayContaining([
        expect.objectContaining({ code: 'GRAPH_PARTIAL' }),
      ]),
    }));
  });

  it('keeps degraded low-signal warnings visible on codemap_communities', async () => {
    const connection = await createConnectedClient({
      graphStatus: 'partial',
      failedFileCount: 1,
      parseFailureFiles: ['src/stale.ts'],
      communityShape: 'sparse',
    });
    openResources.push(connection);

    const result = await connection.client.callTool({
      name: 'codemap_communities',
      arguments: {},
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toEqual(expect.objectContaining({
      status: 'ok',
      confidence: 'reduced',
      graph_status: 'partial',
      topology: expect.objectContaining({
        deduped_dependency_count: 1,
      }),
      warnings: expect.arrayContaining([
        expect.objectContaining({ code: 'GRAPH_PARTIAL' }),
        expect.objectContaining({ code: 'LOW_SIGNAL_SPARSE_GRAPH' }),
        expect.objectContaining({ code: 'LOW_SIGNAL_SINGLETON_HEAVY' }),
      ]),
    }));
  });

  it('does not return a false success envelope when persisted SQLite truth is stale', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'codemap-mcp-phase63-'));
    tempRoots.push(rootDir);
    const databasePath = '.codemap/governance.sqlite';
    const storage = new SQLiteStorage({ type: 'sqlite', databasePath });
    const graph = createGraphFixture();
    const transitiveCallId = createCanonicalDependencyId(graph, graph.dependencies[1]!);

    await storage.initialize(rootDir);
    await storage.saveCodeGraph(graph);
    await storage.close();

    const inspector = await createSQLiteInspector(rootDir, databasePath);
    inspector.prepare('DELETE FROM graph_edges WHERE dependency_id = ?').run(transitiveCallId);
    inspector.close();

    const staleStorage = new SQLiteStorage({ type: 'sqlite', databasePath });
    await expect(staleStorage.initialize(rootDir)).rejects.toMatchObject({
      code: 'SQLITE_INIT_FAILED',
      cause: expect.objectContaining({
        code: 'GRAPH_SCHEMA_REBUILD_REQUIRED',
      }),
    });
  });
});
