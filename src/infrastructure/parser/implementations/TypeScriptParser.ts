// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] TypeScript/JavaScript parser - implements ILanguageParser for TS/JS files
// ============================================
// TypeScript/JavaScript 解析器 - 实现 ILanguageParser 接口
// ============================================

import { randomUUID } from 'crypto';
import type {
  ParseOptions,
  ParseResult,
  CallGraphInfo,
  LanguageId,
} from '../../../interface/types/parser.js';
import type {
  Module,
  SymbolKind,
  SourceLocation,
  ModuleSymbol,
  ImportInfo,
  ExportInfo,
  ComplexityMetrics,
} from '../../../interface/types/index.js';
import { ParserBase, ParseError } from '../interfaces/ParserBase.js';

/**
 * TypeScript/JavaScript 解析器
 *
 * 基于正则表达式的快速解析器，适用于：
 * - 快速扫描项目结构
 * - 提取导入/导出信息
 * - 识别符号定义
 *
 * TODO-DEBT [L1] [日期:2026-03-17] [作者:AI] [原因:MVP阶段使用简化实现]
 * 问题：使用正则而非完整 AST 解析
 * 风险：复杂语法可能解析不准确
 * 偿还计划：V1.0 集成 Tree-sitter 实现完整解析
 */
export class TypeScriptParser extends ParserBase {
  readonly languageId = 'typescript' as const;
  readonly fileExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
  readonly name = 'TypeScript Parser';
  
  protected supportedFeatures = new Set([
    'type-inference',
    'generic-types',
    'decorators',
    'call-graph',
    'cross-file-analysis',
    'complexity-metrics',
  ] as const);

  /**
   * 初始化解析器
   */
  protected async doInitialize(): Promise<void> {
    // 简化实现：无需特殊初始化
  }

  /**
   * 释放资源
   */
  protected async doDispose(): Promise<void> {
    // 简化实现：无需特殊清理
  }

