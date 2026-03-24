# CodeMap MVP3 架构重构技术需求文档 (Tech-PRD)

> **版本**: v1.0.0  
> **状态**: Draft  
> **日期**: 2026-03-17  
> **负责人**: Architecture Team

---

## 1. 技术目标

### 1.1 核心架构原则

```
┌─────────────────────────────────────────────────────────────────┐
│                    架构设计原则                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 依赖方向: Interface → Infrastructure → Domain → Server → CLI│
│     (外层依赖内层，内层不依赖外层)                                │
│                                                                 │
│  2. 接口隔离: 每层通过明确定义的接口与其他层交互                   │
│                                                                 │
│  3. 依赖注入: 通过构造函数注入依赖，便于测试和替换                 │
│                                                                 │
│  4. 单一职责: 每个模块只有一个变化理由                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构重构

```
src/
├── interface/                    # Layer 1: 接口层
│   ├── types/
│   │   ├── index.ts             # 核心类型定义
│   │   ├── storage.ts           # 存储接口
│   │   ├── parser.ts            # 解析器接口
│   │   └── analyzer.ts          # 分析器接口
│   └── config/
│       └── index.ts             # 配置类型
│
├── infrastructure/               # Layer 2: 基础设施层
│   ├── storage/                 # 存储实现
│   │   ├── interfaces/
│   │   │   └── IStorage.ts
│   │   ├── implementations/
│   │   │   ├── FileSystemStorage.ts
│   │   │   ├── KuzuDBStorage.ts
│   │   │   └── MemoryStorage.ts
│   │   ├── StorageFactory.ts
│   │   └── index.ts
│   │
│   ├── parser/                  # 解析器实现
│   │   ├── interfaces/
│   │   │   └── ILanguageParser.ts
│   │   ├── implementations/
│   │   │   ├── typescript/
│   │   │   ├── python/
│   │   │   ├── java/
│   │   │   ├── rust/
│   │   │   ├── cpp/
│   │   │   └── ... (其他语言)
│   │   ├── ParserRegistry.ts
│   │   └── index.ts
│   │
│   ├── cache/                   # 缓存系统
│   ├── file-system/            # 文件系统抽象
│   └── logger/                 # 日志系统
│
├── domain/                       # Layer 3: 领域层
│   ├── entities/               # 领域实体
│   │   ├── Project.ts
│   │   ├── Module.ts
│   │   ├── Symbol.ts
│   │   ├── Dependency.ts
│   │   └── CodeGraph.ts
│   │
│   ├── services/               # 领域服务
│   │   ├── AnalysisService.ts
│   │   ├── DependencyService.ts
│   │   ├── SymbolIndexService.ts
│   │   └── ComplexityService.ts
│   │
│   ├── value-objects/          # 值对象
│   │   ├── FilePath.ts
│   │   ├── Position.ts
│   │   └── Range.ts
│   │
│   └── repositories/           # 仓储接口
│       └── ICodeGraphRepository.ts
│
├── server/                       # Layer 4: 服务层 ⭐ 新增
│   ├── usecases/               # 用例
│   │   ├── GenerateCodeMap.ts
│   │   ├── QuerySymbol.ts
│   │   ├── AnalyzeImpact.ts
│   │   ├── DetectCycles.ts
│   │   ├── StartWorkflow.ts
│   │   └── ...
│   │
│   ├── dto/                    # 数据传输对象
│   │   ├── GenerateRequest.ts
│   │   ├── GenerateResponse.ts
│   │   └── QueryRequest.ts
│   │
│   ├── mappers/                # 对象映射
│   │   ├── ModuleMapper.ts
│   │   └── SymbolMapper.ts
│   │
│   └── services/               # 应用服务
│       ├── CodeMapService.ts
│       ├── QueryService.ts
│       └── WorkflowService.ts
│
└── cli/                          # Layer 5: CLI 层
    ├── commands/               # 命令实现
    ├── visualizers/            # CLI 可视化
    │   ├── TreeVisualizer.ts
    │   ├── GraphVisualizer.ts
    │   └── HeatmapVisualizer.ts
    ├── formatters/             # 输出格式化
    └── index.ts                # 入口
```

---

## 2. 核心接口设计

### 2.1 存储抽象接口

```typescript
// src/infrastructure/storage/interfaces/IStorage.ts

/**
 * 存储抽象接口
 * 定义所有存储后端必须实现的能力
 */
export interface IStorage {
  /** 存储类型标识 */
  readonly type: StorageType;
  
  /** 初始化存储 */
  initialize(projectPath: string): Promise<void>;
  
  /** 关闭存储连接 */
  close(): Promise<void>;
  
