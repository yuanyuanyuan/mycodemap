# CodeMap AI 集成 - 技术实现指南

## 核心类设计

### 1. CodeMapGenerator - 主生成器

```typescript
import { Project, SourceFile } from 'ts-morph';
import { createHash } from 'crypto';

interface CodeMapGeneratorConfig {
  projectPath: string;
  compressionMode: 'full' | 'signature' | 'minimal' | 'smart';
  maxTokens: number;
  includeTests: boolean;
  includePrivate: boolean;
}

class CodeMapGenerator {
  private project: Project;
  private config: CodeMapGeneratorConfig;
  private symbolTable: Map<string, SymbolInfo> = new Map();
  private dependencyGraph: DependencyGraph = new DependencyGraph();

  constructor(config: CodeMapGeneratorConfig) {
    this.config = config;
    this.project = new Project({
      tsConfigFilePath: `${config.projectPath}/tsconfig.json`
    });
  }

  async generate(): Promise<CodeMap> {
    // 1. 扫描所有源文件
    const sourceFiles = this.project.getSourceFiles()
      .filter(f => this.shouldInclude(f));

    // 2. 构建符号表
    for (const file of sourceFiles) {
      await this.analyzeFile(file);
    }

    // 3. 构建依赖图
    this.buildDependencyGraph();

    // 4. 计算重要性分数
    this.calculateImportanceScores();

    // 5. 生成 CodeMap
    return this.buildCodeMap();
  }

  private async analyzeFile(file: SourceFile): Promise<void> {
    const filePath = file.getFilePath();
    
    // 分析类
    file.getClasses().forEach(cls => {
      this.symbolTable.set(cls.getName()!, {
        name: cls.getName()!,
        type: 'class',
        file: filePath,
        line: cls.getStartLineNumber(),
        isExported: cls.isExported(),
        isAbstract: cls.isAbstract(),
        properties: this.extractProperties(cls),
        methods: this.extractMethods(cls),
        documentation: cls.getJsDocs().map(d => d.getCommentText()).join('\n')
      });
    });

    // 分析函数
    file.getFunctions().forEach(fn => {
      this.symbolTable.set(fn.getName()!, {
        name: fn.getName()!,
        type: 'function',
        file: filePath,
        line: fn.getStartLineNumber(),
        isExported: fn.isExported(),
        isAsync: fn.isAsync(),
        parameters: this.extractParameters(fn),
        returnType: fn.getReturnType().getText(),
        documentation: fn.getJsDocs().map(d => d.getCommentText()).join('\n')
      });
    });

    // 分析接口
    file.getInterfaces().forEach(iface => {
      this.symbolTable.set(iface.getName()!, {
        name: iface.getName()!,
        type: 'interface',
        file: filePath,
        line: iface.getStartLineNumber(),
        isExported: iface.isExported(),
        properties: this.extractInterfaceProperties(iface),
        methods: this.extractInterfaceMethods(iface)
      });
    });
  }

  private buildDependencyGraph(): void {
    for (const [name, symbol] of this.symbolTable) {
      const dependencies = this.findDependencies(symbol);
      this.dependencyGraph.addNode(name, { symbol, dependencies });
      
      dependencies.forEach(dep => {
        this.dependencyGraph.addEdge(name, dep);
      });
    }
  }

  private calculateImportanceScores(): void {
    const centrality = this.dependencyGraph.calculateBetweennessCentrality();
    
    for (const [name, symbol] of this.symbolTable) {
      const score = this.calculateScore(symbol, centrality.get(name) || 0);
      symbol.importanceScore = score;
    }
  }

  private calculateScore(symbol: SymbolInfo, centrality: number): number {
    return (
      centrality * 0.3 +
      (symbol.referenceCount || 0) * 0.2 +
      (symbol.isExported ? 0.2 : 0) +
      (symbol.documentation ? 0.1 : 0) +
      (symbol.complexity || 0) * 0.2
    );
  }

  private buildCodeMap(): CodeMap {
    return {
      metadata: this.generateMetadata(),
      level1: this.generateLevel1(),
      level2: this.generateLevel2(),
      level3: this.generateLevel3(),
      level4: this.generateLevel4()
    };
  }

  private generateLevel1(): Level1Content {
    return {
      directoryStructure: this.getDirectoryTree(),
      techStack: this.detectTechStack(),
      moduleDependencies: this.dependencyGraph.toMermaid()
    };
  }

  private generateLevel2(): Level2Content {
    const modules = this.groupByModule();
    
    return {
      modules: modules.map(m => ({
        name: m.name,
        path: m.path,
        responsibility: this.inferResponsibility(m),
        keyExports: m.exports.map(e => e.name),
        dependencies: this.getModuleDependencies(m),
        complexity: this.calculateModuleComplexity(m)
      }))
    };
  }

  private generateLevel3(): Level3Content {
    const sortedSymbols = Array.from(this.symbolTable.values())
      .sort((a, b) => (b.importanceScore || 0) - (a.importanceScore || 0));

    return {
      symbols: sortedSymbols.map(s => this.compressSymbol(s, 'signature'))
    };
  }

  private generateLevel4(): Level4Content {
    const highImportanceSymbols = Array.from(this.symbolTable.values())
      .filter(s => (s.importanceScore || 0) > 0.7)
      .slice(0, 50);

    return {
      implementations: highImportanceSymbols.map(s => ({
        name: s.name,
        file: s.file,
        lineRange: [s.line, s.endLine || s.line + 20],
        code: this.getSourceCode(s)
      }))
    };
  }

  private compressSymbol(symbol: SymbolInfo, mode: CompressionMode): CompressedSymbol {
    switch (mode) {
      case 'full':
        return { ...symbol, code: this.getSourceCode(symbol) };
      case 'signature':
        return this.extractSignature(symbol);
      case 'minimal':
        return { name: symbol.name, type: symbol.type };
      case 'smart':
        return symbol.importanceScore! > 0.7 
          ? this.compressSymbol(symbol, 'full')
          : this.compressSymbol(symbol, 'signature');
    }
  }
}
```

