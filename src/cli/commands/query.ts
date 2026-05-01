// [META] since:2026-03-03 | owner:orchestrator-team | stable:true
// [WHY] 查询命令优化：改进缓存策略、添加索引结构、添加性能指标输出

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { resolveDataPath } from '../paths.js';
import { resolveOutputMode, renderOutput, createProgressEmitter, formatError } from '../output/index.js';
import type { OutputMode } from '../output/index.js';
import type { CodeMap, ModuleInfo, ExportInfo, ModuleSymbol } from '../../types/index.js';

interface QueryOptions {
  symbol?: string;
  module?: string;
  deps?: string;
  search?: string;
  limit?: number;
  json?: boolean;
  human?: boolean;
  verbose?: boolean;
  cache?: boolean;
  regex?: boolean;  // 新增：正则表达式模式
  depsFormat?: 'default' | 'detailed';  // 新增：依赖查询输出格式
  // 新增：大小写敏感
  caseSensitive?: boolean;
  // 新增：代码上下文行数
  context?: number;
  // 新增：包含引用信息
  includeReferences?: boolean;
  // 新增：结构化输出模式（完全结构化，移除自然语言字符串）
  structured?: boolean;
}

interface QueryResult {
  type: 'symbol' | 'module' | 'deps' | 'search';
  query: string;
  count: number;
  results: QueryResultItem[];
  // 性能指标（verbose 模式输出）
  metrics?: QueryMetrics;
}

interface QueryMetrics {
  indexLoadTime: number;
  queryTime: number;
  totalTime: number;
  cacheHit: boolean;
  indexSize: number;
}

