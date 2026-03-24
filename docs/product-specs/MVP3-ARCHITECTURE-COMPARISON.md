# MVP3 架构对比：Before vs After

> 本文档对比展示 CodeMap MVP3 架构重构前后的差异

---

## 1. 架构总览对比

### Before (当前架构)

```
┌─────────────────────────────────────────────────────────────────┐
│                        当前架构 (v2.5)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      CLI Layer                          │   │
│  │   (命令解析 + 业务逻辑 + 输出格式化 混合在一起)            │   │
│  │                                                         │   │
│  │   cli/commands/generate.ts ──────┐                      │   │
│  │   cli/commands/query.ts  ────────┼── 直接调用核心        │   │
│  │   cli/commands/impact.ts ────────┘                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      Core Layer                         │   │
│  │   (分析器 + 依赖图构建 混合在一起)                        │   │
│  │                                                         │   │
│  │   core/analyzer.ts ────── 直接操作文件系统               │   │
│  │   core/global-index.ts                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     Parser Layer                        │   │
│  │   (仅支持 TS/JS/Go，扩展困难)                            │   │
│  │                                                         │   │
│  │   parser/index.ts ──────── 硬编码 TypeScript 逻辑        │   │
│  │   parser/smart-parser.ts                                  │   │
│  │   parser/fast-parser.ts                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Generator Layer                       │   │
│  │   (直接输出 JSON/Markdown，无抽象)                       │   │
│  │                                                         │   │
│  │   generator/index.ts ──── 硬编码文件输出                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ❌ 问题:                                                       │
│  - CLI 直接依赖 Core，难以测试                                  │
│  - 存储硬编码，无法切换图数据库                                   │
│  - 语言解析器扩展困难                                           │
│  - 业务逻辑分散在各命令中                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### After (MVP3 架构)

```
┌─────────────────────────────────────────────────────────────────┐
│                        MVP3 架构 (v3.0)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Layer 5: CLI Layer                                      │   │
│  │  - 仅负责: 命令解析、参数校验、格式化输出                   │   │
│  │  - 通过 Server Layer 执行业务                              │   │
│  │                                                          │   │
│  │   cli/commands/generate.ts ──────┐                       │   │
│  │   cli/commands/query.ts  ────────┼── 调用 Server 用例    │   │
│  │   cli/commands/viz.ts  ──────────┘                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Layer 4: Server Layer ⭐ 新增                            │   │
│  │  - 用例编排: GenerateCodeMap, QuerySymbol, etc.           │   │
│  │  - 应用服务: CodeMapService, QueryService                 │   │
│  │  - DTO 转换: Request/Response 映射                        │   │
│  │                                                          │   │
│  │   server/usecases/GenerateCodeMap.ts                     │   │
│  │   server/services/CodeMapService.ts                      │   │
│  │   server/dto/GenerateRequest.ts                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Layer 3: Domain Layer                                   │   │
│  │  - 核心实体: Project, Module, Symbol, Dependency          │   │
│  │  - 领域服务: AnalysisService (纯业务逻辑)                 │   │
│  │  - 仓储接口: ICodeGraphRepository                         │   │
│  │                                                          │   │
│  │   domain/entities/*.ts                                   │   │
│  │   domain/services/AnalysisService.ts                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Layer 2: Infrastructure Layer                           │   │
│  │                                                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │   Storage    │  │   Parser     │  │    Cache     │   │   │
│  │  │  (可插拔)    │  │ (14 种语言)  │  │   (多层)     │   │   │
│  │  │              │  │              │  │              │   │   │
│  │  │ • FileSystem │  │ • TypeScript │  │ • LRU        │   │   │
│  │  │ • KùzuDB ⭐  │  │ • Python ⭐  │  │ • File       │   │   │
│  │  │ • KùzuDB ⭐  │  │ • Java ⭐    │  │ • Incremental│   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Layer 1: Interface Layer                                │   │
│  │  - 类型定义、接口契约、配置类型                            │   │
│  │                                                          │   │
│  │   interface/types/*.ts                                   │   │
│  │   interface/config/*.ts                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ✅ 优势:                                                       │
│  - 依赖方向清晰: Interface → Infrastructure → Domain → Server → CLI │
│  - 存储可插拔: 支持文件系统、KùzuDB                              │
│  - 语言易扩展: 实现 ILanguageParser 即可添加新语言               │
│  - 业务内聚: Server Layer 统一管理用例                          │
│  - 可测试性: 每层可独立单元测试                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 存储层对比

### Before: 硬编码文件系统

```typescript
// ❌ 问题: 直接操作文件系统，无法扩展

// src/core/analyzer.ts
export async function analyze(options: AnalysisOptions): Promise<CodeMap> {
  // ... 分析逻辑
  
  // 直接写 JSON 文件
  await fs.writeFile(
    path.join(outputDir, 'codemap.json'),
    JSON.stringify(codeMap)
  );
  
  // 直接写 Markdown
  await fs.writeFile(
    path.join(outputDir, 'AI_MAP.md'),
    generateAIMap(codeMap)
  );
  
  return codeMap;
}

// ❌ 查询时重新读取文件
export async function querySymbol(name: string) {
  const codeMap = JSON.parse(
    await fs.readFile('codemap.json', 'utf-8')
  );
  // 线性扫描
  return codeMap.modules.flatMap(m => m.symbols).filter(s => s.name === name);
}
```

### After: 存储抽象接口

```typescript
// ✅ 通过接口抽象，支持多种后端

// src/infrastructure/storage/interfaces/IStorage.ts
export interface IStorage {
  saveCodeGraph(graph: CodeGraph): Promise<void>;
  loadCodeGraph(): Promise<CodeMap>;
  findSymbolByName(name: string): Promise<Symbol[]>;
  findCallers(functionId: string): Promise<Symbol[]>;
  calculateImpact(moduleId: string, depth: number): Promise<ImpactResult>;
  detectCycles(): Promise<Cycle[]>;
  // ...
}

// 使用方代码
export class CodeMapService {
  constructor(private storage: IStorage) {}
  
  async generate(request: GenerateRequest) {
    const codeGraph = await this.buildCodeGraph(request);
    await this.storage.saveCodeGraph(codeGraph); // 不关心具体存储
    return codeGraph;
  }
  
  async querySymbol(name: string) {
    return this.storage.findSymbolByName(name); // 可能走图数据库查询
  }
}

// 存储选择
const storage = await storageFactory.create({
  type: 'auto',  // 根据项目规模自动选择
  autoThresholds: {
    useGraphDBWhenFileCount: 500
  }
});
// < 500 文件: FileSystemStorage
// >= 500 文件: KuzuDBStorage
```

---

## 3. 语言支持对比

### Before: 硬编码 TypeScript

```typescript
// ❌ 问题: 解析逻辑硬编码，难以扩展新语言

// src/parser/index.ts
export async function parseFile(filePath: string): Promise<ModuleInfo> {
  const content = await readFileContent(filePath);
  
  // 只能解析 TypeScript
  const sourceFile = ts.createSourceFile(
    path.basename(filePath),
    content,
    ts.ScriptTarget.ES2022,
    true
  );
  
  const imports = extractImports(sourceFile); // TS 专用逻辑
  const exports = extractExports(sourceFile); // TS 专用逻辑
  
  return { imports, exports, ... };
}
```

### After: 可插拔语言解析器

```typescript
// ✅ 通过注册表管理，支持 14 种语言

// src/infrastructure/parser/interfaces/ILanguageParser.ts
export interface ILanguageParser {
  readonly languageId: LanguageId;
  readonly fileExtensions: string[];
  parseFile(filePath: string, content: string): Promise<ParseResult>;
  extractImports(content: string): Promise<Import[]>;
  extractSymbols(content: string): Promise<Symbol[]>;
}

// 使用方代码
export class AnalysisService {
  constructor(private parserRegistry: IParserRegistry) {}
  
  async analyzeFile(filePath: string, content: string) {
    // 自动根据扩展名选择解析器
    const parser = this.parserRegistry.getParserByFile(filePath);
    if (!parser) {
      throw new Error(`No parser for ${filePath}`);
    }
    
    return parser.parseFile(filePath, content);
  }
}

// 注册新语言只需一行
parserRegistry.register(new PythonParser());
parserRegistry.register(new JavaParser());
parserRegistry.register(new RustParser());
// ... 共 14 种语言
```

---

## 4. CLI 对比

### Before: 功能有限

```bash
# 基础命令
$ mycodemap generate
$ mycodemap query -s "symbolName"
$ mycodemap deps

# 输出: 静态文本文件
# - AI_MAP.md
# - CONTEXT.md
# - codemap.json
```

### After: 丰富的 CLI 可视化

```bash
# 树形视图
$ mycodemap viz tree --depth 3
📁 src/
├── 📁 cli/
│   ├── 📄 index.ts
│   └── 📁 commands/
└── 📁 core/
    └── 📄 analyzer.ts

# ASCII 依赖图
$ mycodemap viz deps --module src/core/analyzer.ts
src/core/analyzer.ts
├── src/parser/index.ts
├── src/cache/index.ts
└── src/types/index.ts

# 复杂度热力图
$ mycodemap viz heatmap --metric complexity
🔴 src/orchestrator/workflow.ts     ████████████████ 45
🟡 src/cli/commands/query.ts        ██████████ 28
🟢 src/cache/lru-cache.ts           ████ 12

# 带进度条的生成
$ mycodemap generate
[████████████████████] 85% | 正在分析 src/core/analyzer.ts
```

---

## 5. 依赖关系对比

### Before: 混乱的依赖

```
cli/commands/generate.ts ─────┬─────▶ core/analyzer.ts
                              │
cli/commands/query.ts ────────┤─────▶ core/analyzer.ts (重复依赖)
                              │
cli/commands/impact.ts ───────┘─────▶ core/analyzer.ts (重复依赖)

                              ↓
                    难以测试，难以替换实现
```

### After: 清晰的依赖

```
┌──────────────────────────────────────────────────────────┐
│  CLI Layer                                               │
│   ↓                                                      │
│   依赖: Server Layer 接口                                 │
└──────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│  Server Layer                                            │
│   ↓                                                      │
│   依赖: Domain Layer 接口                                 │
└──────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│  Domain Layer                                            │
│   ↓                                                      │
│   依赖: Interface Layer (类型定义)                        │
└──────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│  Infrastructure Layer                                    │
│   ↓                                                      │
│   依赖: Interface Layer (实现接口)                        │
└──────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│  Interface Layer (无依赖，纯类型定义)                      │
└──────────────────────────────────────────────────────────┘
```

---

## 6. 测试对比

### Before: 难以测试

```typescript
// ❌ 直接依赖文件系统，难以 mock
// cli/commands/generate.test.ts

it('should generate code map', async () => {
  // 无法隔离测试，必须操作真实文件
  await generateCommand({ output: '/tmp/test' });
  
  // 验证文件存在
  expect(fs.existsSync('/tmp/test/AI_MAP.md')).toBe(true);
});
// 测试慢，依赖外部环境
```

### After: 易于测试

```typescript
// ✅ 通过接口注入依赖，易于 mock
// server/usecases/GenerateCodeMap.test.ts

it('should generate code map', async () => {
  // Mock 存储
  const mockStorage = {
    saveCodeGraph: vi.fn(),
    loadCodeGraph: vi.fn()
  };
  
  // Mock 解析器
  const mockParser = {
    parseFile: vi.fn().mockResolvedValue({ ... })
  };
  
  // 注入依赖
  const useCase = new GenerateCodeMapUseCase(
    mockStorage,
    mockParser
  );
  
  // 执行
  const result = await useCase.execute({
    projectPath: '/tmp/test',
    mode: 'fast'
  });
  
  // 验证
  expect(mockStorage.saveCodeGraph).toHaveBeenCalled();
  expect(result.success).toBe(true);
});
// 测试快，完全隔离
```

---

## 7. 性能对比

| 指标 | Before | After | 提升 |
|------|--------|-------|------|
| 首次索引 (1000 文件) | ~30s | < 20s | 33% |
| 符号查询 | ~500ms | < 10ms (GraphDB) | 50x |
| 循环依赖检测 | ~3s | < 100ms (GraphDB) | 30x |
| 影响分析 | ~2s | < 50ms (GraphDB) | 40x |
| 内存占用 | ~500MB | ~400MB | 20% |

---

## 8. 扩展性对比

### 添加新存储后端

| 步骤 | Before | After |
|------|--------|-------|
| 1 | 修改多处代码 | 实现 `IStorage` 接口 |
| 2 | 处理兼容性问题 | 注册到 `StorageFactory` |
| 3 | 测试回归 | 复用现有测试套件 |
| **工作量** | **2-3 天** | **2-3 小时** |

### 添加新语言支持

| 步骤 | Before | After |
|------|--------|-------|
| 1 | 创建新文件，复制粘贴修改 | 实现 `ILanguageParser` |
| 2 | 修改 parser/index.ts | 注册到 `ParserRegistry` |
| 3 | 修改 cli 命令 | 自动识别文件扩展名 |
| **工作量** | **1-2 天** | **4-8 小时** |

---

## 9. 总结

```
┌─────────────────────────────────────────────────────────────────┐
│                     MVP3 架构重构价值                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🎯 架构清晰性                                                    │
│     - 5 层架构，每层职责单一                                      │
│     - 依赖方向明确，内层不依赖外层                                 │
│                                                                 │
│  🔌 可扩展性                                                      │
│     - 存储可插拔: 文件系统 / KùzuDB                               │
│     - 语言可扩展: 14 种语言支持                                   │
│     - 可视化可扩展: CLI / TUI / Web                               │
│                                                                 │
│  🧪 可测试性                                                      │
│     - 每层可独立单元测试                                          │
│     - 依赖注入，易于 mock                                         │
│     - 测试覆盖率提升至 > 80%                                      │
│                                                                 │
│  🚀 性能提升                                                      │
│     - 图数据库加速复杂查询 (10-50x)                                │
│     - Worker 线程并行解析                                         │
│     - 智能存储选择策略                                            │
│                                                                 │
│  👥 开发者体验                                                    │
│     - 丰富的 CLI 可视化                                           │
│     - 进度条和实时反馈                                            │
│     - 向后兼容，零成本迁移                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
