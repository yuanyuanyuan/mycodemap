// [META] since:2026-05-09 | owner:cli-team | stable:false
// [WHY] AST-based Python parser using tree-sitter-python grammar
// ============================================
// Python Tree-sitter 解析器 - 基于 tree-sitter 的 AST 解析
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
  DecoratorInfo,
  FunctionSignature,
  ParameterInfo,
} from '../../../interface/types/index.js';
import { analyzeComplexityFromContent } from '../../../core/ast-complexity-analyzer.js';
import { ParserBase, ParseError } from '../interfaces/ParserBase.js';
import { TreeSitterParser } from './TreeSitterParser.js';

interface SymbolWalkContext {
  currentClassName?: string;
  withinFunction: boolean;
}

interface CallWalkContext extends SymbolWalkContext {
  callerName?: string;
}

interface FunctionComplexityDetail {
  name: string;
  line: number;
  cyclomatic: number;
  cognitive: number;
  lines: number;
}

/**
 * Python Tree-sitter 解析器
 *
 * 基于 tree-sitter-python 的 AST 解析器，支持:
 * - import/from 导入语句（含相对导入、别名、通配符）
 * - class/function 定义（含装饰器、异步、类型注解）
 * - __all__ 导出声明
 * - 嵌套定义的递归提取
 * - 多行导入的正确解析
 */
export class PythonTreeSitterParser extends ParserBase {
  readonly languageId = 'python' as const;
  readonly fileExtensions = ['py'];
  readonly name = 'Python Tree-sitter Parser';

  protected supportedFeatures = new Set([
    'decorators',
    'call-graph',
    'cross-file-analysis',
    'complexity-metrics',
  ] as const);

  private sharedParser = new TreeSitterParser({
    rootDir: process.cwd(),
    mode: 'tree-sitter',
  });

  // ============================================
  // 生命周期
  // ============================================

  protected async doInitialize(): Promise<void> {
    try {
      await this.sharedParser.initialize();
      await this.sharedParser.parseSyntaxTree('/virtual.py', 'x = 1\n');
    } catch {
      throw new ParseError(
        'tree-sitter-python grammar not available. ' +
        'Install native: npm install tree-sitter tree-sitter-python. ' +
        'Or WASM: npm install web-tree-sitter tree-sitter-python. ' +
        'No silent fallback to regex parser.'
      );
    }
  }

  protected async doDispose(): Promise<void> {
    this.sharedParser.dispose();
  }

  // ============================================
  // parseFile
  // ============================================

