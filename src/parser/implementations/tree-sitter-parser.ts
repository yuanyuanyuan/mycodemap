// ============================================
// Tree-sitter Parser - 基于 tree-sitter 的解析器
// ============================================

import fs from 'fs/promises';
import path from 'path';
import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import type { ExportInfo, ImportInfo, ImportSpecifier, ModuleSymbol, SymbolKind } from '../../types/index.js';
import type { IParser, ParserOptions, ParseResult } from '../interfaces/IParser.js';

/**
 * Tree-sitter Parser
 * 使用 tree-sitter 进行高性能代码解析
 */
export class TreeSitterParser implements IParser {
  readonly name = 'TreeSitterParser';
  readonly mode: 'fast' | 'smart' = 'fast';
  private parser: Parser;
  private rootDir: string;

  constructor(options: ParserOptions) {
    this.rootDir = options.rootDir;
    this.parser = new Parser();
    // 使用 TypeScript 语言
    this.parser.setLanguage(TypeScript.typescript);
  }

  /**
   * 解析单个文件
   */
  async parseFile(filePath: string): Promise<ParseResult> {
    const content = await fs.readFile(filePath, 'utf-8');
    const tree = this.parser.parse(content);

    return {
      path: filePath,
      exports: this.extractExports(tree.rootNode, content),
      imports: this.extractImports(tree.rootNode, content),
      symbols: this.extractSymbols(tree.rootNode, content),
      dependencies: this.extractDependencies(tree.rootNode, content),
      type: this.detectModuleType(filePath),
      stats: this.calculateStats(content, tree.rootNode)
    };
  }

  /**
   * 批量解析文件
   */
  async parseFiles(filePaths: string[]): Promise<ParseResult[]> {
    return Promise.all(filePaths.map(fp => this.parseFile(fp)));
  }

  /**
   * 释放资源
   */
  dispose(): void {
    // tree-sitter 不需要显式释放
  }

