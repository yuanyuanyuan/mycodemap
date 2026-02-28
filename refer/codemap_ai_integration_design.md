# CodeMap 系统 AI 集成方案设计

## 1. 分层上下文策略

### 1.1 四级分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│  Level 1: 项目概览 (Project Overview)                            │
│  ─────────────────────────────────────                          │
│  • 目录结构树                                                    │
│  • 技术栈识别                                                    │
│  • 主要模块依赖图                                                │
│  • 项目元数据 (名称、版本、描述)                                  │
│  Token 预算: ~500-1000                                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Level 2: 模块摘要 (Module Summary)                              │
│  ─────────────────────────────────                              │
│  • 每个模块的职责描述                                            │
│  • 关键导出符号列表                                              │
│  • 模块间依赖关系                                                │
│  • 模块复杂度指标                                                │
│  Token 预算: ~2000-5000                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Level 3: 详细符号 (Detailed Symbols)                            │
│  ─────────────────────────────────────                          │
│  • 类/接口定义 (含属性、方法签名)                                 │
│  • 函数签名 (参数、返回值、类型)                                  │
│  • 类型别名和枚举                                                │
│  • 装饰器和元数据                                                │
│  Token 预算: ~5000-15000                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Level 4: 实现细节 (Implementation Details)                      │
│  ─────────────────────────────────────────                      │
│  • 关键函数体实现                                                │
│  • 算法逻辑详解                                                  │
│  • 复杂表达式解析                                                │
│  • 注释和文档字符串                                              │
│  Token 预算: 按需加载 (可分页)                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 分层加载策略

| 场景 | 加载层级 | Token 预算 | 适用任务 |
|------|---------|-----------|---------|
| 项目理解 | L1 + L2 | 3K-6K | 架构分析、技术选型 |
| 模块设计 | L1 + L2 + L3 | 8K-20K | API 设计、接口评审 |
| 代码审查 | L3 + L4(按需) | 15K-30K | Bug 修复、重构建议 |
| 功能实现 | 全层级 | 30K+ | 新功能开发、复杂修改 |

### 1.3 智能层级选择算法

```typescript
interface ContextSelectionConfig {
  taskType: 'understand' | 'design' | 'review' | 'implement';
  targetFiles?: string[];
  maxTokens: number;
  includeTests: boolean;
}

function selectContextLevel(config: ContextSelectionConfig): ContextLevel {
  const { taskType, maxTokens } = config;
  
  // 基于任务类型和 Token 预算选择层级
  if (maxTokens < 5000 || taskType === 'understand') {
    return { primary: 'L1', secondary: 'L2', depth: 'shallow' };
  }
  if (maxTokens < 15000 || taskType === 'design') {
    return { primary: 'L2', secondary: 'L3', depth: 'medium' };
  }
  if (maxTokens < 30000 || taskType === 'review') {
    return { primary: 'L3', secondary: 'L4', depth: 'deep' };
  }
  return { primary: 'L4', secondary: 'all', depth: 'full' };
}
```

---

## 2. Token 优化策略

### 2.1 代码压缩技术

#### 2.1.1 压缩模式对比

| 模式 | 描述 | Token 节省 | 适用场景 |
|------|------|-----------|---------|
| **Full** | 完整代码 | 0% | 关键算法审查 |
| **Signature** | 仅签名，省略实现 | 60-70% | API 理解、接口设计 |
| **Minimal** | 仅名称和类型 | 80-85% | 架构概览、依赖分析 |
| **Smart** | 智能选择（基于重要性） | 40-60% | 通用场景 |

#### 2.1.2 TypeScript 专用压缩规则

```typescript
// 原始代码
class UserService {
  private readonly userRepository: UserRepository;
  private readonly logger: Logger;
  
  constructor(userRepository: UserRepository, logger: Logger) {
    this.userRepository = userRepository;
    this.logger = logger;
  }
  
  async getUserById(id: string): Promise<User | null> {
    this.logger.debug(`Fetching user: ${id}`);
    return this.userRepository.findById(id);
  }
}

// Signature 模式
class UserService {
  private readonly userRepository: UserRepository;
  private readonly logger: Logger;
  
  constructor(userRepository: UserRepository, logger: Logger);
  async getUserById(id: string): Promise<User | null>;
}

// Minimal 模式
class UserService {
  getUserById(id: string): Promise<User | null>;
}
```

