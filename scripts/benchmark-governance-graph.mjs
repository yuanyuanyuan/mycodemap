import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const loadModule = async (relativePath) => import(pathToFileURL(path.join(repoRoot, relativePath)).href);
const { SQLiteStorage } = await loadModule('dist/infrastructure/storage/adapters/SQLiteStorage.js');
const {
  CONTRACT_GATE_MAX_CHANGED_FILES_FOR_HARD_GATE,
  CONTRACT_GATE_MAX_FALSE_POSITIVE_RATE,
  CONTRACT_GATE_PERF_BUDGET,
} = await loadModule('dist/cli/contract-gate-thresholds.js');

function parseArgs(argv) {
  const args = {
    maxFiles: CONTRACT_GATE_PERF_BUDGET.maxFiles,
    maxLoadMs: CONTRACT_GATE_PERF_BUDGET.maxLoadMs,
    maxRssMb: CONTRACT_GATE_PERF_BUDGET.maxRssMb,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (current === '--max-files' && next) {
      args.maxFiles = Number(next);
    }
    if (current === '--max-load-ms' && next) {
      args.maxLoadMs = Number(next);
    }
    if (current === '--max-rss-mb' && next) {
      args.maxRssMb = Number(next);
    }
  }

  return args;
}

function createLinearGraph(moduleCount) {
  const modules = Array.from({ length: moduleCount }, (_, index) => ({
    id: `mod-${index + 1}`,
    projectId: 'proj-benchmark',
    path: `src/mod-${index + 1}.ts`,
    language: 'ts',
    stats: {
      lines: 10,
      codeLines: 8,
      commentLines: 1,
      blankLines: 1,
    },
  }));
  const dependencies = modules.slice(1).map((module, index) => ({
    id: `dep-${index + 1}`,
    sourceId: module.id,
    targetId: modules[index]?.id ?? module.id,
    type: 'import',
  }));

  return {
    project: {
      id: 'proj-benchmark',
      name: 'governance-benchmark',
      rootPath: '/fixture',
      createdAt: new Date('2026-04-15T00:00:00Z'),
      updatedAt: new Date('2026-04-15T00:00:00Z'),
    },
    modules,
    symbols: [],
    dependencies,
  };
}

async function runCase(moduleCount, thresholds) {
  const rootDir = mkdtempSync(path.join(tmpdir(), 'codemap-governance-benchmark-'));
  const storage = new SQLiteStorage(
    {
      type: 'sqlite',
      databasePath: '.codemap/governance.sqlite',
    },
    {
      governanceGraphThresholds: thresholds,
    }
  );

  try {
    await storage.initialize(rootDir);
    await storage.saveCodeGraph(createLinearGraph(moduleCount));
    return storage.getGovernanceGraphRuntimeStats();
  } finally {
    await storage.close();
    rmSync(rootDir, { recursive: true, force: true });
  }
}

const thresholds = parseArgs(process.argv.slice(2));
const benchmarkModuleCount = Math.min(Math.max(32, thresholds.maxFiles - 1), 512);
const benchmarkStats = await runCase(benchmarkModuleCount, thresholds);
const fallbackStats = await runCase(thresholds.maxFiles + 1, thresholds);

if (benchmarkStats.cacheMode !== 'memory-eager') {
  throw new Error(
    `benchmark graph should stay memory-eager, got ${benchmarkStats.cacheMode} (${benchmarkStats.warning ?? 'no warning'})`
  );
}

if (benchmarkStats.loadMs > thresholds.maxLoadMs) {
  throw new Error(
    `benchmark load time ${benchmarkStats.loadMs.toFixed(2)}ms exceeds maxLoadMs=${thresholds.maxLoadMs}`
  );
}

if (benchmarkStats.rssDeltaMb > thresholds.maxRssMb) {
  throw new Error(
    `benchmark rss delta ${benchmarkStats.rssDeltaMb.toFixed(2)}MB exceeds maxRssMb=${thresholds.maxRssMb}`
  );
}

if (fallbackStats.cacheMode !== 'sqlite-direct') {
  throw new Error(`oversize rehearsal should fall back to sqlite-direct, got ${fallbackStats.cacheMode}`);
}

console.log(JSON.stringify({
  ok: true,
  thresholds,
  contractGate: {
    maxChangedFilesForHardGate: CONTRACT_GATE_MAX_CHANGED_FILES_FOR_HARD_GATE,
    maxFalsePositiveRate: CONTRACT_GATE_MAX_FALSE_POSITIVE_RATE,
  },
  benchmark: benchmarkStats,
  failureRehearsal: fallbackStats,
}, null, 2));
