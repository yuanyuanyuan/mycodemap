// [META] since:2026-05-01 | owner:cli-team | stable:false
// [WHY] Compare WASM vs Native performance to verify <1s startup penalty on 10K-file repos

import { performance } from 'node:perf_hooks';
import { globby } from 'globby';
import path from 'node:path';
import { loadTreeSitter } from '../../parser/implementations/tree-sitter-loader.js';
import { TreeSitterParser } from '../../parser/implementations/tree-sitter-parser.js';
import { loadSQLite } from '../../infrastructure/storage/adapters/sqlite-loader.js';

export interface BenchmarkOptions {
  target?: string;
  mode?: 'native' | 'wasm' | 'both';
  iterations?: number;
  json?: boolean;
}

interface BenchmarkResult {
  target: string;
  fileCount: number;
  native: Metrics | null;
  wasm: Metrics | null;
  penaltyMs: number;
  thresholdMs: number;
  passesThreshold: boolean;
}

interface Metrics {
  coldStartupMs: number;
  parseInitMs: number;
  storageInitMs: number;
  firstFileParseMs: number;
  totalFiles: number;
  filesPerSecond: number;
}

async function runSingleBenchmark(
  target: string,
  useWASM: boolean,
  iterations: number
): Promise<Metrics> {
  const results: Metrics[] = [];

  for (let i = 0; i < iterations; i++) {
    // Set env vars for this iteration
    const prevTreeSitter = process.env.CODEMAP_USE_WASM_TREE_SITTER;
    const prevSqlite = process.env.CODEMAP_USE_WASM_BETTER_SQLITE3;

    if (useWASM) {
      process.env.CODEMAP_USE_WASM_TREE_SITTER = '1';
      process.env.CODEMAP_USE_WASM_BETTER_SQLITE3 = '1';
    } else {
      process.env.CODEMAP_USE_WASM_TREE_SITTER = '0';
      process.env.CODEMAP_USE_WASM_BETTER_SQLITE3 = '0';
    }

    const coldStart = performance.now();

    // Parser init
    const parseInitStart = performance.now();
    const parser = new TreeSitterParser({ rootDir: target, mode: 'fast' });
    const parseInitMs = performance.now() - parseInitStart;

    // Storage init
    const storageInitStart = performance.now();
    const SQLiteCtor = await loadSQLite();
    const storage = new SQLiteCtor(':memory:');
    storage.close();
    const storageInitMs = performance.now() - storageInitStart;

    // File discovery and parse
    const files = await globby('**/*.{ts,js,tsx,jsx}', {
      cwd: target,
      ignore: ['node_modules', 'dist', '.git'],
      absolute: true,
    });

    const firstFileParseStart = performance.now();
    if (files.length > 0) {
      await parser.parseFile(files[0]);
    }
    const firstFileParseMs = performance.now() - firstFileParseStart;

    const coldStartupMs = performance.now() - coldStart;

    // Restore env vars
    if (prevTreeSitter !== undefined) process.env.CODEMAP_USE_WASM_TREE_SITTER = prevTreeSitter;
    else delete process.env.CODEMAP_USE_WASM_TREE_SITTER;
    if (prevSqlite !== undefined) process.env.CODEMAP_USE_WASM_BETTER_SQLITE3 = prevSqlite;
    else delete process.env.CODEMAP_USE_WASM_BETTER_SQLITE3;

    results.push({
      coldStartupMs,
      parseInitMs,
      storageInitMs,
      firstFileParseMs,
      totalFiles: files.length,
      filesPerSecond: files.length > 0 ? files.length / (coldStartupMs / 1000) : 0,
    });
  }

  // Average results
  return {
    coldStartupMs: average(results.map(r => r.coldStartupMs)),
    parseInitMs: average(results.map(r => r.parseInitMs)),
    storageInitMs: average(results.map(r => r.storageInitMs)),
    firstFileParseMs: average(results.map(r => r.firstFileParseMs)),
    totalFiles: results[0]?.totalFiles ?? 0,
    filesPerSecond: average(results.map(r => r.filesPerSecond)),
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export async function benchmarkCommand(options: BenchmarkOptions): Promise<void> {
  const target = path.resolve(options.target ?? '.');
  const mode = options.mode ?? 'both';
  const iterations = Number(options.iterations ?? 3);
  const useJson = options.json ?? false;

  // Quick file count
  const files = await globby('**/*.{ts,js,tsx,jsx}', {
    cwd: target,
    ignore: ['node_modules', 'dist', '.git'],
    absolute: true,
  });

  let nativeMetrics: Metrics | null = null;
  let wasmMetrics: Metrics | null = null;

  if (mode === 'native' || mode === 'both') {
    if (!useJson) console.log('Running native benchmark...');
    nativeMetrics = await runSingleBenchmark(target, false, iterations);
  }

  if (mode === 'wasm' || mode === 'both') {
    if (!useJson) console.log('Running WASM benchmark...');
    wasmMetrics = await runSingleBenchmark(target, true, iterations);
  }

  const penaltyMs = nativeMetrics && wasmMetrics
    ? wasmMetrics.coldStartupMs - nativeMetrics.coldStartupMs
    : 0;
  const thresholdMs = 1000;
  const passesThreshold = penaltyMs < thresholdMs;

  const result: BenchmarkResult = {
    target,
    fileCount: files.length,
    native: nativeMetrics,
    wasm: wasmMetrics,
    penaltyMs,
    thresholdMs,
    passesThreshold,
  };

  if (useJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Human-readable output
  console.log('');
  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log('│  CodeMap Benchmark: WASM vs Native                      │');
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log(`│  Target: ${target.padEnd(53)}│`);
  console.log(`│  Files: ${String(files.length).padEnd(54)}│`);
  console.log('├──────────────────────┬────────────┬──────────┬──────────┤');
  console.log('│  Metric              │  Native    │  WASM    │  Delta   │');
  console.log('├──────────────────────┼────────────┼──────────┼──────────┤');

  const metrics: Array<{ label: string; nativeKey: keyof Metrics; wasmKey: keyof Metrics; unit: string }> = [
    { label: 'Cold Startup', nativeKey: 'coldStartupMs', wasmKey: 'coldStartupMs', unit: 'ms' },
    { label: 'Parser Init', nativeKey: 'parseInitMs', wasmKey: 'parseInitMs', unit: 'ms' },
    { label: 'Storage Init', nativeKey: 'storageInitMs', wasmKey: 'storageInitMs', unit: 'ms' },
    { label: 'First File Parse', nativeKey: 'firstFileParseMs', wasmKey: 'firstFileParseMs', unit: 'ms' },
    { label: 'Files/Second', nativeKey: 'filesPerSecond', wasmKey: 'filesPerSecond', unit: '' },
  ];

  for (const m of metrics) {
    const nativeVal = nativeMetrics?.[m.nativeKey] ?? 0;
    const wasmVal = wasmMetrics?.[m.wasmKey] ?? 0;
    const delta = typeof nativeVal === 'number' && typeof wasmVal === 'number' ? wasmVal - nativeVal : 0;
    const deltaStr = delta > 0 ? `+${delta}${m.unit}` : `${delta}${m.unit}`;
    console.log(
      `│  ${m.label.padEnd(19)}│  ${String(nativeVal).padStart(7)}${m.unit.padEnd(3)}│  ${String(wasmVal).padStart(6)}${m.unit.padEnd(2)}│  ${deltaStr.padStart(7)}│`
    );
  }

  console.log('└──────────────────────┴────────────┴──────────┴──────────┘');
  console.log('');

  if (mode === 'both') {
    const status = passesThreshold ? '✓' : '✗';
    console.log(`WASM startup penalty: ${penaltyMs}ms (< ${thresholdMs}ms threshold ${status})`);
  }
}