  // ========== 项目级别操作 ==========
  
  /** 保存完整代码图 */
  saveCodeGraph(graph: CodeGraph): Promise<void>;
  
  /** 加载完整代码图 */
  loadCodeGraph(): Promise<CodeGraph>;
  
  /** 删除项目数据 */
  deleteProject(): Promise<void>;
  
  // ========== 增量更新 ==========
  
  /** 更新单个模块 */
  updateModule(module: Module): Promise<void>;
  
  /** 删除模块 */
  deleteModule(moduleId: string): Promise<void>;
  
  // ========== 查询操作 ==========
  
  /** 查询模块 */
  findModuleById(id: string): Promise<Module | null>;
  findModulesByPath(path: string): Promise<Module[]>;
  
  /** 查询符号 */
  findSymbolByName(name: string): Promise<Symbol[]>;
  findSymbolById(id: string): Promise<Symbol | null>;
  
  /** 查询依赖 */
  findDependencies(moduleId: string): Promise<Dependency[]>;
  findDependents(moduleId: string): Promise<Dependency[]>;
  
  /** 查询调用关系 */
  findCallers(functionId: string): Promise<Symbol[]>;
  findCallees(functionId: string): Promise<Symbol[]>;
  
  /** 模糊搜索 */
  search(query: string, options: SearchOptions): Promise<SearchResult[]>;
  
  // ========== 分析操作 ==========
  
  /** 检测循环依赖 */
  detectCycles(): Promise<Cycle[]>;
  
  /** 计算影响范围 */
  calculateImpact(moduleId: string, depth: number): Promise<ImpactResult>;
  
  /** 获取项目统计 */
  getStatistics(): Promise<ProjectStatistics>;
}

/** 存储类型 */
export type StorageType = 'filesystem' | 'kuzudb' | 'memory';

/** 搜索选项 */
export interface SearchOptions {
  type?: 'symbol' | 'module' | 'file';
  language?: string;
  limit?: number;
  offset?: number;
}

/** 存储配置 */
export interface StorageConfig {
  type: StorageType | 'auto';
  
  // FileSystem 配置
  outputPath?: string;
  
  // KùzuDB 配置
  databasePath?: string;
  
  // 自动选择配置
  autoThresholds?: {
    useGraphDBWhenFileCount: number;
    useGraphDBWhenNodeCount: number;
  };
}

/** 存储工厂 */
export interface IStorageFactory {
  create(config: StorageConfig): Promise<IStorage>;
  createForProject(projectPath: string, config: StorageConfig): Promise<IStorage>;
}
```

### 2.2 语言解析器接口

```typescript
// src/infrastructure/parser/interfaces/ILanguageParser.ts

import type { Module, Symbol, Dependency, ParseOptions } from '../../../interface/types/index.js';

/**
 * 语言解析器接口
 * 所有语言解析器必须实现此接口
 */
export interface ILanguageParser {
  /** 支持的语言标识 */
  readonly languageId: LanguageId;
  
  /** 支持的文件扩展名 */
  readonly fileExtensions: string[];
  
  /** 解析器名称 */
  readonly name: string;
  
  /** 初始化解析器 */
  initialize(): Promise<void>;
  
  /** 释放解析器资源 */
  dispose(): Promise<void>;
  
  /** 解析单个文件 */
  parseFile(filePath: string, content: string, options?: ParseOptions): Promise<ParseResult>;
  
  /** 批量解析文件 */
  parseFiles(files: Array<{ path: string; content: string }>, options?: ParseOptions): Promise<ParseResult[]>;
  
  /** 提取导入信息 */
  extractImports(content: string): Promise<ImportInfo[]>;
  
  /** 提取导出信息 */
  extractExports(content: string): Promise<ExportInfo[]>;
  
  /** 提取符号信息 */
  extractSymbols(content: string): Promise<SymbolInfo[]>;
  
  /** 构建调用图 */
  buildCallGraph(content: string): Promise<CallGraphInfo>;
  
  /** 计算复杂度 */
  calculateComplexity(content: string): Promise<ComplexityMetrics>;
  
  /** 检测语言特性支持 */
  supportsFeature(feature: LanguageFeature): boolean;
}

/** 支持的语言 */
export type LanguageId = 
  | 'typescript' | 'javascript' | 'go'      // Phase 1 (已支持)
  | 'python' | 'java' | 'rust' | 'cpp'      // Phase 2 (MVP3)
  | 'csharp' | 'ruby' | 'php'               // Phase 3
  | 'swift' | 'kotlin' | 'dart' | 'perl';   // Phase 3

