// ============================================
// Global Symbol Index - 全局符号索引
// 支持跨文件调用链分析
// ============================================

import * as path from 'path';
import type {
  GlobalSymbolIndex,
  FileSymbolIndex,
  GlobalSymbolInfo,
  CrossFileCall,
  ImportInfo,
  ExportInfo,
  ModuleSymbol,
  SymbolKind,
  SourceLocation,
  CallChain,
  CallChainEntry
} from '../types/index.js';
import type { ParseResult } from '../parser/interfaces/IParser.js';

/**
 * 全局符号索引构建器
 * 
 * 功能：
 * 1. 收集所有文件的导出符号
 * 2. 建立 import -> export 映射
 * 3. 解析跨文件调用关系
 * 4. 构建调用链
 */
export class GlobalSymbolIndexBuilder {
  private index: GlobalSymbolIndex;
  private rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.index = {
      symbols: new Map(),
      files: new Map()
    };
  }

  /**
   * 从解析结果构建全局索引
   */
  build(results: ParseResult[]): GlobalSymbolIndex {
    // 第1步：为每个文件建立本地符号索引
    for (const result of results) {
      this.buildFileIndex(result);
    }

    // 第2步：解析跨文件调用
    for (const result of results) {
      this.resolveCrossFileCalls(result);
    }

    // 第3步：构建全局符号表
    this.buildGlobalSymbolTable();

    return this.index;
  }

  /**
   * 为单个文件建立符号索引
   */
  private buildFileIndex(result: ParseResult): void {
    const filePath = result.path;
    const relativePath = path.relative(this.rootDir, filePath);

    const fileIndex: FileSymbolIndex = {
      filePath: relativePath,
      imports: new Map(),
      exports: new Map(),
      localSymbols: new Map(),
      crossFileCalls: []
    };

    // 索引导入
    for (const imp of result.imports) {
      const key = this.getImportKey(imp);
      fileIndex.imports.set(key, imp);
    }

    // 索引导出符号
    for (const exp of result.exports) {
      const symbolInfo: GlobalSymbolInfo = {
        name: exp.name,
        kind: exp.kind,
        filePath: relativePath,
        line: 0, // 从 symbols 中查找
        column: 0,
        isExported: true,
        isDefault: exp.isDefault
      };

      // 查找符号的详细位置
      const matchingSymbol = result.symbols.find(s => s.name === exp.name);
      if (matchingSymbol) {
        symbolInfo.line = matchingSymbol.location.line;
        symbolInfo.column = matchingSymbol.location.column;
      }

      fileIndex.exports.set(exp.name, symbolInfo);
    }

    // 索引本地符号
    for (const sym of result.symbols) {
      const symbolInfo: GlobalSymbolInfo = {
        name: sym.name,
        kind: sym.kind,
        filePath: relativePath,
        line: sym.location.line,
        column: sym.location.column,
        isExported: result.exports.some(e => e.name === sym.name)
      };

      fileIndex.localSymbols.set(sym.name, symbolInfo);
    }

    this.index.files.set(relativePath, fileIndex);
  }

  /**
   * 解析跨文件调用
   */
  private resolveCrossFileCalls(result: ParseResult): void {
    const filePath = result.path;
    const relativePath = path.relative(this.rootDir, filePath);
    const fileIndex = this.index.files.get(relativePath);

    if (!fileIndex || !result.callGraph) return;

    for (const call of result.callGraph.calls) {
      const calleeName = call.callee;

      // 检查是否是本地调用
      if (fileIndex.localSymbols.has(calleeName)) {
        continue; // 本地调用，无需处理
      }

      // 尝试解析为跨文件调用
      const resolved = this.resolveCallee(calleeName, fileIndex);

      if (resolved) {
        fileIndex.crossFileCalls.push({
          callee: calleeName,
          calleeLocation: resolved.location,
          callerLocation: {
            file: relativePath,
            line: call.line,
            column: 0
          },
          importPath: resolved.importPath,
          resolved: true
        });
      } else {
        // 未解析的调用（可能是外部库）
        fileIndex.crossFileCalls.push({
          callee: calleeName,
          calleeLocation: { file: '', line: 0, column: 0 },
          callerLocation: {
            file: relativePath,
            line: call.line,
            column: 0
          },
          resolved: false
        });
      }
    }
  }

  /**
   * 解析被调用者位置
   */
  private resolveCallee(calleeName: string, fileIndex: FileSymbolIndex): {
    location: SourceLocation;
    importPath?: string;
  } | null {
    // 1. 检查是否是命名导入
    for (const [alias, imp] of fileIndex.imports) {
      // 检查是否是默认导入 (import name from './module')
      // 默认导入通常是单个导入且没有花括号
      const isDefaultImport = imp.specifiers.length === 1 && 
                              alias === imp.specifiers[0].name;
      
      if (isDefaultImport && calleeName === alias) {
        // 查找导入来源的导出符号
        const targetFile = this.findFileByImport(imp.source);
        if (targetFile) {
          const targetIndex = this.index.files.get(targetFile);
          if (targetIndex) {
            const defaultExport = [...targetIndex.exports.values()].find(e => e.isDefault);
            if (defaultExport) {
              return {
                location: {
                  file: targetFile,
                  line: defaultExport.line,
                  column: defaultExport.column
                },
                importPath: imp.source
              };
            }
          }
        }
      }

      // 检查命名导入
      for (const spec of imp.specifiers) {
        if (spec.name === calleeName || spec.alias === calleeName) {
          const searchName = spec.alias || spec.name;
          const targetFile = this.findFileByImport(imp.source);
          if (targetFile) {
            const targetIndex = this.index.files.get(targetFile);
            if (targetIndex) {
              const targetSymbol = targetIndex.exports.get(searchName) ||
                                   targetIndex.localSymbols.get(searchName);
              if (targetSymbol) {
                return {
                  location: {
                    file: targetFile,
                    line: targetSymbol.line,
                    column: targetSymbol.column
                  },
                  importPath: imp.source
                };
              }
            }
          }
        }
      }
    }

    // 2. 检查是否是路径导入（如 import * as foo from './bar'）
    const parts = calleeName.split('.');
    if (parts.length > 1) {
      const namespace = parts[0];
      const memberName = parts[1];

      for (const [alias, imp] of fileIndex.imports) {
        if (alias === namespace) {
          const targetFile = this.findFileByImport(imp.source);
          if (targetFile) {
            const targetIndex = this.index.files.get(targetFile);
            if (targetIndex) {
              const targetSymbol = targetIndex.exports.get(memberName) ||
                                   targetIndex.localSymbols.get(memberName);
              if (targetSymbol) {
                return {
                  location: {
                    file: targetFile,
                    line: targetSymbol.line,
                    column: targetSymbol.column
                  },
                  importPath: imp.source
                };
              }
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * 根据导入路径查找文件
   */
  private findFileByImport(importPath: string): string | null {
    // 处理相对路径
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      // 尝试直接匹配
      for (const filePath of this.index.files.keys()) {
        // 移除 .ts 扩展名进行比较
        const normalizedFile = filePath.replace(/\.ts$/, '');
        const normalizedImport = importPath.replace(/\.ts$/, '');
        
        if (normalizedFile.endsWith(normalizedImport) ||
            normalizedFile.includes('/' + normalizedImport) ||
            normalizedFile === normalizedImport) {
          return filePath;
        }
      }
    }

    // 处理路径别名（简化版，实际应该解析 tsconfig paths）
    // TODO: 从 tsconfig.json 解析路径映射

    return null;
  }

  /**
   * 构建全局符号表
   */
  private buildGlobalSymbolTable(): void {
    for (const fileIndex of this.index.files.values()) {
      // 添加导出符号到全局表
      for (const [name, symbol] of fileIndex.exports) {
        const existing = this.index.symbols.get(name) || [];
        existing.push(symbol);
        this.index.symbols.set(name, existing);
      }

      // 添加本地符号到全局表（用于查找）
      for (const [name, symbol] of fileIndex.localSymbols) {
        if (!fileIndex.exports.has(name)) {
          const existing = this.index.symbols.get(name) || [];
          existing.push(symbol);
          this.index.symbols.set(name, existing);
        }
      }
    }
  }

  /**
   * 获取导入的键
   */
  private getImportKey(imp: ImportInfo): string {
    // 如果有命名导入，使用第一个作为键
    if (imp.specifiers.length > 0) {
      return imp.specifiers[0].alias || imp.specifiers[0].name;
    }
    return imp.source;
  }

  /**
   * 查找符号的定义位置
   */
  findSymbol(name: string): GlobalSymbolInfo[] {
    return this.index.symbols.get(name) || [];
  }

  /**
   * 获取文件的跨文件调用
   */
  getCrossFileCalls(filePath: string): CrossFileCall[] {
    const fileIndex = this.index.files.get(filePath);
    return fileIndex?.crossFileCalls || [];
  }

  /**
   * 构建调用链
   */
  buildCallChain(startSymbol: string, maxDepth: number = 5): CallChain {
    const entries: CallChainEntry[] = [];
    const visited = new Set<string>();

    const buildChain = (symbolName: string, depth: number, sourceFile: string) => {
      if (depth > maxDepth || visited.has(symbolName)) return;
      visited.add(symbolName);

      // 查找符号信息
      const symbols = this.findSymbol(symbolName);
      if (symbols.length === 0) return;

      // 使用第一个匹配
      const symbol = symbols.find(s => s.filePath === sourceFile) || symbols[0];

      entries.push({
        file: symbol.filePath,
        symbol: symbol.name,
        line: symbol.line,
        column: symbol.column,
        callType: symbol.filePath === sourceFile ? 'local' : 'cross-file'
      });

      // 查找该符号的调用
      const fileIndex = this.index.files.get(symbol.filePath);
      if (!fileIndex) return;

      for (const call of fileIndex.crossFileCalls) {
        if (call.callerLocation.file === symbol.filePath &&
            call.callerLocation.line === symbol.line) {
          buildChain(call.callee, depth + 1, symbol.filePath);
        }
      }
    };

    // 从所有文件查找起始符号
    for (const [filePath, fileIndex] of this.index.files) {
      if (fileIndex.localSymbols.has(startSymbol) ||
          fileIndex.exports.has(startSymbol)) {
        buildChain(startSymbol, 0, filePath);
        break;
      }
    }

    return {
      entries,
      depth: entries.length
    };
  }

  /**
   * 获取模块的依赖图
   */
  getModuleDependencyGraph(): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    for (const [filePath, fileIndex] of this.index.files) {
      const deps = new Set<string>();

      // 从导入收集依赖
      for (const imp of fileIndex.imports.values()) {
        if (imp.source.startsWith('./') || imp.source.startsWith('../')) {
          const targetFile = this.findFileByImport(imp.source);
          if (targetFile) {
            deps.add(targetFile);
          }
        }
      }

      // 从跨文件调用收集依赖
      for (const call of fileIndex.crossFileCalls) {
        if (call.resolved && call.calleeLocation.file) {
          deps.add(call.calleeLocation.file);
        }
      }

      graph.set(filePath, deps);
    }

    return graph;
  }
}

/**
 * 创建全局符号索引
 */
export function createGlobalIndex(
  results: ParseResult[],
  rootDir: string
): GlobalSymbolIndex {
  const builder = new GlobalSymbolIndexBuilder(rootDir);
  return builder.build(results);
}

/**
 * 查找符号定义
 */
export function findSymbolDefinition(
  index: GlobalSymbolIndex,
  name: string,
  currentFile?: string
): GlobalSymbolInfo | undefined {
  const symbols = index.symbols.get(name);
  if (!symbols || symbols.length === 0) return undefined;

  // 优先返回当前文件的符号
  if (currentFile) {
    const local = symbols.find(s => s.filePath === currentFile);
    if (local) return local;
  }

  // 优先返回导出的符号
  const exported = symbols.find(s => s.isExported);
  if (exported) return exported;

  return symbols[0];
}
