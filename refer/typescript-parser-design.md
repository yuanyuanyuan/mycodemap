# TypeScript 项目代码解析方案设计

## 1. 技术选型对比表

| 维度 | TypeScript Compiler API | LSP (tsserver) | Tree-sitter |
|------|------------------------|----------------|-------------|
| **解析速度** | ⭐⭐⭐ 中等（需完整类型检查） | ⭐⭐ 较慢（进程通信开销） | ⭐⭐⭐⭐⭐ 极快（纯语法解析） |
| **类型准确性** | ⭐⭐⭐⭐⭐ 完美（完整类型系统） | ⭐⭐⭐⭐⭐ 完美（使用相同引擎） | ⭐⭐ 有限（仅语法级） |
| **语义分析** | ⭐⭐⭐⭐⭐ 完整 | ⭐⭐⭐⭐⭐ 完整 | ⭐⭐ 无 |
| **增量更新** | ⭐⭐⭐⭐ 支持（IncrementalProgram） | ⭐⭐⭐⭐ 内置支持 | ⭐⭐⭐⭐⭐ 原生支持 |
| **内存占用** | ⭐⭐⭐ 较高 | ⭐⭐ 高（常驻进程） | ⭐⭐⭐⭐⭐ 低 |
| **错误恢复** | ⭐⭐⭐ 一般 | ⭐⭐⭐ 一般 | ⭐⭐⭐⭐⭐ 优秀 |
| **实现复杂度** | ⭐⭐⭐ 中等 | ⭐⭐ 较高（协议处理） | ⭐⭐⭐⭐ 简单 |
| **跨语言支持** | ❌ TypeScript only | ❌ TypeScript only | ⭐⭐⭐⭐⭐ 多语言 |
| **依赖分析** | ⭐⭐⭐⭐⭐ 完整模块图 | ⭐⭐⭐⭐ 完整 | ⭐⭐⭐ 语法级导入 |
| **泛型处理** | ⭐⭐⭐⭐⭐ 完整类型推断 | ⭐⭐⭐⭐⭐ 完整 | ❌ 不支持 |
| **调用关系图** | ⭐⭐⭐⭐⭐ 完整 | ⭐⭐⭐⭐ 需多请求 | ⭐⭐⭐ 语法级 |
| **启动时间** | ⭐⭐⭐ 中等 | ⭐⭐ 慢 | ⭐⭐⭐⭐⭐ 极快 |
| **API稳定性** | ⭐⭐⭐⭐ 较稳定 | ⭐⭐⭐⭐⭐ 标准协议 | ⭐⭐⭐⭐ 稳定 |

### 详细分析

#### TypeScript Compiler API
```
优势：
- 完整的类型信息和语义分析
- 可直接访问 Symbol、Type、TypeChecker
- 支持复杂的泛型推断
- 可构建完整的模块依赖图
- 官方支持，文档完善

劣势：
- 需要加载完整的类型定义
- 大项目启动较慢
- 内存占用较高
- 错误文件处理能力有限
```

#### LSP (Language Server Protocol)
```
优势：
- 标准化接口，易于集成
- 内置增量更新机制
- 支持丰富的IDE功能（跳转、重构等）
- 社区生态成熟

劣势：
- 进程通信开销
- 需要维护tsserver进程
- 批量分析效率低
- 复杂查询需要多次往返
```

#### Tree-sitter
```
优势：
- 极快的解析速度
- 优秀的错误恢复能力
- 真正的增量解析
- 低内存占用
- 统一的多语言支持

劣势：
- 无类型信息
- 无法解析语义依赖
- 泛型信息不完整
- 需要额外处理来确定符号类型
```

---

## 2. 推荐方案：分层混合架构

### 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                      CodeMap Parser                         │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: Semantic Analysis (TypeScript Compiler API)      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  - Type information extraction                      │   │
│  │  - Generic resolution                               │   │
│  │  - Cross-file symbol resolution                     │   │
│  │  - Call graph construction                          │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Syntactic Analysis (Tree-sitter)                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  - Fast AST traversal                               │   │
│  │  - Symbol discovery                                 │   │
│  │  - Import/Export extraction                         │   │
│  │  - Incremental updates                              │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: File System & Caching                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  - File watcher                                     │   │
│  │  - AST cache                                        │   │
│  │  - Symbol index                                     │   │
│  │  - Dependency graph cache                           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 方案选择理由

1. **Tree-sitter 作为第一层**：快速提取语法结构，支持增量更新
2. **TypeScript Compiler API 作为第二层**：补充类型信息和语义分析
3. **分层缓存**：每层独立缓存，避免重复计算

---

## 3. 符号提取策略

### 3.1 符号类型定义

```typescript
// 符号类型枚举
enum SymbolKind {
  // 模块级
  Namespace = 'namespace',
  Module = 'module',
  
  // 类型定义
  Interface = 'interface',
  TypeAlias = 'typeAlias',
  Enum = 'enum',
  Class = 'class',
  
  // 值定义
  Function = 'function',
  Variable = 'variable',
  Constant = 'constant',
  
  // 类成员
  Method = 'method',
  Property = 'property',
  Constructor = 'constructor',
  Getter = 'getter',
  Setter = 'setter',
  
  // 其他
  TypeParameter = 'typeParameter',
  Parameter = 'parameter',
  Decorator = 'decorator',
}

// 符号信息接口
interface SymbolInfo {
  id: string;                    // 唯一标识
  name: string;                  // 符号名称
  kind: SymbolKind;              // 符号类型
  location: SourceLocation;      // 源代码位置
  
  // 类型信息（可选，由TS Compiler提供）
  typeInfo?: TypeInfo;
  
  // 泛型信息
  typeParameters?: TypeParameterInfo[];
  
  // 文档注释
  documentation?: string;
  
  // 修饰符
  modifiers: Modifier[];         // export, public, async, etc.
  
  // 关系
  parent?: string;               // 父符号ID
  children: string[];            // 子符号ID列表
  
  // 依赖关系
  dependencies: string[];        // 依赖的符号ID
  dependents: string[];          // 被依赖的符号ID
}
```

