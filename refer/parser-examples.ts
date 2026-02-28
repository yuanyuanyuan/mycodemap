/**
 * TypeScript 代码解析示例
 * 可直接运行的关键解析逻辑
 */

import * as ts from 'typescript';
import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';

// ============================================================
// 1. 基础符号提取（Tree-sitter）
// ============================================================

interface SymbolLocation {
  file: string;
  line: number;
  column: number;
}

interface CodeSymbol {
  id: string;
  name: string;
  kind: string;
  location: SymbolLocation;
  modifiers: string[];
  children: CodeSymbol[];
}

/**
 * 使用 Tree-sitter 快速提取符号
 */
export class FastSymbolExtractor {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
    this.parser.setLanguage(TypeScript.typescript);
  }

  /**
   * 提取文件中的所有符号
   */
  extractSymbols(sourceCode: string, filePath: string): CodeSymbol[] {
    const tree = this.parser.parse(sourceCode);
    const symbols: CodeSymbol[] = [];

    this.traverseNode(tree.rootNode, filePath, symbols, null);
    
    return symbols;
  }

  private traverseNode(
    node: Parser.SyntaxNode,
    filePath: string,
    symbols: CodeSymbol[],
    parent: CodeSymbol | null
  ): void {
    // 识别符号定义节点
    const symbolInfo = this.getSymbolInfo(node, filePath);
    
    if (symbolInfo) {
      symbols.push(symbolInfo);
      
      if (parent) {
        parent.children.push(symbolInfo);
      }
      
      parent = symbolInfo;
    }

    // 递归遍历子节点
    for (const child of node.children) {
      this.traverseNode(child, filePath, symbols, parent);
    }
  }

  private getSymbolInfo(
    node: Parser.SyntaxNode,
    filePath: string
  ): CodeSymbol | null {
    const kind = this.getNodeKind(node);
    if (!kind) return null;

    const name = this.getNodeName(node);
    if (!name) return null;

    return {
      id: `${filePath}:${node.startPosition.row}:${node.startPosition.column}`,
      name,
      kind,
      location: {
        file: filePath,
        line: node.startPosition.row + 1,
        column: node.startPosition.column,
      },
      modifiers: this.getModifiers(node),
      children: [],
    };
  }

  private getNodeKind(node: Parser.SyntaxNode): string | null {
    const kindMap: Record<string, string> = {
      'class_declaration': 'class',
      'interface_declaration': 'interface',
      'type_alias_declaration': 'type',
      'enum_declaration': 'enum',
      'function_declaration': 'function',
      'method_definition': 'method',
      'variable_declaration': 'variable',
      'property_definition': 'property',
      'import_statement': 'import',
      'export_statement': 'export',
    };

    return kindMap[node.type] || null;
  }

  private getNodeName(node: Parser.SyntaxNode): string | null {
    // 查找名称节点
    const nameNode = node.children.find(child => 
      child.type === 'identifier' ||
      child.type === 'type_identifier' ||
      child.type === 'property_identifier'
    );
    
    return nameNode?.text || null;
  }

  private getModifiers(node: Parser.SyntaxNode): string[] {
    const modifiers: string[] = [];
    
    // 查找修饰符节点
    const modifiersNode = node.children.find(child => 
      child.type === 'modifiers'
    );
    
    if (modifiersNode) {
      for (const mod of modifiersNode.children) {
        modifiers.push(mod.text);
      }
    }

    return modifiers;
  }
}

// ============================================================
// 2. 类型信息提取（TypeScript Compiler API）
// ============================================================

interface TypeInfo {
  typeString: string;
  isGeneric: boolean;
  typeParameters?: string[];
  documentation?: string;
}

/**
 * 使用 TypeScript Compiler API 提取类型信息
 */
export class TypeInfoExtractor {
  private program: ts.Program;
  private typeChecker: ts.TypeChecker;

  constructor(tsConfigPath: string) {
    const config = this.loadTsConfig(tsConfigPath);
    this.program = ts.createProgram(config.fileNames, config.options);
    this.typeChecker = this.program.getTypeChecker();
  }