/** 解析结果 */
export interface ParseResult {
  /** 文件路径 */
  filePath: string;
  
  /** 语言 */
  language: LanguageId;
  
  /** 模块信息 */
  module: Module;
  
  /** 符号列表 */
  symbols: Symbol[];
  
  /** 导入列表 */
  imports: Import[];
  
  /** 导出列表 */
  exports: Export[];
  
  /** 依赖列表 */
  dependencies: Dependency[];
  
  /** 调用图 */
  callGraph?: CallGraph;
  
  /** 复杂度指标 */
  complexity?: ComplexityMetrics;
  
  /** 解析耗时 (ms) */
  parseTime: number;
  
  /** 错误信息 */
  errors?: ParseError[];
}

/** 语言特性 */
export type LanguageFeature = 
  | 'type-inference'      // 类型推导
  | 'generic-types'       // 泛型
  | 'decorators'          // 装饰器
  | 'call-graph'          // 调用图
  | 'cross-file-analysis' // 跨文件分析
  | 'complexity-metrics'; // 复杂度指标

/** 解析器注册表 */
export interface IParserRegistry {
  /** 注册解析器 */
  register(parser: ILanguageParser): void;
  
  /** 获取解析器 */
  getParser(language: LanguageId): ILanguageParser | undefined;
  getParserByFile(filePath: string): ILanguageParser | undefined;
  
  /** 获取所有支持的扩展名 */
  getSupportedExtensions(): string[];
  
  /** 获取所有支持的语言 */
  getSupportedLanguages(): LanguageId[];
}
```

### 2.3 Server 层用例接口

```typescript
// src/server/usecases/IGenerateCodeMap.ts

import type { GenerateRequest, GenerateResponse } from '../dto/index.js';

/**
 * 生成代码图用例
 */
export interface IGenerateCodeMapUseCase {
  execute(request: GenerateRequest): Promise<GenerateResponse>;
}

// src/server/dto/GenerateRequest.ts
export interface GenerateRequest {
  /** 项目根目录 */
  projectPath: string;
  
  /** 包含模式 */
  include?: string[];
  
  /** 排除模式 */
  exclude?: string[];
  
  /** 分析模式 */
  mode: 'fast' | 'smart' | 'hybrid';
  
  /** 存储配置 */
  storage?: StorageConfig;
  
  /** 输出配置 */
  output?: {
    formats: ('aimap' | 'context' | 'json' | 'deps-graph')[];
    directory: string;
  };
  
  /** 是否启用进度回调 */
  enableProgress?: boolean;
  
  /** 进度回调 */
  onProgress?: (progress: ProgressInfo) => void;
}

// src/server/dto/GenerateResponse.ts
export interface GenerateResponse {
  /** 成功状态 */
  success: boolean;
  
  /** 代码图 */
  codeGraph: CodeGraph;
  
  /** 生成的文件路径 */
  generatedFiles: string[];
  
  /** 统计信息 */
  statistics: {
    totalFiles: number;
    parsedFiles: number;
    failedFiles: number;
    totalSymbols: number;
    totalDependencies: number;
    duration: number;
  };
  
  /** 警告信息 */
  warnings?: string[];
  
  /** 错误信息 */
  error?: string;
}

// 其他用例接口...
export interface IQuerySymbolUseCase {
  execute(request: QuerySymbolRequest): Promise<QuerySymbolResponse>;
}

export interface IAnalyzeImpactUseCase {
  execute(request: AnalyzeImpactRequest): Promise<AnalyzeImpactResponse>;
}

export interface IDetectCyclesUseCase {
  execute(request: DetectCyclesRequest): Promise<DetectCyclesResponse>;
}
```

---

## 3. 存储实现详解

### 3.1 文件系统存储 (默认)

```typescript
// src/infrastructure/storage/implementations/FileSystemStorage.ts

export class FileSystemStorage implements IStorage {
  readonly type = 'filesystem';
  private outputPath: string = '';
  private codeGraph: CodeGraph | null = null;

  async initialize(projectPath: string): Promise<void> {
    this.outputPath = path.join(projectPath, '.mycodemap');
    await fs.mkdir(this.outputPath, { recursive: true });
  }

  async saveCodeGraph(graph: CodeGraph): Promise<void> {
    // 保存 codemap.json
    const jsonPath = path.join(this.outputPath, 'codemap.json');
    await fs.writeFile(jsonPath, JSON.stringify(graph, null, 2));
    
    // 生成 AI_MAP.md
    const aiMap = this.generateAIMap(graph);
    await fs.writeFile(path.join(this.outputPath, 'AI_MAP.md'), aiMap);
    
    // 生成 CONTEXT.md
    const context = this.generateContext(graph);
    await fs.writeFile(path.join(this.outputPath, 'CONTEXT.md'), context);
    
    this.codeGraph = graph;
  }

