import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import type { CodeMap, ModuleInfo, ExportInfo, ModuleSymbol } from '../../types/index.js';

interface QueryOptions {
  symbol?: string;
  module?: string;
  deps?: string;
  search?: string;
  limit?: number;
  json?: boolean;
}

interface QueryResult {
  type: 'symbol' | 'module' | 'deps' | 'search';
  query: string;
  count: number;
  results: QueryResultItem[];
}

interface QueryResultItem {
  name: string;
  path?: string;
  kind?: string;
  details?: string;
}

/**
 * 加载代码地图数据
 */
function loadCodeMap(rootDir: string): CodeMap | null {
  const codemapPath = path.join(rootDir, '.codemap', 'codemap.json');

  if (!fs.existsSync(codemapPath)) {
    console.log(chalk.red('❌ 代码地图不存在，请先运行 codemap generate'));
    return null;
  }

  try {
    const data = fs.readFileSync(codemapPath, 'utf-8');
    return JSON.parse(data) as CodeMap;
  } catch (error) {
    console.log(chalk.red('❌ 读取代码地图失败:', error instanceof Error ? error.message : String(error)));
    return null;
  }
}

/**
 * 查询符号
 */
function querySymbol(codeMap: CodeMap, symbolName: string, limit: number): QueryResultItem[] {
  const results: QueryResultItem[] = [];

  for (const module of codeMap.modules) {
    // 搜索导出
    for (const exp of module.exports) {
      if (exp.name.toLowerCase() === symbolName.toLowerCase()) {
        results.push({
          name: exp.name,
          path: module.absolutePath,
          kind: exp.kind,
          details: `导出于 ${path.relative(codeMap.project.rootDir, module.absolutePath)}`
        });
      }
    }

    // 搜索符号
    for (const sym of module.symbols) {
      if (sym.name.toLowerCase() === symbolName.toLowerCase()) {
        results.push({
          name: sym.name,
          path: module.absolutePath,
          kind: sym.kind,
          details: `定义于 ${path.relative(codeMap.project.rootDir, module.absolutePath)}:${sym.location.line}`
        });
      }
    }
  }

  return results.slice(0, limit);
}

/**
 * 查询模块
 */
function queryModule(codeMap: CodeMap, modulePath: string, limit: number): QueryResultItem[] {
  const results: QueryResultItem[] = [];
  const searchPath = modulePath.toLowerCase();

  for (const module of codeMap.modules) {
    const relativePath = path.relative(codeMap.project.rootDir, module.absolutePath).toLowerCase();

    if (relativePath.includes(searchPath) || module.absolutePath.toLowerCase().includes(searchPath)) {
      const exports = module.exports.map(e => e.name).join(', ') || '无导出';
      results.push({
        name: path.relative(codeMap.project.rootDir, module.absolutePath),
        path: module.absolutePath,
        kind: module.type,
        details: `导出: ${exports}`
      });
    }
  }

  return results.slice(0, limit);
}

/**
 * 查询依赖
 */