interface QueryResultItem {
  name: string;
  path?: string;
  kind?: string;
  details?: string;
  // 结构化字段（JSON 模式）
  location?: {
    file: string;
    line?: number;
    column?: number;
  };
  isExported?: boolean;
  // 新增：引用位置
  references?: ReferenceInfo[];
  // 新增：代码上下文
  context?: CodeContext[];
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

// ===== 性能优化：改进的缓存机制 =====

// 缓存配置
const CACHE_CONFIG = {
  TTL: 60000,           // 60秒缓存（从5秒提升）
  MAX_SIZE: 10,         // 最大缓存 10 个项目的索引
};

// 缓存存储结构
interface IndexCache {
  data: CodeMap | null;
  timestamp: number;
  path: string;
  index: SymbolIndex | null;  // 预构建索引
}

const indexCache = new Map<string, IndexCache>();

/**
 * 符号索引 - 用于快速查找
 */
interface SymbolIndex {
  // 符号名 -> 符号列表（用于精确/模糊查询，不区分大小写）
  symbols: Map<string, SymbolEntry[]>;
  // 符号名 -> 符号列表（用于精确/模糊查询，区分大小写）
  symbolsExact: Map<string, SymbolEntry[]>;
  // 模块路径 -> 模块索引
  modules: Map<string, ModuleIndex>;
  // 依赖名 -> 依赖列表
  dependencies: Map<string, DependencyEntry[]>;
  // 前缀索引（用于前缀匹配，不区分大小写）
  prefixIndex: Map<string, SymbolEntry[]>;
  // 前缀索引（用于前缀匹配，区分大小写）
  prefixIndexExact: Map<string, SymbolEntry[]>;
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

/**
 * 标准化依赖名称，用于去重比较
 * 1. 去除扩展名（如 .ts, .js）
 * 2. 去除 ./ 前缀
 * 3. 转换为小写
 */
function normalizeDependencyName(name: string): string {
  return name
    .replace(/\.[jt]s$/, "")      // 去除 .ts 或 .js 扩展名
    .replace(/^\.\//, "")         // 去除 ./ 前缀
    .toLowerCase();
}

/**
 * 预构建索引以加速查询
 */
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
    const moduleIndex: ModuleIndex = {
      absolutePath: module.absolutePath,
      relativePath,
      type: module.type,
      exports: module.exports.map(e => e.name),
    };

    // 索引模块（使用相对路径作为主键）
    index.modules.set(relativePath.toLowerCase(), moduleIndex);

    // 索引导出
    for (const exp of module.exports) {
      const entry: SymbolEntry = {
        name: exp.name,
        kind: exp.kind,
        filePath: relativePath,
        isExported: true,
      };

      // 精确索引（不区分大小写）
      const lowerName = exp.name.toLowerCase();
      if (!index.symbols.has(lowerName)) {
        index.symbols.set(lowerName, []);
      }
      index.symbols.get(lowerName)!.push(entry);

      // 精确索引（区分大小写）
      if (!index.symbolsExact.has(exp.name)) {
        index.symbolsExact.set(exp.name, []);
      }
      index.symbolsExact.get(exp.name)!.push(entry);

      // 前缀索引（不区分大小写）
      for (let i = 1; i <= exp.name.length; i++) {
        const prefix = exp.name.substring(0, i).toLowerCase();
        if (!index.prefixIndex.has(prefix)) {
          index.prefixIndex.set(prefix, []);
        }
        index.prefixIndex.get(prefix)!.push(entry);
      }

      // 前缀索引（区分大小写）
      for (let i = 1; i <= exp.name.length; i++) {
        const prefix = exp.name.substring(0, i);
        if (!index.prefixIndexExact.has(prefix)) {
          index.prefixIndexExact.set(prefix, []);
        }
        index.prefixIndexExact.get(prefix)!.push(entry);
      }
    }

    // 索引符号
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

      // 精确索引（区分大小写）
      if (!index.symbolsExact.has(sym.name)) {
        index.symbolsExact.set(sym.name, []);
      }
      index.symbolsExact.get(sym.name)!.push(entry);

      // 前缀索引（不区分大小写）
      for (let i = 1; i <= sym.name.length; i++) {
        const prefix = sym.name.substring(0, i).toLowerCase();
        if (!index.prefixIndex.has(prefix)) {
          index.prefixIndex.set(prefix, []);
        }
        index.prefixIndex.get(prefix)!.push(entry);
      }

      // 前缀索引（区分大小写）
      for (let i = 1; i <= sym.name.length; i++) {
        const prefix = sym.name.substring(0, i);
        if (!index.prefixIndexExact.has(prefix)) {
          index.prefixIndexExact.set(prefix, []);
        }
        index.prefixIndexExact.get(prefix)!.push(entry);
      }
    }

    // 索引依赖和导入，进行去重处理
    // 使用 Set 跟踪当前模块已添加的依赖（基于标准化名称）
    const seenDeps = new Set<string>();

    // 先索引 dependencies（优先保留）
    for (const dep of module.dependencies) {
      const normalizedDep = normalizeDependencyName(dep);
      const depKey = `${relativePath}:${normalizedDep}`;
      
      // 跳过已存在的依赖
      if (seenDeps.has(depKey)) {
        continue;
      }
      seenDeps.add(depKey);

      const depEntry: DependencyEntry = {
        name: dep,
        sourcePath: relativePath,
        type: "dependency",
      };

      const lowerDep = dep.toLowerCase();
      if (!index.dependencies.has(lowerDep)) {
        index.dependencies.set(lowerDep, []);
      }
      index.dependencies.get(lowerDep)!.push(depEntry);
    }

    // 再索引 imports（如果与 dependency 重复则跳过）
    for (const imp of module.imports) {
      const normalizedSource = normalizeDependencyName(imp.source);
      const impKey = `${relativePath}:${normalizedSource}`;
      
      // 跳过已存在的依赖（避免与 dependency 重复）
      if (seenDeps.has(impKey)) {
        continue;
      }
      seenDeps.add(impKey);

      const impEntry: DependencyEntry = {
        name: imp.source,
        sourcePath: relativePath,
        type: "import",
      };

      const lowerSource = imp.source.toLowerCase();
      if (!index.dependencies.has(lowerSource)) {
        index.dependencies.set(lowerSource, []);
      }
      index.dependencies.get(lowerSource)!.push(impEntry);
    }
  }