  /**
   * 解析单个文件
   */
  async parseFile(
    filePath: string,
    content: string,
    options?: ParseOptions
  ): Promise<ParseResult> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    
    try {
      // 并行提取各种信息
      const [
        imports,
        exports,
        symbols,
      ] = await Promise.all([
        this.extractImports(content),
        this.extractExports(content),
        this.extractSymbols(content),
      ]);

      // 构建模块信息
      const lineCounts = this.countLines(content);
      const module: Module = {
        id: `mod_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
        projectId: '',
        path: filePath,
        language: this.detectLanguage(filePath),
        stats: {
          lines: lineCounts.total,
          codeLines: lineCounts.code,
          commentLines: lineCounts.comment,
          blankLines: lineCounts.blank,
        },
      };

      // 构建依赖关系
      const dependencies = this.buildDependencies(imports, filePath);

      // 可选：构建调用图
      let callGraph: CallGraphInfo | undefined;
      if (options?.includeCallGraph) {
        callGraph = await this.buildCallGraph(content);
      }

      // 可选：计算复杂度
      let complexity: ComplexityMetrics | undefined;
      if (options?.includeComplexity) {
        complexity = await this.calculateComplexity(content);
      }

      const parseTime = Date.now() - startTime;
      this.stats.totalParsed++;
      this.stats.totalTime += parseTime;

      return {
        filePath,
        language: module.language as LanguageId,
        module,
        symbols,
        imports,
        exports,
        dependencies,
        callGraph,
        complexity,
        parseTime,
      };
    } catch (error) {
      this.stats.totalErrors++;
      throw new ParseError(
        `Failed to parse ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        filePath
      );
    }
  }

  /**
   * 提取导入信息
   */
  async extractImports(content: string): Promise<ImportInfo[]> {
    const imports: ImportInfo[] = [];
    
    // ES6 import 语句
    const importRegex = /import\s+(?:(?:\{([^}]+)\})|(\*\s+as\s+\w+)|(\w+))\s+from\s+['"]([^'"]+)['"];?/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const [, namedImports, namespaceImport, defaultImport, source] = match;
      
      const specifiers: ImportInfo['specifiers'] = [];
      
      if (defaultImport) {
        specifiers.push({ name: defaultImport, isTypeOnly: false });
      }
      
      if (namespaceImport) {
        const name = namespaceImport.replace(/\*\s+as\s+/, '').trim();
        specifiers.push({ name: '*', alias: name, isTypeOnly: false });
      }
      
      if (namedImports) {
        const names = namedImports.split(',').map(s => s.trim());
        for (const name of names) {
          if (name) {
            const [actualName, alias] = name.split(/\s+as\s+/).map(s => s.trim());
            specifiers.push({
              name: actualName!,
              alias: alias,
              isTypeOnly: false,
            });
          }
        }
      }
      
      imports.push({
        source: source!,
        sourceType: this.classifyImportSource(source!),
        specifiers,
        isTypeOnly: false,
      });
    }
    
    // 类型导入
    const typeImportRegex = /import\s+type\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?/g;
    while ((match = typeImportRegex.exec(content)) !== null) {
      const [, names, source] = match;
      imports.push({
        source: source!,
        sourceType: this.classifyImportSource(source!),
        specifiers: names!.split(',').map(n => ({
          name: n.trim(),
          isTypeOnly: true,
        })),
        isTypeOnly: true,
      });
    }
    
    return imports;
  }

  /**
   * 提取导出信息
   */
  async extractExports(content: string): Promise<ExportInfo[]> {
    const exports: ExportInfo[] = [];
    
    // 命名导出
    const exportRegex = /export\s+(?:(?:default\s+)?(?:class|function|interface|type|enum|const|let|var))\s+(\w+)/g;
    let match;
    
    while ((match = exportRegex.exec(content)) !== null) {
      const [, name] = match;
      const isDefault = match[0]!.includes('default');
      
      exports.push({
        name: name!,
        kind: this.inferSymbolKind(match[0]!),
        isDefault,
        isTypeOnly: match[0]!.includes('type'),
      });
    }
    
    // export { ... } 语法
    const exportListRegex = /export\s+\{([^}]+)\}/g;
    while ((match = exportListRegex.exec(content)) !== null) {
      const [, names] = match;
      const exportedNames = names!.split(',').map(n => n.trim().split(/\s+as\s+/)[0]);
      
      for (const name of exportedNames) {
        if (name) {
          exports.push({
            name: name.trim(),
            kind: 'variable' as SymbolKind,
            isDefault: false,
            isTypeOnly: false,
          });
        }
      }
    }
    
    return exports;
  }

  /**
   * 提取符号信息
   */
  async extractSymbols(content: string): Promise<ModuleSymbol[]> {
    const symbols: ModuleSymbol[] = [];
    const lines = content.split('\n');
    
    // 类和接口
    const classRegex = /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      const [fullMatch, name, extendsClass, implementsList] = match;
      const line = this.getLineNumber(content, match.index);
      
      symbols.push({
        id: `sym_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
        name: name!,
        kind: 'class',
        location: this.createLocation('', line),
        visibility: fullMatch!.includes('export') ? 'public' : 'internal',
        relatedSymbols: [],
        ...(extendsClass && { extends: [extendsClass] }),
        ...(implementsList && { implements: implementsList.split(',').map(s => s.trim()) }),
      });
    }
    
    // 接口
    const interfaceRegex = /(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+([^{]+))?/g;
    while ((match = interfaceRegex.exec(content)) !== null) {
      const [fullMatch, name, extendsList] = match;
      const line = this.getLineNumber(content, match.index);
      
      symbols.push({
        id: `sym_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
        name: name!,
        kind: 'interface',
        location: this.createLocation('', line),
        visibility: fullMatch!.includes('export') ? 'public' : 'internal',
        relatedSymbols: [],
        ...(extendsList && { extends: extendsList.split(',').map(s => s.trim()) }),
      });
    }
    
    // 函数
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/g;
    while ((match = functionRegex.exec(content)) !== null) {
      const [fullMatch, name] = match;
      const line = this.getLineNumber(content, match.index);
      
      symbols.push({
        id: `sym_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
        name: name!,
        kind: 'function',
        location: this.createLocation('', line),
        visibility: fullMatch!.includes('export') ? 'public' : 'internal',
        relatedSymbols: [],
      });
    }
    
    // 类型别名
    const typeRegex = /(?:export\s+)?type\s+(\w+)\s*=/g;
    while ((match = typeRegex.exec(content)) !== null) {
      const [fullMatch, name] = match;
      const line = this.getLineNumber(content, match.index);
      
      symbols.push({
        id: `sym_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
        name: name!,
        kind: 'type',
        location: this.createLocation('', line),
        visibility: fullMatch!.includes('export') ? 'public' : 'internal',
        relatedSymbols: [],
      });
    }
    
    return symbols;
  }

  /**
   * 构建调用图
   */
  async buildCallGraph(content: string): Promise<CallGraphInfo> {
    const calls: CallGraphInfo['calls'] = [];
    const calledFunctions = new Set<string>();
    
    // 简单函数调用检测
    const callRegex = /(\w+)\s*\(/g;
    let match;
    
    while ((match = callRegex.exec(content)) !== null) {
      const [, callee] = match;
      if (callee && !this.isKeyword(callee)) {
        calledFunctions.add(callee);
        const line = this.getLineNumber(content, match.index);
        calls.push({
          caller: '<anonymous>',
          callee: callee,
          line: line,
        });
      }
    }
    
    // 递归检测（简化：检查函数是否调用自身）
    const recursive: string[] = [];
    const functionRegex = /function\s+(\w+)/g;
    while ((match = functionRegex.exec(content)) !== null) {
      const [, funcName] = match;
      if (funcName && calledFunctions.has(funcName)) {
        // 简化检测：如果函数体内有自己的调用
        const funcStart = match.index;
        const funcEnd = this.findFunctionEnd(content, funcStart);
        const funcBody = content.slice(funcStart, funcEnd);
        
        const selfCallRegex = new RegExp(`\\b${funcName}\\s*\\(`, 'g');
        if (selfCallRegex.test(funcBody)) {
          recursive.push(funcName);
        }
      }
    }
    
    return { calls, recursive };
  }

  /**
   * 计算复杂度
   */
  async calculateComplexity(content: string): Promise<ComplexityMetrics> {
    const lines = content.split('\n');
    let branchCount = 0;
    const functions: ComplexityMetrics['details']['functions'] = [];
    
    // 检测分支点
    const branchRegex = /\b(if|else|while|for|do|switch|case|\?\s*:|&&|\|\|)\b/g;
    let match;
    while ((match = branchRegex.exec(content)) !== null) {
      branchCount++;
    }
    
    // 检测函数
    const functionRegex = /(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{/g;
    while ((match = functionRegex.exec(content)) !== null) {
      const [, name] = match;
      const funcStart = match.index;
      const funcEnd = this.findFunctionEnd(content, funcStart);
      const funcBody = content.slice(funcStart, funcEnd);
      const funcLines = funcBody.split('\n').length;
      
      // 计算函数复杂度
      let funcBranches = 0;
      let funcMatch;
      const funcBranchRegex = /\b(if|else|while|for|do|switch|case|\?\s*:|&&|\|\|)\b/g;
      while ((funcMatch = funcBranchRegex.exec(funcBody)) !== null) {
        funcBranches++;
      }
      
      functions.push({
        name: name!,
        cyclomatic: funcBranches + 1,
        cognitive: Math.min(funcBranches, 10),
        lines: funcLines,
      });
    }
    
    const cyclomatic = branchCount + 1;
    const maintainability = Math.max(0, 100 - cyclomatic * 2 - functions.length);
    
    return {
      cyclomatic,
      cognitive: Math.min(branchCount, 15),
      maintainability,
      details: { functions },
    };
  }

  // ============================================
  // 私有方法
  // ============================================

  private detectLanguage(filePath: string): LanguageId {
    return filePath.match(/\.tsx?$/) ? 'typescript' : 'javascript';
  }

  private classifyImportSource(source: string): ImportInfo['sourceType'] {
    if (source.startsWith('.')) return 'relative';
    if (source.startsWith('/')) return 'absolute';
    if (source.startsWith('node:') || ['fs', 'path', 'http', 'crypto'].includes(source)) {
      return 'node_module';
    }
    return 'node_module';
  }

  private inferSymbolKind(exportStatement: string): SymbolKind {
    if (exportStatement.includes('class')) return 'class';
    if (exportStatement.includes('interface')) return 'interface';
    if (exportStatement.includes('type')) return 'type';
    if (exportStatement.includes('enum')) return 'enum';
    if (exportStatement.includes('function')) return 'function';
    return 'variable';
  }

  private buildDependencies(imports: ImportInfo[], _filePath: string) {
    // 简化实现：将导入转换为依赖
    return imports.map(imp => ({
      id: `dep_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      sourceId: '',
      targetId: '',
      type: 'import' as const,
    }));
  }

  private getLineNumber(content: string, index: number): number {
    return content.slice(0, index).split('\n').length;
  }

  private createLocation(file: string, line: number): SourceLocation {
    return {
      file,
      line,
      column: 0,
    };
  }

  private isKeyword(word: string): boolean {
    const keywords = [
      'if', 'else', 'while', 'for', 'switch', 'case', 'break', 'continue',
      'return', 'throw', 'try', 'catch', 'finally', 'new', 'typeof', 'instanceof',
      'await', 'yield', 'void', 'delete', 'in', 'of',
    ];
    return keywords.includes(word);
  }

  private findFunctionEnd(content: string, startIndex: number): number {
    let braceCount = 0;
    let inFunction = false;
    
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '{') {
        braceCount++;
        inFunction = true;
      } else if (content[i] === '}') {
        braceCount--;
        if (inFunction && braceCount === 0) {
          return i + 1;
        }
      }
    }
    
    return content.length;
  }
}