  async loadCodeGraph(): Promise<CodeGraph> {
    if (this.codeGraph) return this.codeGraph;
    
    const jsonPath = path.join(this.outputPath, 'codemap.json');
    const content = await fs.readFile(jsonPath, 'utf-8');
    this.codeGraph = JSON.parse(content);
    return this.codeGraph;
  }

  async findSymbolByName(name: string): Promise<Symbol[]> {
    const graph = await this.loadCodeGraph();
    return graph.modules
      .flatMap(m => m.symbols)
      .filter(s => s.name === name);
  }

  // ... 其他方法实现
}
```

### 3.2 KùzuDB 存储

```typescript
// src/infrastructure/storage/implementations/KuzuDBStorage.ts

export class KuzuDBStorage implements IStorage {
  readonly type = 'kuzudb';
  private db: kuzu.Database | null = null;
  private conn: kuzu.Connection | null = null;
  private dbPath: string = '';

  async initialize(projectPath: string): Promise<void> {
    this.dbPath = path.join(projectPath, '.mycodemap', 'graph.db');
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
    
    this.db = new kuzu.Database(this.dbPath);
    this.conn = new kuzu.Connection(this.db);
    
    await this.createSchema();
  }

  private async createSchema(): Promise<void> {
    // 创建节点表
    await this.conn?.query(`
      CREATE NODE TABLE IF NOT EXISTS Module(
        id STRING PRIMARY KEY,
        path STRING,
        language STRING,
        lines INT64
      )
    `);
    
    await this.conn?.query(`
      CREATE NODE TABLE IF NOT EXISTS Symbol(
        id STRING PRIMARY KEY,
        name STRING,
        kind STRING,
        moduleId STRING
      )
    `);
    
    // 创建关系表
    await this.conn?.query(`
      CREATE REL TABLE IF NOT EXISTS IMPORTS(
        FROM Module TO Module,
        MANY_MANY
      )
    `);
    
    await this.conn?.query(`
      CREATE REL TABLE IF NOT EXISTS CALLS(
        FROM Symbol TO Symbol,
        MANY_MANY
      )
    `);
  }

  async saveCodeGraph(graph: CodeGraph): Promise<void> {
    // 批量导入节点
    const modules = graph.modules.map(m => ({
      id: m.id,
      path: m.path,
      language: m.language,
      lines: m.stats.lines
    }));
    
    await this.bulkInsert('Module', modules);
    
    // 批量导入关系
    const imports = graph.modules.flatMap(m => 
      m.dependencies.map(dep => ({
        from: m.id,
        to: dep.targetId
      }))
    );
    
    await this.bulkInsertRelations('IMPORTS', imports);
  }

  async findCallers(functionId: string): Promise<Symbol[]> {
    const result = await this.conn?.query(`
      MATCH (caller:Symbol)-[:CALLS]->(callee:Symbol {id: '${functionId}'})
      RETURN caller.id, caller.name, caller.kind
    `);
    
    return result ? this.mapToSymbols(result) : [];
  }

  async calculateImpact(moduleId: string, depth: number): Promise<ImpactResult> {
    const result = await this.conn?.query(`
      MATCH (start:Module {id: '${moduleId}'})-[:IMPORTS*1..${depth}]->(impact:Module)
      RETURN impact.id, impact.path
    `);
    
    return {
      rootModule: moduleId,
      affectedModules: result ? this.mapToModules(result) : [],
      depth
    };
  }

  // ... 其他方法实现
}
```

### 3.3 存储工厂

```typescript
// src/infrastructure/storage/StorageFactory.ts

export class StorageFactory implements IStorageFactory {
  async create(config: StorageConfig): Promise<IStorage> {
    const type = await this.resolveStorageType(config);
    
    switch (type) {
      case 'filesystem':
        return new FileSystemStorage();
      case 'kuzudb':
        return new KuzuDBStorage();
      default:
        throw new Error(`Unknown storage type: ${type}`);
    }
  }

  async createForProject(
    projectPath: string, 
    config: StorageConfig
  ): Promise<IStorage> {
    const storage = await this.create(config);
    await storage.initialize(projectPath);
    return storage;
  }

  private async resolveStorageType(config: StorageConfig): Promise<StorageType> {
    if (config.type !== 'auto') {
      return config.type;
    }
    
    // 自动选择逻辑
    const thresholds = config.autoThresholds || {
      useGraphDBWhenFileCount: 500,
      useGraphDBWhenNodeCount: 10000
    };
    
    const fileCount = await this.estimateFileCount();
    
    return fileCount >= thresholds.useGraphDBWhenFileCount 
      ? 'kuzudb' 
      : 'filesystem';
  }