  /**
   * 提取导入信息
   */
  private extractImports(root: Parser.SyntaxNode, content: string): ImportInfo[] {
    const imports: ImportInfo[] = [];

    // 查找 import 语句
    const importNodes = root.namedChildren.filter(
      node => node.type === 'import_statement'
    );

    for (const importNode of importNodes) {
      // 获取导入的模块路径
      const stringLiteral = importNode.namedChildren.find(
        node => node.type === 'string'
      );
      const source = stringLiteral?.text.replace(/['"]/g, '') || '';

      // 判断是相对导入还是绝对导入
      const sourceType: 'relative' | 'absolute' | 'node_module' | 'alias' =
        source.startsWith('.') ? 'relative' :
        source.startsWith('@') ? 'alias' : 'node_module';

      // 获取导入的命名空间
      const importClause = importNode.namedChildren.find(
        node => node.type === 'import_clause'
      );

      const specifiers: ImportSpecifier[] = [];

      if (importClause) {
        // 处理 named imports: import { a, b } from 'module'
        const namedImports = importClause.namedChildren.filter(
          node => node.type === 'named_imports'
        );

        for (const named of namedImports) {
          const specifierList = named.namedChildren.filter(
            node => node.type === 'import_specifier'
          );

          for (const spec of specifierList) {
            const name = spec.namedChildren[0];
            specifiers.push({
              name: name?.text || '',
              alias: spec.namedChildren[1]?.text,
              isTypeOnly: false
            });
          }
        }

        // 处理 default import: import a from 'module'
        const defaultImport = importClause.namedChildren.find(
          node => node.type === 'identifier'
        );
        if (defaultImport) {
          specifiers.push({
            name: defaultImport.text,
            isTypeOnly: false
          });
        }

        // 处理 namespace import: import * as a from 'module'
        const namespaceImport = importClause.namedChildren.find(
          node => node.type === 'namespace_import'
        );
        if (namespaceImport) {
          const alias = namespaceImport.namedChildren[0];
          specifiers.push({
            name: alias?.text || '*',
            isTypeOnly: false
          });
        }
      }

      if (specifiers.length > 0 || source) {
        imports.push({
          source,
          sourceType,
          specifiers,
          isTypeOnly: false
        });
      }
    }

    return imports;
  }

  /**
   * 提取导出信息
   */
  private extractExports(root: Parser.SyntaxNode, content: string): ExportInfo[] {
    const exports: ExportInfo[] = [];

    // 查找 export 语句
    const exportNodes = root.namedChildren.filter(
      node => node.type === 'export_statement'
    );

    for (const exportNode of exportNodes) {
      // 查找子节点
      for (const child of exportNode.namedChildren) {
        switch (child.type) {
          case 'named_exports':
            // export { a, b }
            const specifiers = child.namedChildren.filter(
              node => node.type === 'export_specifier'
            );
            for (const spec of specifiers) {
              const name = spec.namedChildren[0];
              exports.push({
                name: name?.text || '',
                kind: 'function',
                isDefault: false,
                isTypeOnly: false,
                origin: spec.namedChildren[1]?.text
              });
            }
            break;

          case 'class_declaration':
            // export class A {}
            const className = child.namedChildren.find(
              node => node.type === 'type_identifier'
            );
            if (className) {
              exports.push({
                name: className.text,
                kind: 'class',
                isDefault: false,
                isTypeOnly: false
              });
            }
            break;

          case 'function_declaration':
            // export function foo() {}
            const funcName = child.namedChildren.find(
              node => node.type === 'identifier'
            );
            if (funcName) {
              exports.push({
                name: funcName.text,
                kind: 'function',
                isDefault: false,
                isTypeOnly: false
              });
            }
            break;

          case 'variable_declaration':
            // export const a = ...
            const variables = child.namedChildren.filter(
              node => node.type === 'variable_declarator'
            );
            for (const variable of variables) {
              const varName = variable.namedChildren[0];
              exports.push({
                name: varName?.text || '',
                kind: 'type',
                isDefault: false,
                isTypeOnly: false
              });
            }
            break;

          case 'interface_declaration':
            // export interface A {}
            const ifaceName = child.namedChildren.find(
              node => node.type === 'type_identifier'
            );
            if (ifaceName) {
              exports.push({
                name: ifaceName.text,
                kind: 'interface',
                isDefault: false,
                isTypeOnly: false
              });
            }
            break;

          case 'type_alias_declaration':
            // export type A = ...
            const typeName = child.namedChildren.find(
              node => node.type === 'type_identifier'
            );
            if (typeName) {
              exports.push({
                name: typeName.text,
                kind: 'type',
                isDefault: false,
                isTypeOnly: false
              });
            }
            break;

          case 'enum_declaration':
            // export enum A {}
            const enumName = child.namedChildren.find(
              node => node.type === 'identifier'
            );
            if (enumName) {
              exports.push({
                name: enumName.text,
                kind: 'enum',
                isDefault: false,
                isTypeOnly: false
              });
            }
            break;
        }
      }

      // 处理 export default
      const defaultExport = exportNode.namedChildren.find(
        node => node.type === 'default'
      );
      if (defaultExport) {
        exports.push({
          name: 'default',
          kind: 'function',
          isDefault: true,
          isTypeOnly: false
        });
      }
    }

    return exports;
  }

  /**
   * 提取符号信息
   */
  private extractSymbols(root: Parser.SyntaxNode, content: string): ModuleSymbol[] {
    const symbols: ModuleSymbol[] = [];

    // 查找所有声明
    const declarations = this.findDeclarations(root);

    for (const decl of declarations) {
      symbols.push({
        id: `${decl.name}-${decl.node.startPosition.row}`,
        name: decl.name,
        kind: decl.kind,
        location: {
          file: '',  // 需要由调用方填充
          line: decl.node.startPosition.row + 1,
          column: decl.node.startPosition.column
        },
        visibility: 'public',
        relatedSymbols: []
      });
    }

    return symbols;
  }

  /**
   * 查找所有声明
   */
  private findDeclarations(node: Parser.SyntaxNode): Array<{ name: string; kind: SymbolKind; node: Parser.SyntaxNode }> {
    const declarations: Array<{ name: string; kind: SymbolKind; node: Parser.SyntaxNode }> = [];

    // 类声明
    if (node.type === 'class_declaration') {
      const name = node.namedChildren.find(n => n.type === 'type_identifier');
      if (name) {
        declarations.push({ name: name.text, kind: 'class', node });
      }
    }

    // 函数声明
    if (node.type === 'function_declaration') {
      const name = node.namedChildren.find(n => n.type === 'identifier');
      if (name) {
        declarations.push({ name: name.text, kind: 'function', node });
      }
    }

    // 接口声明
    if (node.type === 'interface_declaration') {
      const name = node.namedChildren.find(n => n.type === 'type_identifier');
      if (name) {
        declarations.push({ name: name.text, kind: 'interface', node });
      }
    }

    // 类型别名
    if (node.type === 'type_alias_declaration') {
      const name = node.namedChildren.find(n => n.type === 'type_identifier');
      if (name) {
        declarations.push({ name: name.text, kind: 'type', node });
      }
    }

    // 枚举
    if (node.type === 'enum_declaration') {
      const name = node.namedChildren.find(n => n.type === 'identifier');
      if (name) {
        declarations.push({ name: name.text, kind: 'enum', node });
      }
    }

    // 变量声明
    if (node.type === 'variable_declarator') {
      const name = node.namedChildren[0];
      if (name && name.type === 'identifier') {
        declarations.push({ name: name.text, kind: 'variable', node });
      }
    }

    // 递归遍历子节点
    for (const child of node.namedChildren) {
      declarations.push(...this.findDeclarations(child));
    }

    return declarations;
  }

  /**
   * 提取依赖列表
   */
  private extractDependencies(root: Parser.SyntaxNode, content: string): string[] {
    const deps: Set<string> = new Set();

    // 从导入语句中提取依赖
    const imports = this.extractImports(root, content);
    for (const imp of imports) {
      // 过滤外部模块 vs 本地模块
      if (!imp.source.startsWith('.')) {
        deps.add(imp.source);
      }
    }

    return Array.from(deps);
  }

  /**
   * 检测模块类型
   */
  private detectModuleType(filePath: string): 'source' | 'test' | 'config' | 'type' {
    const basename = path.basename(filePath);

    if (basename.includes('.test.') || basename.includes('.spec.')) {
      return 'test';
    }
    if (basename.startsWith('.') || basename.endsWith('.config.') || basename.endsWith('.config.ts')) {
      return 'config';
    }
    if (basename.includes('.d.ts') || basename.includes('.types.')) {
      return 'type';
    }
    return 'source';
  }

  /**
   * 计算代码统计
   */
  private calculateStats(content: string, root: Parser.SyntaxNode): {
    lines: number;
    codeLines: number;
    commentLines: number;
    blankLines: number;
  } {
    const lines = content.split('\n');
    let commentLines = 0;
    let blankLines = 0;

    // 统计注释和空行
    const comments = this.findCommentNodes(root);
    const commentLinesSet = new Set<number>();

    for (const comment of comments) {
      const startLine = comment.startPosition.row;
      const endLine = comment.endPosition.row;
      for (let i = startLine; i <= endLine; i++) {
        commentLinesSet.add(i);
      }
    }

    for (const line of lines) {
      if (line.trim() === '') {
        blankLines++;
      }
    }

    commentLines = commentLinesSet.size;

    return {
      lines: lines.length,
      codeLines: lines.length - commentLines - blankLines,
      commentLines,
      blankLines
    };
  }

  /**
   * 查找注释节点
   */
  private findCommentNodes(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
    const comments: Parser.SyntaxNode[] = [];

    if (node.type === 'comment') {
      comments.push(node);
    }

    for (const child of node.children) {
      comments.push(...this.findCommentNodes(child));
    }

    return comments;
  }
}
