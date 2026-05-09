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

function createTempProject(): string {
  return mkdtempSync(path.join(tmpdir(), 'codemap-phase66-e2e-'));
}

function seedFixtureRepo(rootDir: string): void {
  mkdirSync(path.join(rootDir, 'src', 'auth'), { recursive: true });
  mkdirSync(path.join(rootDir, 'src', 'billing'), { recursive: true });
  mkdirSync(path.join(rootDir, 'src', 'shared'), { recursive: true });
  writeFileSync(
    path.join(rootDir, 'package.json'),
    JSON.stringify({ name: 'phase66-fixture', version: '1.0.0', type: 'module' }, null, 2),
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
    path.join(rootDir, 'src', 'shared', 'types.ts'),
    'export interface SessionContext { userId: string; role: string; }\n',
    'utf8'
  );
  writeFileSync(
    path.join(rootDir, 'src', 'auth', 'policy.ts'),
    [
      "import type { SessionContext } from '../shared/types';",
      '',
      'export function canAccess(context: SessionContext): boolean {',
      "  return context.role === 'admin';",
      '}',
      '',
    ].join('\n'),
    'utf8'
  );
  writeFileSync(
    path.join(rootDir, 'src', 'auth', 'service.ts'),
    [
      "import { canAccess } from './policy';",
      "import type { SessionContext } from '../shared/types';",
      '',
      'export function authorize(context: SessionContext): boolean {',
      '  return canAccess(context);',
      '}',
      '',
    ].join('\n'),
    'utf8'
  );
  writeFileSync(
    path.join(rootDir, 'src', 'billing', 'ledger.ts'),
    [
      'export interface LedgerEntry {',
      '  id: string;',
      '  amount: number;',
      '}',
      '',
    ].join('\n'),
    'utf8'
  );
  writeFileSync(
    path.join(rootDir, 'src', 'billing', 'invoice.ts'),
    [
      "import type { LedgerEntry } from './ledger';",
      '',
      'export function createInvoice(entries: LedgerEntry[]): number {',
      '  return entries.reduce((total, entry) => total + entry.amount, 0);',
      '}',
      '',
    ].join('\n'),
    'utf8'
  );
  writeFileSync(
    path.join(rootDir, 'src', 'isolated.ts'),
    'export const isolated = true;\n',
    'utf8'
  );
}