### 3.2 符号提取流程

```
┌─────────────────┐
│   Source File   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Tree-sitter Parse      │
│  - 快速生成AST          │
│  - 错误恢复             │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Syntax Symbol Extract  │
│  - 遍历AST节点          │
│  - 识别符号定义         │
│  - 提取基础信息         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  TS Compiler Enrich     │
│  - 获取类型信息         │
│  - 解析泛型             │
│  - 补充语义             │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Symbol Index Build     │
│  - 建立符号表           │
│  - 计算依赖关系         │
└─────────────────────────┘
```

### 3.3 符号提取实现

```typescript
// 使用 Tree-sitter 快速提取符号
class SyntaxSymbolExtractor {
  private parser: Parser;
  private query: Query;

  constructor() {
    this.parser = new Parser();
    this.parser.setLanguage(TypeScript);
    
    // 定义查询模式
    this.query = new Query(TypeScript, `
      ;; 类定义
      (class_declaration
        name: (type_identifier) @class.name
        type_parameters: (type_parameters)? @class.typeParams
        heritage: (class_heritage)? @class.heritage
        body: (class_body) @class.body) @class.def

      ;; 接口定义
      (interface_declaration
        name: (type_identifier) @interface.name
        type_parameters: (type_parameters)? @interface.typeParams
        body: (object_type) @interface.body) @interface.def

      ;; 函数定义
      (function_declaration
        name: (identifier) @function.name
        parameters: (formal_parameters) @function.params
        return_type: (type_annotation)? @function.returnType
        body: (statement_block)? @function.body) @function.def

      ;; 变量声明
      (variable_declaration
        (variable_declarator
          name: (identifier) @var.name
          type: (type_annotation)? @var.type
          value: (_)? @var.value)) @var.def

      ;; 导入语句
      (import_statement
        source: (string) @import.source
        clause: (import_clause)? @import.clause) @import.def

      ;; 导出语句
      (export_statement
        (export_clause)? @export.clause
        source: (string)? @export.source) @export.def
    `);
  }

  extractSymbols(sourceCode: string, filePath: string): SymbolInfo[] {
    const tree = this.parser.parse(sourceCode);
    const captures = this.query.captures(tree.rootNode);
    
    const symbols: SymbolInfo[] = [];
    const symbolMap = new Map<string, SymbolInfo>();

    for (const capture of captures) {
      const symbol = this.createSymbolFromCapture(capture, filePath);
      if (symbol) {
        symbols.push(symbol);
        symbolMap.set(symbol.id, symbol);
      }
    }

    // 建立父子关系
    this.buildHierarchy(symbols, tree.rootNode);
    
    return symbols;
  }

  private createSymbolFromCapture(
    capture: QueryCapture, 
    filePath: string
  ): SymbolInfo | null {
    // 根据捕获类型创建符号信息
    const kind = this.getSymbolKind(capture.name);
    if (!kind) return null;

    return {
      id: `${filePath}#${capture.node.startPosition.row}:${capture.node.startPosition.column}`,
      name: capture.node.text,
      kind,
      location: {
        file: filePath,
        start: capture.node.startPosition,
        end: capture.node.endPosition,
      },
      modifiers: this.extractModifiers(capture.node),
      children: [],
      dependencies: [],
      dependents: [],
    };
  }

  private getSymbolKind(captureName: string): SymbolKind | null {
    if (captureName.includes('class')) return SymbolKind.Class;
    if (captureName.includes('interface')) return SymbolKind.Interface;
    if (captureName.includes('function')) return SymbolKind.Function;
    if (captureName.includes('var')) return SymbolKind.Variable;
    return null;
  }

  private extractModifiers(node: SyntaxNode): Modifier[] {
    const modifiers: Modifier[] = [];
    const parent = node.parent;
    
    if (parent?.type === 'modifiers') {
      for (const child of parent.children) {
        modifiers.push(child.text as Modifier);
      }
    }
    
    return modifiers;
  }

  private buildHierarchy(symbols: SymbolInfo[], rootNode: SyntaxNode): void {
    // 根据节点位置关系建立父子层级
    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const parent = symbols[i];
        const child = symbols[j];
        
        if (this.isChildOf(child.location, parent.location)) {
          parent.children.push(child.id);
          child.parent = parent.id;
        }
      }
    }
  }

  private isChildOf(child: SourceLocation, parent: SourceLocation): boolean {
    return child.file === parent.file &&
           child.start.row >= parent.start.row &&
           child.end.row <= parent.end.row;
  }
}
```

### 3.4 类型信息增强（TypeScript Compiler）

```typescript
class TypeInfoEnricher {
  private program: ts.Program;
  private typeChecker: ts.TypeChecker;