### 2. TokenBudgetManager - Token 预算管理

```typescript
interface TokenAllocation {
  level: 'L1' | 'L2' | 'L3' | 'L4';
  allocated: number;
  used: number;
  priority: number;
}

class TokenBudgetManager {
  private totalBudget: number;
  private bufferRatio: number = 0.2;
  private allocations: Map<string, TokenAllocation> = new Map();

  constructor(totalBudget: number, bufferRatio: number = 0.2) {
    this.totalBudget = totalBudget;
    this.bufferRatio = bufferRatio;
  }

  allocate(level: 'L1' | 'L2' | 'L3' | 'L4', priority: number): number {
    const effectiveBudget = this.totalBudget * (1 - this.bufferRatio);
    const allocation = Math.floor(effectiveBudget * priority);
    
    this.allocations.set(level, {
      level,
      allocated: allocation,
      used: 0,
      priority
    });

    return allocation;
  }

  use(level: 'L1' | 'L2' | 'L3' | 'L4', tokens: number): boolean {
    const allocation = this.allocations.get(level);
    if (!allocation) return false;

    if (allocation.used + tokens > allocation.allocated) {
      return false; // 超出预算
    }

    allocation.used += tokens;
    return true;
  }

  getRemaining(level: 'L1' | 'L2' | 'L3' | 'L4'): number {
    const allocation = this.allocations.get(level);
    if (!allocation) return 0;
    return allocation.allocated - allocation.used;
  }

  getTotalRemaining(): number {
    let used = 0;
    this.allocations.forEach(a => used += a.used);
    return this.totalBudget - used;
  }

  // 动态调整预算
  reallocate(from: 'L1' | 'L2' | 'L3' | 'L4', to: 'L1' | 'L2' | 'L3' | 'L4', amount: number): boolean {
    const fromAlloc = this.allocations.get(from);
    const toAlloc = this.allocations.get(to);
    
    if (!fromAlloc || !toAlloc) return false;
    
    const available = fromAlloc.allocated - fromAlloc.used;
    if (available < amount) return false;

    fromAlloc.allocated -= amount;
    toAlloc.allocated += amount;
    
    return true;
  }
}
```