  /**
   * 获取文件中所有符号的类型信息
   */
  extractTypeInfo(filePath: string): Map<string, TypeInfo> {
    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) {
      throw new Error(`File not found: ${filePath}`);
    }

    const typeInfoMap = new Map<string, TypeInfo>();

    const visit = (node: ts.Node) => {
      if (this.isSymbolDefinition(node)) {
        const symbol = this.typeChecker.getSymbolAtLocation(node);
        if (symbol) {
          const info = this.getSymbolTypeInfo(symbol, node);
          const id = this.getNodeId(node, sourceFile);
          typeInfoMap.set(id, info);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return typeInfoMap;
  }

  /**
   * 获取特定位置的类型信息
   */
  getTypeAtPosition(
    filePath: string,
    line: number,
    column: number
  ): TypeInfo | null {
    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) return null;

    const position = ts.getPositionOfLineAndCharacter(sourceFile, line, column);
    const node = this.findNodeAtPosition(sourceFile, position);
    
    if (!node) return null;

    const type = this.typeChecker.getTypeAtLocation(node);
    const symbol = this.typeChecker.getSymbolAtLocation(node);

    return {
      typeString: this.typeChecker.typeToString(type),
      isGeneric: this.isGenericType(type),
      typeParameters: this.getTypeParameters(type),
      documentation: symbol 
        ? ts.displayPartsToString(symbol.getDocumentationComment(this.typeChecker))
        : undefined,
    };
  }

  private isSymbolDefinition(node: ts.Node): boolean {
    return ts.isClassDeclaration(node) ||
           ts.isInterfaceDeclaration(node) ||
           ts.isFunctionDeclaration(node) ||
           ts.isVariableDeclaration(node) ||
           ts.isMethodDeclaration(node) ||
           ts.isPropertyDeclaration(node);
  }

  private getSymbolTypeInfo(symbol: ts.Symbol, node: ts.Node): TypeInfo {
    const type = this.typeChecker.getTypeOfSymbolAtLocation(symbol, node);
    
    return {
      typeString: this.typeChecker.typeToString(type),
      isGeneric: this.isGenericType(type),
      typeParameters: this.getTypeParameters(type),
      documentation: ts.displayPartsToString(
        symbol.getDocumentationComment(this.typeChecker)
      ),
    };
  }

  private isGenericType(type: ts.Type): boolean {
    return !!(type.flags & ts.TypeFlags.Object) && 
           !!(type as ts.ObjectType).typeParameters;
  }

  private getTypeParameters(type: ts.Type): string[] | undefined {
    const objectType = type as ts.ObjectType;
    if (!objectType.typeParameters) return undefined;

    return objectType.typeParameters.map(param => 
      this.typeChecker.typeToString(param)
    );
  }

  private findNodeAtPosition(
    sourceFile: ts.SourceFile,
    position: number
  ): ts.Node | undefined {
    function find(node: ts.Node): ts.Node | undefined {
      if (node.pos <= position && node.end >= position) {
        return ts.forEachChild(node, find) || node;
      }
      return undefined;
    }
    return find(sourceFile);
  }

  private getNodeId(node: ts.Node, sourceFile: ts.SourceFile): string {
    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    return `${sourceFile.fileName}:${pos.line}:${pos.character}`;
  }

  private loadTsConfig(tsConfigPath: string): {
    fileNames: string[];
    options: ts.CompilerOptions;
  } {
    const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      require('path').dirname(tsConfigPath)
    );

    return {
      fileNames: parsed.fileNames,
      options: parsed.options,
    };
  }
}

// ============================================================
// 3. 依赖分析
// ============================================================

interface ImportInfo {
  source: string;
  specifiers: string[];
  isTypeOnly: boolean;
}

interface ExportInfo {
  name: string;
  isDefault: boolean;
  isReExport: boolean;
}

interface ModuleInfo {
  path: string;
  imports: ImportInfo[];
  exports: ExportInfo[];
  dependencies: string[];
}