  constructor(tsConfigPath: string) {
    const config = this.loadTsConfig(tsConfigPath);
    this.program = ts.createProgram(
      config.fileNames,
      config.options
    );
    this.typeChecker = this.program.getTypeChecker();
  }

  enrichSymbol(symbol: SymbolInfo): SymbolInfo {
    const sourceFile = this.program.getSourceFile(symbol.location.file);
    if (!sourceFile) return symbol;

    // 找到对应的AST节点
    const node = this.findNodeAtPosition(
      sourceFile, 
      symbol.location.start.row,
      symbol.location.start.column
    );

    if (!node) return symbol;

    // 获取类型信息
    const type = this.typeChecker.getTypeAtLocation(node);
    const symbol_ts = this.typeChecker.getSymbolAtLocation(node);

    symbol.typeInfo = {
      typeString: this.typeChecker.typeToString(type),
      flags: type.flags,
      isGeneric: this.isGenericType(type),
      typeParameters: this.extractTypeParameters(type),
    };

    // 提取文档注释
    if (symbol_ts) {
      symbol.documentation = ts.displayPartsToString(
        symbol_ts.getDocumentationComment(this.typeChecker)
      );
    }

    return symbol;
  }

  private isGenericType(type: ts.Type): boolean {
    return !!(type.flags & ts.TypeFlags.Object) && 
           !!(type as ts.ObjectType).typeParameters;
  }

  private extractTypeParameters(type: ts.Type): TypeParameterInfo[] {
    const objectType = type as ts.ObjectType;
    if (!objectType.typeParameters) return [];

    return objectType.typeParameters.map((param, index) => ({
      name: param.symbol?.name || `T${index}`,
      constraint: param.constraint 
        ? this.typeChecker.typeToString(param.constraint)
        : undefined,
      default: param.default
        ? this.typeChecker.typeToString(param.default)
        : undefined,
    }));
  }

  private findNodeAtPosition(
    sourceFile: ts.SourceFile,
    line: number,
    column: number
  ): ts.Node | undefined {
    const position = ts.getPositionOfLineAndCharacter(
      sourceFile, 
      line, 
      column
    );

    function find(node: ts.Node): ts.Node | undefined {
      if (node.pos <= position && node.end >= position) {
        return ts.forEachChild(node, find) || node;
      }
      return undefined;
    }

    return find(sourceFile);
  }
}
```

### 3.5 泛型处理策略

```typescript
class GenericTypeResolver {
  constructor(private typeChecker: ts.TypeChecker) {}

  // 解析泛型类型定义
  resolveGenericType(node: ts.Node): GenericTypeInfo | null {
    if (!ts.isClassDeclaration(node) && 
        !ts.isInterfaceDeclaration(node) &&
        !ts.isTypeAliasDeclaration(node)) {
      return null;
    }

    const typeParameters = node.typeParameters;
    if (!typeParameters || typeParameters.length === 0) {
      return null;
    }

    return {
      parameters: typeParameters.map(param => ({
        name: param.name.text,
        constraint: param.constraint 
          ? this.typeChecker.typeToString(
              this.typeChecker.getTypeAtLocation(param.constraint)
            )
          : undefined,
        default: param.default
          ? this.typeChecker.typeToString(
              this.typeChecker.getTypeAtLocation(param.default)
            )
          : undefined,
      })),
      constraints: this.extractConstraints(typeParameters),
    };
  }

  // 解析泛型实例化
  resolveGenericInstantiation(
    node: ts.Node
  ): GenericInstantiationInfo | null {
    if (!ts.isTypeReferenceNode(node)) return null;

    const type = this.typeChecker.getTypeAtLocation(node);
    const typeArguments = node.typeArguments;

    if (!typeArguments || typeArguments.length === 0) return null;

    return {
      baseType: node.typeName.getText(),
      typeArguments: typeArguments.map(arg => ({
        text: arg.getText(),
        resolvedType: this.typeChecker.typeToString(
          this.typeChecker.getTypeAtLocation(arg)
        ),
      })),
    };
  }

  private extractConstraints(
    typeParameters: ts.NodeArray<ts.TypeParameterDeclaration>
  ): Record<string, string> {
    const constraints: Record<string, string> = {};
    
    for (const param of typeParameters) {
      if (param.constraint) {
        constraints[param.name.text] = this.typeChecker.typeToString(
          this.typeChecker.getTypeAtLocation(param.constraint)
        );
      }
    }
    
    return constraints;
  }
}
```

---

## 4. 依赖分析方案

### 4.1 模块依赖图

```typescript
interface ModuleDependencyGraph {
  // 模块节点
  modules: Map<string, ModuleNode>;
  
  // 依赖边
  edges: DependencyEdge[];
  
  // 循环依赖检测
  cycles: string[][];
}

interface ModuleNode {
  id: string;                    // 模块ID（文件路径）
  path: string;                  // 绝对路径
  exports: ExportInfo[];         // 导出项
  imports: ImportInfo[];         // 导入项
  
  // 统计信息
  stats: {
    totalLines: number;
    codeLines: number;
    dependencyCount: number;
    dependentCount: number;
  };
}

interface ImportInfo {
  source: string;                // 导入源
  sourceType: 'relative' | 'absolute' | 'builtin' | 'external';
  specifiers: ImportSpecifier[]; // 导入的符号
  isTypeOnly: boolean;           // 是否仅类型导入
}

