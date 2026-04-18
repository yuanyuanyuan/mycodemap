import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  DEFAULT_MCP_SERVER_NAME,
  handleMcpStart,
  installMcpServer,
  isMcpStartInvocation,
} from '../mcp.js';

const mockStartCodeMapMcpServer = vi.fn();

vi.mock('../../../server/mcp/index.js', () => ({
  startCodeMapMcpServer: (...args: unknown[]) => mockStartCodeMapMcpServer(...args),
}));

describe('mcp command helpers', () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await mkdtemp(path.join(tmpdir(), 'codemap-mcp-command-'));
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('detects stdio start invocation so CLI can bypass human startup output', () => {
    expect(isMcpStartInvocation(['mcp', 'start'])).toBe(true);
    expect(isMcpStartInvocation(['mcp', 'install'])).toBe(false);
    expect(isMcpStartInvocation(['generate'])).toBe(false);
  });

  it('installs the experimental server into the repo .mcp.json', async () => {
    const result = await installMcpServer(tempRoot);
    const writtenConfig = JSON.parse(
      await readFile(path.join(tempRoot, '.mcp.json'), 'utf8')
    ) as {
      mcpServers: Record<string, {
        command: string;
        args: string[];
        cwd: string;
        env: Record<string, string>;
      }>;
    };

    expect(result.serverName).toBe(DEFAULT_MCP_SERVER_NAME);
    expect(result.updated).toBe(true);
    expect(writtenConfig.mcpServers[DEFAULT_MCP_SERVER_NAME]).toEqual({
      command: 'node',
      args: ['dist/cli/index.js', 'mcp', 'start'],
      cwd: tempRoot,
      env: {
        MYCODEMAP_RUNTIME_LOG_ENABLED: 'false',
      },
    });
  });

  it('keeps install idempotent when the entry already exists', async () => {
    await installMcpServer(tempRoot);
    const secondInstall = await installMcpServer(tempRoot);

    expect(secondInstall.updated).toBe(false);
  });

  it('delegates mcp start to the stdio server runner', async () => {
    mockStartCodeMapMcpServer.mockResolvedValue({
      close: vi.fn(),
    });

    await handleMcpStart();

    expect(mockStartCodeMapMcpServer).toHaveBeenCalledTimes(1);
  });
});