/**
 * 分析模块依赖关系
 */
export class DependencyAnalyzer {
  private program: ts.Program;
  private typeChecker: ts.TypeChecker;

  constructor(tsConfigPath: string) {
    const config = this.loadTsConfig(tsConfigPath);
    this.program = ts.createProgram(config.fileNames, config.options);
    this.typeChecker = this.program.getTypeChecker();
  }

  /**
   * 分析单个文件的依赖
   */
  analyzeFile(filePath: string): ModuleInfo {
    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) {
      throw new Error(`File not found: ${filePath}`);
    }

    const imports: ImportInfo[] = [];
    const exports: ExportInfo[] = [];

    ts.forEachChild(sourceFile, (node) => {
      if (ts.isImportDeclaration(node)) {
        imports.push(this.parseImport(node));
      } else if (ts.isExportDeclaration(node)) {
        exports.push(...this.parseExport(node));
      } else if (this.isExportable(node)) {
        exports.push(this.parseLocalExport(node));
      }
    });

    return {
      path: filePath,
      imports,
      exports,
      dependencies: imports.map(imp => imp.source),
    };
  }

  /**
   * 分析项目中的所有模块
   */
  analyzeProject(): Map<string, ModuleInfo> {
    const modules = new Map<string, ModuleInfo>();

    for (const sourceFile of this.program.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile) {
        const info = this.analyzeFile(sourceFile.fileName);
        modules.set(sourceFile.fileName, info);
      }
    }

    return modules;
  }

  /**
   * 检测循环依赖
   */
  detectCircularDependencies(): string[][] {
    const modules = this.analyzeProject();
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (modulePath: string, path: string[]): void => {
      if (recursionStack.has(modulePath)) {
        // 发现循环
        const cycleStart = path.indexOf(modulePath);
        cycles.push(path.slice(cycleStart));
        return;
      }

      if (visited.has(modulePath)) return;

      visited.add(modulePath);
      recursionStack.add(modulePath);
      path.push(modulePath);

      const module = modules.get(modulePath);
      if (module) {
        for (const dep of module.dependencies) {
          const resolved = this.resolveModule(dep, modulePath);
          if (resolved && modules.has(resolved)) {
            dfs(resolved, [...path]);
          }
        }
      }

      recursionStack.delete(modulePath);
    };

    for (const modulePath of modules.keys()) {
      dfs(modulePath, []);
    }

    return cycles;
  }

  private parseImport(node: ts.ImportDeclaration): ImportInfo {
    const source = (node.moduleSpecifier as ts.StringLiteral).text;
    const specifiers: string[] = [];
    let isTypeOnly = false;

    if (node.importClause) {
      isTypeOnly = node.importClause.isTypeOnly;

      if (node.importClause.name) {
        specifiers.push(node.importClause.name.text);
      }

      if (node.importClause.namedBindings) {
        if (ts.isNamedImports(node.importClause.namedBindings)) {
          for (const element of node.importClause.namedBindings.elements) {
            specifiers.push(element.name.text);
          }
        } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
          specifiers.push(`* as ${node.importClause.namedBindings.name.text}`);
        }
      }
    }

    return { source, specifiers, isTypeOnly };
  }

  private parseExport(node: ts.ExportDeclaration): ExportInfo[] {
    const exports: ExportInfo[] = [];

    if (node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const element of node.exportClause.elements) {
        exports.push({
          name: element.name.text,
          isDefault: false,
          isReExport: !!node.moduleSpecifier,
        });
      }
    }

    return exports;
  }

  private parseLocalExport(node: ts.Node): ExportInfo {
    let name = '';
    let isDefault = false;

    if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) {
      name = node.name?.text || '';
    } else if (ts.isVariableStatement(node)) {
      name = node.declarationList.declarations[0].name.getText();
    }

    // 检查是否有 export default 修饰符
    if (node.modifiers) {
      for (const mod of node.modifiers) {
        if (mod.kind === ts.SyntaxKind.DefaultKeyword) {
          isDefault = true;
        }
      }
    }

    return { name, isDefault, isReExport: false };
  }

  private isExportable(node: ts.Node): boolean {
    if (!node.modifiers) return false;

    return node.modifiers.some(mod =>
      mod.kind === ts.SyntaxKind.ExportKeyword
    );
  }

  private resolveModule(source: string, containingFile: string): string | null {
    const resolved = ts.resolveModuleName(
      source,
      containingFile,
      this.program.getCompilerOptions(),
      ts.sys
    );

    return resolved.resolvedModule?.resolvedFileName || null;
  }

  private loadTsConfig(tsConfigPath: string): {
    fileNames: string[];
    options: ts.CompilerOptions;
  } {
    const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      require('path').dirname(tsConfigPath)
    );

    return {
      fileNames: parsed.fileNames,
      options: parsed.options,
    };
  }
}