interface ExportInfo {
  name: string;
  kind: SymbolKind;
  isDefault: boolean;
  isReExport: boolean;
  originalSource?: string;       // 重导出的源
}
```

### 4.2 依赖分析实现

```typescript
class DependencyAnalyzer {
  private moduleGraph: ModuleDependencyGraph;
  private resolver: ModuleResolver;

  constructor(private program: ts.Program) {
    this.moduleGraph = {
      modules: new Map(),
      edges: [],
      cycles: [],
    };
    this.resolver = new ModuleResolver(program);
  }

  analyzeProject(entryFiles: string[]): ModuleDependencyGraph {
    const visited = new Set<string>();
    const queue = [...entryFiles];

    while (queue.length > 0) {
      const filePath = queue.shift()!;
      if (visited.has(filePath)) continue;
      
      visited.add(filePath);
      const moduleNode = this.analyzeModule(filePath);
      
      this.moduleGraph.modules.set(filePath, moduleNode);

      // 递归分析依赖
      for (const imp of moduleNode.imports) {
        const resolvedPath = this.resolver.resolve(imp.source, filePath);
        if (resolvedPath && !visited.has(resolvedPath)) {
          queue.push(resolvedPath);
        }
      }
    }

    // 构建依赖边
    this.buildEdges();
    
    // 检测循环依赖
    this.detectCycles();

    return this.moduleGraph;
  }

  private analyzeModule(filePath: string): ModuleNode {
    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) {
      throw new Error(`Cannot find source file: ${filePath}`);
    }

    const imports: ImportInfo[] = [];
    const exports: ExportInfo[] = [];

    ts.forEachChild(sourceFile, (node) => {
      if (ts.isImportDeclaration(node)) {
        imports.push(this.parseImport(node, filePath));
      } else if (ts.isExportDeclaration(node)) {
        exports.push(...this.parseExport(node));
      } else if (this.isExportable(node)) {
        exports.push(this.parseLocalExport(node));
      }
    });

    return {
      id: filePath,
      path: filePath,
      exports,
      imports,
      stats: this.calculateStats(sourceFile),
    };
  }

  private parseImport(
    node: ts.ImportDeclaration, 
    containingFile: string
  ): ImportInfo {
    const source = (node.moduleSpecifier as ts.StringLiteral).text;
    const sourceType = this.classifySource(source);
    
    const specifiers: ImportSpecifier[] = [];
    
    if (node.importClause) {
      // 默认导入
      if (node.importClause.name) {
        specifiers.push({
          name: 'default',
          localName: node.importClause.name.text,
        });
      }
      
      // 命名导入
      if (node.importClause.namedBindings) {
        if (ts.isNamedImports(node.importClause.namedBindings)) {
          for (const element of node.importClause.namedBindings.elements) {
            specifiers.push({
              name: element.propertyName?.text || element.name.text,
              localName: element.name.text,
              isType: element.isTypeOnly,
            });
          }
        } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
          specifiers.push({
            name: '*',
            localName: node.importClause.namedBindings.name.text,
          });
        }
      }
    }

    return {
      source,
      sourceType,
      specifiers,
      isTypeOnly: node.importClause?.isTypeOnly || false,
    };
  }

  private classifySource(source: string): ImportInfo['sourceType'] {
    if (source.startsWith('.')) return 'relative';
    if (source.startsWith('/')) return 'absolute';
    if (this.isBuiltinModule(source)) return 'builtin';
    return 'external';
  }

  private isBuiltinModule(source: string): boolean {
    const builtins = [
      'fs', 'path', 'http', 'https', 'url', 'querystring',
      'crypto', 'os', 'util', 'stream', 'events', 'child_process',
    ];
    return builtins.includes(source.split('/')[0]);
  }

  private buildEdges(): void {
    for (const [moduleId, moduleNode] of this.moduleGraph.modules) {
      for (const imp of moduleNode.imports) {
        const resolvedPath = this.resolver.resolve(imp.source, moduleId);
        if (resolvedPath && this.moduleGraph.modules.has(resolvedPath)) {
          this.moduleGraph.edges.push({
            from: moduleId,
            to: resolvedPath,
            type: imp.isTypeOnly ? 'type' : 'value',
            symbols: imp.specifiers.map(s => s.name),
          });
        }
      }
    }
  }

  // 检测循环依赖（Tarjan算法）
  private detectCycles(): void {
    const cycles: string[][] = [];
    const index = new Map<string, number>();
    const lowlink = new Map<string, number>();
    const onStack = new Set<string>();
    const stack: string[] = [];
    let currentIndex = 0;

    const strongconnect = (moduleId: string): void => {
      index.set(moduleId, currentIndex);
      lowlink.set(moduleId, currentIndex);
      currentIndex++;
      stack.push(moduleId);
      onStack.add(moduleId);

      // 获取相邻节点
      const neighbors = this.moduleGraph.edges
        .filter(e => e.from === moduleId)
        .map(e => e.to);

      for (const neighbor of neighbors) {
        if (!index.has(neighbor)) {
          strongconnect(neighbor);
          lowlink.set(
            moduleId, 
            Math.min(lowlink.get(moduleId)!, lowlink.get(neighbor)!)
          );
        } else if (onStack.has(neighbor)) {
          lowlink.set(
            moduleId,
            Math.min(lowlink.get(moduleId)!, index.get(neighbor)!)
          );
        }
      }

      if (lowlink.get(moduleId) === index.get(moduleId)) {
        const cycle: string[] = [];
        let w: string;
        do {
          w = stack.pop()!;
          onStack.delete(w);
          cycle.push(w);
        } while (w !== moduleId);
        
        if (cycle.length > 1) {
          cycles.push(cycle);
        }
      }
    };

    for (const moduleId of this.moduleGraph.modules.keys()) {
      if (!index.has(moduleId)) {
        strongconnect(moduleId);
      }
    }

    this.moduleGraph.cycles = cycles;
  }
}
```

### 4.3 调用关系图

```typescript
interface CallGraph {
  nodes: Map<string, CallGraphNode>;
  edges: CallGraphEdge[];
}