  private async estimateFileCount(): Promise<number> {
    // 快速估算文件数量
    return 0;
  }
}
```

---

## 4. 多语言支持实现

### 4.1 Tree-sitter 解析器基类

```typescript
// src/infrastructure/parser/implementations/TreeSitterParser.ts

import Parser from 'tree-sitter';

/**
 * Tree-sitter 解析器基类
 * 所有 Tree-sitter 语言解析器继承此类
 */
export abstract class TreeSitterParser implements ILanguageParser {
  protected parser: Parser | null = null;
  protected grammar: any;

  async initialize(): Promise<void> {
    this.parser = new Parser();
    this.parser.setLanguage(this.grammar);
  }

  async parseFile(
    filePath: string, 
    content: string, 
    options?: ParseOptions
  ): Promise<ParseResult> {
    if (!this.parser) {
      throw new Error('Parser not initialized');
    }

    const tree = this.parser.parse(content);
    const root = tree.rootNode;

    const startTime = performance.now();

    // 并行提取信息
    const [imports, exports, symbols, callGraph, complexity] = await Promise.all([
      this.extractImports(content),
      this.extractExports(content),
      this.extractSymbols(content),
      options?.includeCallGraph ? this.buildCallGraph(content) : Promise.resolve(undefined),
      options?.includeComplexity ? this.calculateComplexity(content) : Promise.resolve(undefined)
    ]);

    const parseTime = performance.now() - startTime;

    return {
      filePath,
      language: this.languageId,
      module: this.buildModule(filePath, content, imports, exports),
      symbols,
      imports,
      exports,
      dependencies: this.buildDependencies(imports),
      callGraph,
      complexity,
      parseTime
    };
  }

  abstract extractImports(content: string): Promise<Import[]>;
  abstract extractExports(content: string): Promise<Export[]>;
  abstract extractSymbols(content: string): Promise<Symbol[]>;
  abstract buildCallGraph(content: string): Promise<CallGraph>;
  abstract calculateComplexity(content: string): Promise<ComplexityMetrics>;

  // ... 其他方法实现
}
```

### 4.2 Python 解析器

```typescript
// src/infrastructure/parser/implementations/python/PythonParser.ts

import Python from 'tree-sitter-python';

export class PythonParser extends TreeSitterParser {
  readonly languageId = 'python';
  readonly fileExtensions = ['.py', '.pyw', '.pyi'];
  readonly name = 'Python Parser';
  protected grammar = Python;

  async extractImports(content: string): Promise<Import[]> {
    const tree = this.parser!.parse(content);
    const imports: Import[] = [];

    // 查询 import 语句
    const importQuery = new Parser.Query(Python, `
      (import_statement
        name: (dotted_name) @name)
      
      (import_from_statement
        module_name: (dotted_name) @module
        name: (dotted_name) @name)
    `);

    const matches = importQuery.matches(tree.rootNode);
    
    for (const match of matches) {
      // 解析 import 信息
      imports.push(this.parseImportMatch(match));
    }

    return imports;
  }

  async extractSymbols(content: string): Promise<Symbol[]> {
    const tree = this.parser!.parse(content);
    const symbols: Symbol[] = [];

    // 查询类定义
    const classQuery = new Parser.Query(Python, `
      (class_definition
        name: (identifier) @name) @class
    `);

    // 查询函数定义
    const funcQuery = new Parser.Query(Python, `
      (function_definition
        name: (identifier) @name) @func
    `);

    // 处理类
    const classMatches = classQuery.matches(tree.rootNode);
    for (const match of classMatches) {
      symbols.push(this.parseClassMatch(match));
    }

    // 处理函数
    const funcMatches = funcQuery.matches(tree.rootNode);
    for (const match of funcMatches) {
      symbols.push(this.parseFunctionMatch(match));
    }

    return symbols;
  }

  supportsFeature(feature: LanguageFeature): boolean {
    const supported: LanguageFeature[] = [
      'type-inference',
      'decorators',
      'call-graph',
      'cross-file-analysis',
      'complexity-metrics'
    ];
    return supported.includes(feature);
  }

  // ... 其他方法实现
}
```

### 4.3 解析器注册表

```typescript
// src/infrastructure/parser/ParserRegistry.ts

export class ParserRegistry implements IParserRegistry {
  private parsers = new Map<LanguageId, ILanguageParser>();
  private extToLanguage = new Map<string, LanguageId>();

