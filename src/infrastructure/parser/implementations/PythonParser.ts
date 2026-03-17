// [META] since:2026-03 | owner:architecture-team | stable:false
// [WHY] Python language parser - implements ILanguageParser for Python files
// ============================================
// Python 语言解析器 - 实现 ILanguageParser 接口
// ============================================

import { randomUUID } from 'crypto';
import type {
  ParseOptions,
  ParseResult,
} from '../../../interface/types/parser.js';
import type {
  Module,
  ModuleSymbol,
  ImportInfo,
  ExportInfo,
} from '../../../interface/types/index.js';
import { ParserBase, ParseError } from '../interfaces/ParserBase.js';

/**
 * Python 语言解析器
 *
 * 支持:
 * - import/from 导入语句
 * - class/function 定义
 * - 模块级变量
 *
 * TODO-DEBT [L1] [日期:2026-03-17] [作者:AI] [原因:MVP阶段简化实现]
 * 问题：使用正则而非 AST 解析
 * 风险：复杂语法可能解析不准确
 * 偿还计划：V1.0 集成 Tree-sitter 实现完整解析
 */
export class PythonParser extends ParserBase {
  readonly languageId = 'python' as const;
  readonly fileExtensions = ['.py'];
  readonly name = 'Python Parser';
  
  protected supportedFeatures = new Set([
    'call-graph',
    'cross-file-analysis',
    'complexity-metrics',
  ] as const);

  protected async doInitialize(): Promise<void> {
    // 无需初始化
  }

  protected async doDispose(): Promise<void> {
    // 无需清理
  }

  async parseFile(
    filePath: string,
    content: string,
    _options?: ParseOptions
  ): Promise<ParseResult> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    
    try {
      const [
        imports,
        exports,
        symbols,
      ] = await Promise.all([
        this.extractImports(content),
        this.extractExports(content),
        this.extractSymbols(content),
      ]);

      const lineCounts = this.countLines(content);
      const module: Module = {
        id: `mod_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
        projectId: '',
        path: filePath,
        language: 'python',
        stats: {
          lines: lineCounts.total,
          codeLines: lineCounts.code,
          commentLines: lineCounts.comment,
          blankLines: lineCounts.blank,
        },
      };

      const parseTime = Date.now() - startTime;

      return {
        filePath,
        language: 'python',
        module,
        symbols,
        imports,
        exports,
        dependencies: [],
        parseTime,
      };
    } catch (error) {
      throw new ParseError(
        `Failed to parse ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        filePath
      );
    }
  }

  async extractImports(content: string): Promise<ImportInfo[]> {
    const imports: ImportInfo[] = [];
    
    // import x
    const importRegex = /^import\s+([\w.]+)(?:\s+as\s+(\w+))?/gm;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const [, moduleName, alias] = match;
      imports.push({
        source: moduleName!,
        sourceType: moduleName!.includes('.') ? 'node_module' : 'relative',
        specifiers: [{
          name: moduleName!,
          alias: alias,
          isTypeOnly: false,
        }],
        isTypeOnly: false,
      });
    }
    
    // from x import y
    const fromImportRegex = /^from\s+([\w.]+)\s+import\s+(.+)$/gm;
    while ((match = fromImportRegex.exec(content)) !== null) {
      const [, moduleName, importsList] = match;
      const names = importsList!.split(',').map(n => n.trim());
      
      imports.push({
        source: moduleName!,
        sourceType: moduleName!.startsWith('.') ? 'relative' : 'node_module',
        specifiers: names.map(name => {
          const [actualName, alias] = name.split(/\s+as\s+/).map(s => s.trim());
          return {
            name: actualName!,
            alias: alias,
            isTypeOnly: false,
          };
        }),
        isTypeOnly: false,
      });
    }
    
    return imports;
  }

  async extractExports(content: string): Promise<ExportInfo[]> {
    const exports: ExportInfo[] = [];
    
    // Python 中所有非下划线开头的东西都可以被视为导出
    // __all__ 明确定义了导出内容
    const allRegex = /^__all__\s*=\s*\[([^\]]+)\]/m;
    const allMatch = allRegex.exec(content);
    
    if (allMatch) {
      const names = allMatch[1]!.split(',').map(n => n.trim().replace(/['"]/g, ''));
      for (const name of names) {
        if (name) {
          exports.push({
            name: name,
            kind: 'variable',
            isDefault: false,
            isTypeOnly: false,
          });
        }
      }
    } else {
      // 默认导出：类定义
      const classRegex = /^class\s+(\w+)/gm;
      let match;
      while ((match = classRegex.exec(content)) !== null) {
        const [, name] = match;
        if (name && !name.startsWith('_')) {
          exports.push({
            name: name,
            kind: 'class',
            isDefault: false,
            isTypeOnly: false,
          });
        }
      }
      
      // 函数定义
      const funcRegex = /^def\s+(\w+)\s*\(/gm;
      while ((match = funcRegex.exec(content)) !== null) {
        const [, name] = match;
        if (name && !name.startsWith('_')) {
          exports.push({
            name: name,
            kind: 'function',
            isDefault: false,
            isTypeOnly: false,
          });
        }
      }
    }
    
    return exports;
  }

  async extractSymbols(content: string): Promise<ModuleSymbol[]> {
    const symbols: ModuleSymbol[] = [];
    
    // 类定义
    const classRegex = /^class\s+(\w+)(?:\(([^)]+)\))?/gm;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      const [, name, bases] = match;
      const line = this.getLineNumber(content, match.index);
      
      symbols.push({
        id: `sym_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
        name: name!,
        kind: 'class',
        location: { file: '', line, column: 0 },
        visibility: name!.startsWith('_') ? 'private' : 'public',
        relatedSymbols: [],
        ...(bases && { extends: bases.split(',').map(b => b.trim().split('.').pop()).filter(Boolean) as string[] }),
      });
    }
    
    // 函数定义
    const funcRegex = /^def\s+(\w+)\s*\(/gm;
    while ((match = funcRegex.exec(content)) !== null) {
      const [, name] = match;
      const line = this.getLineNumber(content, match.index);
      
      symbols.push({
        id: `sym_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
        name: name!,
        kind: 'function',
        location: { file: '', line, column: 0 },
        visibility: name!.startsWith('_') ? 'private' : 'public',
        relatedSymbols: [],
      });
    }
    
    return symbols;
  }

  private getLineNumber(content: string, index: number): number {
    return content.slice(0, index).split('\n').length;
  }
}