### 3. CodeMapReferenceResolver - 引用解析器

```typescript
interface Reference {
  type: 'symbol' | 'file' | 'module' | 'range';
  path: string;
  location?: {
    file?: string;
    line?: number;
    column?: number;
    endLine?: number;
  };
  query?: Record<string, string>;
}

interface ResolvedContent {
  content: string;
  level: 'L1' | 'L2' | 'L3' | 'L4';
  metadata: {
    file?: string;
    lineRange?: [number, number];
    symbol?: string;
  };
}

class CodeMapReferenceResolver {
  private codemap: CodeMap;
  private symbolIndex: Map<string, SymbolLocation>;

  constructor(codemap: CodeMap) {
    this.codemap = codemap;
    this.symbolIndex = this.buildSymbolIndex();
  }

  parse(ref: string): Reference {
    // codemap://symbol/ClassName.method@file.ts:10?level=L3
    const pattern = /^codemap:\/\/([^\/]+)\/([^@?]+)(?:@([^?]+))?(?:\?(.+))?$/;
    const match = ref.match(pattern);

    if (!match) {
      throw new Error(`Invalid CodeMap reference: ${ref}`);
    }

    const [, type, path, location, queryStr] = match;

    return {
      type: type as Reference['type'],
      path: decodeURIComponent(path),
      location: location ? this.parseLocation(location) : undefined,
      query: queryStr ? this.parseQuery(queryStr) : undefined
    };
  }

  resolve(ref: string): ResolvedContent {
    const reference = this.parse(ref);
    const level = (reference.query?.level as 'L1' | 'L2' | 'L3' | 'L4') || 'L3';

    switch (reference.type) {
      case 'symbol':
        return this.resolveSymbol(reference, level);
      case 'file':
        return this.resolveFile(reference, level);
      case 'module':
        return this.resolveModule(reference, level);
      case 'range':
        return this.resolveRange(reference);
      default:
        throw new Error(`Unknown reference type: ${reference.type}`);
    }
  }

  private resolveSymbol(ref: Reference, level: 'L1' | 'L2' | 'L3' | 'L4'): ResolvedContent {
    const location = this.symbolIndex.get(ref.path);
    if (!location) {
      throw new Error(`Symbol not found: ${ref.path}`);
    }

    const symbol = this.findSymbolInCodeMap(ref.path, level);

    return {
      content: this.formatSymbol(symbol, level),
      level,
      metadata: {
        file: location.file,
        lineRange: [location.line, location.endLine],
        symbol: ref.path
      }
    };
  }

  private resolveFile(ref: Reference, level: 'L1' | 'L2' | 'L3' | 'L4'): ResolvedContent {
    const fileContent = this.codemap.level3?.symbols.filter(
      s => s.file === ref.path
    );

    return {
      content: this.formatFileContent(fileContent, level),
      level,
      metadata: { file: ref.path }
    };
  }

  private resolveModule(ref: Reference, level: 'L1' | 'L2' | 'L3' | 'L4'): ResolvedContent {
    const moduleInfo = this.codemap.level2?.modules.find(
      m => m.path === ref.path || m.name === ref.path
    );

    if (!moduleInfo) {
      throw new Error(`Module not found: ${ref.path}`);
    }

    return {
      content: JSON.stringify(moduleInfo, null, 2),
      level: 'L2',
      metadata: {}
    };
  }

  private resolveRange(ref: Reference): ResolvedContent {
    const [file, rangeStr] = ref.path.split(':');
    const [start, end] = rangeStr.split('-').map(Number);

    const content = this.extractRange(file, start, end);

    return {
      content,
      level: 'L4',
      metadata: {
        file,
        lineRange: [start, end]
      }
    };
  }

  private parseLocation(loc: string): Reference['location'] {
    // file.ts:10:5 or file.ts:10-20
    if (loc.includes('-')) {
      const [file, range] = loc.split(':');
      const [start, end] = range.split('-').map(Number);
      return { file, line: start, endLine: end };
    } else {
      const parts = loc.split(':');
      return {
        file: parts[0],
        line: Number(parts[1]),
        column: parts[2] ? Number(parts[2]) : undefined
      };
    }
  }

  private parseQuery(queryStr: string): Record<string, string> {
    return Object.fromEntries(
      queryStr.split('&').map(p => p.split('='))
    );
  }

  private buildSymbolIndex(): Map<string, SymbolLocation> {
    const index = new Map<string, SymbolLocation>();
    
    this.codemap.level3?.symbols.forEach(s => {
      index.set(s.name, {
        file: s.file,
        line: s.line,
        endLine: s.endLine || s.line + 20
      });
    });

    return index;
  }
}
```