interface CallGraphNode {
  id: string;
  symbolId: string;
  name: string;
  kind: 'function' | 'method' | 'constructor';
  location: SourceLocation;
}

interface CallGraphEdge {
  caller: string;      // 调用者ID
  callee: string;      // 被调用者ID
  callSite: SourceLocation;
  isDynamic: boolean;  // 是否动态调用
}

class CallGraphBuilder {
  private callGraph: CallGraph;
  private typeChecker: ts.TypeChecker;

  constructor(program: ts.Program) {
    this.callGraph = {
      nodes: new Map(),
      edges: [],
    };
    this.typeChecker = program.getTypeChecker();
  }

  buildForFile(sourceFile: ts.SourceFile): void {
    const visit = (node: ts.Node): void => {
      // 检测函数调用
      if (ts.isCallExpression(node)) {
        this.processCallExpression(node, sourceFile);
      }
      
      // 检测方法调用
      if (ts.isPropertyAccessExpression(node) && 
          ts.isCallExpression(node.parent)) {
        this.processMethodCall(node, sourceFile);
      }

      // 检测 new 表达式
      if (ts.isNewExpression(node)) {
        this.processNewExpression(node, sourceFile);
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  private processCallExpression(
    node: ts.CallExpression, 
    sourceFile: ts.SourceFile
  ): void {
    const caller = this.findEnclosingFunction(node);
    const callee = this.resolveCallee(node.expression);

    if (caller && callee) {
      this.callGraph.edges.push({
        caller: caller.id,
        callee: callee.id,
        callSite: this.getLocation(node, sourceFile),
        isDynamic: this.isDynamicCall(node),
      });
    }
  }

  private resolveCallee(expression: ts.Expression): CallGraphNode | null {
    const symbol = this.typeChecker.getSymbolAtLocation(expression);
    if (!symbol) return null;

    const declarations = symbol.getDeclarations();
    if (!declarations || declarations.length === 0) return null;

    const decl = declarations[0];
    const id = this.getNodeId(decl);

    if (!this.callGraph.nodes.has(id)) {
      this.callGraph.nodes.set(id, {
        id,
        symbolId: symbol.getName(),
        name: symbol.getName(),
        kind: this.getFunctionKind(decl),
        location: this.getLocation(decl, decl.getSourceFile()),
      });
    }

    return this.callGraph.nodes.get(id)!;
  }

  private isDynamicCall(node: ts.CallExpression): boolean {
    // 检测动态调用（如：fn[dynamicKey]() 或 eval()）
    if (ts.isElementAccessExpression(node.expression)) {
      return true;
    }
    
    const callee = node.expression.getText();
    return ['eval', 'setTimeout', 'setInterval'].includes(callee);
  }

  private findEnclosingFunction(node: ts.Node): CallGraphNode | null {
    let current: ts.Node | undefined = node;
    
    while (current) {
      if (ts.isFunctionDeclaration(current) ||
          ts.isMethodDeclaration(current) ||
          ts.isConstructorDeclaration(current) ||
          ts.isArrowFunction(current) ||
          ts.isFunctionExpression(current)) {
        
        const id = this.getNodeId(current);
        return this.callGraph.nodes.get(id) || null;
      }
      current = current.parent;
    }
    
    return null;
  }

  private getNodeId(node: ts.Node): string {
    const sourceFile = node.getSourceFile();
    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    return `${sourceFile.fileName}:${pos.line}:${pos.character}`;
  }

  private getLocation(node: ts.Node, sourceFile: ts.SourceFile): SourceLocation {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    
    return {
      file: sourceFile.fileName,
      start,
      end,
    };
  }

  private getFunctionKind(node: ts.Node): CallGraphNode['kind'] {
    if (ts.isConstructorDeclaration(node)) return 'constructor';
    if (ts.isMethodDeclaration(node)) return 'method';
    return 'function';
  }
}
```

---

## 5. 性能优化建议

### 5.1 缓存策略

```typescript
interface CacheManager {
  // AST缓存
  astCache: LRUCache<string, Parser.Tree>;
  
  // 符号索引缓存
  symbolIndexCache: LRUCache<string, SymbolInfo[]>;
  
  // 类型信息缓存
  typeInfoCache: LRUCache<string, TypeInfo>;
  
  // 依赖图缓存
  dependencyGraphCache: LRUCache<string, ModuleDependencyGraph>;
  
  // 文件哈希缓存（用于变更检测）
  fileHashCache: Map<string, string>;
}

class OptimizedCacheManager implements CacheManager {
  astCache = new LRUCache<string, Parser.Tree>({ max: 100 });
  symbolIndexCache = new LRUCache<string, SymbolInfo[]>({ max: 200 });
  typeInfoCache = new LRUCache<string, TypeInfo>({ max: 500 });
  dependencyGraphCache = new LRUCache<string, ModuleDependencyGraph>({ max: 10 });
  fileHashCache = new Map<string, string>();

  // 文件变更检测
  async detectChanges(filePath: string): Promise<boolean> {
    const currentHash = await this.computeFileHash(filePath);
    const cachedHash = this.fileHashCache.get(filePath);
    
    if (cachedHash !== currentHash) {
      this.fileHashCache.set(filePath, currentHash);
      this.invalidateFileCache(filePath);
      return true;
    }
    
    return false;
  }

  private invalidateFileCache(filePath: string): void {
    this.astCache.delete(filePath);
    this.symbolIndexCache.delete(filePath);
    // 类型缓存可能需要级联清除
    this.invalidateDependentCaches(filePath);
  }

  private invalidateDependentCaches(changedFile: string): void {
    // 获取依赖此文件的其他文件
    const dependents = this.getDependents(changedFile);
    
    for (const dep of dependents) {
      this.symbolIndexCache.delete(dep);
      this.typeInfoCache.delete(dep);
    }
    
    // 清除依赖图缓存（因为结构可能变化）
    this.dependencyGraphCache.clear();
  }

  private async computeFileHash(filePath: string): Promise<string> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  private getDependents(filePath: string): string[] {
    // 从依赖图中获取反向依赖
    const graph = this.dependencyGraphCache.values().next().value;
    if (!graph) return [];

    return graph.edges
      .filter(e => e.to === filePath)
      .map(e => e.from);
  }
}
```

### 5.2 增量更新实现

```typescript
class IncrementalParser {
  private parser: Parser;
  private treeCache: Map<string, Parser.Tree>;
  private editHistory: Map<string, Edit[]>;

  constructor() {
    this.parser = new Parser();
    this.parser.setLanguage(TypeScript);
    this.treeCache = new Map();
    this.editHistory = new Map();
  }

  // 增量解析
  parseIncremental(
    filePath: string, 
    newContent: string, 
    edits: TextEdit[]
  ): Parser.Tree {
    const oldTree = this.treeCache.get(filePath);
    
    if (!oldTree) {
      // 首次解析
      const tree = this.parser.parse(newContent);
      this.treeCache.set(filePath, tree);
      return tree;
    }

    // 应用编辑到旧树
    for (const edit of edits) {
      oldTree.edit({
        startIndex: edit.startIndex,
        oldEndIndex: edit.oldEndIndex,
        newEndIndex: edit.newEndIndex,
        startPosition: edit.startPosition,
        oldEndPosition: edit.oldEndPosition,
        newEndPosition: edit.newEndPosition,
      });
    }

    // 增量解析
    const newTree = this.parser.parse(newContent, oldTree);
    
    // 获取变更的节点
    const changes = this.getChangedNodes(oldTree, newTree);
    
    // 更新缓存
    oldTree.delete();
    this.treeCache.set(filePath, newTree);
    
    return newTree;
  }

  private getChangedNodes(
    oldTree: Parser.Tree, 
    newTree: Parser.Tree
  ): ChangedNode[] {
    const changes: ChangedNode[] = [];
    const oldCursor = oldTree.walk();
    const newCursor = newTree.walk();

    const compareNodes = (
      oldNode: Parser.SyntaxNode,
      newNode: Parser.SyntaxNode
    ): void => {
      if (oldNode.type !== newNode.type ||
          oldNode.text !== newNode.text) {
        changes.push({
          oldNode,
          newNode,
          type: this.classifyChange(oldNode, newNode),
        });
      }

      // 递归比较子节点
      const oldChildren = oldNode.children;
      const newChildren = newNode.children;
      const maxLen = Math.max(oldChildren.length, newChildren.length);

      for (let i = 0; i < maxLen; i++) {
        if (i < oldChildren.length && i < newChildren.length) {
          compareNodes(oldChildren[i], newChildren[i]);
        } else if (i < newChildren.length) {
          changes.push({
            oldNode: null,
            newNode: newChildren[i],
            type: 'added',
          });
        } else {
          changes.push({
            oldNode: oldChildren[i],
            newNode: null,
            type: 'removed',
          });
        }
      }
    };

    compareNodes(oldTree.rootNode, newTree.rootNode);
    return changes;
  }

  private classifyChange(
    oldNode: Parser.SyntaxNode | null,
    newNode: Parser.SyntaxNode | null
  ): ChangeType {
    if (!oldNode) return 'added';
    if (!newNode) return 'removed';
    if (oldNode.type !== newNode.type) return 'type_changed';
    return 'modified';
  }
}
```

### 5.3 大项目处理技巧

```typescript
class LargeProjectOptimizer {
  private workerPool: WorkerPool;
  private batchSize: number;

  constructor(private maxWorkers: number = 4) {
    this.workerPool = new WorkerPool(maxWorkers);
    this.batchSize = 50; // 每批处理的文件数
  }

  // 并行处理大项目
  async analyzeProjectParallel(
    filePaths: string[],
    progressCallback?: (progress: number) => void
  ): Promise<AnalysisResult> {
    const batches = this.createBatches(filePaths, this.batchSize);
    const results: AnalysisResult[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      // 并行处理批次
      const batchResults = await Promise.all(
        batch.map(filePath => 
          this.workerPool.execute('analyzeFile', filePath)
        )
      );
      
      results.push(...batchResults);
      
      if (progressCallback) {
        progressCallback((i + 1) / batches.length);
      }
    }

    // 合并结果
    return this.mergeResults(results);
  }

  // 延迟加载策略
  async lazyLoadAnalysis(
    entryFiles: string[],
    onDemandFiles: string[]
  ): Promise<LazyAnalysisResult> {
    // 首先分析入口文件
    const entryResult = await this.analyzeFiles(entryFiles);
    
    // 构建依赖图但不深入分析
    const dependencyGraph = this.buildShallowGraph(entryResult);
    
    return {
      analyzed: entryResult,
      dependencyGraph,
      
      // 提供按需分析方法
      analyzeOnDemand: async (filePath: string) => {
        if (!onDemandFiles.includes(filePath)) {
          throw new Error(`File not in on-demand list: ${filePath}`);
        }
        return this.analyzeFile(filePath);
      },
    };
  }

  // 内存优化：流式处理
  async streamAnalyze(
    filePaths: string[],
    processor: (result: FileAnalysis) => Promise<void>
  ): Promise<void> {
    for (const filePath of filePaths) {
      // 处理单个文件后立即释放内存
      const result = await this.analyzeFile(filePath);
      await processor(result);
      
      // 主动触发GC提示
      if (global.gc) {
        global.gc();
      }
    }
  }

  // 智能预加载
  async preloadHotFiles(
    dependencyGraph: ModuleDependencyGraph,
    openFiles: string[]
  ): Promise<void> {
    // 分析打开文件的依赖关系
    const relatedFiles = new Set<string>();
    
    for (const openFile of openFiles) {
      // 添加直接依赖
      const directDeps = dependencyGraph.edges
        .filter(e => e.from === openFile)
        .map(e => e.to);
      directDeps.forEach(f => relatedFiles.add(f));
      
      // 添加反向依赖
      const reverseDeps = dependencyGraph.edges
        .filter(e => e.to === openFile)
        .map(e => e.from);
      reverseDeps.forEach(f => relatedFiles.add(f));
    }

    // 预加载相关文件
    const preloadPromises = Array.from(relatedFiles)
      .slice(0, 20) // 限制预加载数量
      .map(filePath => this.preloadFile(filePath));
    
    await Promise.all(preloadPromises);
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async preloadFile(filePath: string): Promise<void> {
    // 预解析但不存储完整结果
    const tree = await this.parseFile(filePath);
    // 只缓存AST，不提取符号
    cacheManager.astCache.set(filePath, tree);
  }
}
```

### 5.4 性能基准

```typescript
interface PerformanceBenchmark {
  // 解析性能指标
  parsing: {
    smallFile: number;      // < 100 lines (ms)
    mediumFile: number;     // 100-1000 lines (ms)
    largeFile: number;      // > 1000 lines (ms)
  };
  
  // 内存使用指标
  memory: {
    astPerFile: number;     // KB per file
    symbolIndexPerFile: number; // KB per file
    typeInfoPerFile: number;    // KB per file
  };
  
  // 增量更新性能
  incremental: {
    smallChange: number;    // ms
    mediumChange: number;   // ms
    largeChange: number;    // ms
  };
}

// 预期性能指标
const targetBenchmark: PerformanceBenchmark = {
  parsing: {
    smallFile: 10,      // 10ms
    mediumFile: 50,     // 50ms
    largeFile: 200,     // 200ms
  },
  memory: {
    astPerFile: 50,         // 50KB
    symbolIndexPerFile: 20, // 20KB
    typeInfoPerFile: 30,    // 30KB
  },
  incremental: {
    smallChange: 5,     // 5ms
    mediumChange: 20,   // 20ms
    largeChange: 100,   // 100ms
  },
};
```

---

## 6. 代码示例：完整解析流程

```typescript
// 主解析器类
class CodeMapTypeScriptParser {
  private syntaxExtractor: SyntaxSymbolExtractor;
  private typeEnricher: TypeInfoEnricher;
  private dependencyAnalyzer: DependencyAnalyzer;
  private callGraphBuilder: CallGraphBuilder;
  private cacheManager: OptimizedCacheManager;
  private incrementalParser: IncrementalParser;

  constructor(config: ParserConfig) {
    this.syntaxExtractor = new SyntaxSymbolExtractor();
    this.cacheManager = new OptimizedCacheManager();
    this.incrementalParser = new IncrementalParser();
    
    // 延迟初始化需要tsconfig的组件
    if (config.tsConfigPath) {
      const program = this.createProgram(config.tsConfigPath);
      this.typeEnricher = new TypeInfoEnricher(program);
      this.dependencyAnalyzer = new DependencyAnalyzer(program);
      this.callGraphBuilder = new CallGraphBuilder(program);
    }
  }

  // 完整解析流程
  async parseProject(projectPath: string): Promise<CodeMapProject> {
    const startTime = Date.now();
    
    // 1. 发现所有TypeScript文件
    const files = await this.discoverFiles(projectPath);
    console.log(`Discovered ${files.length} TypeScript files`);

    // 2. 并行语法解析
    const syntaxResults = await this.parseSyntaxParallel(files);
    console.log(`Syntax parsing completed in ${Date.now() - startTime}ms`);

    // 3. 类型信息增强（如果可用）
    if (this.typeEnricher) {
      await this.enrichTypeInfo(syntaxResults);
    }

    // 4. 构建依赖图
    const dependencyGraph = this.dependencyAnalyzer.analyzeProject(files);
    console.log(`Dependency analysis completed`);

    // 5. 构建调用关系图
    const callGraph = await this.buildCallGraph(files);
    console.log(`Call graph built`);

    // 6. 检测循环依赖
    if (dependencyGraph.cycles.length > 0) {
      console.warn(`Found ${dependencyGraph.cycles.length} circular dependencies`);
    }

    return {
      files: syntaxResults,
      dependencyGraph,
      callGraph,
      symbols: this.buildSymbolIndex(syntaxResults),
      stats: {
        totalFiles: files.length,
        totalSymbols: syntaxResults.reduce((sum, f) => sum + f.symbols.length, 0),
        circularDependencies: dependencyGraph.cycles.length,
        analysisTime: Date.now() - startTime,
      },
    };
  }

  // 增量更新
  async updateIncremental(
    filePath: string,
    newContent: string,
    edits: TextEdit[]
  ): Promise<FileUpdateResult> {
    const startTime = Date.now();

    // 1. 增量解析
    const newTree = this.incrementalParser.parseIncremental(
      filePath, 
      newContent, 
      edits
    );

    // 2. 提取变更的符号
    const changedSymbols = this.extractChangedSymbols(filePath, newTree);

    // 3. 更新符号索引
    await this.updateSymbolIndex(filePath, changedSymbols);

    // 4. 更新依赖图（如果导入/导出变化）
    if (this.hasImportExportChanges(changedSymbols)) {
      await this.updateDependencyGraph(filePath);
    }

    // 5. 使相关缓存失效
    this.cacheManager.invalidateFileCache(filePath);

    return {
      filePath,
      changedSymbols,
      updateTime: Date.now() - startTime,
    };
  }

  // 查询符号
  async querySymbols(query: SymbolQuery): Promise<SymbolInfo[]> {
    const index = await this.getSymbolIndex();
    
    return index.filter(symbol => {
      // 按名称匹配
      if (query.name && !symbol.name.includes(query.name)) {
        return false;
      }
      
      // 按类型过滤
      if (query.kinds && !query.kinds.includes(symbol.kind)) {
        return false;
      }
      
      // 按文件过滤
      if (query.file && symbol.location.file !== query.file) {
        return false;
      }
      
      // 按修饰符过滤
      if (query.modifiers) {
        for (const mod of query.modifiers) {
          if (!symbol.modifiers.includes(mod)) {
            return false;
          }
        }
      }
      
      return true;
    });
  }

  // 获取符号定义
  async getSymbolDefinition(symbolId: string): Promise<SymbolDefinition | null> {
    const symbol = await this.findSymbol(symbolId);
    if (!symbol) return null;

    return {
      symbol,
      references: await this.findReferences(symbolId),
      implementations: await this.findImplementations(symbolId),
      typeHierarchy: await this.getTypeHierarchy(symbol),
    };
  }

  // 获取文件依赖关系
  async getFileDependencies(filePath: string): Promise<FileDependencies> {
    const graph = this.dependencyAnalyzer.getGraph();
    
    return {
      imports: graph.edges
        .filter(e => e.from === filePath)
        .map(e => ({
          file: e.to,
          symbols: e.symbols,
        })),
      exports: graph.edges
        .filter(e => e.to === filePath)
        .map(e => ({
          file: e.from,
          symbols: e.symbols,
        })),
    };
  }

  // 私有辅助方法
  private async discoverFiles(projectPath: string): Promise<string[]> {
    const glob = require('glob');
    return glob.sync('**/*.ts', {
      cwd: projectPath,
      ignore: ['**/node_modules/**', '**/*.d.ts'],
    }).map((f: string) => path.join(projectPath, f));
  }

  private async parseSyntaxParallel(files: string[]): Promise<FileSyntaxResult[]> {
    const optimizer = new LargeProjectOptimizer();
    return optimizer.analyzeProjectParallel(files);
  }

  private async enrichTypeInfo(results: FileSyntaxResult[]): Promise<void> {
    for (const result of results) {
      for (const symbol of result.symbols) {
        this.typeEnricher.enrichSymbol(symbol);
      }
    }
  }

  private buildSymbolIndex(results: FileSyntaxResult[]): SymbolIndex {
    const index = new Map<string, SymbolInfo>();
    
    for (const result of results) {
      for (const symbol of result.symbols) {
        index.set(symbol.id, symbol);
      }
    }
    
    return index;
  }

  private createProgram(tsConfigPath: string): ts.Program {
    const config = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(
      config.config,
      ts.sys,
      path.dirname(tsConfigPath)
    );
    
    return ts.createProgram(
      parsed.fileNames,
      parsed.options
    );
  }
}
```

---

## 7. 总结

### 推荐架构

| 层级 | 技术 | 职责 |
|------|------|------|
| L1 | Tree-sitter | 快速语法解析、增量更新 |
| L2 | TypeScript Compiler API | 类型信息、语义分析 |
| L3 | 自定义缓存层 | 性能优化、状态管理 |

### 关键决策

1. **使用 Tree-sitter 作为主要解析器**：提供快速响应和增量更新能力
2. **TypeScript Compiler API 补充类型信息**：按需加载，避免性能瓶颈
3. **分层缓存策略**：AST、符号、类型信息独立缓存
4. **并行处理大项目**：Worker Pool 加速批量分析
5. **智能增量更新**：只处理变更部分，保持系统响应

### 预期性能

- 小型项目（< 100文件）：< 2秒完整分析
- 中型项目（100-1000文件）：< 10秒完整分析
- 大型项目（> 1000文件）：< 30秒完整分析 + 按需加载
- 增量更新：< 100ms