  constructor() {
    this.registerBuiltInParsers();
  }

  private registerBuiltInParsers(): void {
    // Phase 1: 已支持
    this.register(new TypeScriptParser());
    this.register(new JavaScriptParser());
    this.register(new GoParser());

    // Phase 2: MVP3 新增
    this.register(new PythonParser());
    this.register(new JavaParser());
    this.register(new RustParser());
    this.register(new CppParser());

    // Phase 3: 后续添加
    // this.register(new CSharpParser());
    // ...
  }

  register(parser: ILanguageParser): void {
    this.parsers.set(parser.languageId, parser);
    
    for (const ext of parser.fileExtensions) {
      this.extToLanguage.set(ext, parser.languageId);
    }
  }

  getParser(language: LanguageId): ILanguageParser | undefined {
    return this.parsers.get(language);
  }

  getParserByFile(filePath: string): ILanguageParser | undefined {
    const ext = path.extname(filePath).toLowerCase();
    const language = this.extToLanguage.get(ext);
    return language ? this.parsers.get(language) : undefined;
  }

  getSupportedExtensions(): string[] {
    return Array.from(this.extToLanguage.keys());
  }

  getSupportedLanguages(): LanguageId[] {
    return Array.from(this.parsers.keys());
  }
}
```

---

## 5. Server 层实现

### 5.1 CodeMap 服务

```typescript
// src/server/services/CodeMapService.ts

export class CodeMapService {
  constructor(
    private storageFactory: IStorageFactory,
    private parserRegistry: IParserRegistry,
    private analysisService: AnalysisService
  ) {}

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const startTime = performance.now();
    
    try {
      // 1. 初始化存储
      const storage = await this.storageFactory.createForProject(
        request.projectPath, 
        request.storage || { type: 'filesystem' }
      );

      // 2. 发现文件
      const files = await this.discoverFiles(request);
      
      // 3. 解析文件
      const parsedModules = await this.parseFiles(files, request, storage);

      // 4. 构建代码图
      const codeGraph = await this.buildCodeGraph(parsedModules, request);

      // 5. 保存到存储
      await storage.saveCodeGraph(codeGraph);

      // 6. 生成输出文件
      const generatedFiles = await this.generateOutputFiles(codeGraph, request);

      const duration = performance.now() - startTime;

      return {
        success: true,
        codeGraph,
        generatedFiles,
        statistics: {
          totalFiles: files.length,
          parsedFiles: parsedModules.length,
          failedFiles: files.length - parsedModules.length,
          totalSymbols: codeGraph.modules.reduce((sum, m) => sum + m.symbols.length, 0),
          totalDependencies: codeGraph.dependencies.length,
          duration
        }
      };
    } catch (error) {
      return {
        success: false,
        codeGraph: {} as CodeGraph,
        generatedFiles: [],
        statistics: {
          totalFiles: 0,
          parsedFiles: 0,
          failedFiles: 0,
          totalSymbols: 0,
          totalDependencies: 0,
          duration: performance.now() - startTime
        },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async discoverFiles(request: GenerateRequest): Promise<string[]> {
    const include = request.include || ['src/**/*'];
    const exclude = request.exclude || ['node_modules/**', 'dist/**'];
    
    // 支持多语言扩展名
    const extensions = this.parserRegistry.getSupportedExtensions();
    const patterns = include.map(i => 
      extensions.map(ext => `${i}${ext}`)
    ).flat();
    
    return globby(patterns, {
      cwd: request.projectPath,
      ignore: exclude,
      absolute: true
    });
  }

  private async parseFiles(
    files: string[], 
    request: GenerateRequest,
    storage: IStorage
  ): Promise<Module[]> {
    const modules: Module[] = [];
    const batchSize = 50;

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      // 并行解析批次
      const results = await Promise.all(
        batch.map(async (file) => {
          const parser = this.parserRegistry.getParserByFile(file);
          if (!parser) return null;

          try {
            const content = await fs.readFile(file, 'utf-8');
            const result = await parser.parseFile(file, content, {
              includeCallGraph: request.mode === 'smart',
              includeComplexity: request.mode === 'smart'
            });
            return result.module;
          } catch (error) {
            console.warn(`Failed to parse ${file}:`, error);
            return null;
          }
        })
      );

      modules.push(...results.filter((m): m is Module => m !== null));

      // 进度回调
      if (request.onProgress) {
        request.onProgress({
          current: Math.min(i + batchSize, files.length),
          total: files.length,
          percentage: Math.round(((i + batchSize) / files.length) * 100),
          currentFile: batch[batch.length - 1]
        });
      }
    }

    return modules;
  }

  // ... 其他方法
}
```

---

## 6. CLI 可视化实现

### 6.1 树形可视化

```typescript
// src/cli/visualizers/TreeVisualizer.ts

import chalk from 'chalk';
import { TreeNode, TreeOptions } from './types.js';

export class TreeVisualizer {
  private options: TreeOptions;