### 4. IncrementalUpdater - 增量更新

```typescript
interface FileChange {
  type: 'added' | 'modified' | 'deleted' | 'renamed';
  file: string;
  oldFile?: string;  // for renamed
  diff?: string;
  timestamp: Date;
}

interface UpdateImpact {
  affectedSymbols: string[];
  affectedFiles: string[];
  affectedModules: string[];
  breakingChanges: boolean;
  suggestedReload: ('L1' | 'L2' | 'L3' | 'L4')[];
}

class IncrementalUpdater {
  private codemap: CodeMap;
  private dependencyGraph: DependencyGraph;
  private changeHistory: FileChange[] = [];

  constructor(codemap: CodeMap, dependencyGraph: DependencyGraph) {
    this.codemap = codemap;
    this.dependencyGraph = dependencyGraph;
  }

  async processChange(change: FileChange): Promise<UpdateImpact> {
    this.changeHistory.push(change);

    switch (change.type) {
      case 'added':
        return this.handleFileAdded(change);
      case 'modified':
        return this.handleFileModified(change);
      case 'deleted':
        return this.handleFileDeleted(change);
      case 'renamed':
        return this.handleFileRenamed(change);
    }
  }

  private async handleFileModified(change: FileChange): Promise<UpdateImpact> {
    const oldSymbols = this.getSymbolsInFile(change.file);
    const newSymbols = await this.parseFile(change.file);

    const impact: UpdateImpact = {
      affectedSymbols: [],
      affectedFiles: [change.file],
      affectedModules: this.getModulesForFile(change.file),
      breakingChanges: false,
      suggestedReload: []
    };

    // 检测符号变更
    for (const oldSym of oldSymbols) {
      const newSym = newSymbols.find(s => s.name === oldSym.name);
      
      if (!newSym) {
        // 符号被删除
        impact.affectedSymbols.push(oldSym.name);
        impact.breakingChanges = true;
      } else if (this.isSignatureChanged(oldSym, newSym)) {
        // 签名变更
        impact.affectedSymbols.push(oldSym.name);
        impact.breakingChanges = true;
      }
    }

    // 检测新增符号
    for (const newSym of newSymbols) {
      if (!oldSymbols.find(s => s.name === newSym.name)) {
        impact.affectedSymbols.push(newSym.name);
      }
    }

    // 确定需要重新加载的层级
    impact.suggestedReload = this.determineReloadLevels(impact);

    return impact;
  }

  private isSignatureChanged(oldSym: SymbolInfo, newSym: SymbolInfo): boolean {
    return (
      oldSym.type !== newSym.type ||
      JSON.stringify(oldSym.parameters) !== JSON.stringify(newSym.parameters) ||
      oldSym.returnType !== newSym.returnType
    );
  }

  private determineReloadLevels(impact: UpdateImpact): ('L1' | 'L2' | 'L3' | 'L4')[] {
    const levels: ('L1' | 'L2' | 'L3' | 'L4')[] = [];

    // L4: 实现细节总是需要更新
    levels.push('L4');

    // L3: 如果有签名变更
    if (impact.breakingChanges) {
      levels.push('L3');
    }

    // L2: 如果有模块结构变更
    if (impact.affectedModules.length > 0) {
      levels.push('L2');
    }

    // L1: 如果有目录结构变更
    if (impact.affectedFiles.some(f => this.isNewDirectory(f))) {
      levels.push('L1');
    }

    return levels;
  }

  generateUpdateNotification(impact: UpdateImpact, change: FileChange): string {
    return JSON.stringify({
      type: 'incremental_update',
      timestamp: new Date().toISOString(),
      change: {
        type: change.type,
        file: change.file
      },
      impact: {
        affectedSymbols: impact.affectedSymbols,
        affectedFiles: impact.affectedFiles,
        breakingChanges: impact.breakingChanges
      },
      suggestedAction: {
        reloadLevels: impact.suggestedReload,
        priorityFiles: impact.affectedFiles.slice(0, 5)
      }
    }, null, 2);
  }
}
```