  return index;
}

/**
 * 加载代码地图数据（带改进的缓存）
 */
function loadCodeMap(rootDir: string, useCache: boolean = true): {
  codeMap: CodeMap | null;
  index: SymbolIndex | null;
  cacheHit: boolean;
  loadTime: number;
} {
  const codemapPath = resolveDataPath(rootDir);
  const startTime = performance.now();

  // 检查缓存
  if (useCache) {
    const cached = indexCache.get(rootDir);
    if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.TTL) {
      return {
        codeMap: cached.data,
        index: cached.index,
        cacheHit: true,
        loadTime: 0,
      };
    }
  }

  if (!fs.existsSync(codemapPath)) {
    console.log(chalk.red('错误: 代码地图不存在，请先运行 codemap generate'));
    return { codeMap: null, index: null, cacheHit: false, loadTime: 0 };
  }

  try {
    const data = fs.readFileSync(codemapPath, 'utf-8');
    const parsed = JSON.parse(data) as CodeMap;
    const loadTime = performance.now() - startTime;

    // 构建索引
    const index = buildIndex(parsed, rootDir);

    // 缓存（如果启用）
    if (useCache) {
      // 清理超出限制的旧缓存
      if (indexCache.size >= CACHE_CONFIG.MAX_SIZE) {
        // 删除最旧的缓存
        let oldestKey: string | null = null;
        let oldestTime = Infinity;
        for (const [key, val] of indexCache.entries()) {
          if (val.timestamp < oldestTime) {
            oldestTime = val.timestamp;
            oldestKey = key;
          }
        }
        if (oldestKey) {
          indexCache.delete(oldestKey);
        }
      }

      indexCache.set(rootDir, {
        data: parsed,
        timestamp: Date.now(),
        path: codemapPath,
        index,
      });
    }

    return {
      codeMap: parsed,
      index,
      cacheHit: false,
      loadTime,
    };
  } catch (error) {
    console.log(chalk.red('错误: 读取代码地图失败:', error instanceof Error ? error.message : String(error)));
    return { codeMap: null, index: null, cacheHit: false, loadTime: 0 };
  }
}

/**
 * 清除缓存
 */
function clearCache(): void {
  indexCache.clear();
}

/**
 * 查找符号的引用位置
 */
function findReferences(
  codeMap: CodeMap,
  symbolName: string,
  excludeFile: string,
  caseSensitive: boolean = false
): ReferenceInfo[] {
  const references: ReferenceInfo[] = [];
  const searchName = caseSensitive ? symbolName : symbolName.toLowerCase();

  for (const mod of codeMap.modules) {
    const relPath = path.relative(codeMap.project.rootDir, mod.absolutePath);

    // 跳过定义位置文件
    if (relPath === excludeFile) continue;

    // 检查 imports 中是否引用了该符号
    for (const imp of mod.imports) {
      // 检查导入源
      const impSource = caseSensitive ? imp.source : imp.source.toLowerCase();
      if (impSource.includes(searchName)) {
        references.push({
          file: relPath,
          line: 1,  // 简化处理，显示第一行
          type: 'import',
        });
        continue;
      }

      // 检查导入的 specifiers
      for (const spec of imp.specifiers) {
        const specName = caseSensitive ? spec.name : spec.name.toLowerCase();
        if (specName === searchName) {
          references.push({
            file: relPath,
            line: 1,
            type: 'import',
          });
          break;
        }
      }
    }

    // 检查 exports 中是否导出该符号
    for (const exp of mod.exports) {
      const expName = caseSensitive ? exp.name : exp.name.toLowerCase();
      if (expName === searchName) {
        references.push({
          file: relPath,
          line: 1,
          type: 'export',
        });
      }
    }
  }

  return references.slice(0, 20);  // 限制引用数量
}

