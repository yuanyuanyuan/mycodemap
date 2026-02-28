import path from 'path';
import fs from 'fs/promises';
import { globby } from 'globby';
import { parseFile, createParser } from '../parser/index.js';
import type { CodeMap, AnalysisOptions, ModuleInfo, DependencyGraph, ProjectInfo, ProjectSummary } from '../types/index.js';
import type { ParseResult } from '../parser/interfaces/IParser.js';
import { createGlobalIndex, GlobalSymbolIndexBuilder } from './global-index.js';

// 默认排除模式
const DEFAULT_EXCLUDE = [
  'node_modules/**',
  'dist/**',
  'build/**',
  '.git/**',
  'coverage/**',
  '*.test.ts',
  '*.spec.ts',
  '*.d.ts'
];

// 阈值配置
const HYBRID_THRESHOLD = 50; // 文件数 >= 50 时使用 Smart 模式

// 主分析函数
export async function analyze(options: AnalysisOptions): Promise<CodeMap> {
  const { rootDir, include = ['src/**/*.ts'], exclude = DEFAULT_EXCLUDE, mode = 'hybrid' } = options;

  // 1. 发现文件
  const files = await discoverFiles(rootDir, include, exclude);

  // 2. Hybrid 模式自动选择
  let actualMode: 'fast' | 'smart' = mode === 'hybrid' ? 'fast' : (mode as 'fast' | 'smart');
  if (mode === 'hybrid') {
    if (files.length >= HYBRID_THRESHOLD) {
      actualMode = 'smart';
    } else {
      actualMode = 'fast';
    }
    console.log(`[Hybrid] 检测到 ${files.length} 个文件，自动选择 ${actualMode} 模式`);
  }

  // 3. 解析文件
  const modules: ModuleInfo[] = [];
  let parseResults: ParseResult[] = [];

  // 根据实际模式选择解析器
  if (actualMode === 'smart') {
    // Smart 模式：使用 SmartParser 获取复杂度、调用图、完整类型信息
    const parser = createParser({ mode: 'smart', rootDir });
    try {
      parseResults = await parser.parseFiles(files);

      // 转换 ParseResult 到 ModuleInfo
      for (const result of parseResults) {
        const moduleInfo = convertToModuleInfo(result);
        modules.push(moduleInfo);
      }
    } catch (error) {
      console.warn(`Warning: Smart parse failed, falling back: ${error}`);
      // Fallback to basic parser
      for (const file of files) {
        try {
          const moduleInfo = await parseFile(file);
          moduleInfo.id = createModuleId(moduleInfo.path);
          moduleInfo.dependencies = Array.from(new Set(moduleInfo.dependencies));
          modules.push(moduleInfo);
        } catch (e) {
          console.warn(`Warning: Failed to parse ${file}: ${e}`);
        }
      }
    }
  } else {
    // Fast 模式：使用基础解析器
    for (const file of files) {
      try {
        const moduleInfo = await parseFile(file);
        moduleInfo.id = createModuleId(moduleInfo.path);
        moduleInfo.dependencies = Array.from(new Set(moduleInfo.dependencies));
        modules.push(moduleInfo);
      } catch (error) {
        console.warn(`Warning: Failed to parse ${file}: ${error}`);
      }
    }
  }

  // 4. Smart 模式下构建全局符号索引和跨文件调用链
  if (actualMode === 'smart' && parseResults.length > 0) {
    try {
      console.log('[Analyzer] 构建全局符号索引...');
      const globalIndex = createGlobalIndex(parseResults, rootDir);
      
      // 将跨文件调用信息添加到模块
      for (const mod of modules) {
        const relativePath = path.relative(rootDir, mod.path);
        const builder = new GlobalSymbolIndexBuilder(rootDir);
        const calls = builder.getCrossFileCalls(relativePath);
        
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

  // 5. 构建依赖图
  const dependencies = buildDependencyGraph(modules);

  // 6. 计算摘要
  const summary = calculateSummary(modules);

  // 7. 获取项目信息
  const project = await getProjectInfo(rootDir);

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    project,
    summary,
    modules,
    dependencies,
    actualMode
  };
}

// 转换 ParseResult 到 ModuleInfo
function convertToModuleInfo(result: ParseResult): ModuleInfo {
  return {
    id: createModuleId(result.path),
    path: result.path,
    absolutePath: result.path,
    type: result.type,
    stats: result.stats,
    exports: result.exports,
    imports: result.imports,
    symbols: result.symbols,
    dependencies: Array.from(new Set(result.dependencies)),
    dependents: [],
    // Smart 模式额外信息
    complexity: result.complexity,
    callGraph: result.callGraph,
    typeInfo: result.typeInfo
  };
}

// 发现文件
async function discoverFiles(rootDir: string, include: string[], exclude: string[]): Promise<string[]> {
  const patterns = include.map(p => path.join(rootDir, p));
  const files = await globby(patterns, {
    ignore: exclude,
    absolute: true,
    onlyFiles: true
  });

  // 只返回 .ts 文件
  return files.filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));
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
