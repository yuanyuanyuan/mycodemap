import { afterEach, describe, expect, it } from 'vitest';
import { PassThrough } from 'node:stream';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { CodeGraph } from '../../../interface/types/index.js';
import { MemoryStorage } from '../../../infrastructure/storage/adapters/MemoryStorage.js';
import { createCodeMapMcpServer } from '../server.js';

function createGraphFixture(): CodeGraph {
  return {
    project: {
      id: 'proj-1',
      name: 'fixture',
      rootPath: '/fixture',
      createdAt: new Date('2026-04-19T00:00:00.000Z'),
      updatedAt: new Date('2026-04-19T00:00:00.000Z'),
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
    graphStatus: 'complete',
    failedFileCount: 0,
    parseFailureFiles: [],
  };
}

async function createConnectedClient(withGraph = true) {
  const storage = new MemoryStorage();
  await storage.initialize('/fixture');
  if (withGraph) {
    await storage.saveCodeGraph(createGraphFixture());
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
    expect(tools.tools.map(tool => tool.name)).toEqual([
      'codemap_query',
      'codemap_impact',
    ]);

    await connection.client.callTool({
      name: 'codemap_query',
      arguments: { symbol: 'target' },
    });

    const stdoutFrames = connection.getRawStdout().trim().split('\n').filter(Boolean);
    expect(stdoutFrames.length).toBeGreaterThan(0);
    for (const frame of stdoutFrames) {
      expect(() => JSON.parse(frame)).not.toThrow();
    }
  });

  it('returns definition, callers and callees for codemap_query', async () => {
    const connection = await createConnectedClient();
    openResources.push(connection);

    const result = await connection.client.callTool({
      name: 'codemap_query',
      arguments: { symbol: 'target' },
    });
    const structured = result.structuredContent as Record<string, unknown>;

    expect(structured.status).toBe('ok');
    expect(structured.graph_status).toBe('complete');
    expect(structured.symbol).toEqual(expect.objectContaining({
      id: 'sym-target',
      file_path: 'src/target.ts',
    }));
    expect(structured.callers).toEqual([
      expect.objectContaining({ id: 'sym-caller' }),
    ]);
    expect(structured.callees).toEqual([]);
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
    const connection = await createConnectedClient(false);
    openResources.push(connection);

    const result = await connection.client.callTool({
      name: 'codemap_query',
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
      name: 'codemap_query',
      arguments: { symbol: 'missingSymbol' },
    });
    const ambiguousResult = await connection.client.callTool({
      name: 'codemap_query',
      arguments: { symbol: 'duplicate' },
    });

    expect((notFoundResult.structuredContent as Record<string, unknown>).error)
      .toEqual(expect.objectContaining({ code: 'SYMBOL_NOT_FOUND' }));
    expect((ambiguousResult.structuredContent as Record<string, unknown>).error)
      .toEqual(expect.objectContaining({ code: 'AMBIGUOUS_EDGE' }));
  });
});