/**
 * 读取代码上下文
 */
function readCodeContext(
  filePath: string,
  lineNumber: number,
  contextLines: number,
  rootDir: string
): CodeContext[] {
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

    for (let i = startLine; i <= endLine; i++) {
      context.push({
        line: i,
        content: lines[i - 1] || '',
      });
    }

    return context;
  } catch {
    return [];
  }
}

/**
 * 查询符号（使用索引）
 */
function querySymbol(
  index: SymbolIndex,
  codeMap: CodeMap,
  symbolName: string,
  limit: number,
  caseSensitive: boolean = false,
  includeReferences: boolean = false,
  contextLines: number = 0
): QueryResultItem[] {
  const results: QueryResultItem[] = [];

  // 选择正确的索引
  const symbolsMap = caseSensitive ? index.symbolsExact : index.symbols;
  const prefixMap = caseSensitive ? index.prefixIndexExact : index.prefixIndex;
  // 搜索键：不区分大小写时转换为小写
  const searchKey = caseSensitive ? symbolName : symbolName.toLowerCase();

  // 用于去重的 Set
  const seenResults = new Set<string>();

  // 首先尝试精确匹配（完全相等）
  const exactMatches = symbolsMap.get(searchKey);
  if (exactMatches) {
    for (const entry of exactMatches) {
      const key = `${entry.name}:${entry.filePath}`;
      if (!seenResults.has(key)) {
        seenResults.add(key);
        results.push({
          name: entry.name,
          path: path.join(codeMap.project.rootDir, entry.filePath),
          kind: entry.kind,
          details: `${entry.isExported ? '导出于' : '定义于'} ${entry.filePath}${entry.line ? ':' + entry.line : ''}`,
          location: { file: entry.filePath, line: entry.line, column: entry.column },
          isExported: entry.isExported,
        });
      }
    }
  }

  // 尝试前缀匹配（以搜索词开头）
  const prefixResults = prefixMap.get(searchKey) || [];
  for (const entry of prefixResults) {
    const key = `${entry.name}:${entry.filePath}`;
    if (!seenResults.has(key)) {
      seenResults.add(key);
      results.push({
        name: entry.name,
        path: path.join(codeMap.project.rootDir, entry.filePath),
        kind: entry.kind,
        details: `${entry.isExported ? '导出于' : '定义于'} ${entry.filePath}${entry.line ? ':' + entry.line : ''}`,
        location: { file: entry.filePath, line: entry.line, column: entry.column },
        isExported: entry.isExported,
      });
    }
  }

  // 尝试子串匹配（包含匹配）
  // 例如：搜索 "Analyzer" 应匹配 "GitAnalyzer"
  for (const [key, entries] of symbolsMap.entries()) {
    if (key.includes(searchKey) && !key.startsWith(searchKey)) {
      // 跳过已经通过精确匹配和前缀匹配找到的键
      for (const entry of entries) {
        const resultKey = `${entry.name}:${entry.filePath}`;
        if (!seenResults.has(resultKey)) {
          seenResults.add(resultKey);
          results.push({
            name: entry.name,
            path: path.join(codeMap.project.rootDir, entry.filePath),
            kind: entry.kind,
            details: `${entry.isExported ? '导出于' : '定义于'} ${entry.filePath}${entry.line ? ':' + entry.line : ''}`,
            location: { file: entry.filePath, line: entry.line, column: entry.column },
            isExported: entry.isExported,
          });
        }
      }
    }
  }

  // 添加引用信息
  if (includeReferences) {
    for (const result of results) {
      result.references = findReferences(codeMap, symbolName, result.location?.file || '', caseSensitive);
    }
  }

  // 添加代码上下文
  if (contextLines > 0) {
    for (const result of results) {
      result.context = readCodeContext(result.location?.file || '', result.location?.line || 0, contextLines, codeMap.project.rootDir);
    }
  }

  return results.slice(0, limit);
}