function queryDeps(codeMap: CodeMap, depName: string, limit: number): QueryResultItem[] {
  const results: QueryResultItem[] = [];
  const searchDep = depName.toLowerCase();

  for (const module of codeMap.modules) {
    // 检查直接依赖
    for (const dep of module.dependencies) {
      if (dep.toLowerCase().includes(searchDep)) {
        results.push({
          name: dep,
          path: module.absolutePath,
          kind: 'dependency',
          details: `被 ${path.relative(codeMap.project.rootDir, module.absolutePath)} 引用`
        });
      }
    }

    // 检查导入
    for (const imp of module.imports) {
      if (imp.source.toLowerCase().includes(searchDep)) {
        results.push({
          name: imp.source,
          path: module.absolutePath,
          kind: 'import',
          details: `导入自 ${path.relative(codeMap.project.rootDir, module.absolutePath)}`
        });
      }
    }
  }

  // 去重
  const unique = new Map<string, QueryResultItem>();
  for (const item of results) {
    const key = `${item.name}:${item.path}`;
    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  return Array.from(unique.values()).slice(0, limit);
}

/**
 * 模糊搜索
 */
function search(codeMap: CodeMap, keyword: string, limit: number): QueryResultItem[] {
  const results: QueryResultItem[] = [];
  const search = keyword.toLowerCase();

  for (const module of codeMap.modules) {
    const relativePath = path.relative(codeMap.project.rootDir, module.absolutePath).toLowerCase();

    // 匹配模块路径
    if (relativePath.includes(search)) {
      results.push({
        name: path.relative(codeMap.project.rootDir, module.absolutePath),
        path: module.absolutePath,
        kind: 'module',
        details: `模块匹配`
      });
    }

    // 匹配导出
    for (const exp of module.exports) {
      if (exp.name.toLowerCase().includes(search)) {
        results.push({
          name: exp.name,
          path: module.absolutePath,
          kind: `export (${exp.kind})`,
          details: `导出于 ${path.relative(codeMap.project.rootDir, module.absolutePath)}`
        });
      }
    }

    // 匹配符号
    for (const sym of module.symbols) {
      if (sym.name.toLowerCase().includes(search)) {
        results.push({
          name: sym.name,
          path: module.absolutePath,
          kind: sym.kind,
          details: `定义于 ${path.relative(codeMap.project.rootDir, module.absolutePath)}:${sym.location.line}`
        });
      }
    }
  }

  return results.slice(0, limit);
}

/**
 * 格式化输出结果
 */
function formatResults(result: QueryResult, isJson: boolean): void {
  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(chalk.cyan(`\n🔍 查询 "${result.query}" (${result.type})`));
  console.log(chalk.gray(`   找到 ${result.count} 个结果\n`));

  if (result.count === 0) {
    console.log(chalk.yellow('   未找到匹配结果'));
    return;
  }

  for (const item of result.results) {
    console.log(chalk.green(`   ${item.name}`));
    if (item.kind) {
      console.log(chalk.gray(`      类型: ${item.kind}`));
    }
    if (item.path) {
      console.log(chalk.gray(`      路径: ${item.path}`));
    }
    if (item.details) {
      console.log(chalk.gray(`      ${item.details}`));
    }
    console.log('');
  }
}

/**
 * Query 命令实现
 */
export async function queryCommand(options: QueryOptions) {
  const rootDir = process.cwd();
  const limit = options.limit || 20;

  // 加载代码地图
  const codeMap = loadCodeMap(rootDir);
  if (!codeMap) {
    process.exit(1);
  }

  let result: QueryResult;

  // 执行查询
  if (options.symbol) {
    const items = querySymbol(codeMap, options.symbol, limit);
    result = {
      type: 'symbol',
      query: options.symbol,
      count: items.length,
      results: items
    };
  } else if (options.module) {
    const items = queryModule(codeMap, options.module, limit);
    result = {
      type: 'module',
      query: options.module,
      count: items.length,
      results: items
    };
  } else if (options.deps) {
    const items = queryDeps(codeMap, options.deps, limit);
    result = {
      type: 'deps',
      query: options.deps,
      count: items.length,
      results: items
    };
  } else if (options.search) {
    const items = search(codeMap, options.search, limit);
    result = {
      type: 'search',
      query: options.search,
      count: items.length,
      results: items
    };
  } else {
    console.log(chalk.red('❌ 请指定查询类型: --symbol, --module, --deps, 或 --search'));
    console.log(chalk.gray('\n用法:'));
    console.log(chalk.gray('   codemap query --symbol <name>    # 查询符号'));
    console.log(chalk.gray('   codemap query --module <path>   # 查询模块'));
    console.log(chalk.gray('   codemap query --deps <name>    # 查询依赖'));
    console.log(chalk.gray('   codemap query --search <word>  # 模糊搜索'));
    process.exit(1);
  }

  // 输出结果
  formatResults(result, options.json || false);
}