### 2.2 智能代码选择算法

#### 2.2.1 重要性评分模型

```typescript
interface CodeImportanceScore {
  symbol: string;
  score: number;  // 0-100
  factors: {
    centrality: number;      // 依赖图中的中心性
    complexity: number;      // 圈复杂度
    usageCount: number;      // 被引用次数
    recency: number;         // 最近修改时间
    documentation: number;   // 文档完整性
  };
}

function calculateImportance(symbol: Symbol, graph: DependencyGraph): CodeImportanceScore {
  return {
    symbol: symbol.name,
    score: weightedSum([
      graph.betweennessCentrality(symbol) * 0.3,
      symbol.cyclomaticComplexity * 0.2,
      symbol.referenceCount * 0.2,
      recencyScore(symbol.lastModified) * 0.15,
      symbol.docCoverage * 0.15
    ]),
    factors: { /* ... */ }
  };
}
```

#### 2.2.2 上下文感知选择

```typescript
interface ContextAwareSelection {
  // 基于查询意图选择相关代码
  selectForQuery(query: string, codebase: Codebase): SelectedCode[] {
    const queryEmbedding = embed(query);
    const relevantSymbols = codebase.symbols
      .map(s => ({ symbol: s, similarity: cosineSimilarity(queryEmbedding, s.embedding) }))
      .filter(s => s.similarity > 0.7)
      .sort((a, b) => b.similarity - a.similarity);
    
    // 包含直接依赖和反向依赖
    return expandWithDependencies(relevantSymbols.slice(0, 20));
  }
}
```

### 2.3 Token 预算管理

```typescript
class TokenBudgetManager {
  private budget: number;
  private used: number = 0;
  
  constructor(totalBudget: number) {
    this.budget = totalBudget;
  }
  
  allocate(level: ContextLevel, priority: number): number {
    const allocation = Math.floor(this.budget * priority);
    this.used += allocation;
    return allocation;
  }
  
  // 预留 20% 作为缓冲
  getEffectiveBudget(): number {
    return Math.floor(this.budget * 0.8) - this.used;
  }
}

// 使用示例
const manager = new TokenBudgetManager(32000);
const l1Budget = manager.allocate('L1', 0.05);   // 1280 tokens
const l2Budget = manager.allocate('L2', 0.15);   // 3840 tokens
const l3Budget = manager.allocate('L3', 0.30);   // 7680 tokens
const l4Budget = manager.getEffectiveBudget();   // ~15000 tokens
```

---

## 3. 输出格式设计

### 3.1 推荐格式: Markdown + JSON 混合

**选择理由:**
- Markdown: LLM 友好，结构化清晰，易于阅读
- JSON: 机器可解析，支持元数据和结构化数据
- 混合: 兼顾可读性和可处理性

### 3.2 格式模板设计

```markdown
# CodeMap: {project_name}

## 元数据
```json
{
  "project": {
    "name": "codemap-core",
    "version": "1.0.0",
    "language": "typescript",
    "entryPoints": ["src/index.ts"],
    "totalFiles": 45,
    "totalLines": 3200
  },
  "generatedAt": "2024-01-15T10:30:00Z",
  "compressionMode": "smart",
  "tokenCount": 15234
}
```

## 目录结构
```
src/
├── core/                    # 核心分析引擎
│   ├── analyzer.ts         # [L3] 主分析器
│   └── parser.ts           # [L3] AST 解析器
├── models/                  # 数据模型
│   ├── symbol.ts           # [L3] 符号定义
│   └── graph.ts            # [L3] 依赖图
└── utils/                   # 工具函数
    └── helpers.ts          # [L2] 辅助函数
```

## 模块摘要

### Module: core/analyzer
**职责**: 代码分析主引擎，协调解析、分析和输出生成
**复杂度**: 高 (圈复杂度: 24)
**关键导出**:
- `CodeAnalyzer` (class) - 主分析器类
- `analyzeProject()` (function) - 项目分析入口

**依赖关系**:
```mermaid
graph LR
  analyzer --> parser
  analyzer --> symbol
  analyzer --> graph