/**
 * 查询模块（使用索引）
 */
function queryModule(index: SymbolIndex, codeMap: CodeMap, modulePath: string, limit: number): QueryResultItem[] {
  const results: QueryResultItem[] = [];
  const searchPath = modulePath.toLowerCase();

  // 使用索引查找
  for (const [key, moduleIdx] of index.modules.entries()) {
    if (key.includes(searchPath) || moduleIdx.absolutePath.toLowerCase().includes(searchPath)) {
      const exports = moduleIdx.exports.join(', ') || '无导出';
      results.push({
        name: moduleIdx.relativePath,
        path: moduleIdx.absolutePath,
        kind: moduleIdx.type,
        details: `导出: ${exports}`,
        location: { file: moduleIdx.relativePath },
        isExported: moduleIdx.exports.length > 0,
      });
    }
  }

  return results.slice(0, limit);
}

/**
 * 查询依赖（使用索引）
 * @param index 符号索引
 * @param codeMap 代码地图数据
 * @param depName 依赖名称
 * @param limit 结果数量限制
 * @param deduplicate 是否去重（默认true）
 */
function queryDeps(index: SymbolIndex, codeMap: CodeMap, depName: string, limit: number, deduplicate: boolean = true): QueryResultItem[] {
  const results: QueryResultItem[] = [];
  const searchDep = depName.toLowerCase();

  // 使用索引查找
  const depEntries = index.dependencies.get(searchDep);
  if (depEntries) {
    for (const entry of depEntries) {
      results.push({
        name: entry.name,
        path: path.join(codeMap.project.rootDir, entry.sourcePath),
        kind: entry.type,
        details: `${entry.type === 'dependency' ? '被' : '导入自'} ${entry.sourcePath} 引用`,
        location: { file: entry.sourcePath },
        isExported: false,
      });
    }
  }

  // 去重：基于 name:sourcePath 组合去重，避免 dependency 和 import 重复
  if (deduplicate) {
    const unique = new Map<string, QueryResultItem>();
    for (const item of results) {
      const key = `${item.name}:${item.path}`;
      if (!unique.has(key)) {
        unique.set(key, item);
      }
    }
    return Array.from(unique.values()).slice(0, limit);
  }

  return results.slice(0, limit);
}

/**
 * 模糊搜索（使用索引）
 * @param index 符号索引
 * @param codeMap 代码地图数据
 * @param keyword 搜索关键词
 * @param limit 结果数量限制
 * @param useRegex 是否使用正则表达式搜索
 * @param caseSensitive 大小写敏感
 * @param contextLines 代码上下文行数
 */
