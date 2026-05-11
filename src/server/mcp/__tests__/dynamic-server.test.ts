import { afterEach, describe, expect, it } from 'vitest';
import { PassThrough } from 'node:stream';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MemoryStorage } from '../../../infrastructure/storage/adapters/MemoryStorage.js';
import { createCodeMapMcpServer } from '../server.js';

async function createConnectedClient() {
  const storage = new MemoryStorage();
  await storage.initialize('/fixture');

  const server = createCodeMapMcpServer(storage);
  const clientToServer = new PassThrough();
  const serverToClient = new PassThrough();

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
    cleanup: async () => {
      await client.close();
      await server.close();
      await storage.close();
    },
  };
}

describe('Dynamic MCP tool registration from CLI contract', () => {
  it('registers all contract commands as MCP tools alongside native tools', async () => {
    const connection = await createConnectedClient();

    const tools = await connection.client.listTools();
    const toolNames = tools.tools.map(t => t.name);

    // Native tools should still be present
    expect(toolNames).toContain('codemap_query');
    expect(toolNames).toContain('codemap_impact');
    expect(toolNames).toContain('codemap_env_contract');
    expect(toolNames).toContain('codemap_context');

    // Contract commands should be dynamically registered
    expect(toolNames).toContain('codemap_analyze');
    expect(toolNames).toContain('codemap_deps');

    // Query now reuses the contract-backed direct-execution path on the native name.
    expect(toolNames).not.toContain('codemap_query_contract');
    expect(toolNames).not.toContain('codemap_env-contract');

    await connection.cleanup();
  });

  it('contract tools have correct metadata and input schemas', async () => {
    const connection = await createConnectedClient();

    const tools = await connection.client.listTools();
    const analyzeTool = tools.tools.find(t => t.name === 'codemap_analyze');

    expect(analyzeTool).toBeDefined();
    expect(analyzeTool?.description).toContain('统一分析入口');

    // The input schema should reflect the contract flags
    const schema = analyzeTool?.inputSchema as Record<string, unknown>;
    expect(schema).toBeDefined();
    expect(schema.type).toBe('object');

    // The output schema should also be exposed for discovery
    const outputSchema = analyzeTool?.outputSchema as Record<string, unknown> | undefined;
    expect(outputSchema).toBeDefined();
    expect(outputSchema?.type).toBe('object');

    const contextTool = tools.tools.find(t => t.name === 'codemap_context');
    const contextSchema = contextTool?.inputSchema as Record<string, unknown>;
    const contextProperties = contextSchema.properties as Record<string, unknown>;
    expect(contextProperties.detailLevel).toBeDefined();
    expect(contextProperties.allowedTools).toBeDefined();

    await connection.cleanup();
  });

  it('calling analyze returns structured direct-execution failures instead of cli_redirect', async () => {
    const connection = await createConnectedClient();

    const result = await connection.client.callTool({
      name: 'codemap_analyze',
      arguments: { intent: 'refactor' },
    });

    const structured = result.structuredContent as Record<string, unknown>;
    expect(result.isError).toBe(true);
    expect(structured.status).toBe('error');
    expect((structured.diagnostics as Record<string, unknown>).tool).toBe('analyze');
    expect(structured.error).toEqual(
      expect.objectContaining({
        code: 'E0001',
      }),
    );

    const textContent = result.content[0] as { type: string; text: string };
    expect(textContent.type).toBe('text');
    expect(textContent.text).toContain('"status": "error"');

    await connection.cleanup();
  });

  it('calling deps uses direct execution instead of cli_redirect', async () => {
    const connection = await createConnectedClient();

    const result = await connection.client.callTool({
      name: 'codemap_deps',
      arguments: { module: 'src/index.ts', json: true },
    });

    const structured = result.structuredContent as Record<string, unknown>;
    // In CI environments without index files, we get INDEX_NOT_FOUND error
    if (structured.status === 'ok') {
      expect((structured.diagnostics as Record<string, unknown>).tool).toBe('deps');
      expect((structured.result as Record<string, unknown>).module).toEqual(
        expect.objectContaining({
          relativePath: 'src/index.ts',
        }),
      );

      const textContent = result.content[0] as { type: string; text: string };
      expect(textContent.text).toContain('"status": "ok"');
    } else {
      expect(structured.status).toBe('error');
      expect(structured.error).toEqual(
        expect.objectContaining({
          code: 'INDEX_NOT_FOUND',
        }),
      );
    }

    await connection.cleanup();
  });

  it('direct-execution family returns structured failures, not transport hints', async () => {
    const connection = await createConnectedClient();

    const result = await connection.client.callTool({
      name: 'codemap_query',
      arguments: {},
    });

    const structured = result.structuredContent as Record<string, unknown>;
    expect(result.isError).toBe(true);
    expect(structured.status).toBe('error');
    expect(structured.error).toEqual(
      expect.objectContaining({
        code: expect.stringMatching(/MISSING_QUERY_TYPE|INDEX_NOT_FOUND/),
      }),
    );
    expect((structured.diagnostics as Record<string, unknown>).tool).toBe('query');

    await connection.cleanup();
  });

  it('native tools still function correctly alongside contract tools', async () => {
    const connection = await createConnectedClient();

    // Verify native query tool still works (just test registration, not graph logic)
    const tools = await connection.client.listTools();
    const queryTool = tools.tools.find(t => t.name === 'codemap_query');
    expect(queryTool).toBeDefined();
    expect(queryTool?.description).toContain('查询代码地图中的符号、模块、依赖信息');

    // Verify native impact tool still works
    const impactTool = tools.tools.find(t => t.name === 'codemap_impact');
    expect(impactTool).toBeDefined();
    expect(impactTool?.description).toContain('Experimental');

    const contextTool = tools.tools.find(t => t.name === 'codemap_context');
    expect(contextTool).toBeDefined();
    expect(contextTool?.description).toContain('review/debug/default');

    await connection.cleanup();
  });

  it('codemap_context returns structured routing output for review/debug/default', async () => {
    const connection = await createConnectedClient();

    const cases = [
      {
        task: 'review' as const,
        allowedTools: ['codemap_query', 'codemap_deps', 'codemap_doctor'],
        expectError: true,
      },
      {
        task: 'debug' as const,
        allowedTools: ['codemap_query', 'codemap_deps', 'codemap_doctor'],
        expectError: false,
      },
      {
        task: 'default' as const,
        allowedTools: ['codemap_query', 'codemap_analyze', 'codemap_doctor'],
        expectError: false,
      },
    ];

    for (const { task, allowedTools, expectError } of cases) {
      const result = await connection.client.callTool({
        name: 'codemap_context',
        arguments: { task, detailLevel: 'standard', allowedTools },
      });

      const structured = result.structuredContent as Record<string, unknown>;
      if (expectError) {
        expect(result.isError).toBe(true);
        expect(structured.error).toEqual(expect.objectContaining({ code: 'FILTER_CONFLICT' }));
      } else {
        // In CI environments without index files, we get INDEX_NOT_FOUND error
        if (structured.status === 'ok') {
          expect(result.isError).toBe(false);
          expect(structured.task).toBe(task);
          expect(structured.detailLevel).toBe('standard');
          expect(structured.graphStats).toEqual(expect.objectContaining({
            modules: expect.any(Number),
            symbols: expect.any(Number),
            edges: expect.any(Number),
          }));
          expect(structured.riskSummary).toEqual(expect.objectContaining({
            level: expect.any(String),
            factors: expect.any(Array),
          }));
          expect(structured.nextToolSuggestions).toEqual(expect.any(Array));
        } else {
          expect(structured.status).toBe('error');
          expect(structured.error).toEqual(
            expect.objectContaining({
              code: 'INDEX_NOT_FOUND',
            }),
          );
        }
      }
    }

    await connection.cleanup();
  });

  it('contract tools survive restart and are discoverable on each new server instance', async () => {
    const connection1 = await createConnectedClient();
    const tools1 = await connection1.client.listTools();
    expect(tools1.tools.map(t => t.name)).toContain('codemap_analyze');
    await connection1.cleanup();

    const connection2 = await createConnectedClient();
    const tools2 = await connection2.client.listTools();
    expect(tools2.tools.map(t => t.name)).toContain('codemap_analyze');
    expect(tools2.tools.map(t => t.name)).toContain('codemap_deps');
    await connection2.cleanup();
  });
});
