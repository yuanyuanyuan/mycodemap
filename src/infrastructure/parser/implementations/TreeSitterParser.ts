// [META] since:2026-05 | owner:parser-team | stable:false
// [WHY] Shared Tree-sitter parser now lives in Infrastructure and provides TS/JS active parsing plus shared AST helpers for Python

import path from 'path';
import { randomUUID } from 'crypto';
import type ParserType from 'tree-sitter';
import type {
  CallGraphInfo,
  LanguageId,
  ParseOptions,
  ParseResult,
} from '../../../interface/types/parser.js';
import type {
  ComplexityMetrics,
  Dependency,
  ExportInfo,
  ImportInfo,
  ImportSpecifier,
  Module,
  ModuleSymbol,
  SymbolKind,
} from '../../../interface/types/index.js';
import type { ParserOptions } from '../../../parser/interfaces/IParser.js';
import { analyzeComplexityFromContent } from '../../../core/ast-complexity-analyzer.js';
import { loadTreeSitter } from '../../../parser/implementations/tree-sitter-loader.js';
import { ParserBase, ParseError } from '../interfaces/ParserBase.js';

type SharedLanguageId = 'typescript' | 'javascript' | 'python';
type GrammarKey = 'typescript' | 'tsx' | 'python';

interface SharedParseStats {
  lines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
}

export interface TreeSitterSyntaxTree {
  filePath: string;
  content: string;
  language: SharedLanguageId;
  parserUsed: 'TreeSitterParser';
  tree: any;
  rootNode: ParserType.SyntaxNode;
}

export interface SharedTreeSitterParseResult {
  filePath: string;
  language: SharedLanguageId;
  parserUsed: 'TreeSitterParser';
  imports: ImportInfo[];
  exports: ExportInfo[];
  symbols: ModuleSymbol[];
  dependencies: string[];
  type: 'source' | 'test' | 'config' | 'type';
  stats: SharedParseStats;
}

const EXTENSION_LANGUAGE_MAP: Record<string, { grammar: GrammarKey; language: SharedLanguageId }> = {
  ts: { grammar: 'typescript', language: 'typescript' },
  tsx: { grammar: 'tsx', language: 'typescript' },
  js: { grammar: 'tsx', language: 'javascript' },
  jsx: { grammar: 'tsx', language: 'javascript' },
  mjs: { grammar: 'tsx', language: 'javascript' },
  cjs: { grammar: 'tsx', language: 'javascript' },
  py: { grammar: 'python', language: 'python' },
};

export class TreeSitterParser extends ParserBase {
  readonly languageId = 'typescript' as const;
  readonly fileExtensions = ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'];
  readonly name = 'TreeSitterParser';

  protected supportedFeatures = new Set([
    'type-inference',
    'generic-types',
    'decorators',
    'call-graph',
    'cross-file-analysis',
    'complexity-metrics',
  ] as const);

  private parser: any;
  private grammars: Record<GrammarKey, any> | null = null;
  private parserPromise: Promise<void> | null = null;

  constructor(_options?: ParserOptions) {
    super();
  }

  protected async doInitialize(): Promise<void> {
    await this.getParserPromise();
  }

  protected async doDispose(): Promise<void> {}

  private async initializeParser(): Promise<void> {
    const { Parser, TypeScript, Python } = await loadTreeSitter();
    this.parser = new Parser();
    this.grammars = {
      typescript: TypeScript.typescript,
      tsx: TypeScript.tsx ?? TypeScript.typescript,
      python: Python,
    };
  }

