import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';

const CLI_PATH = path.resolve(__dirname, '../../dist/cli/index.js');
const SQLITE_STORAGE_PATH = path.resolve(
  __dirname,
  '../../dist/infrastructure/storage/adapters/SQLiteStorage.js'
);

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

function runNodeScript(script: string, cwd: string, args: string[] = []): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script, ...args], {
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

function createTempProject(): string {
  return mkdtempSync(path.join(tmpdir(), 'codemap-phase63-e2e-'));
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

function seedFixtureRepo(rootDir: string): void {
  mkdirSync(path.join(rootDir, 'src'), { recursive: true });
  writeFileSync(
    path.join(rootDir, 'package.json'),
    JSON.stringify({ name: 'phase63-fixture', version: '1.0.0', type: 'module' }, null, 2),
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
    path.join(rootDir, 'src/helper.ts'),
    'export function helper(name: string): string { return `hello ${name}`; }\n',
    'utf8'
  );
  writeFileSync(
    path.join(rootDir, 'src/index.ts'),
    [
      "import { helper } from './helper';",
      '',
      'export function run(): string {',
      "  return helper('world');",
      '}',
      '',
    ].join('\n'),
    'utf8'
  );
}

describe('graph schema foundation e2e', () => {
  const tempRoots: string[] = [];

  beforeAll(() => {
    buildCliOnce();
  }, 120000);

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('proves generate writes both SQLite and codemap.json and preserves query success output', () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);
    seedFixtureRepo(rootDir);

    const generateResult = runCli(['generate', '--symbol-level'], rootDir);
    expect(generateResult.exitCode).toBe(0);
    expect(existsSync(path.join(rootDir, '.mycodemap', 'governance.sqlite'))).toBe(true);
    expect(existsSync(path.join(rootDir, '.mycodemap', 'codemap.json'))).toBe(true);

    const queryResult = runCli(['query', '--search', 'helper', '--json'], rootDir);
    expect(queryResult.exitCode).toBe(0);

    const parsed = JSON.parse(queryResult.stdout.trim()) as {
      type: string;
      query: string;
      results: Array<{ name?: string; path?: string }>;
    };
    expect(parsed).toEqual(expect.objectContaining({
      type: 'search',
      query: 'helper',
    }));
    expect(parsed.results.length).toBeGreaterThan(0);
    expect(
      parsed.results.some((result) => (
        result.name?.includes('helper')
        || result.path?.includes('helper')
      ))
    ).toBe(true);
  });

  it('proves stale projection reads fail closed with rebuild remediation in a real subprocess', () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);
    seedFixtureRepo(rootDir);

    const generateResult = runCli(['generate', '--symbol-level'], rootDir);
    expect(generateResult.exitCode).toBe(0);

    const databasePath = path.join(rootDir, '.mycodemap', 'governance.sqlite');
    const database = new Database(databasePath);
    const dependencyCountRow = database.prepare(
      'SELECT COUNT(*) AS count FROM dependencies'
    ).get() as { count?: number } | undefined;
    expect(dependencyCountRow?.count).toBeGreaterThan(0);
    const row = database.prepare('SELECT dependency_id FROM graph_edges ORDER BY dependency_id LIMIT 1').get() as
      | { dependency_id?: string }
      | undefined;
    expect(row?.dependency_id).toBeDefined();
    database.prepare('DELETE FROM graph_edges WHERE dependency_id = ?').run(row?.dependency_id);
    database.close();

    const script = `
      import { SQLiteStorage } from ${JSON.stringify(SQLITE_STORAGE_PATH)};

      const rootDir = process.argv[1];
      const storage = new SQLiteStorage({ type: 'sqlite', databasePath: '.mycodemap/governance.sqlite' });

      try {
        await storage.initialize(rootDir);
        await storage.loadCodeGraph();
        await storage.close();
        console.log('unexpected-success');
        process.exit(0);
      } catch (error) {
        const cause = error && typeof error === 'object' && 'cause' in error ? error.cause : undefined;
        const code = cause && typeof cause === 'object' && 'code' in cause
          ? cause.code
          : error && typeof error === 'object' && 'code' in error
            ? error.code
            : 'UNKNOWN';
        const message = cause && typeof cause === 'object' && 'message' in cause
          ? cause.message
          : error instanceof Error
            ? error.message
            : String(error);
        console.error(String(code));
        console.error(String(message));
        process.exit(1);
      }
    `;

    const staleRead = runNodeScript(script, rootDir, [rootDir]);
    expect(staleRead.exitCode).toBe(1);
    expect(staleRead.stderr).toContain('GRAPH_SCHEMA_REBUILD_REQUIRED');
    expect(staleRead.stderr).toMatch(/generate|rebuild/i);
    expect(readFileSync(path.join(rootDir, '.mycodemap', 'codemap.json'), 'utf8').length).toBeGreaterThan(0);
  });

  it('proves incremental refresh updates persisted truth with structured success output', () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);
    seedFixtureRepo(rootDir);

    const initialGenerate = runCli(['generate', '--symbol-level'], rootDir);
    expect(initialGenerate.exitCode).toBe(0);
    const beforeSnapshot = readFileSync(path.join(rootDir, '.mycodemap', 'codemap.json'), 'utf8');

    writeFileSync(
      path.join(rootDir, 'src/helper.ts'),
      'export function helper(name: string): string { return `hi ${name}`; }\n',
      'utf8'
    );

    const refreshResult = runCli([
      'generate',
      '--incremental',
      '--changed-files',
      'src/helper.ts',
      '--json',
      '--structured',
    ], rootDir);
    expect(refreshResult.exitCode).toBe(0);

    const parsed = JSON.parse(refreshResult.stdout.trim()) as {
      status: string;
      mode: string;
      refresh?: { status: string; counts: Record<string, number> };
    };
    expect(parsed.status).toBe('success');
    expect(parsed.mode).toBe('incremental');
    expect(parsed.refresh?.status).toBe('success');
    expect(parsed.refresh?.counts.changed).toBe(1);
    expect(parsed.refresh?.counts.recomputed).toBeGreaterThan(0);

    const afterSnapshot = readFileSync(path.join(rootDir, '.mycodemap', 'codemap.json'), 'utf8');
    expect(afterSnapshot).not.toBe(beforeSnapshot);

    const database = new Database(path.join(rootDir, '.mycodemap', 'governance.sqlite'));
    const refreshMetadata = database.prepare(
      'SELECT value FROM metadata WHERE key = ?'
    ).get('last_refresh_summary_json') as { value?: string } | undefined;
    database.close();
    expect(refreshMetadata?.value).toContain('"status":"success"');
  });

  it('proves incremental refresh can surface partial status without corrupting persisted truth', () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);
    seedFixtureRepo(rootDir);

    const initialGenerate = runCli(['generate', '--symbol-level'], rootDir);
    expect(initialGenerate.exitCode).toBe(0);

    writeFileSync(
      path.join(rootDir, 'src/helper.ts'),
      'export function helper(name: string): string { return `still here ${name}`; }\n',
      'utf8'
    );
    chmodSync(path.join(rootDir, 'src/helper.ts'), 0o000);

    const refreshResult = runCli([
      'generate',
      '--incremental',
      '--changed-files',
      'src/helper.ts',
      '--json',
      '--structured',
    ], rootDir);
    expect(refreshResult.exitCode).toBe(0);

    const parsed = JSON.parse(refreshResult.stdout.trim()) as {
      status: string;
      refresh?: { status: string; counts: Record<string, number>; diagnostics: Array<{ code: string }> };
    };
    expect(parsed.status).toBe('partial');
    expect(parsed.refresh?.status).toBe('partial');
    expect(parsed.refresh?.counts.failed).toBeGreaterThan(0);
    expect(parsed.refresh?.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INCREMENTAL_PARTIAL_SLICE_FAILURE' }),
    ]));

    const queryResult = runCli(['query', '--search', 'helper', '--json'], rootDir);
    expect(queryResult.exitCode).toBe(0);
  });

  it('proves unreliable incremental scope fails closed with remediation instead of silent full rebuild', () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);
    seedFixtureRepo(rootDir);

    const initialGenerate = runCli(['generate', '--symbol-level'], rootDir);
    expect(initialGenerate.exitCode).toBe(0);

    const refreshResult = runCli([
      'generate',
      '--incremental',
      '--changed-files',
      'src/missing.ts',
      '--json',
      '--structured',
    ], rootDir);
    expect(refreshResult.exitCode).toBe(1);

    const parsed = JSON.parse(refreshResult.stdout.trim()) as {
      status: string;
      refresh?: { diagnostics: Array<{ code: string; message: string }>; remediation?: string };
    };
    expect(parsed.status).toBe('failed');
    expect(parsed.refresh?.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INCREMENTAL_INVALIDATION_BOUNDARY_UNRESOLVED' }),
    ]));
    expect(parsed.refresh?.remediation).toMatch(/generate/i);
  });
});