  async parseFile(
    filePath: string,
    content: string,
    options?: ParseOptions
  ): Promise<ParseResult> {
    this.ensureInitialized();

    const startTime = Date.now();

    try {
      const syntaxTree = await this.sharedParser.parseSyntaxTree(filePath, content);
      const root = syntaxTree.rootNode;

      // 并行提取各种信息
      const [imports, exports, symbols] = await Promise.all([
        this.extractImportsFromAST(root),
        this.extractExportsFromAST(root),
        this.extractSymbolsFromAST(root),
      ]);
      const callGraph = options?.includeCallGraph
        ? this.buildCallGraphFromAST(root, imports, symbols)
        : undefined;
      const complexity = options?.includeComplexity
        ? analyzeComplexityFromContent({ filePath, content, language: 'python' })
        : undefined;
      const symbolsWithComplexity = complexity
        ? this.attachComplexityToSymbols(symbols, complexity)
        : symbols;

      // 统计行数
      const lineCounts = this.countLinesFromAST(root, content);

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
        symbols: symbolsWithComplexity,
        imports,
        exports,
        dependencies: [],
        callGraph,
        complexity,
        parseTime,
        parserUsed: 'PythonTreeSitterParser',
      };
    } catch (error) {
      if (error instanceof ParseError) throw error;
      throw new ParseError(
        `Failed to parse ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        filePath
      );
    }
  }

  // ============================================
  // ParserBase 抽象方法实现（基于 content 字符串的接口）
  // ============================================

  async extractImports(content: string): Promise<ImportInfo[]> {
    this.ensureInitialized();
    const syntaxTree = await this.sharedParser.parseSyntaxTree('/virtual.py', content);
    return this.extractImportsFromAST(syntaxTree.rootNode);
  }

  async extractExports(content: string): Promise<ExportInfo[]> {
    this.ensureInitialized();
    const syntaxTree = await this.sharedParser.parseSyntaxTree('/virtual.py', content);
    return this.extractExportsFromAST(syntaxTree.rootNode);
  }

  async extractSymbols(content: string): Promise<ModuleSymbol[]> {
    this.ensureInitialized();
    const syntaxTree = await this.sharedParser.parseSyntaxTree('/virtual.py', content);
    return this.extractSymbolsFromAST(syntaxTree.rootNode);
  }

  async buildCallGraph(content: string): Promise<NonNullable<ParseResult['callGraph']>> {
    this.ensureInitialized();
    const syntaxTree = await this.sharedParser.parseSyntaxTree('/virtual.py', content);
    const root = syntaxTree.rootNode;
    const imports = this.extractImportsFromAST(root);
    const symbols = this.extractSymbolsFromAST(root);
    return this.buildCallGraphFromAST(root, imports, symbols);
  }

  async calculateComplexity(content: string): Promise<ComplexityMetrics> {
    this.ensureInitialized();
    return analyzeComplexityFromContent({
      filePath: '/virtual.py',
      content,
      language: 'python',
    });
  }

  // ============================================
  // AST-based 提取方法
  // ============================================

  /**
   * 提取导入信息
   * Walk root.namedChildren for import_statement, import_from_statement, future_import_statement
   */
  private extractImportsFromAST(root: any): ImportInfo[] {
    const imports: ImportInfo[] = [];

    for (const child of root.namedChildren) {
      if (child.type === 'import_statement') {
        imports.push(...this.parseImportStatement(child));
      } else if (child.type === 'import_from_statement') {
        imports.push(...this.parseImportFromStatement(child));
      } else if (child.type === 'future_import_statement') {
        imports.push(...this.parseFutureImportStatement(child));
      }
    }

    return imports;
  }

  /**
   * 解析 import_statement: import x, import x as y
   */
  private parseImportStatement(node: any): ImportInfo[] {
    const results: ImportInfo[] = [];

    // import_statement 的 name 字段包含所有导入的模块
    const nameField = node.childForFieldName('name');
    if (!nameField) return results;

    // name 字段可以是 dotted_name 或 aliased_import
    const specifiers = this.extractImportSpecifiers(nameField);

    if (specifiers.length > 0) {
      results.push({
        source: specifiers[0]!.name,
        sourceType: specifiers[0]!.name.startsWith('.') ? 'relative' : 'absolute',
        specifiers,
        isTypeOnly: false,
      });
    }

    return results;
  }

  /**
   * 解析 import_from_statement: from x import y, from . import x
   */
  private parseImportFromStatement(node: any): ImportInfo[] {
    const results: ImportInfo[] = [];

    const moduleName = node.childForFieldName('module_name');
    let source = '';
    let sourceType: ImportInfo['sourceType'] = 'absolute';

    if (moduleName) {
      if (moduleName.type === 'relative_import') {
        source = moduleName.text;
        sourceType = 'relative';
      } else {
        source = moduleName.text;
        sourceType = source.startsWith('.') ? 'relative' : 'absolute';
      }
    }

    // 遍历 namedChildren 提取 specifiers（跳过第一个，即 module_name）
    const specifiers: ImportInfo['specifiers'] = [];
    const children = node.namedChildren;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      // 跳过第一个 namedChild（module_name / relative_import）
      if (i === 0) continue;

      if (child.type === 'dotted_name' || child.type === 'identifier') {
        specifiers.push({ name: child.text, isTypeOnly: false });
      } else if (child.type === 'aliased_import') {
        const name = child.childForFieldName('name');
        const alias = child.childForFieldName('alias');
        specifiers.push({
          name: name?.text || '',
          alias: alias?.text,
          isTypeOnly: false,
        });
      } else if (child.type === 'wildcard_import') {
        specifiers.push({ name: '*', isTypeOnly: false });
      }
    }

    if (specifiers.length > 0 || source) {
      results.push({
        source,
        sourceType,
        specifiers,
        isTypeOnly: false,
      });
    }

    return results;
  }

  /**
   * 解析 future_import_statement: from __future__ import annotations
   * AST: 无 module_name 字段，namedChildren 全部是 specifiers
   */
  private parseFutureImportStatement(node: any): ImportInfo[] {
    const results: ImportInfo[] = [];

    const specifiers: ImportInfo['specifiers'] = [];
    for (const child of node.namedChildren) {
      if (child.type === 'dotted_name' || child.type === 'identifier') {
        specifiers.push({ name: child.text, isTypeOnly: false });
      } else if (child.type === 'aliased_import') {
        const name = child.childForFieldName('name');
        const alias = child.childForFieldName('alias');
        specifiers.push({
          name: name?.text || '',
          alias: alias?.text,
          isTypeOnly: false,
        });
      }
    }

    if (specifiers.length > 0) {
      results.push({
        source: '__future__',
        sourceType: 'absolute',
        specifiers,
        isTypeOnly: false,
      });
    }

    return results;
  }

  /**
   * 从 name 字段提取 import specifiers
   * 处理 dotted_name, aliased_import, wildcard_import
   */
  private extractImportSpecifiers(nameNode: any): ImportInfo['specifiers'] {
    const specifiers: ImportInfo['specifiers'] = [];

    if (nameNode.type === 'dotted_name' || nameNode.type === 'identifier') {
      specifiers.push({ name: nameNode.text, isTypeOnly: false });
    } else if (nameNode.type === 'aliased_import') {
      const name = nameNode.childForFieldName('name');
      const alias = nameNode.childForFieldName('alias');
      specifiers.push({
        name: name?.text || '',
        alias: alias?.text,
        isTypeOnly: false,
      });
    } else if (nameNode.type === 'wildcard_import') {
      specifiers.push({ name: '*', isTypeOnly: false });
    } else {
      // 如果是 list（多个 name），遍历 namedChildren
      for (const child of nameNode.namedChildren) {
        if (child.type === 'dotted_name' || child.type === 'identifier') {
          specifiers.push({ name: child.text, isTypeOnly: false });
        } else if (child.type === 'aliased_import') {
          const name = child.childForFieldName('name');
          const alias = child.childForFieldName('alias');
          specifiers.push({
            name: name?.text || '',
            alias: alias?.text,
            isTypeOnly: false,
          });
        } else if (child.type === 'wildcard_import') {
          specifiers.push({ name: '*', isTypeOnly: false });
        }
      }
    }

    return specifiers;
  }

  /**
   * 提取导出信息
   * 1. 扫描 __all__ assignment
   * 2. 如果没有 __all__，扫描顶层 class/function 定义（不以 _ 开头）
   */
  private extractExportsFromAST(root: any): ExportInfo[] {
    const exports: ExportInfo[] = [];
    let hasAll = false;

    // 扫描 __all__ assignment
    for (const child of root.namedChildren) {
      if (child.type === 'assignment') {
        const left = child.childForFieldName('left');
        const right = child.childForFieldName('right');
        if (left?.text === '__all__' && right?.type === 'list') {
          hasAll = true;
          for (const item of right.namedChildren) {
            if (item.type === 'string') {
              // 去掉引号
              const name = item.text.replace(/^['"]|['"]$/g, '');
              if (name) {
                exports.push({
                  name,
                  kind: 'variable',
                  isDefault: false,
                  isTypeOnly: false,
                });
              }
            }
          }
        }
      }
    }

    // 如果没有 __all__，扫描顶层定义
    if (!hasAll) {
      for (const child of root.namedChildren) {
        if (child.type === 'class_definition') {
          const name = child.childForFieldName('name');
          if (name && !name.text.startsWith('_')) {
            exports.push({
              name: name.text,
              kind: 'class',
              isDefault: false,
              isTypeOnly: false,
            });
          }
        } else if (child.type === 'function_definition') {
          const name = child.childForFieldName('name');
          if (name && !name.text.startsWith('_')) {
            exports.push({
              name: name.text,
              kind: 'function',
              isDefault: false,
              isTypeOnly: false,
            });
          }
        } else if (child.type === 'decorated_definition') {
          const definition = child.childForFieldName('definition');
          if (definition) {
            if (definition.type === 'class_definition') {
              const name = definition.childForFieldName('name');
              if (name && !name.text.startsWith('_')) {
                exports.push({
                  name: name.text,
                  kind: 'class',
                  isDefault: false,
                  isTypeOnly: false,
                });
              }
            } else if (definition.type === 'function_definition') {
              const name = definition.childForFieldName('name');
              if (name && !name.text.startsWith('_')) {
                exports.push({
                  name: name.text,
                  kind: 'function',
                  isDefault: false,
                  isTypeOnly: false,
                });
              }
            }
          }
        }
      }
    }

    return exports;
  }

  /**
   * 提取符号信息（递归遍历）
   */
  private extractSymbolsFromAST(root: any): ModuleSymbol[] {
    const symbols: ModuleSymbol[] = [];
    this.walkNode(root, symbols, { withinFunction: false });
    return symbols;
  }

  /**
   * 递归遍历 AST 节点提取符号
   */
  private walkNode(node: any, symbols: ModuleSymbol[], context: SymbolWalkContext): void {
    if (node.type === 'class_definition') {
      const classSymbol = this.extractClassSymbol(node, null);
      symbols.push(classSymbol);
      const body = node.childForFieldName('body');
      if (body) {
        for (const child of body.namedChildren) {
          this.walkNode(child, symbols, {
            currentClassName: classSymbol.name,
            withinFunction: false,
          });
        }
      }
      return;
    }

    if (node.type === 'function_definition') {
      const isMethod = Boolean(context.currentClassName && !context.withinFunction);
      symbols.push(this.extractFunctionSymbol(node, null, context.currentClassName, isMethod));
      const body = node.childForFieldName('body');
      if (body) {
        for (const child of body.namedChildren) {
          this.walkNode(child, symbols, {
            currentClassName: context.currentClassName,
            withinFunction: true,
          });
        }
      }
      return;
    }

    if (node.type === 'decorated_definition') {
      const definition = node.childForFieldName('definition');
      if (definition) {
        const decorators = this.extractDecorators(node);
        if (definition.type === 'class_definition') {
          const classSymbol = this.extractClassSymbol(definition, decorators);
          symbols.push(classSymbol);
          const body = definition.childForFieldName('body');
          if (body) {
            for (const child of body.namedChildren) {
              this.walkNode(child, symbols, {
                currentClassName: classSymbol.name,
                withinFunction: false,
              });
            }
          }
        } else if (definition.type === 'function_definition') {
          const isMethod = Boolean(context.currentClassName && !context.withinFunction);
          symbols.push(this.extractFunctionSymbol(definition, decorators, context.currentClassName, isMethod));
          const body = definition.childForFieldName('body');
          if (body) {
            for (const child of body.namedChildren) {
              this.walkNode(child, symbols, {
                currentClassName: context.currentClassName,
                withinFunction: true,
              });
            }
          }
        }
      }
      return;
    }

    for (const child of node.namedChildren) {
      this.walkNode(child, symbols, context);
    }
  }

  /**
   * 提取 class 定义的符号信息
   */
  private extractClassSymbol(node: any, decorators: DecoratorInfo[] | null): ModuleSymbol {
    const name = node.childForFieldName('name');
    const nameText = name?.text || '<anonymous>';
    const superclasses = node.childForFieldName('superclasses');
    const extendsList: string[] = [];

    if (superclasses) {
      for (const child of superclasses.namedChildren) {
        extendsList.push(child.text);
      }
    }

    return {
      id: `sym_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      name: nameText,
      kind: 'class',
      location: {
        file: '',
        line: node.startPosition.row + 1,
        column: node.startPosition.column,
      },
      visibility: nameText.startsWith('_') ? 'private' : 'public',
      relatedSymbols: [],
      ...(extendsList.length > 0 && { extends: extendsList }),
      ...(decorators && decorators.length > 0 && { decorators }),
    };
  }