  async parseFile(filePath: string, content: string, options?: ParseOptions): Promise<ParseResult> {
    this.ensureInitialized();

    const startTime = Date.now();
    const parsed = await this.parseContent(filePath, content);
    const module: Module = {
      id: `mod_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      projectId: '',
      path: filePath,
      language: parsed.language as LanguageId,
      stats: parsed.stats,
    };

    return {
      filePath,
      language: parsed.language as LanguageId,
      module,
      symbols: parsed.symbols,
      imports: parsed.imports,
      exports: parsed.exports,
      dependencies: this.buildDependencies(parsed.imports),
      callGraph: options?.includeCallGraph ? await this.buildCallGraph(content) : undefined,
      complexity: options?.includeComplexity ? await this.calculateComplexity(content, filePath) : undefined,
      parseTime: Date.now() - startTime,
      parserUsed: parsed.parserUsed,
    };
  }

  async parseContent(filePath: string, content: string): Promise<SharedTreeSitterParseResult> {
    const syntaxTree = await this.parseSyntaxTree(filePath, content);
    const { rootNode, language } = syntaxTree;

    if (language === 'python') {
      return {
        filePath,
        language,
        parserUsed: 'TreeSitterParser',
        imports: this.extractPythonImports(rootNode),
        exports: this.extractPythonExports(rootNode),
        symbols: this.extractPythonSymbols(rootNode, filePath),
        dependencies: this.extractDependencies(this.extractPythonImports(rootNode)),
        type: this.detectModuleType(filePath),
        stats: this.calculateStats(content, rootNode),
      };
    }

    const imports = this.extractTypeScriptImports(rootNode);

    return {
      filePath,
      language,
      parserUsed: 'TreeSitterParser',
      imports,
      exports: this.extractTypeScriptExports(rootNode),
      symbols: this.extractTypeScriptSymbols(rootNode, filePath),
      dependencies: this.extractDependencies(imports),
      type: this.detectModuleType(filePath),
      stats: this.calculateStats(content, rootNode),
    };
  }

  async parseSyntaxTree(filePath: string, content: string): Promise<TreeSitterSyntaxTree> {
    await this.getParserPromise();

    const selection = this.selectLanguage(filePath);
    this.parser.setLanguage(selection.grammar);
    const tree = this.parser.parse(content);

    return {
      filePath,
      content,
      language: selection.language,
      parserUsed: 'TreeSitterParser',
      tree,
      rootNode: tree.rootNode,
    };
  }

  private getParserPromise(): Promise<void> {
    if (!this.parserPromise) {
      this.parserPromise = this.initializeParser();
    }

    return this.parserPromise;
  }

  async extractImports(content: string): Promise<ImportInfo[]> {
    this.ensureInitialized();
    const shared = await this.parseContent('/virtual.ts', content);
    return shared.imports;
  }

  async extractExports(content: string): Promise<ExportInfo[]> {
    this.ensureInitialized();
    const shared = await this.parseContent('/virtual.ts', content);
    return shared.exports;
  }

  async extractSymbols(content: string): Promise<ModuleSymbol[]> {
    this.ensureInitialized();
    const shared = await this.parseContent('/virtual.ts', content);
    return shared.symbols;
  }

  async buildCallGraph(content: string): Promise<CallGraphInfo> {
    const calls: CallGraphInfo['calls'] = [];
    const calledFunctions = new Set<string>();
    const callRegex = /(\w+)\s*\(/g;
    let match: RegExpExecArray | null;

    while ((match = callRegex.exec(content)) !== null) {
      const callee = match[1];
      if (callee && !this.isKeyword(callee)) {
        calledFunctions.add(callee);
        calls.push({
          caller: '<anonymous>',
          callee,
          line: this.getLineNumber(content, match.index),
        });
      }
    }

    const recursive: string[] = [];
    const functionRegex = /(?:async\s+)?function\s+(\w+)/g;
    while ((match = functionRegex.exec(content)) !== null) {
      const funcName = match[1];
      if (!funcName || !calledFunctions.has(funcName)) {
        continue;
      }

      const funcBody = content.slice(match.index, this.findFunctionEnd(content, match.index));
      if (new RegExp(`\\b${funcName}\\s*\\(`, 'g').test(funcBody)) {
        recursive.push(funcName);
      }
    }

    return { calls, recursive, issues: [] };
  }

  async calculateComplexity(content: string, filePath: string = '/virtual.ts'): Promise<ComplexityMetrics> {
    const language = this.selectLanguage(filePath).language;
    return analyzeComplexityFromContent({
      filePath,
      content,
      language,
    });
  }

  private selectLanguage(filePath: string): { grammar: any; language: SharedLanguageId } {
    const extension = path.extname(filePath).slice(1).toLowerCase();
    const selection = EXTENSION_LANGUAGE_MAP[extension];

    if (!selection || !this.grammars) {
      throw new Error(`Unsupported tree-sitter language for file: ${filePath}`);
    }

    const grammar = this.grammars[selection.grammar];
    if (!grammar) {
      throw new Error(`Tree-sitter grammar not available for .${extension}`);
    }

    return { grammar, language: selection.language };
  }

  private extractTypeScriptImports(root: ParserType.SyntaxNode): ImportInfo[] {
    const imports: ImportInfo[] = [];
    const importNodes = root.namedChildren.filter((node) => node.type === 'import_statement');

    for (const importNode of importNodes) {
      const stringLiteral = importNode.namedChildren.find((node) => node.type === 'string');
      const source = stringLiteral?.text.replace(/['"]/g, '') || '';
      const importClause = importNode.namedChildren.find((node) => node.type === 'import_clause');
      const specifiers: ImportSpecifier[] = [];

      if (importClause) {
        const namedImports = importClause.namedChildren.filter((node) => node.type === 'named_imports');
        for (const named of namedImports) {
          const specifierList = named.namedChildren.filter((node) => node.type === 'import_specifier');
          for (const spec of specifierList) {
            const name = spec.namedChildren[0];
            specifiers.push({
              name: name?.text || '',
              alias: spec.namedChildren[1]?.text,
              isTypeOnly: false,
            });
          }
        }

        const defaultImport = importClause.namedChildren.find((node) => node.type === 'identifier');
        if (defaultImport) {
          specifiers.push({
            name: defaultImport.text,
            isTypeOnly: false,
          });
        }

        const namespaceImport = importClause.namedChildren.find((node) => node.type === 'namespace_import');
        if (namespaceImport) {
          const alias = namespaceImport.namedChildren[0];
          specifiers.push({
            name: alias?.text || '*',
            isTypeOnly: false,
          });
        }
      }

      if (specifiers.length > 0 || source) {
        imports.push({
          source,
          sourceType: this.classifyImportSource(source),
          specifiers,
          isTypeOnly: false,
        });
      }
    }

    return imports;
  }

  private extractTypeScriptExports(root: ParserType.SyntaxNode): ExportInfo[] {
    const exports: ExportInfo[] = [];
    const exportNodes = root.namedChildren.filter((node) => node.type === 'export_statement');

    for (const exportNode of exportNodes) {
      for (const child of exportNode.namedChildren) {
        switch (child.type) {
          case 'named_exports': {
            const specifiers = child.namedChildren.filter((node) => node.type === 'export_specifier');
            for (const spec of specifiers) {
              const name = spec.namedChildren[0];
              exports.push({
                name: name?.text || '',
                kind: 'function',
                isDefault: false,
                isTypeOnly: false,
                origin: spec.namedChildren[1]?.text,
              });
            }
            break;
          }
          case 'class_declaration': {
            const className = child.namedChildren.find((node) => node.type === 'type_identifier');
            if (className) {
              exports.push({ name: className.text, kind: 'class', isDefault: false, isTypeOnly: false });
            }
            break;
          }
          case 'function_declaration': {
            const funcName = child.namedChildren.find((node) => node.type === 'identifier');
            if (funcName) {
              exports.push({ name: funcName.text, kind: 'function', isDefault: false, isTypeOnly: false });
            }
            break;
          }
          case 'variable_declaration': {
            const variables = child.namedChildren.filter((node) => node.type === 'variable_declarator');
            for (const variable of variables) {
              const varName = variable.namedChildren[0];
              exports.push({
                name: varName?.text || '',
                kind: 'type',
                isDefault: false,
                isTypeOnly: false,
              });
            }
            break;
          }
          case 'interface_declaration': {
            const ifaceName = child.namedChildren.find((node) => node.type === 'type_identifier');
            if (ifaceName) {
              exports.push({ name: ifaceName.text, kind: 'interface', isDefault: false, isTypeOnly: false });
            }
            break;
          }
          case 'type_alias_declaration': {
            const typeName = child.namedChildren.find((node) => node.type === 'type_identifier');
            if (typeName) {
              exports.push({ name: typeName.text, kind: 'type', isDefault: false, isTypeOnly: false });
            }
            break;
          }
          case 'enum_declaration': {
            const enumName = child.namedChildren.find((node) => node.type === 'identifier');
            if (enumName) {
              exports.push({ name: enumName.text, kind: 'enum', isDefault: false, isTypeOnly: false });
            }
            break;
          }
        }
      }

      const defaultExport = exportNode.namedChildren.find((node) => node.type === 'default');
      if (defaultExport) {
        exports.push({
          name: 'default',
          kind: 'function',
          isDefault: true,
          isTypeOnly: false,
        });
      }
    }

    return exports;
  }

  private extractTypeScriptSymbols(root: ParserType.SyntaxNode, filePath: string): ModuleSymbol[] {
    const symbols: ModuleSymbol[] = [];
    const declarations = this.findTypeScriptDeclarations(root);

    for (const decl of declarations) {
      symbols.push({
        id: `${decl.name}-${decl.node.startPosition.row}`,
        name: decl.name,
        kind: decl.kind,
        location: {
          file: filePath,
          line: decl.node.startPosition.row + 1,
          column: decl.node.startPosition.column,
        },
        visibility: 'public',
        relatedSymbols: [],
      });
    }

    return symbols;
  }

  private findTypeScriptDeclarations(
    node: ParserType.SyntaxNode,
  ): Array<{ name: string; kind: SymbolKind; node: ParserType.SyntaxNode }> {
    const declarations: Array<{ name: string; kind: SymbolKind; node: ParserType.SyntaxNode }> = [];

    if (node.type === 'class_declaration') {
      const name = node.namedChildren.find((child) => child.type === 'type_identifier');
      if (name) declarations.push({ name: name.text, kind: 'class', node });
    }

    if (node.type === 'function_declaration') {
      const name = node.namedChildren.find((child) => child.type === 'identifier');
      if (name) declarations.push({ name: name.text, kind: 'function', node });
    }

    if (node.type === 'interface_declaration') {
      const name = node.namedChildren.find((child) => child.type === 'type_identifier');
      if (name) declarations.push({ name: name.text, kind: 'interface', node });
    }

    if (node.type === 'type_alias_declaration') {
      const name = node.namedChildren.find((child) => child.type === 'type_identifier');
      if (name) declarations.push({ name: name.text, kind: 'type', node });
    }

    if (node.type === 'enum_declaration') {
      const name = node.namedChildren.find((child) => child.type === 'identifier');
      if (name) declarations.push({ name: name.text, kind: 'enum', node });
    }

    if (node.type === 'variable_declarator') {
      const name = node.namedChildren[0];
      if (name && name.type === 'identifier') {
        declarations.push({ name: name.text, kind: 'variable', node });
      }
    }

    for (const child of node.namedChildren) {
      declarations.push(...this.findTypeScriptDeclarations(child));
    }

    return declarations;
  }

  private extractPythonImports(root: ParserType.SyntaxNode): ImportInfo[] {
    const imports: ImportInfo[] = [];

    for (const child of root.namedChildren) {
      if (child.type === 'import_statement') {
        imports.push(...this.parsePythonImportStatement(child));
      } else if (child.type === 'import_from_statement') {
        imports.push(...this.parsePythonImportFromStatement(child));
      } else if (child.type === 'future_import_statement') {
        imports.push(...this.parsePythonFutureImportStatement(child));
      }
    }

    return imports;
  }

  private parsePythonImportStatement(node: any): ImportInfo[] {
    const nameField = node.childForFieldName('name');
    if (!nameField) return [];

    const specifiers = this.extractPythonImportSpecifiers(nameField);
    if (specifiers.length === 0) return [];

    return [{
      source: specifiers[0]!.name,
      sourceType: specifiers[0]!.name.startsWith('.') ? 'relative' : 'absolute',
      specifiers,
      isTypeOnly: false,
    }];
  }

  private parsePythonImportFromStatement(node: any): ImportInfo[] {
    const moduleName = node.childForFieldName('module_name');
    let source = '';
    let sourceType: ImportInfo['sourceType'] = 'absolute';

    if (moduleName) {
      source = moduleName.text;
      sourceType = source.startsWith('.') ? 'relative' : 'absolute';
    }

    const specifiers: ImportInfo['specifiers'] = [];
    for (let i = 1; i < node.namedChildren.length; i++) {
      const child = node.namedChildren[i];
      if (child.type === 'dotted_name' || child.type === 'identifier') {
        specifiers.push({ name: child.text, isTypeOnly: false });
      } else if (child.type === 'aliased_import') {
        specifiers.push({
          name: child.childForFieldName('name')?.text || '',
          alias: child.childForFieldName('alias')?.text,
          isTypeOnly: false,
        });
      } else if (child.type === 'wildcard_import') {
        specifiers.push({ name: '*', isTypeOnly: false });
      }
    }

    if (specifiers.length === 0 && !source) return [];
    return [{ source, sourceType, specifiers, isTypeOnly: false }];
  }

  private parsePythonFutureImportStatement(node: any): ImportInfo[] {
    const specifiers = node.namedChildren
      .filter((child: any) => child.type === 'identifier')
      .map((child: any) => ({ name: child.text, isTypeOnly: false }));

    return [{
      source: '__future__',
      sourceType: 'absolute',
      specifiers,
      isTypeOnly: false,
    }];
  }

  private extractPythonImportSpecifiers(nameNode: any): ImportInfo['specifiers'] {
    if (nameNode.type === 'dotted_name' || nameNode.type === 'identifier') {
      return [{ name: nameNode.text, isTypeOnly: false }];
    }

    if (nameNode.type === 'aliased_import') {
      return [{
        name: nameNode.childForFieldName('name')?.text || '',
        alias: nameNode.childForFieldName('alias')?.text,
        isTypeOnly: false,
      }];
    }

    return nameNode.namedChildren.flatMap((child: any) => this.extractPythonImportSpecifiers(child));
  }

  private extractPythonExports(root: ParserType.SyntaxNode): ExportInfo[] {
    const explicitExports = this.extractPythonAllExports(root);
    if (explicitExports.length > 0) {
      return explicitExports.map((name) => ({
        name,
        kind: 'variable',
        isDefault: false,
        isTypeOnly: false,
      }));
    }

    const exports: ExportInfo[] = [];
    for (const child of root.namedChildren) {
      if (child.type === 'class_definition' || child.type === 'function_definition') {
        const nameNode = child.childForFieldName('name');
        if (nameNode && !nameNode.text.startsWith('_')) {
          exports.push({
            name: nameNode.text,
            kind: child.type === 'class_definition' ? 'class' : 'function',
            isDefault: false,
            isTypeOnly: false,
          });
        }
      } else if (child.type === 'decorated_definition') {
        const definition = child.namedChildren.find((node) => node.type === 'class_definition' || node.type === 'function_definition');
        const nameNode = definition?.childForFieldName('name');
        if (definition && nameNode && !nameNode.text.startsWith('_')) {
          exports.push({
            name: nameNode.text,
            kind: definition.type === 'class_definition' ? 'class' : 'function',
            isDefault: false,
            isTypeOnly: false,
          });
        }
      }
    }

    return exports;
  }

  private extractPythonAllExports(root: ParserType.SyntaxNode): string[] {
    const assignment = root.namedChildren.find(
      (child) => child.type === 'expression_statement' && child.text.includes('__all__'),
    );

    if (!assignment) return [];

    return Array.from(assignment.text.matchAll(/['"]([^'"]+)['"]/g)).map((match) => match[1] || '');
  }

  private extractPythonSymbols(root: ParserType.SyntaxNode, filePath: string): ModuleSymbol[] {
    const symbols: ModuleSymbol[] = [];

    const visit = (node: any, decorators: Array<{ name: string; target: 'class' | 'method' | 'property' | 'parameter' }> = []) => {
      if (node.type === 'decorated_definition') {
        const decoratorNodes = node.namedChildren.filter((child: any) => child.type === 'decorator');
        const nextDecorators = decoratorNodes.map((child: any) => ({
          name: child.text.replace(/^@/, '').split('(')[0] || child.text,
          target: 'class' as const,
        }));
        const definition = node.namedChildren.find(
          (child: any) => child.type === 'class_definition' || child.type === 'function_definition',
        );
        if (definition) visit(definition, nextDecorators);
        return;
      }

      if (node.type === 'class_definition' || node.type === 'function_definition') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const kind: SymbolKind = node.type === 'class_definition' ? 'class' : 'function';
          const signature = kind === 'function'
            ? {
                parameters: [],
                returnType: 'Any',
                async: node.text.startsWith('async def '),
              }
            : undefined;

          symbols.push({
            id: `${nameNode.text}-${node.startPosition.row}`,
            name: nameNode.text,
            kind,
            location: {
              file: filePath,
              line: node.startPosition.row + 1,
              column: node.startPosition.column,
            },
            visibility: nameNode.text.startsWith('_') ? 'internal' : 'public',
            relatedSymbols: [],
            decorators: decorators.length > 0 ? decorators : undefined,
            signature,
            ...(kind === 'class' ? { extends: this.extractPythonClassBases(node) } : {}),
          });
        }
      }

      for (const child of node.namedChildren ?? []) {
        visit(child, []);
      }
    };

    for (const child of root.namedChildren) {
      visit(child);
    }

    return symbols;
  }

  private extractPythonClassBases(node: any): string[] {
    const superclasses = node.childForFieldName('superclasses');
    if (!superclasses) return [];

    return superclasses.namedChildren
      .filter((child: any) => child.type === 'identifier' || child.type === 'attribute')
      .map((child: any) => child.text);
  }

  private extractDependencies(imports: ImportInfo[]): string[] {
    const deps = new Set<string>();
    for (const imp of imports) {
      if (!imp.source.startsWith('.')) {
        deps.add(imp.source);
      }
    }
    return Array.from(deps);
  }

  private detectModuleType(filePath: string): 'source' | 'test' | 'config' | 'type' {
    const basename = path.basename(filePath);

    if (basename.includes('.test.') || basename.includes('.spec.')) return 'test';
    if (basename.startsWith('.') || basename.endsWith('.config.') || basename.endsWith('.config.ts')) return 'config';
    if (basename.includes('.d.ts') || basename.includes('.types.')) return 'type';
    return 'source';
  }

  private calculateStats(content: string, root: ParserType.SyntaxNode): SharedParseStats {
    const lines = content.split('\n');
    const commentLines = new Set<number>();

    for (const comment of this.findCommentNodes(root)) {
      for (let i = comment.startPosition.row; i <= comment.endPosition.row; i++) {
        commentLines.add(i);
      }
    }

    const blankLines = lines.filter((line) => line.trim() === '').length;

    return {
      lines: lines.length,
      codeLines: lines.length - commentLines.size - blankLines,
      commentLines: commentLines.size,
      blankLines,
    };
  }

  private findCommentNodes(node: ParserType.SyntaxNode): ParserType.SyntaxNode[] {
    const comments: ParserType.SyntaxNode[] = [];
    if (node.type === 'comment') comments.push(node);
    for (const child of node.children) {
      comments.push(...this.findCommentNodes(child));
    }
    return comments;
  }

  private classifyImportSource(source: string): ImportInfo['sourceType'] {
    if (source.startsWith('.')) return 'relative';
    if (source.startsWith('@')) return 'alias';
    return 'node_module';
  }

  private buildDependencies(imports: ImportInfo[]): Dependency[] {
    return imports.map((imp) => ({
      id: `dep_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      sourceId: '',
      targetId: '',
      type: 'import',
      filePath: imp.source,
    }));
  }

  private getLineNumber(content: string, index: number): number {
    return content.slice(0, index).split('\n').length;
  }

  private isKeyword(word: string): boolean {
    return [
      'if', 'else', 'while', 'for', 'switch', 'case', 'break', 'continue',
      'return', 'throw', 'try', 'catch', 'finally', 'new', 'typeof', 'instanceof',
      'await', 'yield', 'void', 'delete', 'in', 'of',
    ].includes(word);
  }

  private findFunctionEnd(content: string, startIndex: number): number {
    let braceCount = 0;
    let inFunction = false;

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      if (char === '{') {
        braceCount++;
        inFunction = true;
      } else if (char === '}') {
        braceCount--;
        if (inFunction && braceCount === 0) {
          return i + 1;
        }
      }
    }

    return content.length;
  }
}