  constructor(options: TreeOptions = {}) {
    this.options = {
      maxDepth: options.maxDepth ?? Infinity,
      showIcons: options.showIcons ?? true,
      showSize: options.showSize ?? false,
      ...options
    };
  }

  visualize(root: TreeNode): string {
    return this.renderNode(root, '', 0, true);
  }

  private renderNode(
    node: TreeNode, 
    prefix: string, 
    depth: number,
    isLast: boolean
  ): string {
    if (depth > this.options.maxDepth!) {
      return '';
    }

    const lines: string[] = [];
    
    // 当前节点行
    const icon = this.getIcon(node);
    const name = this.formatName(node);
    const size = this.options.showSize && node.size 
      ? chalk.gray(` (${this.formatSize(node.size)})`)
      : '';
    
    const line = prefix + (isLast ? '└── ' : '├── ') + icon + name + size;
    lines.push(line);

    // 子节点
    if (node.children && node.children.length > 0) {
      const childPrefix = prefix + (isLast ? '    ' : '│   ');
      
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const childIsLast = i === node.children.length - 1;
        lines.push(this.renderNode(child, childPrefix, depth + 1, childIsLast));
      }
    }

    return lines.join('\n');
  }

  private getIcon(node: TreeNode): string {
    if (!this.options.showIcons) return '';
    
    if (node.type === 'directory') {
      return chalk.blue('📁 ');
    }
    
    // 根据扩展名返回图标
    const ext = node.name.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      'ts': '📘 ',
      'js': '📒 ',
      'py': '🐍 ',
      'java': '☕ ',
      'go': '🐹 ',
      'rs': '🦀 ',
      'json': '📋 ',
      'md': '📝 ',
      'default': '📄 '
    };
    
    return iconMap[ext || 'default'] || iconMap.default;
  }

  private formatName(node: TreeNode): string {
    if (node.highlight) {
      return chalk.yellow(node.name);
    }
    return node.name;
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}
```

### 6.2 ASCII 依赖图

```typescript
// src/cli/visualizers/GraphVisualizer.ts

export class GraphVisualizer {
  visualize(graph: DependencyGraph): string {
    const lines: string[] = [];
    const visited = new Set<string>();

    // 找到根节点
    const roots = this.findRootNodes(graph);

    for (const root of roots) {
      lines.push(...this.renderSubgraph(root, graph, visited, '', true));
    }

    return lines.join('\n');
  }

  private renderSubgraph(
    nodeId: string,
    graph: DependencyGraph,
    visited: Set<string>,
    prefix: string,
    isLast: boolean
  ): string[] {
    const lines: string[] = [];
    
    if (visited.has(nodeId)) {
      lines.push(prefix + (isLast ? '└── ' : '├── ') + chalk.gray(`${nodeId} (circular)`));
      return lines;
    }

    visited.add(nodeId);
    
    const node = graph.nodes[nodeId];
    const deps = graph.edges.filter(e => e.from === nodeId);
    
    lines.push(prefix + (isLast ? '└── ' : '├── ') + node.path);

    for (let i = 0; i < deps.length; i++) {
      const dep = deps[i];
      const childPrefix = prefix + (isLast ? '    ' : '│   ');
      const childIsLast = i === deps.length - 1;
      
      lines.push(...this.renderSubgraph(dep.to, graph, new Set(visited), childPrefix, childIsLast));
    }

    return lines;
  }

  private findRootNodes(graph: DependencyGraph): string[] {
    // 找到没有入边的节点
    const hasIncoming = new Set(graph.edges.map(e => e.to));
    return Object.keys(graph.nodes).filter(id => !hasIncoming.has(id));
  }
}
```

### 6.3 热力图

```typescript
// src/cli/visualizers/HeatmapVisualizer.ts

import chalk from 'chalk';

export class HeatmapVisualizer {
  visualize(items: HeatmapItem[]): string {
    // 按值排序
    const sorted = [...items].sort((a, b) => b.value - a.value);
    
    // 计算最大值用于归一化
    const maxValue = Math.max(...items.map(i => i.value));
    
    const lines: string[] = [];
    
    for (const item of sorted) {
      const intensity = item.value / maxValue;
      const color = this.getColor(intensity);
      const bar = this.renderBar(intensity);
      
      lines.push(`${color(item.name.padEnd(40))} ${bar} ${chalk.gray(item.value)}`);
    }

    return lines.join('\n');
  }