// ============================================================
// 4. 调用关系图构建
// ============================================================

interface CallNode {
  id: string;
  name: string;
  file: string;
  line: number;
}

interface CallEdge {
  caller: string;
  callee: string;
  file: string;
  line: number;
}

interface CallGraph {
  nodes: Map<string, CallNode>;
  edges: CallEdge[];
}

/**
 * 构建函数调用关系图
 */
export class CallGraphBuilder {
  private program: ts.Program;
  private typeChecker: ts.TypeChecker;
  private graph: CallGraph;

  constructor(tsConfigPath: string) {
    const config = this.loadTsConfig(tsConfigPath);
    this.program = ts.createProgram(config.fileNames, config.options);
    this.typeChecker = this.program.getTypeChecker();
    this.graph = {
      nodes: new Map(),
      edges: [],
    };
  }

  /**
   * 构建整个项目的调用图
   */
  buildCallGraph(): CallGraph {
    for (const sourceFile of this.program.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile) {
        this.analyzeFile(sourceFile);
      }
    }

    return this.graph;
  }

  /**
   * 获取特定函数的被调用者
   */
  getCallees(functionId: string): CallNode[] {
    const edges = this.graph.edges.filter(e => e.caller === functionId);
    return edges.map(e => this.graph.nodes.get(e.callee)!).filter(Boolean);
  }

  /**
   * 获取特定函数的调用者
   */
  getCallers(functionId: string): CallNode[] {
    const edges = this.graph.edges.filter(e => e.callee === functionId);
    return edges.map(e => this.graph.nodes.get(e.caller)!).filter(Boolean);
  }

  private analyzeFile(sourceFile: ts.SourceFile): void {
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        this.processCallExpression(node, sourceFile);
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  private processCallExpression(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile
  ): void {
    const caller = this.findEnclosingFunction(node, sourceFile);
    const callee = this.resolveCallee(node.expression, sourceFile);

    if (caller && callee) {
      this.graph.edges.push({
        caller: caller.id,
        callee: callee.id,
        file: sourceFile.fileName,
        line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line,
      });
    }
  }

  private findEnclosingFunction(
    node: ts.Node,
    sourceFile: ts.SourceFile
  ): CallNode | null {
    let current: ts.Node | undefined = node;

    while (current) {
      if (ts.isFunctionDeclaration(current) && current.name) {
        return this.getOrCreateNode(current, sourceFile);
      }
      if (ts.isMethodDeclaration(current) && current.name) {
        return this.getOrCreateNode(current, sourceFile);
      }
      if (ts.isArrowFunction(current)) {
        return this.getOrCreateNode(current, sourceFile);
      }
      current = current.parent;
    }

    return null;
  }

  private resolveCallee(
    expression: ts.Expression,
    sourceFile: ts.SourceFile
  ): CallNode | null {
    const symbol = this.typeChecker.getSymbolAtLocation(expression);
    if (!symbol) return null;

    const declarations = symbol.getDeclarations();
    if (!declarations || declarations.length === 0) return null;

    const decl = declarations[0];
    const declSourceFile = decl.getSourceFile();

    return this.getOrCreateNode(decl, declSourceFile);
  }

  private getOrCreateNode(
    node: ts.Node,
    sourceFile: ts.SourceFile
  ): CallNode {
    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const id = `${sourceFile.fileName}:${pos.line}:${pos.character}`;

    if (!this.graph.nodes.has(id)) {
      const name = this.getNodeName(node);
      this.graph.nodes.set(id, {
        id,
        name,
        file: sourceFile.fileName,
        line: pos.line,
      });
    }

    return this.graph.nodes.get(id)!;
  }

  private getNodeName(node: ts.Node): string {
    if (ts.isFunctionDeclaration(node)) {
      return node.name?.text || '(anonymous)';
    }
    if (ts.isMethodDeclaration(node)) {
      return node.name.getText();
    }
    if (ts.isArrowFunction(node)) {
      return '(arrow function)';
    }
    return '(unknown)';
  }

  private loadTsConfig(tsConfigPath: string): {
    fileNames: string[];
    options: ts.CompilerOptions;
  } {
    const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      require('path').dirname(tsConfigPath)
    );

    return {
      fileNames: parsed.fileNames,
      options: parsed.options,
    };
  }
}