function search(
  index: SymbolIndex,
  codeMap: CodeMap,
  keyword: string,
  limit: number,
  useRegex: boolean = false,
  caseSensitive: boolean = false,
  contextLines: number = 0
): QueryResultItem[] {
  const results: QueryResultItem[] = [];

  // 正则表达式模式
  let regex: RegExp | null = null;
  if (useRegex) {
    try {
      const flags = caseSensitive ? '' : 'i';
      regex = new RegExp(keyword, flags);
    } catch {
      // 正则表达式无效，回退到普通搜索
      regex = null;
    }
  }

  // 1. 搜索模块路径
  for (const [key, moduleIdx] of index.modules.entries()) {
    const searchTarget = caseSensitive ? key : key.toLowerCase();
    const keywordLower = keyword.toLowerCase();
    const matches = regex
      ? regex.test(key) || regex.test(moduleIdx.relativePath)
      : searchTarget.includes(keywordLower);
    if (matches) {
      results.push({
        name: moduleIdx.relativePath,
        path: moduleIdx.absolutePath,
        kind: 'module',
        details: useRegex ? `正则匹配` : `模块匹配`,
        location: { file: moduleIdx.relativePath },
        isExported: false,
      });
    }
  }

  // 2. 搜索符号和导出（使用前缀索引）
  // 选择正确的索引
  const symbolsMap = caseSensitive ? index.symbolsExact : index.symbols;
  const prefixMap = caseSensitive ? index.prefixIndexExact : index.prefixIndex;

  if (useRegex && regex) {
    // 正则模式：遍历所有符号进行匹配
    for (const [symbolKey, entries] of symbolsMap.entries()) {
      const matchTarget = caseSensitive ? symbolKey : symbolKey.toLowerCase();
      if (regex.test(matchTarget) || regex.test(symbolKey)) {
        for (const entry of entries) {
          results.push({
            name: entry.name,
            path: path.join(codeMap.project.rootDir, entry.filePath),
            kind: entry.isExported ? `export (${entry.kind})` : entry.kind,
            details: `正则匹配于 ${entry.filePath}${entry.line ? ':' + entry.line : ''}`,
            location: { file: entry.filePath, line: entry.line, column: entry.column },
            isExported: entry.isExported,
          });
        }
      }
    }
  } else {
    // 普通模式：使用前缀索引
    // 搜索键：不区分大小写时转换为小写
    const searchKey = caseSensitive ? keyword : keyword.toLowerCase();
    const prefixResults = prefixMap.get(searchKey) || [];
    for (const entry of prefixResults) {
      results.push({
        name: entry.name,
        path: path.join(codeMap.project.rootDir, entry.filePath),
        kind: entry.isExported ? `export (${entry.kind})` : entry.kind,
        details: `${entry.isExported ? '导出于' : '定义于'} ${entry.filePath}${entry.line ? ':' + entry.line : ''}`,
        location: { file: entry.filePath, line: entry.line, column: entry.column },
        isExported: entry.isExported,
      });
    }
  }

  // 去重（基于 name:path 组合）
  const unique = new Map<string, QueryResultItem>();
  for (const item of results) {
    const key = `${item.name}:${item.path}`;
    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  const finalResults = Array.from(unique.values()).slice(0, limit);

  // 添加代码上下文
  if (contextLines > 0) {
    for (const result of finalResults) {
      result.context = readCodeContext(result.location?.file || '', result.location?.line || 0, contextLines, codeMap.project.rootDir);
    }
  }

  return finalResults;
}

/**
 * Human-readable renderer for query output (chalk + padEnd table pattern)
 */
function formatQueryHuman(result: QueryResult): string {
  const lines: string[] = [];

  lines.push(chalk.cyan(`\nQuery "${result.query}" (${result.type})`));
  lines.push(chalk.gray(`   Found ${result.count} results\n`));

  if (result.count === 0) {
    lines.push(chalk.yellow('   No matching results'));
    return lines.join('\n');
  }

  // Table header
  const NAME_WIDTH = 30;
  const KIND_WIDTH = 15;
  const header =
    'NAME'.padEnd(NAME_WIDTH) +
    'KIND'.padEnd(KIND_WIDTH) +
    'PATH';
  lines.push(header);
  lines.push('-'.repeat(header.length));

  for (const item of result.results) {
    const name = item.name.substring(0, NAME_WIDTH - 1).padEnd(NAME_WIDTH);
    const kind = (item.kind || '').substring(0, KIND_WIDTH - 1).padEnd(KIND_WIDTH);
    const pathStr = item.path || '';
    lines.push(`${name}${kind}${pathStr}`);
  }

  // Metrics
  if (result.metrics) {
    const m = result.metrics;
    lines.push('');
    lines.push(chalk.cyan('Metrics:'));
    lines.push(chalk.gray(`   Index load: ${m.indexLoadTime.toFixed(2)}ms ${m.cacheHit ? '(cached)' : ''}`));
    lines.push(chalk.gray(`   Query: ${m.queryTime.toFixed(2)}ms`));
    lines.push(chalk.gray(`   Total: ${m.totalTime.toFixed(2)}ms`));
    lines.push(chalk.gray(`   Index size: ${m.indexSize} entries`));
  }

  return lines.join('\n');
}

/**
 * Query 命令实现
 */
export async function queryCommand(options: QueryOptions) {
  const rootDir = process.cwd();
  const limit = options.limit || 50;
  const useCache = options.cache !== false;  // 默认启用缓存
  const verbose = options.verbose || false;
  const useRegex = options.regex || false;
  const depsFormat = options.depsFormat || 'default';
  const caseSensitive = options.caseSensitive || false;
  const contextLines = typeof options.context === 'string' ? parseInt(options.context, 10) : (options.context || 0);
  const includeReferences = options.includeReferences || false;

  // Resolve output mode: --human/--json/no-flag = TTY auto-detect
  const mode: OutputMode = resolveOutputMode({ json: options.json, human: options.human });
  const progress = createProgressEmitter(mode, 'Querying...');

  // 清除缓存（如果指定 --no-cache）
  if (!useCache) {
    clearCache();
  }

  try {
    // 加载代码地图（带缓存）
    const startTotal = performance.now();
    const { codeMap, index, cacheHit, loadTime } = loadCodeMap(rootDir, useCache);

    if (!codeMap || !index) {
      const error = new Error('Code map not found, run codemap generate first') as Error & { code: string };
      error.code = 'INDEX_NOT_FOUND';
      throw error;
    }

    const indexLoadTime = loadTime;
    const indexSize = index.symbols.size + index.modules.size + index.dependencies.size;

    let result: QueryResult;
    const queryStartTime = performance.now();

    progress.update(30, 'Loading index...');

    // 执行查询
    if (options.symbol) {
      const items = querySymbol(index, codeMap, options.symbol, limit, caseSensitive, includeReferences, contextLines);
      result = {
        type: 'symbol',
        query: options.symbol,
        count: items.length,
        results: items,
      };
    } else if (options.module) {
      const items = queryModule(index, codeMap, options.module, limit);
      result = {
        type: 'module',
        query: options.module,
        count: items.length,
        results: items,
      };
    } else if (options.deps) {
      const deduplicate = depsFormat !== 'detailed';
      const items = queryDeps(index, codeMap, options.deps, limit, deduplicate);
      result = {
        type: 'deps',
        query: options.deps,
        count: items.length,
        results: items,
      };
    } else if (options.search) {
      const items = search(index, codeMap, options.search, limit, useRegex, caseSensitive, contextLines);
      result = {
        type: 'search',
        query: options.search,
        count: items.length,
        results: items,
      };
    } else {
      // No query type specified - output usage help
      const usageError = new Error('Please specify query type: --symbol, --module, --deps, or --search') as Error & { code: string; remediation: string };
      usageError.code = 'MISSING_QUERY_TYPE';
      usageError.remediation = 'Run codemap query --symbol <name> to search for symbols';
      throw usageError;
    }

    const queryTime = performance.now() - queryStartTime;
    const totalTime = performance.now() - startTotal;

    // 添加性能指标
    if (verbose) {
      result.metrics = {
        indexLoadTime,
        queryTime,
        totalTime,
        cacheHit,
        indexSize,
      };
    }

    // If structured mode, strip details field
    let data: QueryResult = result;
    if (options.structured) {
      data = {
        ...result,
        results: result.results.map(item => {
          const { details, ...rest } = item;
          void details;
          return rest;
        }),
      };
    }

    progress.complete();
    renderOutput(data, formatQueryHuman, mode);
  } catch (error) {
    progress.fail();
    process.stdout.write(formatError(error, mode, 'codemap query') + '\n');
    process.exitCode = 1;
  }
}
