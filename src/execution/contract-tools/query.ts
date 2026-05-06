// [META] since:2026-05-06 | owner:orchestrator-team | stable:false
// [WHY] Shared direct-execution truth for query so CLI and MCP can reuse one transport-free implementation

import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import type { CodeMap } from '../../types/index.js';
import { loadCodeMapRuntime } from '../../cli/storage-runtime.js';
import {
  createContractError,
  createContractSuccess,
  normalizeExecutionError,
  type ContractToolExecutionResult,
} from './types.js';

export interface QueryOptions {
  symbol?: string;
  module?: string;
  deps?: string;
  search?: string;
  limit?: number;
  json?: boolean;
  human?: boolean;
  verbose?: boolean;
  cache?: boolean;
  regex?: boolean;
  depsFormat?: 'default' | 'detailed';
  caseSensitive?: boolean;
  context?: number | string;
  includeReferences?: boolean;
  structured?: boolean;
}

export interface QueryMetrics {
  indexLoadTime: number;
  queryTime: number;
  totalTime: number;
  cacheHit: boolean;
  indexSize: number;
}

export interface QueryResultItem {
  name: string;
  path?: string;
  kind?: string;
  details?: string;
  location?: {
    file: string;
    line?: number;
    column?: number;
  };
  isExported?: boolean;
  references?: ReferenceInfo[];
  context?: CodeContext[];
}

export interface QueryResult {
  type: 'symbol' | 'module' | 'deps' | 'search';
  query: string;
  count: number;
  results: QueryResultItem[];
  metrics?: QueryMetrics;
}

interface ReferenceInfo {
  file: string;
  line: number;
  type: 'import' | 'usage' | 'export';
}

interface CodeContext {
  line: number;
  content: string;
}

interface SymbolEntry {
  name: string;
  kind: string;
  filePath: string;
  line?: number;
  column?: number;
  isExported: boolean;
}

interface ModuleIndex {
  absolutePath: string;
  relativePath: string;
  type: string;
  exports: string[];
}

interface DependencyEntry {
  name: string;
  sourcePath: string;
  type: 'dependency' | 'import';
}

interface SymbolIndex {
  symbols: Map<string, SymbolEntry[]>;
  symbolsExact: Map<string, SymbolEntry[]>;
  modules: Map<string, ModuleIndex>;
  dependencies: Map<string, DependencyEntry[]>;
  prefixIndex: Map<string, SymbolEntry[]>;
  prefixIndexExact: Map<string, SymbolEntry[]>;
}

interface IndexCache {
  data: CodeMap;
  timestamp: number;
  index: SymbolIndex;
  dataPath: string;
}

const CACHE_CONFIG = {
  TTL: 60000,
  MAX_SIZE: 10,
};

const indexCache = new Map<string, IndexCache>();