```

### Module: models/symbol
**职责**: 定义代码符号的数据模型
**复杂度**: 中 (圈复杂度: 12)
**关键导出**:
- `Symbol` (interface) - 符号基接口
- `FunctionSymbol` (class) - 函数符号
- `ClassSymbol` (class) - 类符号

---

## 详细符号定义

### Class: CodeAnalyzer
**文件**: `src/core/analyzer.ts:15`
**行号**: 15-156

```typescript
class CodeAnalyzer {
  private parser: ASTParser;
  private symbolTable: SymbolTable;
  
  constructor(config: AnalyzerConfig);
  
  // 分析整个项目
  async analyzeProject(rootPath: string): Promise<ProjectAnalysis>;
  
  // 分析单个文件
  analyzeFile(filePath: string): FileAnalysis;
  
  // 获取符号依赖图
  getDependencyGraph(): DependencyGraph;
}
```

**方法详情**:

#### analyzeProject
```typescript
async analyzeProject(rootPath: string): Promise<ProjectAnalysis>
```
- **参数**: `rootPath` - 项目根目录
- **返回**: 项目分析结果
- **复杂度**: O(n) where n = file count
- **实现摘要**: 遍历目录，解析每个文件，构建符号表和依赖图

---

## 实现细节 (按需展开)

<details>
<summary>🔍 analyzer.ts - analyzeProject 实现</summary>

```typescript
async analyzeProject(rootPath: string): Promise<ProjectAnalysis> {
  const files = await this.scanFiles(rootPath);
  const analyses = await Promise.all(
    files.map(f => this.analyzeFile(f))
  );
  
  return {
    files: analyses,
    symbols: this.symbolTable.getAll(),
    dependencies: this.getDependencyGraph()
  };
}
```
</details>
```

### 3.3 元数据规范

```typescript
interface CodeMapMetadata {
  // 项目信息
  project: {
    name: string;
    version: string;
    language: 'typescript' | 'javascript' | 'python' | 'go' | 'rust';
    framework?: string;
    entryPoints: string[];
  };
  
  // 统计信息
  stats: {
    totalFiles: number;
    totalLines: number;
    totalSymbols: number;
    totalClasses: number;
    totalFunctions: number;
    totalInterfaces: number;
  };
  
  // 生成信息
  generation: {
    tool: string;
    version: string;
    timestamp: string;
    compressionMode: 'full' | 'signature' | 'minimal' | 'smart';
    tokenCount: number;
  };
  
  // 索引信息
  indices: {
    symbols: Record<string, SymbolLocation>;
    files: Record<string, FileSummary>;
    modules: Record<string, ModuleSummary>;
  };
}

interface SymbolLocation {
  file: string;
  line: number;
  column: number;
  endLine: number;
  level: 'L1' | 'L2' | 'L3' | 'L4';
}
```

---

## 4. 与 AI Agent 的交互协议

### 4.1 CodeMap 引用协议

#### 4.1.1 引用格式

```typescript
// 标准引用格式: codemap://{type}/{identifier}[@{file}:{line}]

// 引用符号
codemap://symbol/CodeAnalyzer.analyzeProject@src/core/analyzer.ts:42

// 引用文件
codemap://file/src/core/analyzer.ts

// 引用模块
codemap://module/core/analyzer

// 引用行范围
codemap://range/src/core/analyzer.ts:15-50
```

#### 4.1.2 引用解析器

```typescript
class CodeMapReference {
  static parse(ref: string): Reference {
    const match = ref.match(/^codemap:\/\/([^\/]+)\/(.+)$/);
    if (!match) throw new Error('Invalid reference');
    
    const [, type, identifier] = match;
    const [path, location] = identifier.split('@');
    
    return { type, path, location };
  }
  
  static resolve(ref: string, codemap: CodeMap): ResolvedContent {
    const parsed = this.parse(ref);
    
    switch (parsed.type) {
      case 'symbol':
        return codemap.findSymbol(parsed.path);
      case 'file':
        return codemap.getFileContent(parsed.path);
      case 'module':
        return codemap.getModuleSummary(parsed.path);
      case 'range':
        return codemap.getRange(parsed.path, parsed.location);
    }
  }
}
```

