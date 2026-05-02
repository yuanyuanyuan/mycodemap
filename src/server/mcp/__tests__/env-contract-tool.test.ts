// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] Tests for the native codemap_env_contract MCP tool — real contract JSON, not cli_redirect.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PassThrough } from 'node:stream';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { MemoryStorage } from '../../../infrastructure/storage/adapters/MemoryStorage.js';

// Mock process.cwd() to return our temp directory
let mockCwd = '/fixture';

vi.mock('node:process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:process')>();
  return {
    ...actual,
    cwd: () => mockCwd,
  };
});

// Import after mock setup
const { createCodeMapMcpServer } = await import('../server.js');

async function createConnectedClient(rootDir?: string) {
  const storage = new MemoryStorage();
  await storage.initialize(rootDir ?? '/fixture');

  const server = createCodeMapMcpServer(storage);
  const clientToServer = new PassThrough();
  const serverToClient = new PassThrough();

  await server.connect(new StdioServerTransport(clientToServer, serverToClient));

  const client = new Client({
    name: 'mcp-env-contract-test',
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

function createTempProject(): string {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'mcp-env-contract-'));
  writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
    name: 'test-project',
    scripts: { test: 'vitest run', build: 'tsc' },
  }, null, 2));
  mkdirSync(path.join(tmpDir, '.githooks'), { recursive: true });
  writeFileSync(path.join(tmpDir, '.githooks', 'commit-msg'), `#!/bin/sh
VALID_TAGS="BUGFIX FEATURE REFACTOR CONFIG DOCS DELETE"
# Format: [TAG] scope: message
`);
  writeFileSync(path.join(tmpDir, 'AGENTS.md'), `# AGENTS.md
Use codemap CLI for code search: query --symbol, analyze -i read, impact -f.
`);
  mkdirSync(path.join(tmpDir, 'docs', 'rules'), { recursive: true });
  writeFileSync(path.join(tmpDir, 'docs', 'rules', 'testing.md'), `# Testing
Run tests with \`npx vitest run\`.
Real scenario verification required.
`);
  return tmpDir;
}

describe('Native codemap_env_contract MCP tool', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempProject();
    mockCwd = tmpDir;
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    mockCwd = '/fixture';
  });

  it('returns contract items as structured content, not cli_redirect', async () => {
    const connection = await createConnectedClient(tmpDir);

    const result = await connection.client.callTool({
      name: 'codemap_env_contract',
      arguments: { agentType: 'worker' },
    });

    const structured = result.structuredContent as Record<string, unknown>;
    expect(structured.status).not.toBe('cli_redirect');
    expect(structured.schemaVersion).toBe('env-contract.v1');
    expect(Array.isArray(structured.items)).toBe(true);

    const items = structured.items as Array<{ category: string }>;
    const categories = items.map(i => i.category);
    expect(categories).not.toContain('retrieval'); // worker should not have retrieval

    await connection.cleanup();
  });

  it('returns all categories for default agent type', async () => {
    const connection = await createConnectedClient(tmpDir);

    const result = await connection.client.callTool({
      name: 'codemap_env_contract',
      arguments: {},
    });

    const structured = result.structuredContent as Record<string, unknown>;
    expect(structured.agentType).toBe('default');
    const items = structured.items as Array<{ category: string }>;
    const categories = new Set(items.map(i => i.category));
    expect(categories.has('execution')).toBe(true);
    expect(categories.has('commit')).toBe(true);

    await connection.cleanup();
  });

  it('filters by category when specified', async () => {
    const connection = await createConnectedClient(tmpDir);

    const result = await connection.client.callTool({
      name: 'codemap_env_contract',
      arguments: { category: 'commit' },
    });

    const structured = result.structuredContent as Record<string, unknown>;
    const items = structured.items as Array<{ category: string }>;
    for (const item of items) {
      expect(item.category).toBe('commit');
    }

    await connection.cleanup();
  });

  it('check mode returns diagnostics', async () => {
    const connection = await createConnectedClient(tmpDir);

    const result = await connection.client.callTool({
      name: 'codemap_env_contract',
      arguments: { check: true },
    });

    const structured = result.structuredContent as Record<string, unknown>;
    expect(structured.status).toBeDefined();
    expect(Array.isArray(structured.diagnostics)).toBe(true);

    await connection.cleanup();
  });

  it('listTools includes codemap_env_contract as a native tool', async () => {
    const connection = await createConnectedClient();

    const tools = await connection.client.listTools();
    const toolNames = tools.tools.map(t => t.name);
    expect(toolNames).toContain('codemap_env_contract');

    // Should NOT have the hyphenated version
    expect(toolNames).not.toContain('codemap_env-contract');

    await connection.cleanup();
  });

  it('the contract registry still exposes env-contract via getFullContract()', async () => {
    const connection = await createConnectedClient();

    const tools = await connection.client.listTools();
    // The native tool should be present (not replaced by contract tool)
    const envContractTool = tools.tools.find(t => t.name === 'codemap_env_contract');
    expect(envContractTool).toBeDefined();
    expect(envContractTool?.description).toContain('Project Environment Contract');

    await connection.cleanup();
  });
});
