// [META] since:2026-03 | owner:core-team | stable:true
// [WHY] Legacy parser entry keeps fast/smart parser factory and compatibility helpers for existing callers
// ============================================
// Parser Module - 解析器工厂和入口
// ============================================

import ts from 'typescript';
import fs from 'fs/promises';
import path from 'path';
import type { ModuleInfo, ImportInfo, ExportInfo, ModuleSymbol, SymbolKind, DecoratorInfo } from '../types/index.js';
import type { IParser, ParserOptions, ParserMode } from './interfaces/IParser.js';
import { SmartParser } from './implementations/smart-parser.js';
import { FastParser } from './implementations/fast-parser.js';

// 导出接口
export type { IParser, ParserOptions, ParserMode } from './interfaces/IParser.js';
export type { ParseResult, TypeInfo, CallGraph, ComplexityMetrics } from './interfaces/IParser.js';

// 导出实现
export { SmartParser, FastParser };

/**
 * 解析器工厂 - 根据模式创建合适的解析器
 */
export function createParser(options: ParserOptions): IParser {
  if (options.mode === 'fast') {
    return new FastParser(options);
  } else {
    return new SmartParser(options);
  }
}

/**
 * 获取解析器支持的模式
 */
export function getSupportedModes(): ParserMode[] {
  return ['fast', 'smart'];
}

// ========== 保留原有实现（向后兼容）==========

// 创建 TypeScript 程序
export function createProgram(_rootDir: string, files: string[]) {
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    skipLibCheck: true,
    noEmit: true
  };

  return ts.createProgram(files, compilerOptions);
}

// 读取文件
async function readFileContent(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

// 解析文件
export async function parseFile(filePath: string): Promise<ModuleInfo> {
  const content = await readFileContent(filePath);
  const sourceFile = ts.createSourceFile(
    path.basename(filePath),
    content,
    ts.ScriptTarget.ES2022,
    true
  );

  const stats = getFileStats(content);

  const imports = extractImports(sourceFile);
  const exports = extractExports(sourceFile);
  const symbols = extractSymbols(sourceFile);

  return {
    id: generateId(filePath),
    path: filePath,
    absolutePath: filePath,
    type: getModuleType(filePath),
    stats,
    exports,
    imports,
    symbols,
    // 只包含外部模块依赖，过滤掉本地相对路径导入
    dependencies: imports
      .map(i => resolveImportPath(filePath, i.source))
      .filter(dep => !dep.startsWith('.')),
    dependents: []
  };
}

// 获取文件统计
function getFileStats(content: string): ModuleInfo['stats'] {
  const lines = content.split('\n');
  let codeLines = 0;
  let commentLines = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      commentLines++;
    } else {
      codeLines++;
    }
  }

  return {
    lines: lines.length,
    codeLines,
    commentLines,
    blankLines: lines.length - codeLines - commentLines
  };
}

// 提取导入信息
function extractImports(sourceFile: ts.SourceFile): ImportInfo[] {
  const imports: ImportInfo[] = [];

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      let source = '';

      if (ts.isStringLiteral(moduleSpecifier)) {
        source = moduleSpecifier.text;
      }

      const specifiers: ImportInfo['specifiers'] = [];
      if (node.importClause) {
        if (node.importClause.namedBindings) {
          if (ts.isNamedImports(node.importClause.namedBindings)) {
            for (const spec of node.importClause.namedBindings.elements) {
              specifiers.push({
                name: spec.name.text,
                alias: spec.propertyName?.text,
                isTypeOnly: false
              });
            }
          } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
            specifiers.push({
              name: '*',
              alias: node.importClause.namedBindings.name.text,
              isTypeOnly: false
            });
          }
        }

        if (node.importClause.name) {
          specifiers.push({
            name: node.importClause.name.text,
            isTypeOnly: false
          });
        }
      }

      imports.push({
        source,
        sourceType: getImportType(source),
        specifiers,
        isTypeOnly: ts.isTypeOnlyImportDeclaration(node)
      });
    }
  });

  return imports;
}

