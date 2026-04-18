// [META] since:2026-04-19 | owner:cli-team | stable:false
// [WHY] Expose the experimental local-only MCP stdio surface without polluting stdout during server startup

import { cwd } from 'node:process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Command } from 'commander';
import { startCodeMapMcpServer } from '../../server/mcp/index.js';

export const DEFAULT_MCP_SERVER_NAME = 'mycodemap-experimental';

interface McpConfigShape {
  mcpServers?: Record<string, unknown>;
  [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createDefaultConfig(): McpConfigShape {
  return {
    mcpServers: {},
  };
}

function createExperimentalServerEntry(rootDir: string) {
  return {
    command: 'node',
    args: ['dist/cli/index.js', 'mcp', 'start'],
    cwd: rootDir,
    env: {
      MYCODEMAP_RUNTIME_LOG_ENABLED: 'false',
    },
  };
}

export function isMcpStartInvocation(argv: string[]): boolean {
  return argv[0] === 'mcp' && argv[1] === 'start';
}

export async function installMcpServer(rootDir: string = cwd()): Promise<{
  serverName: string;
  configPath: string;
  updated: boolean;
}> {
  const configPath = path.join(rootDir, '.mcp.json');
  const nextEntry = createExperimentalServerEntry(rootDir);
  let existingConfig: McpConfigShape = createDefaultConfig();

  try {
    const rawConfig = await readFile(configPath, 'utf8');
    const parsedConfig = JSON.parse(rawConfig) as unknown;
    if (!isRecord(parsedConfig)) {
      throw new Error('`.mcp.json` 必须是 JSON 对象');
    }
    existingConfig = {
      ...parsedConfig,
      mcpServers: isRecord(parsedConfig.mcpServers)
        ? { ...parsedConfig.mcpServers }
        : {},
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`无法解析 ${configPath}: ${error.message}`);
    }

    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== 'ENOENT') {
      throw error;
    }
  }

  const currentEntry = existingConfig.mcpServers?.[DEFAULT_MCP_SERVER_NAME];
  const updated = JSON.stringify(currentEntry) !== JSON.stringify(nextEntry);

  existingConfig.mcpServers = {
    ...(existingConfig.mcpServers ?? {}),
    [DEFAULT_MCP_SERVER_NAME]: nextEntry,
  };

  await writeFile(configPath, `${JSON.stringify(existingConfig, null, 2)}\n`, 'utf8');

  return {
    serverName: DEFAULT_MCP_SERVER_NAME,
    configPath,
    updated,
  };
}

export async function handleMcpStart(): Promise<void> {
  try {
    await startCodeMapMcpServer();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

export async function handleMcpInstall(): Promise<void> {
  try {
    const result = await installMcpServer();
    const statusText = result.updated ? 'installed' : 'already-installed';

    console.log([
      `Experimental MCP server ${statusText}: ${result.serverName}`,
      `Config: ${result.configPath}`,
      'Surface: local-only stdio, read-only, experimental',
      'Run `mycodemap generate --symbol-level` before invoking MCP tools.',
    ].join('\n'));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

export function createMcpCommand(): Command {
  const command = new Command('mcp');
  command.description('Experimental MCP integration (local-only, read-only, stdio first)');

  command
    .command('start')
    .description('Start the experimental local MCP stdio server')
    .action(handleMcpStart);

  command
    .command('install')
    .description('Install the experimental local MCP server into the current repo `.mcp.json`')
    .action(handleMcpInstall);

  return command;
}

export const mcpCommand = createMcpCommand();