### 5. RAG Integration - RAG 集成

```typescript
import { OpenAIEmbeddings } from '@langchain/openai';
import { Chroma } from '@langchain/community/vectorstores/chroma';

interface CodeEmbedding {
  symbol: string;
  embeddings: {
    project: number[];
    module: number[];
    symbol: number[];
    code: number[];
  };
  metadata: {
    file: string;
    lineRange: [number, number];
    type: string;
  };
}

class CodeRAGIntegration {
  private embeddingModel: OpenAIEmbeddings;
  private vectorStore: Chroma | null = null;
  private codemap: CodeMap;

  constructor(codemap: CodeMap, apiKey: string) {
    this.codemap = codemap;
    this.embeddingModel = new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      modelName: 'text-embedding-3-small'
    });
  }

  async initialize(): Promise<void> {
    // 初始化向量存储
    this.vectorStore = await Chroma.fromExistingCollection(
      this.embeddingModel,
      { collectionName: 'codemap' }
    );
  }

  async indexCodeMap(): Promise<void> {
    const documents: Array<{ pageContent: string; metadata: any }> = [];

    // 索引 L3 符号
    for (const symbol of this.codemap.level3?.symbols || []) {
      // 项目级嵌入
      documents.push({
        pageContent: this.generateProjectContext(symbol),
        metadata: { symbol: symbol.name, level: 'project', type: 'context' }
      });

      // 模块级嵌入
      documents.push({
        pageContent: this.generateModuleContext(symbol),
        metadata: { symbol: symbol.name, level: 'module', type: 'context' }
      });

      // 符号级嵌入
      documents.push({
        pageContent: this.generateSymbolDescription(symbol),
        metadata: { symbol: symbol.name, level: 'symbol', type: 'description' }
      });

      // 代码级嵌入 (仅高重要性符号)
      if ((symbol.importanceScore || 0) > 0.7) {
        documents.push({
          pageContent: symbol.code || '',
          metadata: { symbol: symbol.name, level: 'code', type: 'implementation' }
        });
      }
    }

    // 批量添加到向量存储
    if (this.vectorStore) {
      await this.vectorStore.addDocuments(documents);
    }
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }

    const { topK = 10, level, type } = options;

    // 执行语义搜索
    const results = await this.vectorStore.similaritySearch(query, topK, {
      ...(level && { level }),
      ...(type && { type })
    });

    // 获取符号的完整信息
    return results.map(r => ({
      symbol: r.metadata.symbol,
      content: r.pageContent,
      level: r.metadata.level,
      score: r.metadata.score,
      location: this.getSymbolLocation(r.metadata.symbol)
    }));
  }

  async hybridSearch(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    // 并行执行语义搜索和关键词搜索
    const [semanticResults, keywordResults] = await Promise.all([
      this.search(query, options),
      this.keywordSearch(query, options)
    ]);

    // 使用 RRF 融合结果
    return this.fuseResults(semanticResults, keywordResults);
  }

  private async keywordSearch(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const keywords = query.toLowerCase().split(/\s+/);
    const results: SearchResult[] = [];

    for (const symbol of this.codemap.level3?.symbols || []) {
      const text = `${symbol.name} ${symbol.documentation || ''}`.toLowerCase();
      const matches = keywords.filter(k => text.includes(k)).length;

      if (matches > 0) {
        results.push({
          symbol: symbol.name,
          content: this.generateSymbolDescription(symbol),
          level: 'symbol',
          score: matches / keywords.length,
          location: { file: symbol.file, line: symbol.line }
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, options.topK || 10);
  }

  private fuseResults(
    semantic: SearchResult[],
    keyword: SearchResult[]
  ): SearchResult[] {
    const scores = new Map<string, number>();
    const k = 60; // RRF 常数

    // 语义搜索分数
    semantic.forEach((r, i) => {
      const current = scores.get(r.symbol) || 0;
      scores.set(r.symbol, current + 1 / (k + i));
    });

    // 关键词搜索分数
    keyword.forEach((r, i) => {
      const current = scores.get(r.symbol) || 0;
      scores.set(r.symbol, current + 1 / (k + i));
    });

    // 合并并排序
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([symbol, score]) => ({
        symbol,
        score,
        ...this.getSymbolInfo(symbol)
      }));
  }

  private generateProjectContext(symbol: SymbolInfo): string {
    return `