// 提取导出信息
function extractExports(sourceFile: ts.SourceFile): ExportInfo[] {
  const exports: ExportInfo[] = [];

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier) {
        // re-export
        let source = '';
        if (ts.isStringLiteral(node.moduleSpecifier)) {
          source = node.moduleSpecifier.text;
        }

        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          for (const spec of node.exportClause.elements) {
            exports.push({
              name: spec.name.text,
              kind: 'variable',
              isDefault: false,
              isTypeOnly: false,
              origin: source
            });
          }
        }
      }
    } else if (ts.isFunctionDeclaration(node) ||
               ts.isClassDeclaration(node) ||
               ts.isInterfaceDeclaration(node) ||
               ts.isTypeAliasDeclaration(node) ||
               ts.isEnumDeclaration(node) ||
               ts.isModuleDeclaration(node)) {
      const modifiers = ts.getModifiers(node);
      const isExported = modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      const isDefault = modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);

      if (isExported && node.name) {
        exports.push({
          name: node.name.text,
          kind: getSymbolKind(node),
          isDefault: isDefault || false,
          isTypeOnly: false
        });
      }
    }
  });

  return exports;
}

// 提取符号信息
function extractSymbols(sourceFile: ts.SourceFile): ModuleSymbol[] {
  const symbols: ModuleSymbol[] = [];

  function visit(node: ts.Node) {
    let symbol: ModuleSymbol | null = null;

    if (ts.isFunctionDeclaration(node) && node.name) {
      symbol = createSymbol(node.name.text, 'function', node);
    } else if (ts.isClassDeclaration(node) && node.name) {
      symbol = createSymbol(node.name.text, 'class', node);
    } else if (ts.isInterfaceDeclaration(node) && node.name) {
      symbol = createSymbol(node.name.text, 'interface', node);
    } else if (ts.isTypeAliasDeclaration(node) && node.name) {
      symbol = createSymbol(node.name.text, 'type', node);
    } else if (ts.isEnumDeclaration(node) && node.name) {
      symbol = createSymbol(node.name.text, 'enum', node);
    } else if (ts.isMethodDeclaration(node) && node.name) {
      const methodName = (node.name as any).text || 'anonymous';
      symbol = createSymbol(methodName, 'method', node);
    } else if (ts.isPropertyDeclaration(node) && node.name) {
      const propName = (node.name as any).text || 'anonymous';
      symbol = createSymbol(propName, 'property', node);
    } else if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (decl.name && ts.isIdentifier(decl.name)) {
          symbols.push(createSymbol(decl.name.text, 'variable', decl));
        }
      }
    }

    if (symbol) {
      symbols.push(symbol);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return symbols;
}

/**
 * 提取装饰器信息
 */
function extractDecorators(node: ts.Node, kind: SymbolKind): DecoratorInfo[] {
  const decorators: DecoratorInfo[] = [];

  // 直接检查节点的 modifiers 属性
  const modifiers = (node as any).modifiers;
  if (!modifiers || !Array.isArray(modifiers)) return decorators;

  for (const modifier of modifiers) {
    if (modifier.kind === ts.SyntaxKind.Decorator) {
      const decorator = modifier as ts.Decorator;
      const decoratorInfo = parseDecorator(decorator, kind);
      if (decoratorInfo) {
        decorators.push(decoratorInfo);
      }
    }
  }

  return decorators;
}

/**
 * 解析装饰器，获取名称和参数
 */
function parseDecorator(decorator: ts.Decorator, targetKind: SymbolKind): DecoratorInfo | null {
  let decoratorName = '';
  let params: any = undefined;

  // 获取装饰器表达式
  const expr = decorator.expression;

  if (ts.isCallExpression(expr)) {
    // 处理带参数的装饰器，如 @Component({...})
    const callee = expr.expression;
    if (ts.isIdentifier(callee)) {
      decoratorName = callee.text;
    }

    // 解析参数
    if (expr.arguments.length > 0) {
      const firstArg = expr.arguments[0];
      params = parseDecoratorArg(firstArg);
    }
  } else if (ts.isIdentifier(expr)) {
    // 处理不带参数的装饰器，如 @Injectable
    decoratorName = expr.text;
  }

  // 确定装饰器目标类型
  let target: DecoratorInfo['target'] = 'class';
  if (targetKind === 'method') {
    target = 'method';
  } else if (targetKind === 'property') {
    target = 'property';
  } else if (targetKind === 'parameter') {
    target = 'parameter';
  }

  return {
    name: decoratorName,
    params,
    target
  };
}

/**
 * 解析装饰器参数
 */