function normalizeDependencyName(name: string): string {
  return name
    .replace(/\.[jt]s$/, '')
    .replace(/^\.\//, '')
    .toLowerCase();
}

function buildIndex(codeMap: CodeMap, rootDir: string): SymbolIndex {
  const index: SymbolIndex = {
    symbols: new Map(),
    symbolsExact: new Map(),
    modules: new Map(),
    dependencies: new Map(),
    prefixIndex: new Map(),
    prefixIndexExact: new Map(),
  };

  for (const module of codeMap.modules) {
    const relativePath = path.relative(rootDir, module.absolutePath);
    index.modules.set(relativePath.toLowerCase(), {
      absolutePath: module.absolutePath,
      relativePath,
      type: module.type,
      exports: module.exports.map(exp => exp.name),
    });

    for (const exp of module.exports) {
      const entry: SymbolEntry = {
        name: exp.name,
        kind: exp.kind,
        filePath: relativePath,
        isExported: true,
      };
      const lowerName = exp.name.toLowerCase();
      if (!index.symbols.has(lowerName)) {
        index.symbols.set(lowerName, []);
      }
      index.symbols.get(lowerName)!.push(entry);

      if (!index.symbolsExact.has(exp.name)) {
        index.symbolsExact.set(exp.name, []);
      }
      index.symbolsExact.get(exp.name)!.push(entry);

      for (let i = 1; i <= exp.name.length; i += 1) {
        const prefix = exp.name.substring(0, i);
        const lowerPrefix = prefix.toLowerCase();
        if (!index.prefixIndex.has(lowerPrefix)) {
          index.prefixIndex.set(lowerPrefix, []);
        }
        index.prefixIndex.get(lowerPrefix)!.push(entry);

        if (!index.prefixIndexExact.has(prefix)) {
          index.prefixIndexExact.set(prefix, []);
        }
        index.prefixIndexExact.get(prefix)!.push(entry);
      }
    }

    for (const sym of module.symbols) {
      const entry: SymbolEntry = {
        name: sym.name,
        kind: sym.kind,
        filePath: relativePath,
        line: sym.location.line,
        column: sym.location.column,
        isExported: false,
      };
      const lowerName = sym.name.toLowerCase();
      if (!index.symbols.has(lowerName)) {
        index.symbols.set(lowerName, []);
      }
      index.symbols.get(lowerName)!.push(entry);

      if (!index.symbolsExact.has(sym.name)) {
        index.symbolsExact.set(sym.name, []);
      }
      index.symbolsExact.get(sym.name)!.push(entry);

      for (let i = 1; i <= sym.name.length; i += 1) {
        const prefix = sym.name.substring(0, i);
        const lowerPrefix = prefix.toLowerCase();
        if (!index.prefixIndex.has(lowerPrefix)) {
          index.prefixIndex.set(lowerPrefix, []);
        }
        index.prefixIndex.get(lowerPrefix)!.push(entry);

        if (!index.prefixIndexExact.has(prefix)) {
          index.prefixIndexExact.set(prefix, []);
        }
        index.prefixIndexExact.get(prefix)!.push(entry);
      }
    }

    const seenDeps = new Set<string>();

    for (const dep of module.dependencies) {
      const normalizedDep = normalizeDependencyName(dep);
      const depKey = `${relativePath}:${normalizedDep}`;
      if (seenDeps.has(depKey)) {
        continue;
      }
      seenDeps.add(depKey);

      const lowerDep = dep.toLowerCase();
      if (!index.dependencies.has(lowerDep)) {
        index.dependencies.set(lowerDep, []);
      }
      index.dependencies.get(lowerDep)!.push({
        name: dep,
        sourcePath: relativePath,
        type: 'dependency',
      });
    }

    for (const imp of module.imports) {
      const normalizedSource = normalizeDependencyName(imp.source);
      const impKey = `${relativePath}:${normalizedSource}`;
      if (seenDeps.has(impKey)) {
        continue;
      }
      seenDeps.add(impKey);

      const lowerSource = imp.source.toLowerCase();
      if (!index.dependencies.has(lowerSource)) {
        index.dependencies.set(lowerSource, []);
      }
      index.dependencies.get(lowerSource)!.push({
        name: imp.source,
        sourcePath: relativePath,
        type: 'import',
      });
    }
  }

  return index;
}

function clearOldestCacheEntry(): void {
  let oldestKey: string | null = null;
  let oldestTime = Number.POSITIVE_INFINITY;

  for (const [key, value] of indexCache.entries()) {
    if (value.timestamp < oldestTime) {
      oldestKey = key;
      oldestTime = value.timestamp;
    }
  }

  if (oldestKey) {
    indexCache.delete(oldestKey);
  }
}

export function clearQueryCache(): void {
  indexCache.clear();
}

async function loadIndexedCodeMap(rootDir: string, useCache: boolean): Promise<{
  codeMap: CodeMap;
  index: SymbolIndex;
  cacheHit: boolean;
  loadTime: number;
  dataPath: string;
}> {
  const cached = useCache ? indexCache.get(rootDir) : undefined;
  if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.TTL) {
    return {
      codeMap: cached.data,
      index: cached.index,
      cacheHit: true,
      loadTime: 0,
      dataPath: cached.dataPath,
    };
  }

  const startedAt = performance.now();
  const runtime = await loadCodeMapRuntime(rootDir);
  const index = buildIndex(runtime.codeMap, runtime.rootDir);
  const loadTime = performance.now() - startedAt;

  if (useCache) {
    if (indexCache.size >= CACHE_CONFIG.MAX_SIZE) {
      clearOldestCacheEntry();
    }
    indexCache.set(rootDir, {
      data: runtime.codeMap,
      timestamp: Date.now(),
      index,
      dataPath: runtime.dataPath,
    });
  }

  return {
    codeMap: runtime.codeMap,
    index,
    cacheHit: false,
    loadTime,
    dataPath: runtime.dataPath,
  };
}