Project: ${this.codemap.metadata.project.name}
Description: ${this.codemap.metadata.project.description || 'N/A'}
Symbol: ${symbol.name}
Type: ${symbol.type}
Module: ${this.getModuleForSymbol(symbol.name)}
This symbol is part of the ${this.codemap.metadata.project.name} project.
    `.trim();
  }

  private generateModuleContext(symbol: SymbolInfo): string {
    const module = this.getModuleForSymbol(symbol.name);
    return `
Module: ${module}
Symbol: ${symbol.name}
Type: ${symbol.type}
Responsibility: ${module?.responsibility || 'N/A'}
This ${symbol.type} is part of the ${module} module.
    `.trim();
  }

  private generateSymbolDescription(symbol: SymbolInfo): string {
    return `
Symbol: ${symbol.name}
Type: ${symbol.type}
File: ${symbol.file}:${symbol.line}
Documentation: ${symbol.documentation || 'No documentation'}
Signature: ${symbol.signature || 'N/A'}
Exported: ${symbol.isExported}
    `.trim();
  }
}
```

## 使用示例

### 生成 CodeMap

```typescript
const generator = new CodeMapGenerator({
  projectPath: './my-project',
  compressionMode: 'smart',
  maxTokens: 32000,
  includeTests: false,
  includePrivate: false
});

const codemap = await generator.generate();

// 保存到文件
await fs.writeFile('codemap.json', JSON.stringify(codemap, null, 2));
```

### 解析引用

```typescript
const resolver = new CodeMapReferenceResolver(codemap);

// 解析符号引用
const result = resolver.resolve('codemap://symbol/UserService.getUserById?level=L4');
console.log(result.content);

// 解析文件引用
const fileResult = resolver.resolve('codemap://file/src/services/user.ts');
```

### RAG 搜索

```typescript
const rag = new CodeRAGIntegration(codemap, process.env.OPENAI_API_KEY!);
await rag.initialize();
await rag.indexCodeMap();

// 语义搜索
const results = await rag.search('how to authenticate users', { topK: 5 });

// 混合搜索
const hybridResults = await rag.hybridSearch('user authentication', { topK: 10 });
```

### 增量更新

```typescript
const updater = new IncrementalUpdater(codemap, dependencyGraph);

const change: FileChange = {
  type: 'modified',
  file: 'src/services/user.ts',
  diff: '...',
  timestamp: new Date()
};

const impact = await updater.processChange(change);
console.log('Affected symbols:', impact.affectedSymbols);
console.log('Suggested reload:', impact.suggestedReload);
```