function upsertMetadata(database: Database.Database, key: string, value: string): void {
  database.prepare(`
    INSERT INTO metadata (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

function getModuleIds(database: Database.Database): Record<string, string> {
  const rows = database.prepare('SELECT id, path FROM modules').all() as Array<{ id: string; path: string }>;
  const resolve = (suffix: string): string => {
    const match = rows.find((row) => row.path === suffix || row.path.endsWith(`/${suffix}`));
    if (!match) {
      throw new Error(`module not found: ${suffix}`);
    }
    return match.id;
  };

  return {
    authService: resolve('src/auth/service.ts'),
    authPolicy: resolve('src/auth/policy.ts'),
    billingInvoice: resolve('src/billing/invoice.ts'),
    billingLedger: resolve('src/billing/ledger.ts'),
    sharedTypes: resolve('src/shared/types.ts'),
    isolated: resolve('src/isolated.ts'),
  };
}

function insertModuleDependency(
  database: Database.Database,
  id: string,
  sourceId: string,
  targetId: string,
  dependencyType: 'call' | 'inherit' | 'implement' | 'import' | 'type-ref',
  filePath: string,
  line: number
): void {
  database.prepare(`
    INSERT OR REPLACE INTO dependencies (
      id, source_id, source_entity_type, target_id, target_entity_type, dependency_type, file_path, line, confidence
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, sourceId, 'module', targetId, 'module', dependencyType, filePath, line, 'EXTRACTED');
  database.prepare(`
    INSERT OR REPLACE INTO graph_edges (
      dependency_id, source_id, source_entity_type, target_id, target_entity_type, dependency_type, confidence, file_path, line
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, sourceId, 'module', targetId, 'module', dependencyType, 'EXTRACTED', filePath, line);
}

function ensureHappyCommunityFixture(rootDir: string): void {
  const database = new Database(path.join(rootDir, '.mycodemap', 'governance.sqlite'));
  const modules = getModuleIds(database);
  database.prepare('DELETE FROM dependencies').run();
  database.prepare('DELETE FROM graph_edges').run();

  insertModuleDependency(database, 'phase66-auth-call', modules.authService, modules.authPolicy, 'call', path.join(rootDir, 'src/auth/service.ts'), 4);
  insertModuleDependency(database, 'phase66-auth-inherit', modules.authPolicy, modules.authService, 'inherit', path.join(rootDir, 'src/auth/policy.ts'), 3);
  insertModuleDependency(database, 'phase66-auth-type-ref', modules.authService, modules.sharedTypes, 'type-ref', path.join(rootDir, 'src/auth/service.ts'), 2);
  insertModuleDependency(database, 'phase66-billing-implement', modules.billingInvoice, modules.billingLedger, 'implement', path.join(rootDir, 'src/billing/invoice.ts'), 3);
  insertModuleDependency(database, 'phase66-billing-import', modules.billingLedger, modules.billingInvoice, 'import', path.join(rootDir, 'src/billing/ledger.ts'), 1);

  upsertMetadata(database, 'graph_status', 'complete');
  upsertMetadata(database, 'failed_file_count', '0');
  upsertMetadata(database, 'parse_failure_files_json', JSON.stringify([]));
  database.close();
}

function ensureSparseCommunityFixture(rootDir: string): void {
  const database = new Database(path.join(rootDir, '.mycodemap', 'governance.sqlite'));
  const modules = getModuleIds(database);
  database.prepare('DELETE FROM dependencies').run();
  database.prepare('DELETE FROM graph_edges').run();

  insertModuleDependency(database, 'phase66-sparse-type-ref', modules.authService, modules.sharedTypes, 'type-ref', path.join(rootDir, 'src/auth/service.ts'), 2);

  upsertMetadata(database, 'graph_status', 'complete');
  upsertMetadata(database, 'failed_file_count', '0');
  upsertMetadata(database, 'parse_failure_files_json', JSON.stringify([]));
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
    name: 'phase66-e2e-client',
    version: '1.0.0',
  });
  await client.connect(new StdioServerTransport(serverToClient, clientToServer));

  return {
    client,
    server,
    storage,
  };
}

describe('graph community detection e2e', () => {
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

  it('proves real SQLite + MCP transport return interpretable communities from persisted graph truth', async () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);
    seedFixtureRepo(rootDir);

    const generateResult = runCli(['generate', '--symbol-level'], rootDir);
    expect(generateResult.exitCode).toBe(0);

    ensureHappyCommunityFixture(rootDir);
    const connection = await createConnectedMcpClient(rootDir);
    openConnections.push(connection);

    const result = await connection.client.callTool({
      name: 'codemap_communities',
      arguments: {},
    });
    const structured = result.structuredContent as Record<string, unknown>;
    const communities = structured.communities as Array<Record<string, unknown>>;

    expect(result.isError).toBe(false);
    expect(structured).toEqual(expect.objectContaining({
      status: 'ok',
      summary: expect.objectContaining({
        total_modules: 6,
        total_edges: 3,
        community_count: 3,
      }),
    }));
    expect(communities).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'src/auth',
        top_paths: ['src/auth/policy.ts', 'src/auth/service.ts', 'src/shared/types.ts'],
        dominant_edge_kinds: ['call', 'inherit', 'type-ref'],
      }),
      expect.objectContaining({
        label: 'src/billing',
        top_paths: ['src/billing/invoice.ts', 'src/billing/ledger.ts'],
        dominant_edge_kinds: ['implement', 'import'],
      }),
    ]));
  });

  it('proves sparse real graphs degrade confidence instead of faking precise community boundaries', async () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);
    seedFixtureRepo(rootDir);

    const generateResult = runCli(['generate', '--symbol-level'], rootDir);
    expect(generateResult.exitCode).toBe(0);

    ensureSparseCommunityFixture(rootDir);
    const connection = await createConnectedMcpClient(rootDir);
    openConnections.push(connection);

    const result = await connection.client.callTool({
      name: 'codemap_communities',
      arguments: {},
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toEqual(expect.objectContaining({
      status: 'ok',
      confidence: 'reduced',
      warnings: expect.arrayContaining([
        expect.objectContaining({ code: 'LOW_SIGNAL_SPARSE_GRAPH' }),
        expect.objectContaining({ code: 'LOW_SIGNAL_SINGLETON_HEAVY' }),
      ]),
      communities: expect.arrayContaining([
        expect.objectContaining({
          top_paths: ['src/auth/service.ts', 'src/shared/types.ts'],
        }),
      ]),
    }));
  });
});
