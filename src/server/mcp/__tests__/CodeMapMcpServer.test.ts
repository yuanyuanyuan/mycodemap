import { afterEach, describe, expect, it } from 'vitest';
import { PassThrough } from 'node:stream';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { CodeGraph } from '../../../interface/types/index.js';
import { MemoryStorage } from '../../../infrastructure/storage/adapters/MemoryStorage.js';
import { createCodeMapMcpServer } from '../server.js';

function createGraphFixture(options: {
  updatedAt?: Date;
  graphStatus?: 'complete' | 'partial';
  failedFileCount?: number;
  parseFailureFiles?: string[];
} = {}): CodeGraph {
  const updatedAt = options.updatedAt ?? new Date();

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
    dependencies: [
      {
        id: 'dep-call-1',
        sourceId: 'sym-caller',
        sourceEntityType: 'symbol',
        targetId: 'sym-target',
        targetEntityType: 'symbol',
        type: 'call',
        confidence: 'high',
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
        confidence: 'high',
        filePath: 'src/transitive.ts',
        line: 2,
      },
    ],
    graphStatus: options.graphStatus ?? 'complete',
    failedFileCount: options.failedFileCount ?? 0,
    parseFailureFiles: options.parseFailureFiles ?? [],
  };
}

async function createConnectedClient(options: {
  withGraph?: boolean;
  updatedAt?: Date;
  graphStatus?: 'complete' | 'partial';
  failedFileCount?: number;
  parseFailureFiles?: string[];
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

const openResources: Array<{
  client: Client;
  server: ReturnType<typeof createCodeMapMcpServer>;
  storage: MemoryStorage;
}> = [];

afterEach(async () => {
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

  it('returns symbol-level caller impact without a second tool-layer graph walk', async () => {
    const connection = await createConnectedClient();
    openResources.push(connection);

    const result = await connection.client.callTool({
      name: 'codemap_impact',
      arguments: { symbol: 'target', depth: 4, limit: 10 },
    });
    const structured = result.structuredContent as Record<string, unknown>;
    const affectedSymbols = structured.affected_symbols as Array<Record<string, unknown>>;

    expect(structured.status).toBe('ok');
    expect(structured.root_symbol).toEqual(expect.objectContaining({ id: 'sym-target' }));
    expect(affectedSymbols).toEqual([
      expect.objectContaining({
        depth: 1,
        symbol: expect.objectContaining({ id: 'sym-caller' }),
        path: ['sym-target', 'sym-caller'],
      }),
      expect.objectContaining({
        depth: 2,
        symbol: expect.objectContaining({ id: 'sym-transitive' }),
        path: ['sym-target', 'sym-caller', 'sym-transitive'],
      }),
    ]);
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

  it('returns SYMBOL_NOT_FOUND and AMBIGUOUS_EDGE explicitly', async () => {
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
      .toEqual(expect.objectContaining({ code: 'AMBIGUOUS_EDGE' }));
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
});
