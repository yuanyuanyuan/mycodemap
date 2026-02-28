// ============================================
// Worker Thread Pool - 解析任务工作线程
// ============================================

import { parentPort, workerData } from 'worker_threads';
import * as fs from 'fs/promises';
import * as path from 'path';

// 工作线程数据
interface WorkerTask {
  filePath: string;
  rootDir: string;
  parserType: 'fast' | 'smart' | 'tree-sitter';
}

// 解析结果
interface ParseResult {
  path: string;
  exports: any[];
  imports: any[];
  symbols: any[];
  dependencies: string[];
  type: 'source' | 'test' | 'config' | 'type';
  stats: {
    lines: number;
    codeLines: number;
    commentLines: number;
    blankLines: number;
  };
  error?: string;
}

// 解析文件
async function parseFile(task: WorkerTask): Promise<ParseResult> {
  try {
    const content = await fs.readFile(task.filePath, 'utf-8');

    // 基础统计
    const lines = content.split('\n');
    let commentLines = 0;
    let blankLines = 0;

    // 简单统计
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') {
        blankLines++;
      } else if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        commentLines++;
      }
    }

    // 检测模块类型
    const basename = path.basename(task.filePath);
    let type: 'source' | 'test' | 'config' | 'type' = 'source';
    if (basename.includes('.test.') || basename.includes('.spec.')) {
      type = 'test';
    } else if (basename.startsWith('.') || basename.endsWith('.config.ts')) {
      type = 'config';
    } else if (basename.includes('.d.ts')) {
      type = 'type';
    }

    // 提取导入
    const imports = extractImports(content);

    // 提取导出
    const exports = extractExports(content);

    // 提取符号
    const symbols = extractSymbols(content);

    // 提取依赖
    const dependencies = extractDependencies(imports);

    return {
      path: task.filePath,
      exports,
      imports,
      symbols,
      dependencies,
      type,
      stats: {
        lines: lines.length,
        codeLines: lines.length - commentLines - blankLines,
        commentLines,
        blankLines
      }
    };
  } catch (error) {
    return {
      path: task.filePath,
      exports: [],
      imports: [],
      symbols: [],
      dependencies: [],
      type: 'source',
      stats: {
        lines: 0,
        codeLines: 0,
        commentLines: 0,
        blankLines: 0
      },
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// 提取导入语句
function extractImports(content: string): any[] {
  const imports: any[] = [];
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const source = match[1];
    imports.push({
      source,
      sourceType: source.startsWith('.') ? 'relative' : 'node_module',
      specifiers: [],
      isTypeOnly: false
    });
  }

  return imports;
}

// 提取导出语句
function extractExports(content: string): any[] {
  const exports: any[] = [];

  // 命名导出: export { a, b }
  const namedExportRegex = /export\s+\{([^}]+)\}/g;
  let match;
  while ((match = namedExportRegex.exec(content)) !== null) {
    const names = match[1].split(',').map((n: string) => n.trim());
    for (const name of names) {
      exports.push({
        name,
        kind: 'function',
        isDefault: false,
        isTypeOnly: false
      });
    }
  }

  // 导出声明: export class/function/const/interface/type
  const exportDeclRegex = /export\s+(class|function|const|let|var|interface|type|enum)\s+(\w+)/g;
  while ((match = exportDeclRegex.exec(content)) !== null) {
    exports.push({
      name: match[2],
      kind: match[1] === 'class' ? 'class' :
            match[1] === 'function' ? 'function' :
            match[1] === 'interface' ? 'interface' :
            match[1] === 'type' ? 'type' :
            match[1] === 'enum' ? 'enum' : 'type',
      isDefault: false,
      isTypeOnly: false
    });
  }

  // 默认导出
  if (content.includes('export default')) {
    exports.push({
      name: 'default',
      kind: 'function',
      isDefault: true,
      isTypeOnly: false
    });
  }

  return exports;
}

// 提取符号
function extractSymbols(content: string): any[] {
  const symbols: any[] = [];

  // 类声明
  const classRegex = /(?:export\s+)?class\s+(\w+)/g;
  let match;
  while ((match = classRegex.exec(content)) !== null) {
    symbols.push({
      id: `class-${match[1]}`,
      name: match[1],
      kind: 'class',
      location: { file: '', line: 0, column: 0 },
      visibility: 'public',
      relatedSymbols: []
    });
  }

  // 函数声明
  const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
  while ((match = funcRegex.exec(content)) !== null) {
    symbols.push({
      id: `func-${match[1]}`,
      name: match[1],
      kind: 'function',
      location: { file: '', line: 0, column: 0 },
      visibility: 'public',
      relatedSymbols: []
    });
  }

  // 接口声明
  const interfaceRegex = /(?:export\s+)?interface\s+(\w+)/g;
  while ((match = interfaceRegex.exec(content)) !== null) {
    symbols.push({
      id: `iface-${match[1]}`,
      name: match[1],
      kind: 'interface',
      location: { file: '', line: 0, column: 0 },
      visibility: 'public',
      relatedSymbols: []
    });
  }

  return symbols;
}

// 提取依赖
function extractDependencies(imports: any[]): string[] {
  const deps = new Set<string>();
  for (const imp of imports) {
    if (!imp.source.startsWith('.')) {
      deps.add(imp.source);
    }
  }
  return Array.from(deps);
}

// 主逻辑
async function main() {
  const task = workerData as WorkerTask;
  const result = await parseFile(task);

  if (parentPort) {
    parentPort.postMessage(result);
  }
}

main().catch((error) => {
  console.error('Worker error:', error);
  if (parentPort) {
    parentPort.postMessage({ error: error.message });
  }
});
