// [META] since:2024-06 | owner:core-team | stable:true
// [WHY] Core analysis engine that orchestrates parsing, dependency analysis, and code map generation
import path from 'path';
import fs from 'fs/promises';
import type { CodeMap, AnalysisOptions, ModuleInfo, DependencyGraph, ProjectInfo, ProjectSummary } from '../types/index.js';
import type { ParseResult } from '../interface/types/parser.js';
import { isDeprecatedParserMode } from '../parser/index.js';
import { createGlobalIndex } from './global-index.js';
import { discoverProjectFiles, DEFAULT_DISCOVERY_EXCLUDES } from './file-discovery.js';
import { ErrorCodes } from '../cli/output/error-codes.js';

const DEFAULT_ANALYSIS_INCLUDE = ['src/**/*.{ts,tsx,js,jsx,py,go}'] as const;

// 主分析函数
export async function analyze(options: AnalysisOptions): Promise<CodeMap> {
  const {
    rootDir,
    include = [...DEFAULT_ANALYSIS_INCLUDE],
    exclude = DEFAULT_DISCOVERY_EXCLUDES,
    mode = 'tree-sitter',
    enhanceTypes = true,
    parserRegistry,
    typeEnhancers = [],
  } = options;

  if (isDeprecatedParserMode(mode)) {
    const error = new Error(
      `Parser mode "${mode}" is deprecated. Remove the mode override and use the default parser flow.`
    ) as Error & { code: string };
    error.code = ErrorCodes.DEPRECATED_PARSER_MODE;
    throw error;
  }

  // 1. 发现文件
  const files = await discoverProjectFiles({
    rootDir,
    include,
    exclude
  });

  if (!parserRegistry) {
    throw new Error('AnalysisOptions.parserRegistry is required. Use the composition root to build analysis context.');
  }

  const initializedParsers = new Set<string>();
  let parseResults: ParseResult[] = [];

  for (const file of files) {
    try {
      const parser = parserRegistry.getParserByFile(file);
      if (!parser) {
        console.warn(`Warning: No parser registered for ${file}`);
        continue;
      }

      if (!initializedParsers.has(parser.languageId)) {
        await parser.initialize();
        initializedParsers.add(parser.languageId);
      }

      const content = await fs.readFile(file, 'utf-8');
      const parsed = await parser.parseFile(file, content, {
        includeCallGraph: true,
        includeComplexity: true,
        includeTypeInfo: true,
      });

      parseResults.push(parsed);
    } catch (error) {
      console.warn(`Warning: Failed to parse ${file}: ${error}`);
    }
  }

  if (enhanceTypes) {
    for (const enhancer of typeEnhancers) {
      parseResults = await enhancer.enhance(parseResults);
    }
  }
  const modules = parseResults.map((result) => convertToModuleInfo(result));
  for (const enhancer of typeEnhancers) {
    enhancer.dispose();
  }
  await Promise.all(
    parserRegistry.getSupportedLanguages().map(async (language) => {
      const parser = parserRegistry.getParser(language);
      if (parser) {
        await parser.dispose();
      }
    })
  );

  // 3. 构建全局符号索引和跨文件调用链
  if (parseResults.length > 0) {
    try {
      console.log('[Analyzer] 构建全局符号索引...');
      const globalIndex = createGlobalIndex(parseResults, rootDir);
      
      // 将跨文件调用信息添加到模块
      for (const mod of modules) {
        const relativePath = path.relative(rootDir, mod.path);
        const calls = globalIndex.files.get(relativePath)?.crossFileCalls ?? [];
        
        if (calls.length > 0 && mod.callGraph) {
          // 增强 callGraph 包含跨文件调用信息
          mod.callGraph = {
            ...mod.callGraph,
            crossFileCalls: calls
          };
        }
      }
      
      console.log(`[Analyzer] 全局索引构建完成: ${globalIndex.symbols.size} 个符号`);
    } catch (error) {
      console.warn(`Warning: 全局索引构建失败: ${error}`);
    }
  }

  // 4. 构建依赖图
  const dependencies = buildDependencyGraph(modules);

  // 5. 计算摘要
  const summary = calculateSummary(modules);

  const graphIntegrity = calculateGraphIntegrity(files, modules);

  // 6. 获取项目信息
  const project = await getProjectInfo(rootDir);

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    project,
    summary,
    modules,
    dependencies,
    graphStatus: graphIntegrity.graphStatus,
    failedFileCount: graphIntegrity.failedFileCount,
    parseFailureFiles: graphIntegrity.parseFailureFiles,
  };
}

