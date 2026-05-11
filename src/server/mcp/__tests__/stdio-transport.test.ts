import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { PassThrough } from 'node:stream';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { startCodeMapMcpServer } from '../index.js';

interface RunningServer {
  rootDir: string;
  stdin: PassThrough;
  stdout: PassThrough;
  rawStdout: () => string;
  close: () => Promise<void>;
}

const runningServers: RunningServer[] = [];
const openClients: Client[] = [];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createRunningServer(): Promise<RunningServer> {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'codemap-mcp-stdio-'));
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  let rawOutput = '';

  stdout.on('data', (chunk) => {
    rawOutput += chunk.toString('utf8');
  });

  const started = await startCodeMapMcpServer({
    rootDir,
    stdin,
    stdout,
  });

  return {
    rootDir,
    stdin,
    stdout,
    rawStdout: () => rawOutput,
    close: async () => {
      await started.close();
      await rm(rootDir, { recursive: true, force: true });
    },
  };
}

afterEach(async () => {
  while (openClients.length > 0) {
    const client = openClients.pop();
    if (client) {
      await client.close();
    }
  }

  while (runningServers.length > 0) {
    const server = runningServers.pop();
    if (server) {
      await server.close();
    }
  }
});

describe('CodeMap stdio transport', () => {
  it('ignores blank lines before parsing and keeps valid MCP requests working', async () => {
    const server = await createRunningServer();
    runningServers.push(server);

    server.stdin.write('\n');
    server.stdin.write('   \r\n');

    const client = new Client({
      name: 'stdio-blank-line-test',
      version: '1.0.0',
    });
    openClients.push(client);

    await client.connect(new StdioServerTransport(server.stdout, server.stdin));
    const tools = await client.listTools();

    expect(tools.tools.length).toBeGreaterThan(0);

    const frames = server.rawStdout().trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
    expect(frames.some((frame) => frame.error?.code === ErrorCode.ParseError)).toBe(false);
  });

  it('returns an explicit parse-error frame for malformed non-blank payloads', async () => {
    const server = await createRunningServer();
    runningServers.push(server);

    server.stdin.write('not-json\n');
    await sleep(50);

    const frames = server.rawStdout().trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));

    expect(frames).toHaveLength(1);
    expect(frames[0]).toEqual(expect.objectContaining({
      jsonrpc: '2.0',
      error: expect.objectContaining({
        code: ErrorCode.ParseError,
        message: 'Parse error',
      }),
    }));
  });
});