function findReferences(
  codeMap: CodeMap,
  symbolName: string,
  excludeFile: string,
  caseSensitive: boolean
): ReferenceInfo[] {
  const references: ReferenceInfo[] = [];
  const searchName = caseSensitive ? symbolName : symbolName.toLowerCase();

  for (const mod of codeMap.modules) {
    const relPath = path.relative(codeMap.project.rootDir, mod.absolutePath);
    if (relPath === excludeFile) {
      continue;
    }

    for (const imp of mod.imports) {
      const impSource = caseSensitive ? imp.source : imp.source.toLowerCase();
      if (impSource.includes(searchName)) {
        references.push({ file: relPath, line: 1, type: 'import' });
        continue;
      }

      for (const spec of imp.specifiers) {
        const specName = caseSensitive ? spec.name : spec.name.toLowerCase();
        if (specName === searchName) {
          references.push({ file: relPath, line: 1, type: 'import' });
          break;
        }
      }
    }

    for (const exp of mod.exports) {
      const expName = caseSensitive ? exp.name : exp.name.toLowerCase();
      if (expName === searchName) {
        references.push({ file: relPath, line: 1, type: 'export' });
      }
    }
  }

  return references.slice(0, 20);
}

function readCodeContext(filePath: string, lineNumber: number, contextLines: number, rootDir: string): CodeContext[] {
  const fullPath = path.join(rootDir, filePath);
  if (!fs.existsSync(fullPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    const context: CodeContext[] = [];
    const startLine = Math.max(1, lineNumber - contextLines);
    const endLine = Math.min(lines.length, lineNumber + contextLines);

    for (let i = startLine; i <= endLine; i += 1) {
      context.push({
        line: i,
        content: lines[i - 1] ?? '',
      });
    }

    return context;
  } catch {
    return [];
  }
}

function querySymbol(
  index: SymbolIndex,
  codeMap: CodeMap,
  symbolName: string,
  limit: number,
  caseSensitive: boolean,
  includeReferences: boolean,
  contextLines: number
): QueryResultItem[] {
  const results: QueryResultItem[] = [];
  const symbolsMap = caseSensitive ? index.symbolsExact : index.symbols;
  const prefixMap = caseSensitive ? index.prefixIndexExact : index.prefixIndex;
  const searchKey = caseSensitive ? symbolName : symbolName.toLowerCase();
  const seenResults = new Set<string>();

  const exactMatches = symbolsMap.get(searchKey) ?? [];
  for (const entry of exactMatches) {
    const key = `${entry.name}:${entry.filePath}`;
    if (seenResults.has(key)) {
      continue;
    }
    seenResults.add(key);
    results.push({
      name: entry.name,
      path: path.join(codeMap.project.rootDir, entry.filePath),
      kind: entry.kind,
      details: `${entry.isExported ? '导出于' : '定义于'} ${entry.filePath}${entry.line ? `:${entry.line}` : ''}`,
      location: { file: entry.filePath, line: entry.line, column: entry.column },
      isExported: entry.isExported,
    });
  }

  for (const entry of prefixMap.get(searchKey) ?? []) {
    const key = `${entry.name}:${entry.filePath}`;
    if (seenResults.has(key)) {
      continue;
    }
    seenResults.add(key);
    results.push({
      name: entry.name,
      path: path.join(codeMap.project.rootDir, entry.filePath),
      kind: entry.kind,
      details: `${entry.isExported ? '导出于' : '定义于'} ${entry.filePath}${entry.line ? `:${entry.line}` : ''}`,
      location: { file: entry.filePath, line: entry.line, column: entry.column },
      isExported: entry.isExported,
    });
  }

  for (const [key, entries] of symbolsMap.entries()) {
    if (!key.includes(searchKey) || key.startsWith(searchKey)) {
      continue;
    }
    for (const entry of entries) {
      const resultKey = `${entry.name}:${entry.filePath}`;
      if (seenResults.has(resultKey)) {
        continue;
      }
      seenResults.add(resultKey);
      results.push({
        name: entry.name,
        path: path.join(codeMap.project.rootDir, entry.filePath),
        kind: entry.kind,
        details: `${entry.isExported ? '导出于' : '定义于'} ${entry.filePath}${entry.line ? `:${entry.line}` : ''}`,
        location: { file: entry.filePath, line: entry.line, column: entry.column },
        isExported: entry.isExported,
      });
    }
  }

  if (includeReferences) {
    for (const result of results) {
      result.references = findReferences(codeMap, symbolName, result.location?.file ?? '', caseSensitive);
    }
  }

  if (contextLines > 0) {
    for (const result of results) {
      result.context = readCodeContext(
        result.location?.file ?? '',
        result.location?.line ?? 0,
        contextLines,
        codeMap.project.rootDir
      );
    }
  }

  return results.slice(0, limit);
}

function queryModule(index: SymbolIndex, codeMap: CodeMap, modulePath: string, limit: number): QueryResultItem[] {
  const results: QueryResultItem[] = [];
  const searchPath = modulePath.toLowerCase();

  for (const [key, moduleIdx] of index.modules.entries()) {
    if (!key.includes(searchPath) && !moduleIdx.absolutePath.toLowerCase().includes(searchPath)) {
      continue;
    }
    results.push({
      name: moduleIdx.relativePath,
      path: moduleIdx.absolutePath,
      kind: moduleIdx.type,
      details: `导出: ${moduleIdx.exports.join(', ') || '无导出'}`,
      location: { file: moduleIdx.relativePath },
      isExported: moduleIdx.exports.length > 0,
    });
  }

  return results.slice(0, limit);
}

function queryDeps(
  index: SymbolIndex,
  codeMap: CodeMap,
  depName: string,
  limit: number,
  deduplicate: boolean
): QueryResultItem[] {
  const results: QueryResultItem[] = [];

  for (const entry of index.dependencies.get(depName.toLowerCase()) ?? []) {
    results.push({
      name: entry.name,
      path: path.join(codeMap.project.rootDir, entry.sourcePath),
      kind: entry.type,
      details: `${entry.type === 'dependency' ? '被' : '导入自'} ${entry.sourcePath} 引用`,
      location: { file: entry.sourcePath },
      isExported: false,
    });
  }

  if (!deduplicate) {
    return results.slice(0, limit);
  }

  const unique = new Map<string, QueryResultItem>();
  for (const item of results) {
    const key = `${item.name}:${item.path}`;
    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }
  return Array.from(unique.values()).slice(0, limit);
}

function search(
  index: SymbolIndex,
  codeMap: CodeMap,
  keyword: string,
  limit: number,
  useRegex: boolean,
  caseSensitive: boolean,
  contextLines: number
): QueryResultItem[] {
  const results: QueryResultItem[] = [];
  let regex: RegExp | null = null;

  if (useRegex) {
    try {
      regex = new RegExp(keyword, caseSensitive ? '' : 'i');
    } catch {
      regex = null;
    }
  }

  for (const [key, moduleIdx] of index.modules.entries()) {
    const searchTarget = caseSensitive ? key : key.toLowerCase();
    const loweredKeyword = keyword.toLowerCase();
    const matches = regex
      ? regex.test(key) || regex.test(moduleIdx.relativePath)
      : searchTarget.includes(loweredKeyword);
    if (!matches) {
      continue;
    }
    results.push({
      name: moduleIdx.relativePath,
      path: moduleIdx.absolutePath,
      kind: 'module',
      details: useRegex ? '正则匹配' : '模块匹配',
      location: { file: moduleIdx.relativePath },
      isExported: false,
    });
  }

  const symbolsMap = caseSensitive ? index.symbolsExact : index.symbols;
  const prefixMap = caseSensitive ? index.prefixIndexExact : index.prefixIndex;

  if (useRegex && regex) {
    for (const [symbolKey, entries] of symbolsMap.entries()) {
      const matchTarget = caseSensitive ? symbolKey : symbolKey.toLowerCase();
      if (!regex.test(matchTarget) && !regex.test(symbolKey)) {
        continue;
      }
      for (const entry of entries) {
        results.push({
          name: entry.name,
          path: path.join(codeMap.project.rootDir, entry.filePath),
          kind: entry.isExported ? `export (${entry.kind})` : entry.kind,
          details: `正则匹配于 ${entry.filePath}${entry.line ? `:${entry.line}` : ''}`,
          location: { file: entry.filePath, line: entry.line, column: entry.column },
          isExported: entry.isExported,
        });
      }
    }
  } else {
    const searchKey = caseSensitive ? keyword : keyword.toLowerCase();
    for (const entry of prefixMap.get(searchKey) ?? []) {
      results.push({
        name: entry.name,
        path: path.join(codeMap.project.rootDir, entry.filePath),
        kind: entry.isExported ? `export (${entry.kind})` : entry.kind,
        details: `${entry.isExported ? '导出于' : '定义于'} ${entry.filePath}${entry.line ? `:${entry.line}` : ''}`,
        location: { file: entry.filePath, line: entry.line, column: entry.column },
        isExported: entry.isExported,
      });
    }
  }

  const unique = new Map<string, QueryResultItem>();
  for (const item of results) {
    const key = `${item.name}:${item.path}`;
    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  const finalResults = Array.from(unique.values()).slice(0, limit);
  if (contextLines > 0) {
    for (const result of finalResults) {
      result.context = readCodeContext(
        result.location?.file ?? '',
        result.location?.line ?? 0,
        contextLines,
        codeMap.project.rootDir
      );
    }
  }

  return finalResults;
}

function stripStructuredDetails(result: QueryResult): QueryResult {
  return {
    ...result,
    results: result.results.map(item => {
      const { details, ...rest } = item;
      void details;
      return rest;
    }),
  };
}

export function formatQueryHuman(result: QueryResult): string {
  const lines: string[] = [];

  lines.push(chalk.cyan(`\nQuery "${result.query}" (${result.type})`));
  lines.push(chalk.gray(`   Found ${result.count} results\n`));

  if (result.count === 0) {
    lines.push(chalk.yellow('   No matching results'));
    return lines.join('\n');
  }

  const nameWidth = 30;
  const kindWidth = 15;
  const header = 'NAME'.padEnd(nameWidth) + 'KIND'.padEnd(kindWidth) + 'PATH';
  lines.push(header);
  lines.push('-'.repeat(header.length));

  for (const item of result.results) {
    const name = item.name.substring(0, nameWidth - 1).padEnd(nameWidth);
    const kind = (item.kind ?? '').substring(0, kindWidth - 1).padEnd(kindWidth);
    lines.push(`${name}${kind}${item.path ?? ''}`);
  }

  if (result.metrics) {
    lines.push('');
    lines.push(chalk.cyan('Metrics:'));
    lines.push(chalk.gray(`   Index load: ${result.metrics.indexLoadTime.toFixed(2)}ms ${result.metrics.cacheHit ? '(cached)' : ''}`));
    lines.push(chalk.gray(`   Query: ${result.metrics.queryTime.toFixed(2)}ms`));
    lines.push(chalk.gray(`   Total: ${result.metrics.totalTime.toFixed(2)}ms`));
    lines.push(chalk.gray(`   Index size: ${result.metrics.indexSize} entries`));
  }

  return lines.join('\n');
}

export async function executeQueryTool(
  options: QueryOptions,
  rootDir: string = process.cwd()
): Promise<ContractToolExecutionResult<QueryResult>> {
  const limit = options.limit ?? 50;
  const useCache = options.cache !== false;
  const useRegex = options.regex === true;
  const verbose = options.verbose === true;
  const depsFormat = options.depsFormat ?? 'default';
  const caseSensitive = options.caseSensitive === true;
  const includeReferences = options.includeReferences === true;
  const contextLines = typeof options.context === 'string'
    ? Number.parseInt(options.context, 10)
    : options.context ?? 0;

  if (!useCache) {
    clearQueryCache();
  }

  const startedAt = performance.now();

  try {
    const { codeMap, index, cacheHit, loadTime, dataPath } = await loadIndexedCodeMap(rootDir, useCache);
    const queryStartedAt = performance.now();
    let result: QueryResult;

    if (options.symbol) {
      const items = querySymbol(index, codeMap, options.symbol, limit, caseSensitive, includeReferences, contextLines);
      result = { type: 'symbol', query: options.symbol, count: items.length, results: items };
    } else if (options.module) {
      const items = queryModule(index, codeMap, options.module, limit);
      result = { type: 'module', query: options.module, count: items.length, results: items };
    } else if (options.deps) {
      const items = queryDeps(index, codeMap, options.deps, limit, depsFormat !== 'detailed');
      result = { type: 'deps', query: options.deps, count: items.length, results: items };
    } else if (options.search) {
      const items = search(index, codeMap, options.search, limit, useRegex, caseSensitive, contextLines);
      result = { type: 'search', query: options.search, count: items.length, results: items };
    } else {
      const usageError = new Error(
        'Please specify query type: --symbol, --module, --deps, or --search'
      ) as Error & { code: string; remediation: string };
      usageError.code = 'MISSING_QUERY_TYPE';
      usageError.remediation = 'Run codemap query --symbol <name> to search for symbols';
      throw usageError;
    }

    const queryTime = performance.now() - queryStartedAt;
    const totalTime = performance.now() - startedAt;

    if (verbose) {
      result.metrics = {
        indexLoadTime: loadTime,
        queryTime,
        totalTime,
        cacheHit,
        indexSize: index.symbols.size + index.modules.size + index.dependencies.size,
      };
    }

    return createContractSuccess(
      {
        tool: 'query',
        rootDir,
        dataPath,
        durationMs: totalTime,
        cacheHit,
      },
      options.structured ? stripStructuredDetails(result) : result
    );
  } catch (error) {
    return createContractError(
      {
        tool: 'query',
        rootDir,
        durationMs: performance.now() - startedAt,
      },
      normalizeExecutionError(error)
    );
  }
}
