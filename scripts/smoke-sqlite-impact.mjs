import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const loadModule = async (relativePath) => import(pathToFileURL(path.join(repoRoot, relativePath)).href);
const { SQLiteStorage } = await loadModule('dist/infrastructure/storage/adapters/SQLiteStorage.js');
const { QueryHandler } = await loadModule('dist/server/handlers/QueryHandler.js');

function createImpactFixture() {
  return {
    project: {
      id: 'proj-smoke',
      name: 'sqlite-impact-smoke',
      rootPath: '/fixture',
      createdAt: new Date('2026-04-15T00:00:00Z'),
      updatedAt: new Date('2026-04-15T00:00:00Z'),
    },
    modules: [
      {
        id: 'core',
        projectId: 'proj-smoke',
        path: 'src/core.ts',
        language: 'ts',
        stats: { lines: 10, codeLines: 8, commentLines: 1, blankLines: 1 },
      },
      {
        id: 'service',
        projectId: 'proj-smoke',
        path: 'src/service.ts',
        language: 'ts',
        stats: { lines: 10, codeLines: 8, commentLines: 1, blankLines: 1 },
      },
      {
        id: 'api',
        projectId: 'proj-smoke',
        path: 'src/api.ts',
        language: 'ts',
        stats: { lines: 10, codeLines: 8, commentLines: 1, blankLines: 1 },
      },
    ],
    symbols: [],
    dependencies: [
      { id: 'dep-1', sourceId: 'service', targetId: 'core', type: 'import' },
      { id: 'dep-2', sourceId: 'api', targetId: 'service', type: 'import' },
    ],
  };
}

const rootDir = mkdtempSync(path.join(tmpdir(), 'codemap-sqlite-impact-smoke-'));
const storage = new SQLiteStorage({ type: 'sqlite', databasePath: '.codemap/governance.sqlite' });

try {
  await storage.initialize(rootDir);
  await storage.saveCodeGraph(createImpactFixture());
  const handler = new QueryHandler(storage);
  const result = await handler.analyzeImpact({ moduleId: 'core', depth: 3 });
  const stats = storage.getGovernanceGraphRuntimeStats();

  if (result.rootModule !== 'core') {
    throw new Error(`unexpected root module: ${result.rootModule}`);
  }

  if (result.totalAffected !== 2 || result.maxDepth !== 2) {
    throw new Error(`unexpected impact result: ${JSON.stringify(result)}`);
  }

  if (stats.cacheMode !== 'memory-eager') {
    throw new Error(`expected memory-eager smoke path, got ${stats.cacheMode} (${stats.warning ?? 'no warning'})`);
  }

  console.log(JSON.stringify({
    ok: true,
    smoke: 'sqlite-impact',
    cacheMode: stats.cacheMode,
    rootModule: result.rootModule,
    affectedModules: result.affectedModules,
    loadMs: stats.loadMs,
    rssDeltaMb: stats.rssDeltaMb,
  }, null, 2));
} finally {
  await storage.close();
  rmSync(rootDir, { recursive: true, force: true });
}
