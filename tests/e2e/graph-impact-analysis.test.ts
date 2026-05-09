import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { PassThrough } from 'node:stream';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SQLiteStorage } from '../../src/infrastructure/storage/adapters/SQLiteStorage.js';
import { createCodeMapMcpServer } from '../../src/server/mcp/server.js';

const CLI_PATH = path.resolve(__dirname, '../../dist/cli/index.js');

function runCli(args: string[], cwd: string): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });

  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 1,
  };
}

function buildCliOnce(): void {
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: path.resolve(__dirname, '../..'),
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });

  if ((result.status ?? 1) !== 0) {
    throw new Error(`build failed\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
}

function parseTrailingJson(output: string): Record<string, unknown> {
  const start = output.lastIndexOf('\n{');
  const jsonText = (start >= 0 ? output.slice(start + 1) : output).trim();
  return JSON.parse(jsonText) as Record<string, unknown>;
}

function createTempProject(): string {
  return mkdtempSync(path.join(tmpdir(), 'codemap-phase65-e2e-'));
}

function seedFixtureRepo(rootDir: string): void {
  mkdirSync(path.join(rootDir, 'src'), { recursive: true });
  writeFileSync(
    path.join(rootDir, 'package.json'),
    JSON.stringify({ name: 'phase65-fixture', version: '1.0.0', type: 'module' }, null, 2),
    'utf8'
  );
  writeFileSync(
    path.join(rootDir, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
      },
      include: ['src/**/*.ts'],
    }, null, 2),
    'utf8'
  );
  writeFileSync(
    path.join(rootDir, 'src/target.ts'),
    [
      'export function target(value: string): string {',
      '  return value.toUpperCase();',
      '}',
      '',
    ].join('\n'),
    'utf8'
  );
  writeFileSync(
    path.join(rootDir, 'src/caller.ts'),
    [
      "import { target } from './target';",
      '',
      'export function caller(): string {',
      "  return target('hello');",
      '}',
      '',
    ].join('\n'),
    'utf8'
  );
  writeFileSync(
    path.join(rootDir, 'src/transitive.ts'),
    [
      "import { caller } from './caller';",
      '',
      'export function transitiveCaller(): string {',
      '  return caller();',
      '}',
      '',
    ].join('\n'),
    'utf8'
  );
  writeFileSync(
    path.join(rootDir, 'src/duplicate-a.ts'),
    'export function duplicate(): string { return \'a\'; }\n',
    'utf8'
  );
  writeFileSync(
    path.join(rootDir, 'src/duplicate-b.ts'),
    'export function duplicate(): string { return \'b\'; }\n',
    'utf8'
  );
}

function ensureSymbolImpactFixture(rootDir: string): void {
  const database = new Database(path.join(rootDir, '.mycodemap', 'governance.sqlite'));
  const modules = database.prepare('SELECT id, path FROM modules').all() as Array<{ id: string; path: string }>;
  const findModuleId = (suffix: string): string => {
    const match = modules.find((module) => module.path === suffix || module.path.endsWith(`/${suffix}`));
    if (!match) {
      throw new Error(`module not found for ${suffix}`);
    }
    return match.id;
  };

  const targetSymbol = database.prepare(`
    SELECT id
    FROM symbols
    WHERE name = ?
    ORDER BY id
    LIMIT 1
  `).get('target') as { id?: string } | undefined;
  if (!targetSymbol?.id) {
    throw new Error('target symbol not found');
  }

  const callerModuleId = findModuleId('src/caller.ts');
  const transitiveModuleId = findModuleId('src/transitive.ts');
  const callerSymbolId = 'phase65_sym_caller';
  const transitiveSymbolId = 'phase65_sym_transitive';

  database.prepare(`
    INSERT OR REPLACE INTO symbols (
      id, module_id, name, kind, signature, file_path, line, column_number, end_line, end_column, visibility
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    callerSymbolId,
    callerModuleId,
    'caller',
    'function',
    'caller() => string',
    path.join(rootDir, 'src/caller.ts'),
    2,
    1,
    4,
    1,
    'public'
  );
  database.prepare(`
    INSERT OR REPLACE INTO symbols (
      id, module_id, name, kind, signature, file_path, line, column_number, end_line, end_column, visibility
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    transitiveSymbolId,
    transitiveModuleId,
    'transitiveCaller',
    'function',
    'transitiveCaller() => string',
    path.join(rootDir, 'src/transitive.ts'),
    2,
    1,
    4,
    1,
    'public'
  );
  database.prepare(`
    INSERT OR REPLACE INTO dependencies (
      id, source_id, source_entity_type, target_id, target_entity_type, dependency_type, file_path, line, confidence
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'phase65-dep-call-1',
    callerSymbolId,
    'symbol',
    targetSymbol.id,
    'symbol',
    'call',
    path.join(rootDir, 'src/caller.ts'),
    3,
    'EXTRACTED'
  );
  database.prepare(`
    INSERT OR REPLACE INTO graph_edges (
      dependency_id, source_id, source_entity_type, target_id, target_entity_type, dependency_type, confidence, file_path, line
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'phase65-dep-call-1',
    callerSymbolId,
    'symbol',
    targetSymbol.id,
    'symbol',
    'call',
    'EXTRACTED',
    path.join(rootDir, 'src/caller.ts'),
    3
  );
  database.prepare(`
    INSERT OR REPLACE INTO dependencies (
      id, source_id, source_entity_type, target_id, target_entity_type, dependency_type, file_path, line, confidence
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'phase65-dep-call-2',
    transitiveSymbolId,
    'symbol',
    callerSymbolId,
    'symbol',
    'call',
    path.join(rootDir, 'src/transitive.ts'),
    3,
    'EXTRACTED'
  );
  database.prepare(`
    INSERT OR REPLACE INTO graph_edges (
      dependency_id, source_id, source_entity_type, target_id, target_entity_type, dependency_type, confidence, file_path, line
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'phase65-dep-call-2',
    transitiveSymbolId,
    'symbol',
    callerSymbolId,
    'symbol',
    'call',
    'EXTRACTED',
    path.join(rootDir, 'src/transitive.ts'),
    3
  );
  database.close();
}

async function createConnectedMcpClient(rootDir: string) {
  const storage = new SQLiteStorage({ type: 'sqlite', databasePath: '.mycodemap/governance.sqlite' });
  await storage.initialize(rootDir);
  const server = createCodeMapMcpServer(storage, rootDir);
  const clientToServer = new PassThrough();
  const serverToClient = new PassThrough();

  await server.connect(new StdioServerTransport(clientToServer, serverToClient));

  const client = new Client({
    name: 'phase65-e2e-client',
    version: '1.0.0',
  });
  await client.connect(new StdioServerTransport(serverToClient, clientToServer));

  return {
    client,
    server,
    storage,
  };
}

describe('graph impact analysis e2e', () => {
  const tempRoots: string[] = [];
  const openConnections: Array<Awaited<ReturnType<typeof createConnectedMcpClient>>> = [];

  beforeAll(() => {
    buildCliOnce();
  }, 120000);

  afterEach(async () => {
    while (openConnections.length > 0) {
      const connection = openConnections.pop();
      if (!connection) {
        continue;
      }
      await connection.client.close();
      await connection.server.close();
      await connection.storage.close();
    }

    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('proves built CLI file impact and MCP symbol impact share the same layered truth', async () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);
    seedFixtureRepo(rootDir);

    const generateResult = runCli(['generate', '--symbol-level'], rootDir);
    expect(generateResult.exitCode).toBe(0);

    const cliResult = runCli(['impact', '--file', 'src/target.ts', '--transitive', '--json'], rootDir);
    expect(cliResult.exitCode).toBe(0);
    const cliParsed = JSON.parse(cliResult.stdout.trim()) as Record<string, unknown>;
    expect(cliParsed).toEqual(expect.objectContaining({
      status: 'ok',
      entrypoint: expect.objectContaining({ kind: 'file', filePath: expect.stringContaining('src/target.ts') }),
      summary: expect.objectContaining({
        directCount: 1,
        transitiveCount: 1,
      }),
      direct: [expect.objectContaining({ filePath: expect.stringContaining('src/caller.ts'), depth: 1 })],
      transitiveLayers: [
        expect.objectContaining({
          depth: 2,
          nodes: [expect.objectContaining({ filePath: expect.stringContaining('src/transitive.ts'), depth: 2 })],
        }),
      ],
    }));

    ensureSymbolImpactFixture(rootDir);
    const connection = await createConnectedMcpClient(rootDir);
    openConnections.push(connection);

    const mcpResult = await connection.client.callTool({
      name: 'codemap_impact',
      arguments: { symbol: 'target', depth: 4, limit: 10 },
    });
    const structured = mcpResult.structuredContent as Record<string, unknown>;
    expect(mcpResult.isError).toBe(false);
    expect(structured).toEqual(expect.objectContaining({
      status: 'ok',
      entrypoint: expect.objectContaining({ kind: 'symbol', id: expect.any(String), file_path: expect.stringContaining('src/target.ts') }),
      summary: expect.objectContaining({
        direct_count: 1,
        transitive_count: 1,
      }),
      direct: [expect.objectContaining({ file_path: expect.stringContaining('src/caller.ts'), depth: 1 })],
      transitive_layers: [
        expect.objectContaining({
          depth: 2,
          nodes: [expect.objectContaining({ file_path: expect.stringContaining('src/transitive.ts'), depth: 2 })],
        }),
      ],
    }));
  });

  it('proves missing graph, missing file, and ambiguous symbol all return explicit structured failures', async () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);
    seedFixtureRepo(rootDir);

    const missingGraph = runCli(['impact', '--file', 'src/target.ts', '--json'], rootDir);
    expect(missingGraph.exitCode).toBe(1);
    expect(parseTrailingJson(missingGraph.stdout)).toEqual(expect.objectContaining({
      status: 'unavailable',
      error: expect.objectContaining({ code: 'GRAPH_NOT_FOUND' }),
    }));

    const generateResult = runCli(['generate', '--symbol-level'], rootDir);
    expect(generateResult.exitCode).toBe(0);

    const missingFile = runCli(['impact', '--file', 'src/missing.ts', '--json'], rootDir);
    expect(missingFile.exitCode).toBe(1);
    expect(JSON.parse(missingFile.stdout.trim())).toEqual(expect.objectContaining({
      status: 'not_found',
      error: expect.objectContaining({ code: 'FILE_NOT_FOUND' }),
    }));

    const connection = await createConnectedMcpClient(rootDir);
    openConnections.push(connection);

    const ambiguous = await connection.client.callTool({
      name: 'codemap_impact',
      arguments: { symbol: 'duplicate', depth: 2, limit: 10 },
    });
    expect(ambiguous.isError).toBe(true);
    expect(ambiguous.structuredContent).toEqual(expect.objectContaining({
      status: 'ambiguous',
      error: expect.objectContaining({ code: 'AMBIGUOUS_ENTRYPOINT' }),
      entrypoint: expect.objectContaining({
        candidates: expect.arrayContaining([
          expect.objectContaining({ file_path: expect.stringContaining('src/duplicate-a.ts') }),
          expect.objectContaining({ file_path: expect.stringContaining('src/duplicate-b.ts') }),
        ]),
      }),
    }));
  });

  it('proves partial graph warnings and traversal truncation reach shipped surfaces', async () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);
    seedFixtureRepo(rootDir);

    const generateResult = runCli(['generate', '--symbol-level'], rootDir);
    expect(generateResult.exitCode).toBe(0);

    const database = new Database(path.join(rootDir, '.mycodemap', 'governance.sqlite'));
    database.prepare(`
      INSERT INTO metadata (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run('graph_status', 'partial');
    database.prepare(`
      INSERT INTO metadata (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run('failed_file_count', '1');
    database.prepare(`
      INSERT INTO metadata (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run('parse_failure_files_json', JSON.stringify(['src/broken.ts']));
    database.close();

    const cliResult = runCli(['impact', '--file', 'src/target.ts', '--transitive', '--json'], rootDir);
    expect(cliResult.exitCode).toBe(0);
    expect(JSON.parse(cliResult.stdout.trim())).toEqual(expect.objectContaining({
      status: 'ok',
      confidence: 'reduced',
      warnings: expect.arrayContaining([
        expect.objectContaining({ code: 'GRAPH_PARTIAL' }),
      ]),
    }));

    ensureSymbolImpactFixture(rootDir);
    const connection = await createConnectedMcpClient(rootDir);
    openConnections.push(connection);

    const truncated = await connection.client.callTool({
      name: 'codemap_impact',
      arguments: { symbol: 'target', depth: 4, limit: 1 },
    });
    expect(truncated.isError).toBe(false);
    expect(truncated.structuredContent).toEqual(expect.objectContaining({
      status: 'ok',
      confidence: 'reduced',
      truncated: true,
      warnings: expect.arrayContaining([
        expect.objectContaining({ code: 'GRAPH_PARTIAL' }),
        expect.objectContaining({ code: 'TRAVERSAL_TRUNCATED' }),
      ]),
    }));
  });
});
