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

    // Contract commands should be dynamically registered
    expect(toolNames).toContain('codemap_analyze');
    expect(toolNames).toContain('codemap_deps');

    // query contract conflicts with native codemap_query, so it should be skipped
    expect(toolNames).not.toContain('codemap_query_cli');

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

    await connection.cleanup();
  });

  it('calling a contract tool returns a cli_redirect response', async () => {
    const connection = await createConnectedClient();

    const result = await connection.client.callTool({
      name: 'codemap_analyze',
      arguments: { intent: 'find', keywords: ['SourceLocation'] },
    });

    const structured = result.structuredContent as Record<string, unknown>;
    expect(structured.status).toBe('cli_redirect');
    expect(structured.command).toBe('analyze');
    expect((structured.args as Record<string, unknown>).intent).toBe('find');

    const textContent = result.content[0] as { type: string; text: string };
    expect(textContent.type).toBe('text');
    expect(textContent.text).toContain('codemap analyze');

    await connection.cleanup();
  });

  it('calling deps contract tool works', async () => {
    const connection = await createConnectedClient();

    const result = await connection.client.callTool({
      name: 'codemap_deps',
      arguments: { module: 'src/index.ts', json: true },
    });

    const structured = result.structuredContent as Record<string, unknown>;
    expect(structured.status).toBe('cli_redirect');
    expect(structured.command).toBe('deps');

    const textContent = result.content[0] as { type: string; text: string };
    expect(textContent.text).toContain('codemap deps');

    await connection.cleanup();
  });

  it('native tools still function correctly alongside contract tools', async () => {
    const connection = await createConnectedClient();

    // Verify native query tool still works (just test registration, not graph logic)
    const tools = await connection.client.listTools();
    const queryTool = tools.tools.find(t => t.name === 'codemap_query');
    expect(queryTool).toBeDefined();
    expect(queryTool?.description).toContain('Experimental');

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