  private getColor(intensity: number): chalk.Chalk {
    if (intensity > 0.75) return chalk.red;
    if (intensity > 0.5) return chalk.yellow;
    if (intensity > 0.25) return chalk.green;
    return chalk.blue;
  }

  private renderBar(intensity: number): string {
    const width = 20;
    const filled = Math.round(intensity * width);
    const empty = width - filled;
    
    return '█'.repeat(filled) + '░'.repeat(empty);
  }
}

interface HeatmapItem {
  name: string;
  value: number;
}
```

---

## 7. 测试策略

### 7.1 分层测试

```
┌─────────────────────────────────────────────────────────────────┐
│                       测试金字塔                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    ┌───────────┐                               │
│                    │  E2E Tests │  < 10 个场景                   │
│                    │  (CLI)    │                               │
│                    └─────┬─────┘                               │
│                          │                                      │
│                 ┌────────┴────────┐                            │
│                 │ Integration Tests│  < 50 个场景                │
│                 │ (Server + Infra) │                            │
│                 └────────┬────────┘                            │
│                          │                                      │
│            ┌─────────────┴─────────────┐                      │
│            │        Unit Tests         │  > 500 个测试          │
│            │ (Domain + Infrastructure) │                      │
│            └───────────────────────────┘                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 关键测试用例

```typescript
// 存储抽象测试示例
describe('IStorage', () => {
  const implementations = [
    { name: 'FileSystemStorage', factory: () => new FileSystemStorage() },
    { name: 'KuzuDBStorage', factory: () => new KuzuDBStorage() },
  ];

  for (const { name, factory } of implementations) {
    describe(name, () => {
      let storage: IStorage;

      beforeEach(async () => {
        storage = factory();
        await storage.initialize('/tmp/test-project');
      });

      it('should save and load code graph', async () => {
        const graph = createMockCodeGraph();
        await storage.saveCodeGraph(graph);
        const loaded = await storage.loadCodeGraph();
        expect(loaded).toEqual(graph);
      });

      it('should find symbols by name', async () => {
        // ... 测试实现
      });

      it('should detect cycles', async () => {
        // ... 测试实现
      });
    });
  }
});
```

---

## 8. 迁移计划

### 8.1 代码迁移清单

| 原文件 | 新位置 | 变更类型 |
|--------|--------|----------|
| `src/types/index.ts` | `src/interface/types/index.ts` | 移动 |
| `src/core/analyzer.ts` | `src/domain/services/AnalysisService.ts` | 重构 |
| `src/parser/index.ts` | `src/infrastructure/parser/` | 拆分 |
| `src/cache/*.ts` | `src/infrastructure/cache/` | 移动 |
| `src/generator/*.ts` | `src/server/services/` | 重构 |
| `src/cli/commands/*.ts` | `src/cli/commands/` | 适配新接口 |

### 8.2 向后兼容方案

```typescript
// src/index.ts - 保持向后兼容的导出

// 旧 API 兼容层
export { analyze } from './domain/services/AnalysisService.js';
export { parseFile } from './infrastructure/parser/adapters/LegacyParserAdapter.js';

// 新 API
export { CodeMapService } from './server/services/CodeMapService.js';
export { StorageFactory } from './infrastructure/storage/StorageFactory.js';
export { ParserRegistry } from './infrastructure/parser/ParserRegistry.js';
```

---

## 9. 依赖列表

### 9.1 新增依赖

```json
{
  "dependencies": {
    "kuzu": "^0.8.0",
    "tree-sitter": "^0.22.0",
    "tree-sitter-python": "^0.23.0",
    "tree-sitter-java": "^0.23.0",
    "tree-sitter-rust": "^0.23.0",
    "tree-sitter-cpp": "^0.23.0",
    "chalk": "^5.4.0",
    "cli-progress": "^3.12.0",
    "ink": "^5.1.0"
  },
  "devDependencies": {
    "@types/cli-progress": "^3.11.6"
  }
}
```

---

## 10. 附录

### 10.1 术语定义

| 术语 | 定义 |
|------|------|
| Server Layer | 应用服务层，协调用例和基础设施 |
| Storage Abstraction | 存储抽象，支持多种后端实现 |
| Tree-sitter | 增量解析器生成工具 |
| KùzuDB | 高性能嵌入式图数据库 |
| CLI Visualizer | 命令行可视化组件 |

### 10.2 参考资料

- [KùzuDB Documentation](https://docs.kuzudb.com/)
- [Tree-sitter Documentation](https://tree-sitter.github.io/tree-sitter/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
