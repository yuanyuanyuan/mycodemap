// ============================================
// Smart Parser - 基于 TS Compiler API 的深度解析器
// ============================================

import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import type { IParser, ParseResult, ParserOptions, TypeInfo, CallGraph, ComplexityMetrics } from '../interfaces/IParser.js';
import type { ExportInfo, ImportInfo, ModuleSymbol, SymbolKind, DecoratorInfo, FunctionSignature, ParameterInfo, MemberInfo, JSDocComment, CodeSnippet, CodeSnippetType } from '../../types/index.js';

/**
 * Smart Parser - 使用 TypeScript Compiler API 进行深度分析
 */
export class SmartParser implements IParser {
  readonly name = 'smart-parser';
  readonly mode = 'smart';

  constructor(_options: ParserOptions) {
  }

  /**
   * 解析单个文件
   */
  async parseFile(filePath: string): Promise<ParseResult> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      path.basename(filePath),
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const exports = this.extractExports(sourceFile);
    const imports = this.extractImports(sourceFile);
    const symbols = this.extractSymbols(sourceFile);
    const dependencies = this.extractDependencies(imports, exports);
    const typeInfo = this.extractTypeInfo(sourceFile);
    const callGraph = this.extractCallGraph(sourceFile);
    const complexity = this.calculateComplexity(sourceFile);

