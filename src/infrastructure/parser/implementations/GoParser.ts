// [META] since:2026-03 | owner:architecture-team | stable:false
// [WHY] Go language parser - implements ILanguageParser for Go files
// ============================================
// Go 语言解析器 - 实现 ILanguageParser 接口
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
  ComplexityMetrics,
} from '../../../interface/types/index.js';
import { ParserBase, ParseError } from '../interfaces/ParserBase.js';

/**
 * Go 语言解析器
 *
 * TODO-DEBT [L1] [日期:2026-03-17] [作者:AI] [原因:MVP阶段仅实现框架]
 * 问题：目前仅返回空结果
 * 风险：无法实际解析 Go 代码
 * 偿还计划：V1.0 实现完整 Go 解析器
 */
export class GoParser extends ParserBase {
  readonly languageId = 'go' as const;
  readonly fileExtensions = ['.go'];
  readonly name = 'Go Parser';
  
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
    options?: ParseOptions
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
        language: 'go',
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
        language: 'go',
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
    
    // 单行导入: import "package"
    const singleImportRegex = /import\s+["']([^"']+)["']/g;
    let match;
    
    while ((match = singleImportRegex.exec(content)) !== null) {
      const [, source] = match;
      imports.push({
        source: source!,
        sourceType: source!.includes('.') ? 'node_module' : 'relative',
        specifiers: [],
        isTypeOnly: false,
      });
    }
    
    // 多行导入
    const multiImportRegex = /import\s+\(([^)]+)\)/g;
    while ((match = multiImportRegex.exec(content)) !== null) {
      const [, importBlock] = match;
      const lines = importBlock!.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        const quoteMatch = trimmed.match(/["']([^"']+)["']/);
        if (quoteMatch) {
          imports.push({
            source: quoteMatch[1]!,
            sourceType: quoteMatch[1]!.includes('.') ? 'node_module' : 'relative',
            specifiers: [],
            isTypeOnly: false,
          });
        }
      }
    }
    
    return imports;
  }

  async extractExports(content: string): Promise<ExportInfo[]> {
    const exports: ExportInfo[] = [];
    
    // 大写开头的函数/类型是导出的
    const exportRegex = /^(?:func|type|var|const)\s+([A-Z]\w+)/gm;
    let match;
    
    while ((match = exportRegex.exec(content)) !== null) {
      const [, name] = match;
      const kind = match[0]!.includes('func') ? 'function' :
                   match[0]!.includes('type') ? 'type' : 'variable';
      
      exports.push({
        name: name!,
        kind,
        isDefault: false,
        isTypeOnly: kind === 'type',
      });
    }
    
    return exports;
  }

  async extractSymbols(content: string): Promise<ModuleSymbol[]> {
    const symbols: ModuleSymbol[] = [];
    
    // 函数
    const funcRegex = /func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(/g;
    let match;
    
    while ((match = funcRegex.exec(content)) !== null) {
      const [, name] = match;
      const line = this.getLineNumber(content, match.index);
      
      symbols.push({
        id: `sym_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
        name: name!,
        kind: 'function',
        location: { file: '', line, column: 0 },
        visibility: /^[A-Z]/.test(name!) ? 'public' : 'private',
        relatedSymbols: [],
      });
    }
    
    // 类型定义
    const typeRegex = /type\s+(\w+)\s+(?:struct|interface)/g;
    while ((match = typeRegex.exec(content)) !== null) {
      const [, name] = match;
      const line = this.getLineNumber(content, match.index);
      
      symbols.push({
        id: `sym_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
        name: name!,
        kind: match[0]!.includes('interface') ? 'interface' : 'class',
        location: { file: '', line, column: 0 },
        visibility: /^[A-Z]/.test(name!) ? 'public' : 'private',
        relatedSymbols: [],
      });
    }
    
    return symbols;
  }

  private getLineNumber(content: string, index: number): number {
    return content.slice(0, index).split('\n').length;
  }
}