// ============================================================
// 5. 使用示例
// ============================================================

/**
 * 完整解析流程示例
 */
export async function parseTypeScriptProject(
  projectPath: string,
  tsConfigPath: string
): Promise<void> {
  console.log('=== TypeScript 项目解析示例 ===\n');

  // 1. 快速符号提取（Tree-sitter）
  console.log('1. 快速符号提取...');
  const fastExtractor = new FastSymbolExtractor();
  
  const sampleCode = `
export class UserService {
  private users: User[] = [];
  
  async getUser(id: string): Promise<User> {
    return this.users.find(u => u.id === id)!;
  }
  
  addUser(user: User): void {
    this.users.push(user);
  }
}

interface User {
  id: string;
  name: string;
}
`;

  const symbols = fastExtractor.extractSymbols(sampleCode, 'sample.ts');
  console.log(`   发现 ${symbols.length} 个符号`);
  symbols.forEach(s => {
    console.log(`   - ${s.kind}: ${s.name}`);
  });

  // 2. 类型信息提取（需要 tsconfig.json）
  console.log('\n2. 类型信息提取...');
  try {
    const typeExtractor = new TypeInfoExtractor(tsConfigPath);
    console.log('   TypeScript 编译器初始化成功');
    // const typeInfo = typeExtractor.extractTypeInfo('src/index.ts');
    // console.log(`   提取了 ${typeInfo.size} 个类型信息`);
  } catch (e) {
    console.log('   跳过（需要有效的 tsconfig.json）');
  }

  // 3. 依赖分析
  console.log('\n3. 依赖分析...');
  try {
    const depAnalyzer = new DependencyAnalyzer(tsConfigPath);
    const modules = depAnalyzer.analyzeProject();
    console.log(`   分析了 ${modules.size} 个模块`);
    
    const cycles = depAnalyzer.detectCircularDependencies();
    if (cycles.length > 0) {
      console.log(`   发现 ${cycles.length} 个循环依赖`);
      cycles.forEach(cycle => {
        console.log(`   - ${cycle.join(' -> ')}`);
      });
    } else {
      console.log('   未发现循环依赖');
    }
  } catch (e) {
    console.log('   跳过（需要有效的 tsconfig.json）');
  }

  // 4. 调用关系图
  console.log('\n4. 调用关系图...');
  try {
    const callGraphBuilder = new CallGraphBuilder(tsConfigPath);
    const callGraph = callGraphBuilder.buildCallGraph();
    console.log(`   构建了包含 ${callGraph.nodes.size} 个节点、${callGraph.edges.length} 条边的调用图`);
  } catch (e) {
    console.log('   跳过（需要有效的 tsconfig.json）');
  }

  console.log('\n=== 解析完成 ===');
}

// 导出所有组件
export {
  SymbolLocation,
  CodeSymbol,
  TypeInfo,
  ImportInfo,
  ExportInfo,
  ModuleInfo,
  CallNode,
  CallEdge,
  CallGraph,
};