    return {
      path: filePath,
      exports,
      imports,
      symbols,
      dependencies,
      type: this.getModuleType(filePath),
      stats: this.getFileStats(content),
      typeInfo,
      callGraph,
      complexity
    };
  }

  /**
   * 批量解析文件
   */
  async parseFiles(filePaths: string[]): Promise<ParseResult[]> {
    const results: ParseResult[] = [];

    for (const filePath of filePaths) {
      try {
        const result = await this.parseFile(filePath);
        results.push(result);
      } catch (error) {
        console.error(`解析失败: ${filePath}`, error);
      }
    }

    return results;
  }

  /**
   * 释放资源
   */
  dispose(): void {
    // 清理资源
  }

  /**
   * 提取导出信息
   */
  private extractExports(sourceFile: ts.SourceFile): ExportInfo[] {
    const exports: ExportInfo[] = [];

    ts.forEachChild(sourceFile, (node) => {
      if (ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier) {
          const source = this.getStringLiteral(node.moduleSpecifier, sourceFile);
          if (source && node.exportClause && ts.isNamedExports(node.exportClause)) {
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
      } else if (this.isExportable(node)) {
        const name = this.getNodeName(node);
        if (name) {
          exports.push({
            name,
            kind: this.getSymbolKind(node),
            isDefault: false,
            isTypeOnly: false
          });
        }
      }
    });

    return exports;
  }

  /**
   * 检查节点是否可导出
   */
  private isExportable(node: ts.Node): boolean {
    return ts.isClassDeclaration(node) ||
           ts.isFunctionDeclaration(node) ||
           ts.isInterfaceDeclaration(node) ||
           ts.isTypeAliasDeclaration(node) ||
           ts.isEnumDeclaration(node) ||
           ts.isModuleDeclaration(node);
  }

  /**
   * 获取节点名称
   */
  private getNodeName(node: ts.Node): string | null {
    const nameNode = (node as any).name;
    if (nameNode && ts.isIdentifier(nameNode)) {
      return nameNode.text;
    }
    return null;
  }

  /**
   * 获取符号类型
   */
  private getSymbolKind(node: ts.Node): SymbolKind {
    if (ts.isClassDeclaration(node)) return 'class';
    if (ts.isFunctionDeclaration(node)) return 'function';
    if (ts.isInterfaceDeclaration(node)) return 'interface';
    if (ts.isTypeAliasDeclaration(node)) return 'type';
    if (ts.isEnumDeclaration(node)) return 'enum';
    if (ts.isMethodDeclaration(node)) return 'method';
    if (ts.isPropertyDeclaration(node)) return 'property';
    return 'variable';
  }

  /**
   * 获取字符串字面量
   */
  private getStringLiteral(node: ts.Node, _sourceFile: ts.SourceFile): string | null {
    if (ts.isStringLiteral(node)) {
      return node.text;
    }
    return null;
  }

  /**
   * 提取导入信息
   */
  private extractImports(sourceFile: ts.SourceFile): ImportInfo[] {
    const imports: ImportInfo[] = [];

    ts.forEachChild(sourceFile, (node) => {
      if (ts.isImportDeclaration(node)) {
        const source = this.getStringLiteral(node.moduleSpecifier, sourceFile) || '';
        const specifiers: Array<{ name: string; alias?: string; isTypeOnly: boolean }> = [];

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
            }
          }
          if (node.importClause.name) {
            specifiers.unshift({
              name: node.importClause.name.text,
              isTypeOnly: false
            });
          }
        }

        imports.push({
          source,
          sourceType: source.startsWith('.') ? 'relative' : 'alias',
          specifiers,
          isTypeOnly: false
        });
      }
    });

    return imports;
  }

  /**
   * 提取符号信息 - 增强版，包含详细签名
   */
  private extractSymbols(sourceFile: ts.SourceFile): ModuleSymbol[] {
    const symbols: ModuleSymbol[] = [];

    const visit = (node: ts.Node) => {
      let symbol: ModuleSymbol | null = null;

      if (ts.isFunctionDeclaration(node) && node.name) {
        symbol = this.createFunctionSymbol(node.name.text, node, sourceFile);
      } else if (ts.isClassDeclaration(node) && node.name) {
        symbol = this.createClassSymbol(node.name.text, node, sourceFile);
      } else if (ts.isInterfaceDeclaration(node) && node.name) {
        symbol = this.createInterfaceSymbol(node.name.text, node, sourceFile);
      } else if (ts.isTypeAliasDeclaration(node) && node.name) {
        symbol = this.createTypeAliasSymbol(node.name.text, node, sourceFile);
      } else if (ts.isEnumDeclaration(node) && node.name) {
        symbol = this.createEnumSymbol(node.name.text, node, sourceFile);
      } else if (ts.isVariableStatement(node)) {
        // 处理变量声明
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            const varSymbol = this.createVariableSymbol(decl.name.text, decl, sourceFile);
            if (varSymbol) symbols.push(varSymbol);
          }
        }
      }

      if (symbol) {
        symbols.push(symbol);
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return symbols;
  }

  /**
   * 创建函数符号 - 包含签名信息
   */
  private createFunctionSymbol(name: string, node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): ModuleSymbol {
    const baseSymbol = this.createBaseSymbol(name, 'function', node, sourceFile);
    const signature = this.extractFunctionSignature(node, sourceFile);
    const visibility = this.getVisibility(node);

    return {
      ...baseSymbol,
      visibility,
      signature
    };
  }

  /**
   * 创建类符号 - 包含成员信息
   */
  private createClassSymbol(name: string, node: ts.ClassDeclaration, sourceFile: ts.SourceFile): ModuleSymbol {
    const baseSymbol = this.createBaseSymbol(name, 'class', node, sourceFile);
    const visibility = this.getVisibility(node);
    const members = this.extractClassMembers(node, sourceFile);
    const extendsClause = node.heritageClauses?.find(hc => hc.token === ts.SyntaxKind.ExtendsKeyword);
    const implementsClause = node.heritageClauses?.find(hc => hc.token === ts.SyntaxKind.ImplementsKeyword);

    const extends_ = extendsClause?.types.map(t => t.expression.getText(sourceFile));
    const implements_ = implementsClause?.types.map(t => t.getText(sourceFile));

    return {
      ...baseSymbol,
      visibility,
      members: members.length > 0 ? members : undefined,
      extends: extends_,
      implements: implements_
    };
  }

  /**
   * 创建接口符号 - 包含成员信息
   */
  private createInterfaceSymbol(name: string, node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ModuleSymbol {
    const baseSymbol = this.createBaseSymbol(name, 'interface', node, sourceFile);
    const members = this.extractInterfaceMembers(node, sourceFile);
    const extendsClause = node.heritageClauses?.find(hc => hc.token === ts.SyntaxKind.ExtendsKeyword);
    const extends_ = extendsClause?.types.map(t => t.getText(sourceFile));

    return {
      ...baseSymbol,
      visibility: 'public',
      members: members.length > 0 ? members : undefined,
      extends: extends_
    };
  }

  /**
   * 创建类型别名符号
   */
  private createTypeAliasSymbol(name: string, node: ts.TypeAliasDeclaration, sourceFile: ts.SourceFile): ModuleSymbol {
    const baseSymbol = this.createBaseSymbol(name, 'type', node, sourceFile);
    const typeText = node.type.getText(sourceFile);

    return {
      ...baseSymbol,
      visibility: 'public',
      type: typeText
    };
  }

  /**
   * 创建枚举符号
   */
  private createEnumSymbol(name: string, node: ts.EnumDeclaration, sourceFile: ts.SourceFile): ModuleSymbol {
    const baseSymbol = this.createBaseSymbol(name, 'enum', node, sourceFile);
    const members = node.members.map(m => ({
      name: m.name.getText(sourceFile),
      kind: 'property' as const,
      type: 'enum_member',
      visibility: 'public' as const,
      optional: false
    }));

    return {
      ...baseSymbol,
      visibility: 'public',
      members
    };
  }

  /**
   * 创建变量符号
   */
  private createVariableSymbol(name: string, node: ts.VariableDeclaration, sourceFile: ts.SourceFile): ModuleSymbol {
    const baseSymbol = this.createBaseSymbol(name, 'variable', node, sourceFile);
    const type = node.type?.getText(sourceFile) || 'any';

    return {
      ...baseSymbol,
      visibility: 'public',
      type
    };
  }

  /**
   * 创建基础符号
   */
  private createBaseSymbol(name: string, kind: SymbolKind, node: ts.Node, sourceFile: ts.SourceFile): Omit<ModuleSymbol, 'visibility'> {
    const start = node.getStart();
    const pos = sourceFile.getLineAndCharacterOfPosition(start);
    const decorators = this.extractDecorators(node, kind);
    const jsdoc = this.extractJSDoc(node, sourceFile);

    const result: Omit<ModuleSymbol, 'visibility'> = {
      id: this.generateId(name + sourceFile.fileName + pos.line),
      name,
      kind,
      location: {
        file: sourceFile.fileName,
        line: pos.line + 1,
        column: pos.character + 1
      },
      relatedSymbols: [],
      decorators: decorators.length > 0 ? decorators : undefined
    };

    if (jsdoc) {
      result.jsdoc = jsdoc;
      // 同时保留简单的 documentation 字段用于兼容
      result.documentation = jsdoc.description;
    }

    return result;
  }

  /**
   * 提取 JSDoc 注释
   */
  private extractJSDoc(node: ts.Node, sourceFile: ts.SourceFile): JSDocComment | undefined {
    const jsDocTags = ts.getJSDocTags(node);
    const fullText = sourceFile.getFullText();
    
    // 获取节点前的注释范围
    const commentRanges = ts.getLeadingCommentRanges(fullText, node.getFullStart());
    if (!commentRanges || commentRanges.length === 0) {
      return undefined;
    }

    // 获取最后一个注释（通常是 JSDoc）
    const lastComment = commentRanges[commentRanges.length - 1];
    const commentText = fullText.slice(lastComment.pos, lastComment.end);

    // 检查是否是 JSDoc 注释 (/** ... */)
    if (!commentText.startsWith('/**')) {
      return undefined;
    }

    // 解析 JSDoc
    return this.parseJSDocText(commentText);
  }

  /**
   * 解析 JSDoc 文本
   */
  private parseJSDocText(commentText: string): JSDocComment {
    const lines = commentText
      .split('\n')
      .map(line => line.trim())
      .map(line => line.replace(/^\/\*\*/, ''))  // 移除开头 /**
      .map(line => line.replace(/\*\/$/, ''))     // 移除结尾 */
      .map(line => line.replace(/^\*\s?/, ''))    // 移除行首 *
      .filter(line => line.length > 0);

    const result: JSDocComment = {
      description: '',
      tags: [],
      params: [],
      examples: [],
      see: []
    };

    let currentTag: string | null = null;
    let currentTagText: string[] = [];
    let inDescription = true;

    for (const line of lines) {
      const tagMatch = line.match(/^@(\w+)(?:\s+(.*))?$/);
      
      if (tagMatch) {
        // 保存之前的 tag
        if (currentTag) {
          this.processJSDocTag(result, currentTag, currentTagText.join(' '));
        }
        
        currentTag = tagMatch[1];
        currentTagText = tagMatch[2] ? [tagMatch[2]] : [];
        inDescription = false;
      } else if (currentTag) {
        currentTagText.push(line);
      } else if (inDescription) {
        result.description += (result.description ? ' ' : '') + line;
      }
    }

    // 处理最后一个 tag
    if (currentTag) {
      this.processJSDocTag(result, currentTag, currentTagText.join(' '));
    }

    return result;
  }

  /**
   * 处理单个 JSDoc tag
   */
  private processJSDocTag(result: JSDocComment, tagName: string, tagText: string): void {
    switch (tagName) {
      case 'param': {
        const paramMatch = tagText.match(/^\{([^}]+)\}\s+(\w+)(?:\s+-\s*(.*))?$/);
        if (paramMatch) {
          result.params.push({
            type: paramMatch[1],
            name: paramMatch[2],
            description: paramMatch[3]
          });
        } else {
          const simpleMatch = tagText.match(/^(\w+)(?:\s+-\s*(.*))?$/);
          if (simpleMatch) {
            result.params.push({
              name: simpleMatch[1],
              description: simpleMatch[2]
            });
          }
        }
        break;
      }
      case 'returns':
      case 'return': {
        const returnMatch = tagText.match(/^\{([^}]+)\}(?:\s+-\s*(.*))?$/);
        if (returnMatch) {
          result.returns = {
            type: returnMatch[1],
            description: returnMatch[2]
          };
        } else {
          result.returns = { description: tagText };
        }
        break;
      }
      case 'example':
        result.examples.push(tagText);
        break;
      case 'deprecated':
        result.deprecated = tagText;
        break;
      case 'since':
        result.since = tagText;
        break;
      case 'see':
        result.see.push(tagText);
        break;
      default:
        result.tags.push({ name: tagName, text: tagText });
    }
  }

  /**
   * 提取函数签名 - 增强版，包含调用关系
   */
  private extractFunctionSignature(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction,
    sourceFile: ts.SourceFile
  ): FunctionSignature | undefined {
    const parameters: ParameterInfo[] = [];

    for (const param of node.parameters) {
      if (ts.isIdentifier(param.name)) {
        parameters.push({
          name: param.name.text,
          type: param.type?.getText() || 'any',
          optional: !!param.questionToken || !!param.initializer,
          defaultValue: param.initializer?.getText()
        });
      }
    }

    const returnType = (node as any).type?.getText() || 'void';
    const async = !!(node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword));

    // 提取泛型参数
    const genericParams = (node as any).typeParameters?.map((tp: ts.TypeParameterDeclaration) => {
      let text = tp.name.text;
      if (tp.constraint) {
        text += ` extends ${tp.constraint.getText()}`;
      }
      if (tp.default) {
        text += ` = ${tp.default.getText()}`;
      }
      return text;
    });

    // 提取函数体内的调用
    const calls = this.extractCallsFromFunction(node, sourceFile);

    // 提取关键代码片段
    const bodySnippets = this.extractBodySnippets(node, sourceFile);

    return {
      parameters,
      returnType,
      async,
      genericParams: genericParams?.length > 0 ? genericParams : undefined,
      calls: calls.length > 0 ? calls : undefined,
      bodySnippets: bodySnippets.length > 0 ? bodySnippets : undefined
    };
  }

  /**
   * 从函数体内提取调用
   */
  private extractCallsFromFunction(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction,
    sourceFile: ts.SourceFile
  ): Array<{ callee: string; line: number; column?: number }> {
    const calls: Array<{ callee: string; line: number; column?: number }> = [];
    const body = node.body;
    
    if (!body) return calls;

    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n)) {
        const callee = this.extractCalleeName(n, sourceFile);
        if (callee) {
          const pos = sourceFile.getLineAndCharacterOfPosition(n.getStart());
          calls.push({
            callee,
            line: pos.line + 1,
            column: pos.character + 1
          });
        }
      }
      ts.forEachChild(n, visit);
    };

    visit(body);
    return calls;
  }

  /**
   * 提取函数体关键代码片段
   * 
   * 参考 Repomix 的 --compress 模式：
   * - 保留控制流结构（if/loop/try/switch）
   * - 省略实现细节，用 // ⋮ 标记
   * - 提取 guard clauses 和早期返回
   */
  private extractBodySnippets(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction,
    sourceFile: ts.SourceFile
  ): CodeSnippet[] {
    const snippets: CodeSnippet[] = [];
    const body = node.body;

    if (!body) return snippets;

    const addSnippet = (type: CodeSnippetType, node: ts.Node, description?: string) => {
      const start = node.getStart();
      const end = node.getEnd();
      const startPos = sourceFile.getLineAndCharacterOfPosition(start);
      const endPos = sourceFile.getLineAndCharacterOfPosition(end);
      
      // 提取代码并压缩
      const originalCode = node.getText(sourceFile);
      const compressedCode = this.compressCode(originalCode, type);

      snippets.push({
        type,
        lines: compressedCode,
        lineStart: startPos.line + 1,
        lineEnd: endPos.line + 1,
        description
      });
    };

    const visit = (n: ts.Node) => {
      // 检查是否为顶层语句（函数体直接子节点）
      const isTopLevel = n.parent === body || 
                         (ts.isBlock(n.parent) && n.parent.parent === body);

      if (ts.isIfStatement(n)) {
        // 检查是否是 guard clause（早期返回）
        if (this.isGuardClause(n)) {
          addSnippet('guard', n, 'Guard clause');
        } else {
          addSnippet('if', n);
        }
      } else if (ts.isForStatement(n) || ts.isForInStatement(n) || 
                 ts.isForOfStatement(n) || ts.isWhileStatement(n) || 
                 ts.isDoStatement(n)) {
        addSnippet('loop', n);
      } else if (ts.isTryStatement(n)) {
        addSnippet('try', n);
      } else if (ts.isSwitchStatement(n)) {
        addSnippet('switch', n);
      } else if (isTopLevel && ts.isReturnStatement(n)) {
        // 顶层返回语句（非 guard clause 的返回）
        addSnippet('early-return', n, 'Return statement');
      }

      // 递归访问子节点，但不进入嵌套函数
      if (!ts.isFunctionDeclaration(n) && 
          !ts.isArrowFunction(n) && 
          !ts.isMethodDeclaration(n)) {
        ts.forEachChild(n, visit);
      }
    };

    visit(body);
    return snippets;
  }

  /**
   * 检查是否是 guard clause（早期返回）
   */
  private isGuardClause(node: ts.IfStatement): boolean {
    // Guard clause 特征：
    // 1. if 条件在函数开始位置
    // 2. 只有 then 分支，没有 else
    // 3. then 分支包含 return 或 throw

    if (node.elseStatement) return false;

    const thenStatement = node.thenStatement;
    if (ts.isBlock(thenStatement)) {
      // 检查块中的第一个语句是否是 return/throw
      const firstStatement = thenStatement.statements[0];
      if (firstStatement && (ts.isReturnStatement(firstStatement) || ts.isThrowStatement(firstStatement))) {
        return true;
      }
    } else if (ts.isReturnStatement(thenStatement) || ts.isThrowStatement(thenStatement)) {
      return true;
    }

    return false;
  }

  /**
   * 压缩代码（保留结构，省略实现）
   * 
   * 参考 Repomix 风格：
   * if (condition) {
   *   // ⋮ implementation
   * }
   */
  private compressCode(code: string, type: CodeSnippetType): string {
    const lines = code.split('\n');
    
    if (lines.length <= 3) {
      // 短代码不压缩
      return code.trim();
    }

    switch (type) {
      case 'if':
      case 'guard': {
        // 提取 if 条件
        const conditionMatch = code.match(/if\s*\(([^)]+)\)/);
        if (conditionMatch) {
          const condition = conditionMatch[1].trim();
          // 检查是否有 return/throw
          const hasReturn = code.includes('return');
          const hasThrow = code.includes('throw');
          const action = hasReturn ? 'return' : (hasThrow ? 'throw' : '{ ... }');
          return `if (${condition}) { // ⋮ ${action} }`;
        }
        return `if (...) { // ⋮ }`;
      }

      case 'loop': {
        // 提取循环类型和条件
        if (code.includes('for')) {
          const forMatch = code.match(/for\s*\(([^)]+)\)/);
          if (forMatch) {
            return `for (${forMatch[1].trim()}) { // ⋮ }`;
          }
          return `for (...) { // ⋮ }`;
        } else if (code.includes('while')) {
          const whileMatch = code.match(/while\s*\(([^)]+)\)/);
          if (whileMatch) {
            return `while (${whileMatch[1].trim()}) { // ⋮ }`;
          }
          return `while (...) { // ⋮ }`;
        }
        return `loop { // ⋮ }`;
      }

      case 'try': {
        return `try { // ⋮ } catch (...) { // ⋮ }`;
      }

      case 'switch': {
        // 提取 case 名称
        const caseMatches = code.match(/case\s+([^:]+):/g);
        if (caseMatches && caseMatches.length > 0) {
          const cases = caseMatches.map(c => c.replace(/case\s+/, '').replace(':', '')).slice(0, 3);
          return `switch (...) { case ${cases.join(', ')}${caseMatches.length > 3 ? '...' : ''} // ⋮ }`;
        }
        return `switch (...) { // ⋮ }`;
      }

      case 'early-return': {
        // 返回语句不压缩
        return code.trim();
      }

      default:
        return code.substring(0, 100) + (code.length > 100 ? '...' : '');
    }
  }

  /**
   * 提取类成员
   */
  private extractClassMembers(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): MemberInfo[] {
    const members: MemberInfo[] = [];

    for (const member of node.members) {
      if (ts.isMethodDeclaration(member) && member.name) {
        const name = this.getMemberName(member.name);
        if (name) {
          const signature = this.extractFunctionSignature(member, sourceFile);
          members.push({
            name,
            kind: 'method',
            type: signature?.returnType || 'void',
            visibility: this.getVisibility(member),
            optional: !!member.questionToken,
            static: this.isStatic(member),
            abstract: this.isAbstract(member),
            signature
          });
        }
      } else if (ts.isPropertyDeclaration(member) && member.name) {
        const name = this.getMemberName(member.name);
        if (name) {
          members.push({
            name,
            kind: 'property',
            type: member.type?.getText(sourceFile) || 'any',
            visibility: this.getVisibility(member),
            optional: !!member.questionToken,
            static: this.isStatic(member),
            abstract: this.isAbstract(member),
            readonly: this.isReadonly(member)
          });
        }
      } else if (ts.isGetAccessorDeclaration(member) && member.name) {
        const name = this.getMemberName(member.name);
        if (name) {
          members.push({
            name,
            kind: 'getter',
            type: member.type?.getText(sourceFile) || 'any',
            visibility: this.getVisibility(member),
            optional: false,
            static: this.isStatic(member)
          });
        }
      } else if (ts.isSetAccessorDeclaration(member) && member.name) {
        const name = this.getMemberName(member.name);
        if (name) {
          members.push({
            name,
            kind: 'setter',
            type: member.parameters[0]?.type?.getText(sourceFile) || 'any',
            visibility: this.getVisibility(member),
            optional: false,
            static: this.isStatic(member)
          });
        }
      }
    }

    return members;
  }

  /**
   * 提取接口成员
   */
  private extractInterfaceMembers(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): MemberInfo[] {
    const members: MemberInfo[] = [];

    for (const member of node.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const name = this.getMemberName(member.name);
        if (name) {
          members.push({
            name,
            kind: 'property',
            type: member.type?.getText(sourceFile) || 'any',
            visibility: 'public',
            optional: !!member.questionToken
          });
        }
      } else if (ts.isMethodSignature(member) && member.name) {
        const name = this.getMemberName(member.name);
        if (name) {
          const parameters: ParameterInfo[] = [];
          for (const param of member.parameters) {
            if (ts.isIdentifier(param.name)) {
              parameters.push({
                name: param.name.text,
                type: param.type?.getText(sourceFile) || 'any',
                optional: !!param.questionToken
              });
            }
          }

          members.push({
            name,
            kind: 'method',
            type: member.type?.getText(sourceFile) || 'void',
            visibility: 'public',
            optional: !!member.questionToken,
            signature: {
              parameters,
              returnType: member.type?.getText(sourceFile) || 'void',
              async: false
            }
          });
        }
      }
    }

    return members;
  }

  /**
   * 获取成员名称
   */
  private getMemberName(name: ts.PropertyName): string | null {
    if (ts.isIdentifier(name)) return name.text;
    if (ts.isStringLiteral(name)) return name.text;
    if (ts.isNumericLiteral(name)) return name.text;
    return null;
  }

  /**
   * 获取可见性
   */
  private getVisibility(node: ts.Node): 'public' | 'private' | 'protected' | 'internal' {
    const modifiers = (node as any).modifiers;
    if (!modifiers) return 'public';

    for (const modifier of modifiers) {
      if (modifier.kind === ts.SyntaxKind.PrivateKeyword) return 'private';
      if (modifier.kind === ts.SyntaxKind.ProtectedKeyword) return 'protected';
      if (modifier.kind === ts.SyntaxKind.PublicKeyword) return 'public';
    }

    return 'public';
  }

  /**
   * 检查是否为 static
   */
  private isStatic(node: ts.Node): boolean {
    const modifiers = (node as any).modifiers;
    return modifiers?.some((m: any) => m.kind === ts.SyntaxKind.StaticKeyword) || false;
  }

  /**
   * 检查是否为 abstract
   */
  private isAbstract(node: ts.Node): boolean {
    const modifiers = (node as any).modifiers;
    return modifiers?.some((m: any) => m.kind === ts.SyntaxKind.AbstractKeyword) || false;
  }

  /**
   * 检查是否为 readonly
   */
  private isReadonly(node: ts.Node): boolean {
    const modifiers = (node as any).modifiers;
    return modifiers?.some((m: any) => m.kind === ts.SyntaxKind.ReadonlyKeyword) || false;
  }

  /**
   * 提取装饰器信息
   */
  private extractDecorators(node: ts.Node, kind: SymbolKind): DecoratorInfo[] {
    const decorators: DecoratorInfo[] = [];

    // 直接检查节点的 modifiers 属性
    const modifiers = (node as any).modifiers;
    if (!modifiers || !Array.isArray(modifiers)) return decorators;

    for (const modifier of modifiers) {
      if (modifier.kind === ts.SyntaxKind.Decorator) {
        const decorator = modifier as ts.Decorator;
        const decoratorInfo = this.parseDecorator(decorator, kind);
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
  private parseDecorator(decorator: ts.Decorator, targetKind: SymbolKind): DecoratorInfo | null {
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
        params = this.parseDecoratorArg(firstArg);
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
  private parseDecoratorArg(arg: ts.Expression): any {
    // 处理对象字面量
    if (ts.isObjectLiteralExpression(arg)) {
      const result: Record<string, any> = {};
      for (const prop of arg.properties) {
        if (ts.isPropertyAssignment(prop)) {
          const key = prop.name.getText();
          const value = this.parseExpression(prop.initializer);
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
      return arg.elements.map(elem => this.parseDecoratorArg(elem));
    }

    return undefined;
  }

  /**
   * 解析表达式为 JavaScript 值
   */
  private parseExpression(expr: ts.Expression): any {
    if (ts.isStringLiteral(expr)) return expr.text;
    if (ts.isNumericLiteral(expr)) return Number(expr.text);
    if (expr.kind === ts.SyntaxKind.TrueKeyword || expr.kind === ts.SyntaxKind.FalseKeyword) {
      return expr.kind === ts.SyntaxKind.TrueKeyword;
    }
    if (expr.kind === ts.SyntaxKind.NullKeyword) return null;
    if (ts.isIdentifier(expr)) return expr.text;
    if (ts.isArrayLiteralExpression(expr)) return expr.elements.map(elem => this.parseExpression(elem));
    if (ts.isObjectLiteralExpression(expr)) {
      const result: Record<string, any> = {};
      for (const prop of expr.properties) {
        if (ts.isPropertyAssignment(prop)) {
          const key = prop.name.getText();
          result[key] = this.parseExpression(prop.initializer);
        }
      }
      return result;
    }
    return expr.getText();
  }

  /**
   * 提取依赖列表
   */
  private extractDependencies(imports: ImportInfo[], exports?: ExportInfo[]): string[] {
    const deps = new Set<string>();

    // 收集所有 import 依赖
    for (const imp of imports) {
      deps.add(imp.source);
    }

    // 处理 re-export 依赖 (export { foo } from './module')
    if (exports) {
      for (const exp of exports) {
        if (exp.origin) {
          deps.add(exp.origin);
        }
      }
    }

    return Array.from(deps);
  }

  /**
   * 提取类型信息 - 增强版
   */
  private extractTypeInfo(sourceFile: ts.SourceFile): TypeInfo {
    const typeDefinitions: TypeInfo['typeDefinitions'] = [];
    const genericParams: TypeInfo['genericParams'] = [];
    const crossFileRefs: TypeInfo['crossFileRefs'] = [];
    const unionTypes: string[] = [];
    const intersectionTypes: string[] = [];
    const typeAliases: TypeInfo['typeAliases'] = [];
    
    // 复杂类型信息
    const conditionalTypes: TypeInfo['conditionalTypes'] = [];
    const mappedTypes: TypeInfo['mappedTypes'] = [];
    const templateLiteralTypes: TypeInfo['templateLiteralTypes'] = [];
    const indexedAccessTypes: string[] = [];
    const inferredTypes: string[] = [];

    const visit = (node: ts.Node) => {
      // 提取接口
      if (ts.isInterfaceDeclaration(node) && node.name) {
        const members = node.members.map(m => ({
          name: m.name?.getText(sourceFile) || 'unknown',
          type: this.getTypeFromMember(m, sourceFile),
          optional: (m as any).questionToken ? true : false,
          visibility: 'public' as const,
          isReadonly: (m as any). modifiers?.some((mod: any) => mod.kind === ts.SyntaxKind.ReadonlyKeyword) || false
        }));

        const extendsList = node.heritageClauses
          ?.flatMap(clause => clause.types.map(t => t.getText(sourceFile))) || [];

        const genericParamsList = node.typeParameters
          ?.map(tp => ({
            name: tp.name.text,
            extends: tp.constraint?.getText(sourceFile),
            default: tp.default?.getText(sourceFile)
          })) || [];

        typeDefinitions.push({
          name: node.name.text,
          kind: 'interface',
          members,
          extends: extendsList,
          genericParams: genericParamsList
        });

        // 添加泛型参数
        genericParams.push(...genericParamsList);
      }

      // 提取类型别名
      if (ts.isTypeAliasDeclaration(node) && node.name) {
        const genericParamsList = node.typeParameters
          ?.map(tp => ({
            name: tp.name.text,
            extends: tp.constraint?.getText(sourceFile),
            default: tp.default?.getText(sourceFile)
          })) || [];

        typeAliases.push({
          name: node.name.text,
          type: node.type.getText(sourceFile),
          genericParams: genericParamsList
        });

        typeDefinitions.push({
          name: node.name.text,
          kind: 'alias',
          members: [],
          genericParams: genericParamsList
        });
      }

      // 提取类
      if (ts.isClassDeclaration(node) && node.name) {
        const members = node.members
          .filter(m => ts.isPropertyDeclaration(m) || ts.isMethodDeclaration(m))
          .map(m => ({
            name: m.name ? (m.name as ts.Identifier).getText(sourceFile) : 'unknown',
            type: m.kind === ts.SyntaxKind.MethodDeclaration
              ? 'method'
              : this.getTypeFromMember(m, sourceFile),
            optional: (m as any).questionToken ? true : false,
            visibility: this.getVisibility(m),
            isReadonly: (m as any).modifiers?.some((mod: any) => mod.kind === ts.SyntaxKind.ReadonlyKeyword) || false
          }));

        const extendsList = node.heritageClauses
          ?.filter(c => c.token === ts.SyntaxKind.ExtendsKeyword)
          .flatMap(clause => clause.types.map(t => t.getText(sourceFile))) || [];

        const implementsList = node.heritageClauses
          ?.filter(c => c.token === ts.SyntaxKind.ImplementsKeyword)
          .flatMap(clause => clause.types.map(t => t.getText(sourceFile))) || [];

        const genericParamsList = node.typeParameters
          ?.map(tp => ({
            name: tp.name.text,
            extends: tp.constraint?.getText(sourceFile),
            default: tp.default?.getText(sourceFile)
          })) || [];

        typeDefinitions.push({
          name: node.name.text,
          kind: 'class',
          members,
          extends: extendsList,
          implements: implementsList,
          genericParams: genericParamsList
        });
      }

      // 提取枚举
      if (ts.isEnumDeclaration(node) && node.name) {
        const members = node.members.map((m, idx) => ({
          name: m.name.getText(sourceFile),
          type: m.initializer ? m.initializer.getText(sourceFile) : String(idx),
          optional: false,
          visibility: 'public' as const
        }));

        typeDefinitions.push({
          name: node.name.text,
          kind: 'enum',
          members
        });
      }

      // 提取联合类型
      if (ts.isUnionTypeNode(node)) {
        unionTypes.push(node.getText(sourceFile));
      }

      // 提取交叉类型
      if (ts.isIntersectionTypeNode(node)) {
        intersectionTypes.push(node.getText(sourceFile));
      }

      // 提取跨文件引用（从类型引用中）
      if (ts.isTypeReferenceNode(node) && node.typeName) {
        const typeName = node.typeName.getText(sourceFile);
        if (!typeName.startsWith('_') && typeName[0] === typeName[0].toUpperCase()) {
          const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          crossFileRefs.push({
            symbol: typeName,
            file: sourceFile.fileName,
            line: pos.line + 1,
            column: pos.character + 1
          });
        }
      }

      // 提取条件类型 T extends U ? X : Y
      if (ts.isConditionalTypeNode(node)) {
        conditionalTypes.push({
          checkType: node.checkType.getText(sourceFile),
          extendsType: node.extendsType.getText(sourceFile),
          trueType: node.trueType.getText(sourceFile),
          falseType: node.falseType.getText(sourceFile)
        });
      }

      // 提取映射类型 [K in keyof T]: T[K]
      if (ts.isMappedTypeNode(node)) {
        const typeParam = node.typeParameter;
        const nameType = node.nameType;
        
        mappedTypes.push({
          typeParameter: typeParam.name.text,
          constraint: typeParam.constraint?.getText(sourceFile) || '',
          valueType: node.type?.getText(sourceFile) || 'unknown',
          asType: nameType?.getText(sourceFile),
          readonly: node.readonlyToken ? 
            (node.readonlyToken.kind === ts.SyntaxKind.ReadonlyKeyword ? 'add' : 'remove') : undefined,
          optional: node.questionToken ?
            (node.questionToken.kind === ts.SyntaxKind.QuestionToken ? 'add' : 'remove') : undefined
        });
      }

      // 提取模板字面量类型
      if (ts.isTemplateLiteralTypeNode(node)) {
        const spans = node.templateSpans.map(span => ({
          type: span.type.getText(sourceFile),
          literal: span.literal.text
        }));
        
        templateLiteralTypes.push({
          head: node.head.text,
          spans
        });
      }

      // 提取索引访问类型 T[K]
      if (ts.isIndexedAccessTypeNode(node)) {
        indexedAccessTypes.push(node.getText(sourceFile));
      }

      // 提取 infer 类型
      if (ts.isInferTypeNode(node)) {
        inferredTypes.push(node.typeParameter.name.text);
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return {
      typeDefinitions,
      genericParams,
      crossFileRefs,
      unionTypes,
      intersectionTypes,
      typeAliases,
      conditionalTypes,
      mappedTypes,
      templateLiteralTypes,
      indexedAccessTypes,
      inferredTypes
    };
  }

  /**
   * 从成员获取类型
   */
  private getTypeFromMember(member: ts.Node, sourceFile: ts.SourceFile): string {
    if (ts.isPropertySignature(member) && member.type) {
      return member.type.getText(sourceFile);
    }
    if (ts.isMethodSignature(member)) {
      return 'method';
    }
    return 'any';
  }

  /**
   * 提取调用图 - 增强版
   */
  private extractCallGraph(sourceFile: ts.SourceFile): CallGraph {
    const calls: CallGraph['calls'] = [];
    const recursive: string[] = [];
    const callCounts: Record<string, number> = {};

    // 收集所有函数/方法名
    const functionNames = new Set<string>();
    
    const collectNames = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        functionNames.add(node.name.text);
      } else if (ts.isClassDeclaration(node) && node.name) {
        // 收集类方法名
        for (const member of node.members) {
          if (ts.isMethodDeclaration(member) && member.name) {
            const methodName = this.getMemberName(member.name);
            if (methodName) {
              functionNames.add(`${node.name.text}.${methodName}`);
            }
          }
        }
      }
      ts.forEachChild(node, collectNames);
    };
    
    collectNames(sourceFile);

    // 提取调用关系
    const extractCalls = (node: ts.Node, funcName: string) => {
      callCounts[funcName] = 0;

      const visit = (n: ts.Node) => {
        if (ts.isCallExpression(n)) {
          const callee = this.extractCalleeName(n, sourceFile);
          if (callee) {
            calls.push({
              caller: funcName,
              callee,
              line: n.getStart()
            });
            callCounts[funcName] = (callCounts[funcName] || 0) + 1;

            // 检查是否递归调用
            if (callee === funcName || callee.endsWith(`.${funcName}`)) {
              if (!recursive.includes(funcName)) {
                recursive.push(funcName);
              }
            }
          }
        }
        ts.forEachChild(n, visit);
      };

      // 根据节点类型获取函数体
      let body: ts.Node | undefined;
      if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node)) {
        body = (node as ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction).body;
      } else if (ts.isFunctionExpression(node)) {
        body = node.body;
      }

      if (body) {
        visit(body);
      }
    };

    // 处理函数声明
    const processFunction = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        extractCalls(node, node.name.text);
      } else if (ts.isClassDeclaration(node)) {
        // 处理类方法
        for (const member of node.members) {
          if (ts.isMethodDeclaration(member) && member.name && node.name) {
            const methodName = this.getMemberName(member.name);
            if (methodName) {
              extractCalls(member, `${node.name.text}.${methodName}`);
            }
          }
        }
      }
    };

    ts.forEachChild(sourceFile, processFunction);

    return { calls, recursive, callCounts };
  }

  /**
   * 提取被调用函数的名称
   */
  private extractCalleeName(callExpr: ts.CallExpression, sourceFile: ts.SourceFile): string | null {
    const expr = callExpr.expression;
    
    if (ts.isIdentifier(expr)) {
      // 简单函数调用：funcName()
      return expr.text;
    } else if (ts.isPropertyAccessExpression(expr)) {
      // 方法调用：obj.method() 或 Class.staticMethod()
      return expr.getText(sourceFile);
    } else if (ts.isElementAccessExpression(expr)) {
      // 数组/索引调用：arr[0]()
      return expr.getText(sourceFile);
    }
    
    return null;
  }

  /**
   * 计算复杂度
   */
  private calculateComplexity(sourceFile: ts.SourceFile): ComplexityMetrics {
    let cyclomatic = 1;
    let cognitive = 0;
    const details: ComplexityMetrics['details']['functions'] = [];

    const visit = (node: ts.Node, depth: number) => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        const funcCyclomatic = this.calculateFunctionCyclomatic(node);
        const funcCognitive = this.calculateFunctionCognitive(node);
        cyclomatic += funcCyclomatic;
        cognitive += funcCognitive;

        details.push({
          name: node.name.text,
          cyclomatic: funcCyclomatic,
          cognitive: funcCognitive,
          lines: node.getEnd() - node.getStart()
        });
      }
      ts.forEachChild(node, n => visit(n, depth + 1));
    };

    visit(sourceFile, 0);

    return {
      cyclomatic,
      cognitive,
      maintainability: 85,
      details: { functions: details.slice(0, 10) }
    };
  }

  /**
   * 计算函数圈复杂度
   */
  private calculateFunctionCyclomatic(node: ts.FunctionDeclaration): number {
    let complexity = 1;

    const countNodes = (n: ts.Node) => {
      if (ts.isIfStatement(n) || ts.isWhileStatement(n) ||
          ts.isForStatement(n) || ts.isForInStatement(n) ||
          ts.isForOfStatement(n) || ts.isCaseClause(n) ||
          ts.isCatchClause(n) || ts.isConditionalExpression(n)) {
        complexity++;
      }
      ts.forEachChild(n, countNodes);
    };

    if (node.body) {
      countNodes(node.body);
    }

    return complexity;
  }

  /**
   * 计算函数认知复杂度
   */
  private calculateFunctionCognitive(node: ts.FunctionDeclaration): number {
    let cognitive = 0;

    const countNodes = (n: ts.Node, depth: number) => {
      cognitive += depth;

      if (ts.isIfStatement(n) || ts.isSwitchStatement(n)) {
        cognitive += 1;
      }
      if (ts.isTryStatement(n) || ts.isWithStatement(n)) {
        cognitive += 2;
      }

      ts.forEachChild(n, child => countNodes(child, depth + 1));
    };

    if (node.body) {
      countNodes(node.body, 0);
    }

    return cognitive;
  }

  /**
   * 获取模块类型
   */
  private getModuleType(filePath: string): 'source' | 'test' | 'config' | 'type' {
    const basename = path.basename(filePath);
    if (basename.includes('.test.') || basename.includes('.spec.')) {
      return 'test';
    }
    if (basename === 'tsconfig.json' || basename === 'jest.config.js') {
      return 'config';
    }
    if (basename.endsWith('.d.ts')) {
      return 'type';
    }
    return 'source';
  }

  /**
   * 获取文件统计
   */
  private getFileStats(content: string): ParseResult['stats'] {
    const lines = content.split('\n');
    let codeLines = 0;
    let commentLines = 0;
    let blankLines = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') {
        blankLines++;
      } else if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        commentLines++;
      } else {
        codeLines++;
      }
    }

    return {
      lines: lines.length,
      codeLines,
      commentLines,
      blankLines
    };
  }

  /**
   * 生成 ID
   */
  private generateId(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}