// 转换 ParseResult 到 ModuleInfo
function convertToModuleInfo(result: ParseResult): ModuleInfo {
  return {
    id: createModuleId(result.filePath),
    path: result.filePath,
    absolutePath: result.filePath,
    type: categorizeParsedFile(result.filePath),
    stats: result.module.stats,
    exports: result.exports,
    imports: result.imports,
    symbols: result.symbols,
    dependencies: Array.from(new Set(result.imports.map((entry) => resolveDependencyPath(result.filePath, entry.source)))),
    dependents: [],
    complexity: result.complexity,
    callGraph: result.callGraph
      ? {
          calls: result.callGraph.calls,
          recursive: result.callGraph.recursive,
          issues: result.callGraph.issues,
          callCounts: result.callGraph.calls.reduce<Record<string, number>>((counts, call) => {
            counts[call.callee] = (counts[call.callee] ?? 0) + 1;
            return counts;
          }, {}),
        }
      : undefined,
    typeInfo: result.typeInfo
  };
}

function categorizeParsedFile(filePath: string): ModuleInfo['type'] {
  if (filePath.includes('.test.') || filePath.includes('.spec.')) return 'test';
  if (filePath.includes('config.') || filePath.endsWith('config.ts')) return 'config';
  return 'source';
}

function resolveDependencyPath(fromPath: string, importPath: string): string {
  if (!importPath.startsWith('.')) {
    return importPath;
  }

  const resolved = path.resolve(path.dirname(fromPath), importPath);
  if (/\.(ts|tsx|js|jsx|py|go)$/i.test(resolved)) {
    return resolved;
  }

  return `${resolved}.ts`;
}

function calculateGraphIntegrity(
  discoveredFiles: string[],
  modules: ModuleInfo[]
): Pick<CodeMap, 'graphStatus' | 'failedFileCount' | 'parseFailureFiles'> {
  const discoveredSet = new Set(discoveredFiles.map(filePath => normalizePath(filePath)));
  const parsedSet = new Set(modules.map(moduleInfo => normalizePath(moduleInfo.path)));
  const parseFailureFiles = [...discoveredSet]
    .filter(filePath => !parsedSet.has(filePath))
    .sort();

  return {
    graphStatus: parseFailureFiles.length > 0 ? 'partial' : 'complete',
    failedFileCount: parseFailureFiles.length,
    parseFailureFiles: parseFailureFiles.length > 0 ? parseFailureFiles : undefined,
  };
}

// 构建依赖图
function buildDependencyGraph(modules: ModuleInfo[]): DependencyGraph {
  const nodes: DependencyGraph['nodes'] = [];
  const edges: DependencyGraph['edges'] = [];

  // 创建模块索引，支持扩展名和 index.ts 变体
  const moduleIndex = new Map<string, ModuleInfo>();
  for (const mod of modules) {
    const absPath = normalizePath(mod.absolutePath || mod.path);
    const lookupKeys = buildLookupKeys(absPath);
    for (const key of lookupKeys) {
      moduleIndex.set(key, mod);
    }
  }

  const edgeSet = new Set<string>();

  for (const mod of modules) {
    // 添加节点
    nodes.push({
      id: mod.id,
      path: mod.path,
      category: categorizeModule(mod.path)
    });

    // 添加边 - 基于真实导入路径解析，避免模糊匹配导致误连
    const fromPath = normalizePath(mod.absolutePath || mod.path);
    for (const depPath of mod.dependencies) {
      const targetMod = resolveDependencyModule(fromPath, depPath, moduleIndex);

      if (targetMod && targetMod.id !== mod.id) {
        const edgeKey = `${mod.id}->${targetMod.id}:import`;
        if (edgeSet.has(edgeKey)) continue;
        edgeSet.add(edgeKey);

        edges.push({
          from: mod.id,
          to: targetMod.id,
          type: 'import',
          weight: 1
        });
      }
    }
  }

  // 回填反向依赖，保证 context/deps/impact 可直接消费
  const moduleById = new Map(modules.map(mod => [mod.id, mod]));
  for (const mod of modules) {
    mod.dependents = [];
  }
  for (const edge of edges) {
    const target = moduleById.get(edge.to);
    if (!target) continue;
    if (!target.dependents.includes(edge.from)) {
      target.dependents.push(edge.from);
    }
  }

  return { nodes, edges };
}