  /**
   * 提取 function 定义的符号信息
   */
  private extractFunctionSymbol(
    node: any,
    decorators: DecoratorInfo[] | null,
    currentClassName?: string,
    isMethod: boolean = false
  ): ModuleSymbol {
    const name = node.childForFieldName('name');
    const nameText = name?.text || '<anonymous>';
    const symbolName = isMethod && currentClassName ? `${currentClassName}.${nameText}` : nameText;
    const parameters = node.childForFieldName('parameters');
    const returnTypeNode = node.childForFieldName('return_type');
    const isAsync = this.isAsync(node);

    const params = parameters ? this.extractParameters(parameters) : [];
    const signature: FunctionSignature = {
      parameters: params,
      returnType: returnTypeNode?.text || '',
      async: isAsync,
    };

    return {
      id: `sym_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      name: symbolName,
      kind: isMethod ? 'method' : 'function',
      location: {
        file: '',
        line: node.startPosition.row + 1,
        column: node.startPosition.column,
      },
      visibility: nameText.startsWith('_') ? 'private' : 'public',
      relatedSymbols: [],
      signature,
      ...(decorators && decorators.length > 0 && { decorators }),
    };
  }

  /**
   * 从 decorated_definition 提取装饰器信息
   */
  private extractDecorators(node: any): DecoratorInfo[] {
    const decorators: DecoratorInfo[] = [];

    for (const child of node.children) {
      if (child.type === 'decorator') {
        const expression = child.namedChildren[0];
        let name = '';
        let params: unknown = undefined;

        if (expression) {
          if (expression.type === 'call') {
            // @foo(args) — call 表达式
            const funcName = expression.childForFieldName('function');
            name = funcName?.text || expression.text;
            params = true; // 标记有参数
          } else {
            // @foo — 简单标识符或属性
            name = expression.text;
          }
        }

        decorators.push({
          name,
          ...(params !== undefined && { params }),
          target: this.guessDecoratorTarget(node),
        });
      }
    }

    return decorators;
  }

  /**
   * 猜测装饰器目标类型
   */
  private guessDecoratorTarget(node: any): DecoratorInfo['target'] {
    const definition = node.childForFieldName('definition');
    if (definition?.type === 'class_definition') return 'class';
    if (definition?.type === 'function_definition') return 'method';
    return 'method';
  }

  /**
   * 从 parameters 节点提取参数信息
   */
  private extractParameters(parametersNode: any): ParameterInfo[] {
    const params: ParameterInfo[] = [];

    for (const child of parametersNode.namedChildren) {
      if (child.type === 'identifier') {
        // def foo(x): — 普通参数
        params.push({
          name: child.text,
          type: '',
          optional: false,
        });
      } else if (child.type === 'typed_parameter') {
        // def foo(x: int): — 类型注解参数
        const name = child.childForFieldName('name');
        const typeNode = child.childForFieldName('type');
        params.push({
          name: name?.text || child.text.split(':')[0]?.trim() || '',
          type: typeNode?.text || '',
          optional: false,
        });
      } else if (child.type === 'default_parameter') {
        // def foo(x=5): — 带默认值参数
        const name = child.childForFieldName('name');
        const value = child.childForFieldName('value');
        params.push({
          name: name?.text || '',
          type: '',
          optional: true,
          defaultValue: value?.text,
        });
      } else if (child.type === 'typed_default_parameter') {
        // def foo(x: int = 5): — 类型注解 + 默认值
        const name = child.childForFieldName('name');
        const typeNode = child.childForFieldName('type');
        const value = child.childForFieldName('value');
        params.push({
          name: name?.text || '',
          type: typeNode?.text || '',
          optional: true,
          defaultValue: value?.text,
        });
      } else if (child.type === 'list_splat_pattern') {
        // def foo(*args): — *args
        const name = child.namedChildren[0];
        params.push({
          name: name?.text || '*args',
          type: '',
          optional: false,
        });
      } else if (child.type === 'dictionary_splat_pattern') {
        // def foo(**kwargs): — **kwargs
        const name = child.namedChildren[0];
        params.push({
          name: name?.text || '**kwargs',
          type: '',
          optional: false,
        });
      }
    }

    return params;
  }

  /**
   * 检测函数是否为 async
   * 检查 node.children（不是 namedChildren）中是否有 type === 'async'
   */
  private isAsync(node: any): boolean {
    for (const child of node.children) {
      if (child.type === 'async') {
        return true;
      }
    }
    return false;
  }

  private calculateComplexityFromAST(root: any, content: string): ComplexityMetrics {
    const fileMetrics = this.measureComplexity(root);
    const functionDetails = this.collectFunctionComplexities(root);
    const lines = content.split('\n').length;
    const commentLines = content
      .split('\n')
      .filter((line) => line.trim().startsWith('#'))
      .length;
    const commentRatio = commentLines / Math.max(1, lines);

    return {
      cyclomatic: fileMetrics.cyclomatic,
      cognitive: fileMetrics.cognitive,
      maintainability: this.calculateMaintainabilityIndex(lines, fileMetrics.cyclomatic, commentRatio),
      details: {
        functions: functionDetails.map((detail) => ({
          name: detail.name,
          cyclomatic: detail.cyclomatic,
          cognitive: detail.cognitive,
          lines: detail.lines,
        })),
      },
    };
  }

  private attachComplexityToSymbols(symbols: ModuleSymbol[], complexity: ComplexityMetrics): ModuleSymbol[] {
    const detailByName = new Map<string, ComplexityMetrics['details']['functions'][number]>();
    for (const detail of complexity.details.functions) {
      detailByName.set(detail.name, detail);
    }

    return symbols.map((symbol) => {
      if (symbol.kind !== 'function' && symbol.kind !== 'method') {
        return symbol;
      }

      const detail = detailByName.get(symbol.name);
      if (!detail) {
        return symbol;
      }

      return {
        ...symbol,
        complexity: {
          cyclomatic: detail.cyclomatic,
          cognitive: detail.cognitive,
          lines: detail.lines,
        },
      };
    });
  }

  private collectFunctionComplexities(root: any): FunctionComplexityDetail[] {
    const details: FunctionComplexityDetail[] = [];
    this.walkComplexityNode(root, details, { withinFunction: false });
    return details;
  }

  private walkComplexityNode(node: any, details: FunctionComplexityDetail[], context: SymbolWalkContext): void {
    if (node.type === 'class_definition') {
      const className = node.childForFieldName('name')?.text;
      const body = node.childForFieldName('body');
      if (body) {
        for (const child of body.namedChildren) {
          this.walkComplexityNode(child, details, {
            currentClassName: className,
            withinFunction: false,
          });
        }
      }
      return;
    }

    if (node.type === 'function_definition') {
      const nameText = node.childForFieldName('name')?.text || '<anonymous>';
      const isMethod = Boolean(context.currentClassName && !context.withinFunction);
      const symbolName = isMethod && context.currentClassName
        ? `${context.currentClassName}.${nameText}`
        : nameText;
      details.push(this.measureFunctionComplexity(node, symbolName));

      const body = node.childForFieldName('body');
      if (body) {
        for (const child of body.namedChildren) {
          this.walkComplexityNode(child, details, {
            currentClassName: context.currentClassName,
            withinFunction: true,
          });
        }
      }
      return;
    }

    if (node.type === 'decorated_definition') {
      const definition = node.childForFieldName('definition');
      if (definition) {
        this.walkComplexityNode(definition, details, context);
      }
      return;
    }

    for (const child of node.namedChildren) {
      this.walkComplexityNode(child, details, context);
    }
  }

  private measureFunctionComplexity(node: any, name: string): FunctionComplexityDetail {
    const body = node.childForFieldName('body') ?? node;
    const metrics = this.measureComplexity(body);
    return {
      name,
      line: node.startPosition.row + 1,
      cyclomatic: metrics.cyclomatic,
      cognitive: metrics.cognitive,
      lines: node.endPosition.row - node.startPosition.row + 1,
    };
  }

  private measureComplexity(node: any): { cyclomatic: number; cognitive: number } {
    const counters = { branches: 0, maxDepth: 0 };

    const visit = (current: any, depth: number): void => {
      const nextDepth = this.isComplexityBranchNode(current) ? depth + 1 : depth;

      if (this.isComplexityBranchNode(current) || current.type === 'boolean_operator') {
        counters.branches++;
      }
      if (this.isComplexityBranchNode(current)) {
        counters.maxDepth = Math.max(counters.maxDepth, nextDepth);
      }

      for (const child of current.namedChildren ?? []) {
        visit(child, nextDepth);
      }
    };

    visit(node, 0);

    const cyclomatic = counters.branches + 1;
    return {
      cyclomatic,
      cognitive: cyclomatic + counters.maxDepth * 2,
    };
  }

  private isComplexityBranchNode(node: any): boolean {
    return [
      'if_statement',
      'elif_clause',
      'for_statement',
      'while_statement',
      'except_clause',
      'conditional_expression',
      'assert_statement',
      'comprehension_clause',
    ].includes(node.type);
  }

  private calculateMaintainabilityIndex(loc: number, cyclomatic: number, commentRatio: number): number {
    const normalizedLOC = Math.max(1, loc);
    const normalizedCC = Math.max(1, cyclomatic);

    let mi = 100;
    mi -= (normalizedCC - 1) * 2;
    mi -= Math.log(normalizedLOC / 10 + 1) * 5;
    mi += commentRatio * 15;

    return Math.max(0, Math.min(100, Math.round(mi)));
  }

  private buildCallGraphFromAST(
    root: any,
    imports: ImportInfo[],
    symbols: ModuleSymbol[]
  ): NonNullable<ParseResult['callGraph']> {
    const calls: NonNullable<ParseResult['callGraph']>['calls'] = [];
    const issues: NonNullable<ParseResult['callGraph']>['issues'] = [];
    const importedNames = this.collectImportedNames(imports);
    const localClassNames = new Set(
      symbols
        .filter((symbol) => symbol.kind === 'class')
        .map((symbol) => symbol.name)
    );

    this.walkCallGraph(root, { withinFunction: false }, calls, issues, localClassNames, importedNames);

    const recursive = [...new Set(
      calls
        .filter((call) => call.caller === call.callee)
        .map((call) => call.caller)
    )];

    return { calls, recursive, issues };
  }

  private walkCallGraph(
    node: any,
    context: CallWalkContext,
    calls: NonNullable<ParseResult['callGraph']>['calls'],
    issues: NonNullable<ParseResult['callGraph']>['issues'],
    localClassNames: Set<string>,
    importedNames: Set<string>
  ): void {
    if (node.type === 'class_definition') {
      const className = node.childForFieldName('name')?.text;
      const body = node.childForFieldName('body');
      if (className && body) {
        for (const child of body.namedChildren) {
          this.walkCallGraph(child, {
            currentClassName: className,
            withinFunction: false,
          }, calls, issues, localClassNames, importedNames);
        }
      }
      return;
    }

    if (node.type === 'function_definition') {
      this.collectFunctionCalls(node, context, calls, issues, localClassNames, importedNames);
      return;
    }

    if (node.type === 'decorated_definition') {
      const definition = node.childForFieldName('definition');
      if (definition?.type === 'class_definition') {
        this.walkCallGraph(definition, context, calls, issues, localClassNames, importedNames);
      } else if (definition?.type === 'function_definition') {
        this.collectFunctionCalls(definition, context, calls, issues, localClassNames, importedNames);
      }
      return;
    }

    for (const child of node.namedChildren) {
      this.walkCallGraph(child, context, calls, issues, localClassNames, importedNames);
    }
  }

  private collectFunctionCalls(
    node: any,
    context: CallWalkContext,
    calls: NonNullable<ParseResult['callGraph']>['calls'],
    issues: NonNullable<ParseResult['callGraph']>['issues'],
    localClassNames: Set<string>,
    importedNames: Set<string>
  ): void {
    const nameText = node.childForFieldName('name')?.text || '<anonymous>';
    const isMethod = Boolean(context.currentClassName && !context.withinFunction);
    const callerName = isMethod && context.currentClassName
      ? `${context.currentClassName}.${nameText}`
      : nameText;
    const body = node.childForFieldName('body');

    if (!body) {
      return;
    }

    this.collectCallsInNode(body, {
      callerName,
      currentClassName: context.currentClassName,
      withinFunction: true,
    }, calls, issues, localClassNames, importedNames);

    for (const child of body.namedChildren) {
      this.walkCallGraph(child, {
        currentClassName: context.currentClassName,
        withinFunction: true,
      }, calls, issues, localClassNames, importedNames);
    }
  }

  private collectCallsInNode(
    node: any,
    context: CallWalkContext,
    calls: NonNullable<ParseResult['callGraph']>['calls'],
    issues: NonNullable<ParseResult['callGraph']>['issues'],
    localClassNames: Set<string>,
    importedNames: Set<string>
  ): void {
    if (node.type === 'class_definition' || node.type === 'function_definition' || node.type === 'decorated_definition') {
      return;
    }

    if (node.type === 'call') {
      this.recordCallNode(node, context, calls, issues, localClassNames, importedNames);
    }

    const functionChild = node.type === 'call' ? node.childForFieldName('function') : null;
    for (const child of node.namedChildren) {
      if (functionChild && this.isSameNode(child, functionChild)) {
        continue;
      }
      this.collectCallsInNode(child, context, calls, issues, localClassNames, importedNames);
    }
  }

  private recordCallNode(
    node: any,
    context: CallWalkContext,
    calls: NonNullable<ParseResult['callGraph']>['calls'],
    issues: NonNullable<ParseResult['callGraph']>['issues'],
    localClassNames: Set<string>,
    importedNames: Set<string>
  ): void {
    const functionNode = node.childForFieldName('function');
    if (!functionNode || !context.callerName) {
      return;
    }

    if (functionNode.type === 'identifier') {
      calls.push({
        caller: context.callerName,
        callee: functionNode.text,
        line: node.startPosition.row + 1,
      });
      return;
    }

    if (functionNode.type === 'attribute') {
      const objectNode = functionNode.childForFieldName('object');
      const attributeNode = functionNode.childForFieldName('attribute');
      if (!objectNode || !attributeNode) {
        issues?.push({
          caller: context.callerName,
          expression: node.text,
          line: node.startPosition.row + 1,
          column: node.startPosition.column,
          status: 'unresolved',
        });
        return;
      }

      if (objectNode.type !== 'identifier') {
        issues?.push({
          caller: context.callerName,
          expression: node.text,
          line: node.startPosition.row + 1,
          column: node.startPosition.column,
          status: 'unsupported_dynamic',
        });
        return;
      }

      const objectName = objectNode.text;
      const attributeName = attributeNode.text;

      if ((objectName === 'self' || objectName === 'cls') && context.currentClassName) {
        calls.push({
          caller: context.callerName,
          callee: `${context.currentClassName}.${attributeName}`,
          line: node.startPosition.row + 1,
        });
        return;
      }

      if (localClassNames.has(objectName) || importedNames.has(objectName)) {
        calls.push({
          caller: context.callerName,
          callee: `${objectName}.${attributeName}`,
          line: node.startPosition.row + 1,
        });
        return;
      }

      issues?.push({
        caller: context.callerName,
        expression: node.text,
        line: node.startPosition.row + 1,
        column: node.startPosition.column,
        status: 'ambiguous',
      });
      return;
    }

    issues?.push({
      caller: context.callerName,
      expression: node.text,
      line: node.startPosition.row + 1,
      column: node.startPosition.column,
      status: functionNode.type === 'call' ? 'unsupported_dynamic' : 'unresolved',
    });
  }

  private collectImportedNames(imports: ImportInfo[]): Set<string> {
    const importedNames = new Set<string>();

    for (const imp of imports) {
      for (const specifier of imp.specifiers) {
        if (specifier.alias) {
          importedNames.add(specifier.alias);
        }
        if (specifier.name && specifier.name !== '*') {
          importedNames.add(specifier.name);
        }
      }
    }

    return importedNames;
  }

  private isSameNode(left: any, right: any): boolean {
    return left.type === right.type &&
      left.startIndex === right.startIndex &&
      left.endIndex === right.endIndex;
  }

  // ============================================
  // 行数统计（基于 AST）
  // ============================================

  /**
   * 基于 AST 统计行数（使用 comment 节点）
   */
  private countLinesFromAST(root: any, content: string): {
    total: number;
    code: number;
    comment: number;
    blank: number;
  } {
    const lines = content.split('\n');
    const total = lines.length;

    // 统计空行
    let blank = 0;
    for (const line of lines) {
      if (line.trim().length === 0) {
        blank++;
      }
    }

    // 统计注释行
    const commentLines = new Set<number>();
    this.collectCommentLines(root, commentLines);
    const comment = commentLines.size;

    return {
      total,
      code: total - comment - blank,
      comment,
      blank,
    };
  }

  /**
   * 递归收集注释节点的行号
   */
  private collectCommentLines(node: any, lines: Set<number>): void {
    if (node.type === 'comment') {
      const start = node.startPosition.row;
      const end = node.endPosition.row;
      for (let i = start; i <= end; i++) {
        lines.add(i);
      }
    }
    for (const child of node.children) {
      this.collectCommentLines(child, lines);
    }
  }
}