### 4.2 代码跳转协议

```typescript
interface CodeJumpRequest {
  from: {
    file: string;
    line: number;
    column: number;
  };
  target: string;  // 符号名称或引用
  action: 'definition' | 'references' | 'implementation' | 'type';
}

interface CodeJumpResponse {
  targets: Array<{
    file: string;
    line: number;
    column: number;
    context: string;  // 周围代码片段
  }>;
  relationships: 'defines' | 'references' | 'implements' | 'extends';
}

// 使用示例
const jumpRequest: CodeJumpRequest = {
  from: { file: 'src/app.ts', line: 15, column: 23 },
  target: 'CodeAnalyzer',
  action: 'definition'
};

// Agent 可以请求: "跳转到 CodeAnalyzer 的定义"
// 返回: codemap://symbol/CodeAnalyzer@src/core/analyzer.ts:15
```

### 4.3 增量更新协议

```typescript
interface IncrementalUpdate {
  // 变更类型
  type: 'added' | 'modified' | 'deleted' | 'renamed';
  
  // 变更位置
  location: {
    file: string;
    lineRange: [number, number];
  };
  
  // 变更内容 (diff 格式)
  diff: string;
  
  // 影响分析
  impact: {
    affectedSymbols: string[];
    affectedFiles: string[];
    breakingChanges: boolean;
  };
  
  // 建议的上下文更新
  suggestedContextUpdate: {
    reloadLevels: ('L1' | 'L2' | 'L3' | 'L4')[];
    priorityFiles: string[];
  };
}

// 增量更新通知示例
const update: IncrementalUpdate = {
  type: 'modified',
  location: { file: 'src/core/analyzer.ts', lineRange: [42, 56] },
  diff: `@@ -42,7 +42,8 @@ async analyzeProject(...) {
-    const files = await this.scanFiles(rootPath);
+    const files = await this.scanFiles(rootPath, { recursive: true });
     const analyses = await Promise.all(`,
  impact: {
    affectedSymbols: ['CodeAnalyzer.analyzeProject'],
    affectedFiles: ['src/core/analyzer.ts'],
    breakingChanges: false
  },
  suggestedContextUpdate: {
    reloadLevels: ['L4'],
    priorityFiles: ['src/core/analyzer.ts']
  }
};
```

### 4.4 Agent 交互流程图

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  AI Agent   │────▶│ CodeMap API │────▶│  CodeMap    │
│             │◀────│             │◀────│   Engine    │
└─────────────┘     └─────────────┘     └─────────────┘
       │
       │ 1. 请求上下文
       │    "给我 UserService 的定义"
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  Agent: GET codemap://symbol/UserService              │
│                                                      │
│  CodeMap: 返回 L3 级别的符号定义                      │
│  {
│    "symbol": "UserService",
│    "type": "class",
│    "location": "src/services/user.ts:10",
│    "definition": "class UserService { ... }",
│    "methods": [...]
│  }
└──────────────────────────────────────────────────────┘
       │
       │ 2. 请求实现细节
       │    "给我 getUserById 的实现"
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  Agent: GET codemap://symbol/UserService.getUserById  │
│         ?level=L4                                     │
│                                                      │
│  CodeMap: 返回 L4 级别的完整实现                      │
└──────────────────────────────────────────────────────┘
       │
       │ 3. 代码跳转
       │    "查找 UserService 的所有引用"
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  Agent: GET codemap://references/UserService          │
│                                                      │
│  CodeMap: 返回引用列表                                │
└──────────────────────────────────────────────────────┘
```

---

## 5. RAG 集成建议

### 5.1 向量存储架构

```
┌─────────────────────────────────────────────────────────────┐
│                      RAG Pipeline                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │ CodeMap     │───▶│ Embedding   │───▶│ Vector Store    │ │
│  │ Generator   │    │ Model       │    │ (Chroma/Pinecone)│ │
│  └─────────────┘    └─────────────┘    └─────────────────┘ │
│         │                              │                    │
│         │                              │                    │
│         ▼                              ▼                    │
│  ┌─────────────┐                ┌─────────────────┐         │
│  │ Graph Store │                │ Retrieval API   │         │
│  │ (Neo4j)     │                │                 │         │
│  └─────────────┘                └─────────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 代码向量化策略

#### 5.2.1 多粒度向量化

```typescript
interface CodeEmbedding {
  // 不同粒度的嵌入
  embeddings: {
    // 项目级: 整体架构描述
    project: number[];      // 描述整个项目
    
    // 模块级: 模块职责和接口
    module: number[];       // 描述模块功能
    
    // 符号级: 函数/类的语义
    symbol: number[];       // 描述符号语义
    
    // 代码级: 实现细节
    code: number[];         // 描述代码实现
  };
  
  // 元数据
  metadata: {
    symbol: string;
    type: 'class' | 'function' | 'interface';
    file: string;
    lineRange: [number, number];
  };
}

// 向量化策略
class CodeEmbeddingStrategy {
  async embedSymbol(symbol: Symbol): Promise<CodeEmbedding> {
    return {
      embeddings: {
        project: await this.embedText(this.generateProjectContext(symbol)),
        module: await this.embedText(this.generateModuleContext(symbol)),
        symbol: await this.embedText(this.generateSymbolDescription(symbol)),
        code: await this.embedText(symbol.getSourceCode())
      },
      metadata: this.extractMetadata(symbol)
    };
  }
  
  private generateSymbolDescription(symbol: Symbol): string {
    return `
      Symbol: ${symbol.name}
      Type: ${symbol.type}
      Documentation: ${symbol.documentation}
      Signature: ${symbol.signature}
      Purpose: ${symbol.purpose || 'N/A'}
    `;
  }
}
```

#### 5.2.2 混合检索策略

```typescript
interface HybridSearchResult {
  // 语义搜索结果
  semantic: Array<{
    symbol: string;
    score: number;
    embedding: number[];
  }>;
  
  // 图搜索结果
  graph: Array<{
    symbol: string;
    path: string[];  // 依赖路径
    relationship: string;
  }>;
  
  // 关键词搜索结果
  keyword: Array<{
    symbol: string;
    matches: string[];
    tfidf: number;
  }>;
}

class HybridCodeRetriever {
  async retrieve(query: string, options: RetrieveOptions): Promise<HybridSearchResult> {
    const queryEmbedding = await this.embed(query);
    
    // 并行执行三种检索
    const [semantic, graph, keyword] = await Promise.all([
      this.semanticSearch(queryEmbedding, options.topK),
      this.graphSearch(query, options.maxDepth),
      this.keywordSearch(query, options.topK)
    ]);
    
    // 融合结果
    return this.fuseResults({ semantic, graph, keyword });
  }
  
  private fuseResults(results: HybridSearchResult): RankedResult[] {
    // RRF (Reciprocal Rank Fusion)
    const scores = new Map<string, number>();
    
    results.semantic.forEach((r, i) => {
      scores.set(r.symbol, (scores.get(r.symbol) || 0) + 1 / (60 + i));
    });
    
    results.graph.forEach((r, i) => {
      scores.set(r.symbol, (scores.get(r.symbol) || 0) + 1 / (60 + i));
    });
    
    results.keyword.forEach((r, i) => {
      scores.set(r.symbol, (scores.get(r.symbol) || 0) + 1 / (60 + i));
    });
    
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([symbol, score]) => ({ symbol, score }));
  }
}
```

### 5.3 推荐向量存储方案

| 存储类型 | 推荐方案 | 适用场景 | 优缺点 |
|---------|---------|---------|-------|
| **向量数据库** | ChromaDB / Pinecone | 语义搜索 | 高效相似度检索，需额外部署 |
| **图数据库** | Neo4j | 依赖关系 | 关系查询强，学习成本高 |
| **混合存储** | PostgreSQL + pgvector | 综合场景 | 一体化方案，性能中等 |
| **内存索引** | HNSW (hnswlib) | 小规模 | 速度快，无法持久化 |

### 5.4 RAG 查询优化

```typescript
interface RAGQueryOptimizer {
  // 查询扩展
  expandQuery(query: string): string[] {
    // 同义词扩展
    // 代码术语扩展
    // 上下文扩展
    return [
      query,
      this.addCodeContext(query),
      this.addSynonyms(query)
    ];
  }
  
  // 结果重排序
  rerank(results: SearchResult[], query: string): SearchResult[] {
    // 基于代码结构的重排序
    // 基于重要性的重排序
    // 基于相关性的重排序
    return results.sort((a, b) => {
      const scoreA = this.calculateRelevance(a, query);
      const scoreB = this.calculateRelevance(b, query);
      return scoreB - scoreA;
    });
  }
}
```

---

## 6. Prompt 模板示例

### 6.1 代码摘要生成 Prompt

```markdown
# Role
You are an expert code analyzer specializing in TypeScript/JavaScript projects. 
Your task is to generate concise, accurate summaries of code symbols.

# Task
Generate a structured summary for the provided code symbol.

# Input Format
```typescript
// Symbol to analyze
{SYMBOL_CODE}

// Context
- File: {FILE_PATH}
- Line: {LINE_RANGE}
- Type: {SYMBOL_TYPE}  // class, function, interface, etc.
- Parent: {PARENT_SYMBOL}  // if applicable
```

# Output Format
Respond with a JSON object:

```json
{
  "name": "symbol name",
  "type": "class|function|interface|type|enum|variable",
  "purpose": "One-sentence description of what this symbol does",
  "responsibility": "Detailed description of responsibilities",
  "parameters": [
    {
      "name": "param name",
      "type": "param type",
      "description": "what this parameter represents",
      "optional": true|false
    }
  ],
  "returns": {
    "type": "return type",
    "description": "what the function returns"
  },
  "sideEffects": ["list of side effects, if any"],
  "throws": ["exceptions that may be thrown"],
  "examples": ["usage examples"],
  "dependencies": ["symbols this depends on"],
  "complexity": "low|medium|high",
  "tags": ["relevant tags like 'async', 'pure', 'deprecated'"]
}
```

# Guidelines
1. Be concise but complete
2. Focus on "what" and "why", not "how"
3. Use technical terminology appropriately
4. Include type information for TypeScript
5. Mark optional parameters clearly
6. Identify pure functions vs those with side effects

# Example Input
```typescript
class UserService {
  async getUserById(id: string): Promise<User | null> {
    this.logger.debug(`Fetching user: ${id}`);
    return this.userRepository.findById(id);
  }
}
```

# Example Output
```json
{
  "name": "getUserById",
  "type": "method",
  "purpose": "Retrieves a user by their unique identifier",
  "responsibility": "Fetches user data from the repository and returns it. Logs the operation for debugging.",
  "parameters": [
    {
      "name": "id",
      "type": "string",
      "description": "Unique identifier of the user",
      "optional": false
    }
  ],
  "returns": {
    "type": "Promise<User | null>",
    "description": "The user object if found, null otherwise"
  },
  "sideEffects": ["Logs debug message"],
  "throws": [],
  "examples": ["const user = await userService.getUserById('123')"],
  "dependencies": ["userRepository", "logger"],
  "complexity": "low",
  "tags": ["async"]
}
```

Now analyze the following symbol:

{SYMBOL_CODE}
```

### 6.2 模块摘要生成 Prompt

```markdown
# Role
You are a software architect analyzing TypeScript module structures.

# Task
Generate a high-level summary of a code module.

# Input
- Module path: {MODULE_PATH}
- Files in module: {FILE_LIST}
- Exported symbols: {EXPORT_LIST}
- Dependencies: {DEPENDENCY_LIST}

# Output Format
```json
{
  "name": "module name",
  "purpose": "One-sentence description",
  "responsibility": "What this module is responsible for",
  "keyExports": ["list of most important exports"],
  "architecture": "description of internal structure",
  "dependencies": ["external dependencies"],
  "dependents": ["modules that depend on this"],
  "complexity": "low|medium|high",
  "cohesion": "low|medium|high",
  "recommendations": ["suggested improvements"]
}
```

# Guidelines
1. Focus on module's role in the system
2. Identify the main abstraction
3. Assess module cohesion
4. Suggest improvements if applicable
```

### 6.3 代码审查 Prompt

```markdown
# Role
You are a senior code reviewer with expertise in TypeScript best practices.

# Task
Review the provided code changes and provide constructive feedback.

# Input
```typescript
// Original code
{ORIGINAL_CODE}

// Modified code
{MODIFIED_CODE}

// Context
- File: {FILE_PATH}
- Change type: {CHANGE_TYPE}  // add, modify, delete
- Related symbols: {RELATED_SYMBOLS}
```

# Output Format
```json
{
  "summary": "Brief summary of the change",
  "issues": [
    {
      "severity": "error|warning|info",
      "category": "type-safety|performance|security|readability|maintainability",
      "message": "Description of the issue",
      "suggestion": "How to fix it",
      "line": 42
    }
  ],
  "positives": ["Good practices observed"],
  "suggestions": ["General improvement suggestions"],
  "questions": ["Clarifying questions"]
}
```

# Review Checklist
- [ ] Type safety: Are types correct and complete?
- [ ] Error handling: Are errors properly handled?
- [ ] Performance: Any obvious performance issues?
- [ ] Security: Any security concerns?
- [ ] Testing: Is the code testable?
- [ ] Documentation: Is the code self-documenting?
- [ ] Consistency: Does it follow project conventions?
```

### 6.4 架构分析 Prompt

```markdown
# Role
You are a software architect analyzing system architecture.

# Task
Analyze the project structure and provide architectural insights.

# Input
```
{PROJECT_STRUCTURE}
{MODULE_DEPENDENCIES}
{KEY_SYMBOLS}
```

# Output Format
```json
{
  "architecturePattern": "Detected pattern (e.g., layered, hexagonal, microservices)",
  "layers": [
    {
      "name": "layer name",
      "responsibility": "what this layer does",
      "modules": ["modules in this layer"],
      "dependencies": ["layers this depends on"]
    }
  ],
  "strengths": ["architectural strengths"],
  "concerns": ["potential issues"],
  "recommendations": ["suggested improvements"],
  "metrics": {
    "coupling": "low|medium|high",
    "cohesion": "low|medium|high",
    "complexity": "low|medium|high"
  }
}
```

# Analysis Dimensions
1. Layer separation and boundaries
2. Dependency direction
3. Abstraction levels
4. Module cohesion
5. Interface design
6. Scalability considerations
```

---

## 7. 实现建议

### 7.1 技术栈推荐

| 组件 | 推荐方案 | 备选方案 |
|------|---------|---------|
| **AST 解析** | TypeScript Compiler API | Babel, SWC |
| **向量嵌入** | OpenAI text-embedding-3 | sentence-transformers |
| **向量存储** | ChromaDB | Pinecone, Weaviate |
| **图存储** | Neo4j | ArangoDB |
| **缓存** | Redis | 内存缓存 |
| **API 服务** | Fastify / Express | NestJS |

### 7.2 性能优化建议

1. **增量分析**: 只分析变更的文件
2. **缓存策略**: 缓存解析结果和嵌入向量
3. **并行处理**: 并行解析多个文件
4. **流式输出**: 大文件分块处理
5. **懒加载**: L4 级别按需加载

### 7.3 错误处理策略

```typescript
interface ErrorHandlingStrategy {
  // 解析错误
  parseError: 'skip' | 'partial' | 'fail';
  
  // 嵌入错误
  embeddingError: 'fallback' | 'skip' | 'retry';
  
  // 检索错误
  retrievalError: 'expand' | 'fallback' | 'fail';
}
```

---

## 8. 总结

本方案提供了 CodeMap 系统与 LLM 集成的完整设计，包括:

1. **四级分层上下文**: 从项目概览到实现细节的渐进式信息暴露
2. **Token 优化策略**: 多种压缩模式和智能选择算法
3. **混合输出格式**: Markdown + JSON 兼顾可读性和可处理性
4. **标准化交互协议**: 引用、跳转、增量更新的统一接口
5. **RAG 集成方案**: 多粒度向量化和混合检索策略
6. **Prompt 模板库**: 覆盖摘要生成、代码审查、架构分析等场景

### 下一步行动

1. 实现核心 CodeMap 生成器
2. 集成向量存储和嵌入服务
3. 开发 Agent 交互 API
4. 建立 Prompt 模板库
5. 性能测试和优化