function createModuleId(filePath: string): string {
  const input = normalizePath(filePath);
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function normalizePath(filePath: string): string {
  return path.normalize(filePath).replace(/\\/g, '/');
}

function stripKnownExt(filePath: string): string {
  return filePath.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/i, '');
}

function buildLookupKeys(filePath: string): string[] {
  const normalized = normalizePath(filePath);
  const withoutExt = stripKnownExt(normalized);
  const keys = new Set<string>([normalized, withoutExt]);

  if (withoutExt.endsWith('/index')) {
    keys.add(withoutExt.slice(0, -('/index'.length)));
  }

  return Array.from(keys);
}

function resolveDependencyModule(
  importerPath: string,
  depPath: string,
  moduleIndex: Map<string, ModuleInfo>
): ModuleInfo | undefined {
  const rawDep = depPath.trim();
  const dep = normalizePath(rawDep);
  const candidates: string[] = [];

  const isRelative = rawDep.startsWith('./') || rawDep.startsWith('../') || rawDep.startsWith('.\\') || rawDep.startsWith('..\\');
  if (isRelative) {
    candidates.push(normalizePath(path.resolve(path.dirname(importerPath), rawDep)));
  } else if (path.isAbsolute(dep)) {
    candidates.push(dep);
  } else {
    // node_modules / alias 依赖不纳入本地模块边
    return undefined;
  }

  for (const candidate of candidates) {
    const withoutExt = stripKnownExt(candidate);
    const expanded = [
      candidate,
      withoutExt,
      `${withoutExt}.ts`,
      `${withoutExt}.tsx`,
      `${withoutExt}.js`,
      `${withoutExt}/index`,
      `${withoutExt}/index.ts`,
      `${withoutExt}/index.tsx`,
      `${withoutExt}/index.js`
    ];

    for (const key of expanded) {
      const module = moduleIndex.get(normalizePath(key));
      if (module) return module;
    }
  }

  return undefined;
}

// 计算摘要
function calculateSummary(modules: ModuleInfo[]): ProjectSummary {
  let totalLines = 0;
  let totalExports = 0;

  for (const mod of modules) {
    totalLines += mod.stats.lines;
    totalExports += mod.exports.length;
  }

  return {
    totalFiles: modules.length,
    totalLines,
    totalModules: modules.length,
    totalExports,
    totalTypes: modules.filter(m => m.type === 'source').length
  };
}

// 获取项目信息
async function getProjectInfo(rootDir: string): Promise<ProjectInfo> {
  let name = path.basename(rootDir);
  let packageManager: ProjectInfo['packageManager'] = 'npm';
  let tsconfigPath: string | undefined;

  // 检查 tsconfig.json
  try {
    const tsconfig = path.join(rootDir, 'tsconfig.json');
    await fs.access(tsconfig);
    tsconfigPath = tsconfig;
  } catch {
    // tsconfig 不存在
  }

  // 检查 package.json
  try {
    const pkgPath = path.join(rootDir, 'package.json');
    const content = await fs.readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);
    name = pkg.name || name;

    // 检查包管理器
    if (await hasFile(rootDir, 'pnpm-lock.yaml')) {
      packageManager = 'pnpm';
    } else if (await hasFile(rootDir, 'yarn.lock')) {
      packageManager = 'yarn';
    } else if (await hasFile(rootDir, 'package-lock.json')) {
      packageManager = 'npm';
    }
  } catch {
    // package.json 不存在
  }

  return {
    name,
    rootDir,
    tsconfigPath,
    packageManager
  };
}

// 辅助函数：检查文件是否存在
async function hasFile(dir: string, filename: string): Promise<boolean> {
  try {
    await fs.access(path.join(dir, filename));
    return true;
  } catch {
    return false;
  }
}

// 分类模块
function categorizeModule(filePath: string): DependencyGraph['nodes'][0]['category'] {
  const lower = filePath.toLowerCase();
  if (lower.includes('core') || lower.includes('engine')) return 'core';
  if (lower.includes('feature') || lower.includes('module')) return 'feature';
  if (lower.includes('util') || lower.includes('helper')) return 'utility';
  return 'feature';
}