function parseDecoratorArg(arg: ts.Expression): any {
  // 处理对象字面量
  if (ts.isObjectLiteralExpression(arg)) {
    const result: Record<string, any> = {};
    for (const prop of arg.properties) {
      if (ts.isPropertyAssignment(prop)) {
        const key = prop.name.getText();
        const value = parseExpression(prop.initializer);
        result[key] = value;
      }
    }
    return result;
  }

  // 处理字符串字面量
  if (ts.isStringLiteral(arg)) {
    return arg.text;
  }

  // 处理数字字面量
  if (ts.isNumericLiteral(arg)) {
    return Number(arg.text);
  }

  // 处理布尔字面量
  if (arg.kind === ts.SyntaxKind.TrueKeyword || arg.kind === ts.SyntaxKind.FalseKeyword) {
    return arg.kind === ts.SyntaxKind.TrueKeyword;
  }

  // 处理 null 字面量
  if (arg.kind === ts.SyntaxKind.NullKeyword) {
    return null;
  }

  // 处理标识符（如 true, false, null, undefined）
  if (ts.isIdentifier(arg)) {
    const text = arg.text;
    if (text === 'true') return true;
    if (text === 'false') return false;
    if (text === 'null') return null;
    if (text === 'undefined') return undefined;
    return text;
  }

  // 处理数组字面量
  if (ts.isArrayLiteralExpression(arg)) {
    return arg.elements.map(elem => parseDecoratorArg(elem));
  }

  return undefined;
}

/**
 * 解析表达式为 JavaScript 值
 */
function parseExpression(expr: ts.Expression): any {
  if (ts.isStringLiteral(expr)) return expr.text;
  if (ts.isNumericLiteral(expr)) return Number(expr.text);
  if (expr.kind === ts.SyntaxKind.TrueKeyword || expr.kind === ts.SyntaxKind.FalseKeyword) {
    return expr.kind === ts.SyntaxKind.TrueKeyword;
  }
  if (expr.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isArrayLiteralExpression(expr)) return expr.elements.map(elem => parseExpression(elem));
  if (ts.isObjectLiteralExpression(expr)) {
    const result: Record<string, any> = {};
    for (const prop of expr.properties) {
      if (ts.isPropertyAssignment(prop)) {
        const key = prop.name.getText();
        result[key] = parseExpression(prop.initializer);
      }
    }
    return result;
  }
  return expr.getText();
}

function createSymbol(name: string, kind: SymbolKind, node: ts.Node): ModuleSymbol {
  const location = getLocation(node);
  const decorators = extractDecorators(node, kind);
  return {
    id: generateId(name + location.file + location.line),
    name,
    kind,
    location,
    visibility: 'public',
    relatedSymbols: [],
    decorators: decorators.length > 0 ? decorators : undefined
  };
}

function getLocation(node: ts.Node): ModuleSymbol['location'] {
  const file = node.getSourceFile().fileName;
  const start = node.getStart();
  const { line, character } = node.getSourceFile().getLineAndCharacterOfPosition(start);
  return {
    file,
    line: line + 1,
    column: character + 1
  };
}

function getSymbolKind(node: ts.Node): SymbolKind {
  if (ts.isFunctionDeclaration(node)) return 'function';
  if (ts.isClassDeclaration(node)) return 'class';
  if (ts.isInterfaceDeclaration(node)) return 'interface';
  if (ts.isTypeAliasDeclaration(node)) return 'type';
  if (ts.isEnumDeclaration(node)) return 'enum';
  if (ts.isMethodDeclaration(node)) return 'method';
  if (ts.isPropertyDeclaration(node)) return 'property';
  return 'variable';
}

function getImportType(source: string): ImportInfo['sourceType'] {
  if (source.startsWith('.')) return 'relative';
  if (source.startsWith('@')) return 'alias';
  return 'node_module';
}

function getModuleType(filePath: string): ModuleInfo['type'] {
  if (filePath.includes('.test.') || filePath.includes('.spec.')) return 'test';
  if (filePath.includes('config.') || filePath.endsWith('config.ts')) return 'config';
  return 'source';
}

function generateId(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function resolveImportPath(fromPath: string, importPath: string): string {
  if (!importPath.startsWith('.')) return importPath;

  const fromDir = path.dirname(fromPath);
  const resolved = path.resolve(fromDir, importPath);

  // 如果已经是 .ts 文件，直接返回
  if (resolved.endsWith('.ts')) {
    return resolved;
  }
  // 如果是 .js 文件，也直接返回（不添加 .ts）
  if (resolved.endsWith('.js')) {
    return resolved;
  }
  // 其他情况添加 .ts 扩展名
  return resolved + '.ts';
}
