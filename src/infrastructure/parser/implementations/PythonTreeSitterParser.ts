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
  DecoratorInfo,
  FunctionSignature,
  ParameterInfo,
  SymbolKind,
} from '../../../interface/types/index.js';
import { ParserBase, ParseError } from '../interfaces/ParserBase.js';

// 模块级缓存：web-tree-sitter 是单例，init() 只能安全调用一次
let _wasmParserCtor: any = null;

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

  private parser: any = null;
  private pythonLanguage: any = null;
  private grammarLoaded = false;

  // ============================================
  // 生命周期
  // ============================================

  protected async doInitialize(): Promise<void> {
    await this.loadGrammar();
  }

  protected async doDispose(): Promise<void> {
    this.parser = null;
    this.pythonLanguage = null;
    this.grammarLoaded = false;
  }

  // ============================================
  // Grammar 加载（双路径：native → WASM）
  // ============================================

  private async loadGrammar(): Promise<void> {
    // 尝试 native 加载
    try {
      const treeSitterModule = await import('tree-sitter');
      const pythonModule = await import('tree-sitter-python');
      this.parser = new (treeSitterModule.default as any)();
      this.pythonLanguage = (pythonModule as any).language;
      this.parser.setLanguage(this.pythonLanguage);
      // 验证 parse + node 访问正常（ABI 不兼容时 setLanguage 成功但 node 访问失败）
      const testTree = this.parser.parse('x = 1');
      void testTree.rootNode.type;
      this.grammarLoaded = true;
      return;
    } catch {
      // native 失败（ABI 不兼容或模块缺失），尝试 WASM
    }

    // 尝试 WASM 加载（web-tree-sitter 是单例，使用模块级缓存）
    try {
      if (!_wasmParserCtor) {
        const wasmParserModule = await import('web-tree-sitter');
        _wasmParserCtor = (wasmParserModule as any).default || wasmParserModule;
        if (typeof _wasmParserCtor.init === 'function') {
          await _wasmParserCtor.init();
        }
      }

      const Lang = (_wasmParserCtor as any).Language;
      if (!Lang) {
        throw new Error('web-tree-sitter Language not available after init()');
      }

      const { createRequire } = await import('node:module');
      const require = createRequire(import.meta.url);
      const pyWasmPath = require.resolve('tree-sitter-python/tree-sitter-python.wasm');
      this.pythonLanguage = await Lang.load(pyWasmPath);

      this.parser = new _wasmParserCtor();
      this.parser.setLanguage(this.pythonLanguage);
      this.grammarLoaded = true;
      return;
    } catch {
      // WASM 也失败
    }

    // 两种方式都失败，抛出明确错误（D-10）
    throw new ParseError(
      'tree-sitter-python grammar not available. ' +
      'Install native: npm install tree-sitter tree-sitter-python. ' +
      'Or WASM: npm install web-tree-sitter tree-sitter-python. ' +
      'No silent fallback to regex parser.'
    );
  }

  // ============================================
  // parseFile
  // ============================================

  async parseFile(
    filePath: string,
    content: string,
    _options?: ParseOptions
  ): Promise<ParseResult> {
    this.ensureInitialized();

    if (!this.grammarLoaded) {
      throw new ParseError(
        'tree-sitter-python grammar not available. Cannot parse Python files.',
        filePath
      );
    }

    const startTime = Date.now();

    try {
      const tree = this.parser.parse(content);
      const root = tree.rootNode;

      // 并行提取各种信息
      const [imports, exports, symbols] = await Promise.all([
        this.extractImportsFromAST(root),
        this.extractExportsFromAST(root),
        this.extractSymbolsFromAST(root),
      ]);

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
        symbols,
        imports,
        exports,
        dependencies: [],
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
    if (!this.grammarLoaded) {
      throw new ParseError('tree-sitter-python grammar not available.');
    }
    const tree = this.parser.parse(content);
    return this.extractImportsFromAST(tree.rootNode);
  }

  async extractExports(content: string): Promise<ExportInfo[]> {
    this.ensureInitialized();
    if (!this.grammarLoaded) {
      throw new ParseError('tree-sitter-python grammar not available.');
    }
    const tree = this.parser.parse(content);
    return this.extractExportsFromAST(tree.rootNode);
  }

  async extractSymbols(content: string): Promise<ModuleSymbol[]> {
    this.ensureInitialized();
    if (!this.grammarLoaded) {
      throw new ParseError('tree-sitter-python grammar not available.');
    }
    const tree = this.parser.parse(content);
    return this.extractSymbolsFromAST(tree.rootNode);
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
    this.walkNode(root, symbols, 0);
    return symbols;
  }

  /**
   * 递归遍历 AST 节点提取符号
   */
  private walkNode(node: any, symbols: ModuleSymbol[], depth: number): void {
    if (node.type === 'class_definition') {
      symbols.push(this.extractClassSymbol(node, null));
      // 递归 body 中的嵌套定义
      const body = node.childForFieldName('body');
      if (body) {
        for (const child of body.namedChildren) {
          this.walkNode(child, symbols, depth + 1);
        }
      }
      return;
    }

    if (node.type === 'function_definition') {
      symbols.push(this.extractFunctionSymbol(node, null));
      // 递归 body 中的嵌套定义
      const body = node.childForFieldName('body');
      if (body) {
        for (const child of body.namedChildren) {
          this.walkNode(child, symbols, depth + 1);
        }
      }
      return;
    }

    if (node.type === 'decorated_definition') {
      const definition = node.childForFieldName('definition');
      if (definition) {
        const decorators = this.extractDecorators(node);
        if (definition.type === 'class_definition') {
          symbols.push(this.extractClassSymbol(definition, decorators));
        } else if (definition.type === 'function_definition') {
          symbols.push(this.extractFunctionSymbol(definition, decorators));
        }
        // 递归 body
        const body = definition.childForFieldName('body');
        if (body) {
          for (const child of body.namedChildren) {
            this.walkNode(child, symbols, depth + 1);
          }
        }
      }
      return;
    }

    // 递归遍历其他节点（不过滤定义类型——顶层 if/return 已处理）
    for (const child of node.namedChildren) {
      this.walkNode(child, symbols, depth);
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
  private extractFunctionSymbol(node: any, decorators: DecoratorInfo[] | null): ModuleSymbol {
    const name = node.childForFieldName('name');
    const nameText = name?.text || '<anonymous>';
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
      name: nameText,
      kind: 'function',
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
