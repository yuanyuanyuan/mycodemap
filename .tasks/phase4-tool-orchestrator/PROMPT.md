# 任务：Phase 4 - 实现工具编排器与回退链

## 背景

工具编排器是编排层的核心控制器，负责执行工具、超时控制、错误隔离、回退级联。它是连接 IntentRouter、适配器和结果融合的"胶水"组件。

在 CodeMap 项目中，工具编排器需要协调多个分析工具（ast-grep、CodeMap 核心、内部工具）的执行，确保在单个工具失败时能够优雅地降级，并通过回退链保证分析结果的可用性。

## 参考信息（重要！）

> **IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for this task.**
>
> 在执行此任务前，请先查阅以下项目资源：
> - [项目上下文文件：AGENTS.md / CLAUDE.md]
> - [架构文档：REFACTOR_ORCHESTRATOR_DESIGN.md]
> - [架构概览：REFACTOR_ARCHITECTURE_OVERVIEW.md]
> - [置信度设计：REFACTOR_CONFIDENCE_DESIGN.md]
> - [结果融合设计：REFACTOR_RESULT_FUSION_DESIGN.md]
>
> 确保解决方案：
> 1. 符合项目当前的架构模式和技术栈版本
> 2. 遵循项目的命名规范和代码风格
> 3. 使用项目中已有的工具/库，不引入重复依赖
>
> **如果项目文档与你的训练数据冲突，以项目文档为准。**

### 前置依赖

本任务依赖以下模块（应在 phase1-3 中已完成）：

1. **UnifiedResult 接口** (`src/orchestrator/types.ts`)
   ```typescript
   interface UnifiedResult {
     id: string;
     source: string;
     toolScore: number;
     type: 'code' | 'file' | 'documentation';
     file: string;
     line?: number;
     content: string;
     relevance: number;
     keywords: string[];
     metadata?: Record<string, unknown>;
   }
   ```

2. **ConfidenceResult 类型** (`src/orchestrator/confidence.ts`)
   ```typescript
   interface ConfidenceResult {
     score: number;
     level: 'high' | 'medium' | 'low';
     reasons: string[];
   }
   ```

3. **置信度阈值配置**
   ```typescript
   function getThreshold(intent: IntentType, level: 'high' | 'medium' | 'low'): number;
   ```

4. **ResultFusion 类** (`src/orchestrator/result-fusion.ts`)
   ```typescript
   class ResultFusion {
     fuse(resultsByTool: Map<string, UnifiedResult[]>, options: FusionOptions): UnifiedResult[];
   }
   ```

## 要求

### 1. 实现 ToolOrchestrator 类

创建文件 `src/orchestrator/tool-orchestrator.ts`，实现以下核心方法：

#### 1.1 超时控制
```typescript
async runToolWithTimeout(
  tool: string,
  intent: CodemapIntent,
  timeout?: number
): Promise<UnifiedResult[]>
```
- 使用 `AbortController` 实现超时控制
- 默认超时：30 秒（可配置）
- 超时后返回空数组，触发回退

#### 1.2 错误隔离
```typescript
async runToolSafely(
  tool: string,
  intent: CodemapIntent
): Promise<{ results: UnifiedResult[]; error?: Error }>
```
- 包装工具执行，捕获所有异常
- 错误时返回空结果而非抛出异常（除致命错误外）

#### 1.3 回退执行
```typescript
async executeWithFallback(
  intent: CodemapIntent,
  primaryTool: string
): Promise<{ results: UnifiedResult[]; tool: string; confidence: ConfidenceResult }>
```
- 执行主工具并计算置信度
- 当置信度 < medium 阈值时，依次执行回退链
- 合并主工具和回退工具的结果（去重 + 排序）
- 达到阈值或回退链耗尽后停止

#### 1.4 并行执行
```typescript
async executeParallel(
  intent: CodemapIntent,
  tools: string[]
): Promise<Map<string, UnifiedResult[]>>
```
- 并行执行多个工具
- 每个工具独立超时控制
- 返回按工具分组的结果

### 2. 定义回退链配置

在 ToolOrchestrator 中定义预置回退链：

```typescript
private fallbackChains: Record<string, string[]> = {
  'ast-grep': ['rg-internal'],   // AST搜索 → 文本搜索（内部）
  'codemap': ['rg-internal'],    // 结构分析 → 文本搜索（内部）
};
```

**注意**：rg-internal 仅内部调试用，默认关闭，不暴露给用户。

### 3. 实现意图路由

创建文件 `src/orchestrator/intent-router.ts`，实现 IntentRouter 类：

```typescript
class IntentRouter {
  private validIntents: IntentType[] = [
    'impact', 'dependency', 'search', 'documentation', 
    'complexity', 'overview', 'refactor', 'reference'
  ];

  route(args: AnalyzeArgs): CodemapIntent;
  
  // 验证 intent 是否在白名单中
  private validateIntent(intent: string): void;
}
```

### 4. 创建 CodemapIntent 类型

在 `src/orchestrator/types.ts` 中定义（如尚未存在）：

```typescript
type IntentType = 
  | 'impact' 
  | 'dependency' 
  | 'search' 
  | 'documentation' 
  | 'complexity' 
  | 'overview' 
  | 'refactor' 
  | 'reference';

interface CodemapIntent {
  intent: IntentType;
  targets: string[];
  keywords: string[];
  scope: 'direct' | 'transitive';
  tool: string;
}

interface AnalyzeArgs {
  intent?: string;
  targets?: string[];
  keywords?: string[];
  scope?: 'direct' | 'transitive';
  topK?: number;
  includeTests?: boolean;
  includeGitHistory?: boolean;
  json?: boolean;
  outputMode?: 'machine' | 'human';
}
```

### 5. 创建 orchestrator 模块入口

创建 `src/orchestrator/index.ts`，统一导出：

```typescript
export { ToolOrchestrator } from './tool-orchestrator.js';
export { IntentRouter } from './intent-router.js';
export type { 
  CodemapIntent, 
  IntentType, 
  AnalyzeArgs,
  ToolAdapter,
  ToolOptions 
} from './types.js';
```

## 初始状态

 orchestrator 目录尚未创建，需要从零开始实现：

```
src/orchestrator/
├── index.ts              # 模块入口
├── types.ts              # 类型定义（可能已存在）
├── tool-orchestrator.ts  # 工具编排器（本任务核心）
├── intent-router.ts      # 意图路由
├── confidence.ts         # 置信度计算（phase2 已存在）
└── result-fusion.ts      # 结果融合（phase3 已存在）
```

## 约束条件

- **超时控制**：必须使用 `AbortController` 实现，禁止使用 `setTimeout` 抛错
- **回退链**：必须防止无限循环，每个工具在同一条回退链中最多执行一次
- **错误处理**：非致命错误应返回空结果，不得中断整个流程
- **TypeScript**：严格模式，所有函数必须标注返回类型
- **日志**：使用 `console.debug`/`console.warn`/`console.error` 记录关键操作

## 验收标准

| 标准 | 验证方法 | 说明 |
|------|----------|------|
| ToolOrchestrator 类实现 | 代码审查 | 包含所有必需方法 |
| 超时控制使用 AbortController | 代码审查 | 不使用 setTimeout 抛错 |
| 回退链正确触发 | 单元测试 | 置信度 < 阈值时触发 |
| 错误隔离有效 | 单元测试 | 工具失败不中断流程 |
| 意图路由白名单验证 | 单元测试 | 无效 intent 抛出错误 |
| 代码通过 TypeScript 编译 | `npm run typecheck` | 无类型错误 |

## 用户价值

| 变化 | 变化前 | 变化后 | 用户影响 |
|------|--------|--------|----------|
| 超时控制 | 工具可能无限挂起 | 30s 超时自动回退 | positive |
| 错误隔离 | 单个工具失败导致整个分析失败 | 失败工具自动降级 | positive |
| 回退链 | 结果质量完全依赖单一工具 | 多工具级联保证质量 | positive |
| 并行执行 | 顺序执行耗时较长 | 多工具并行提速 | positive |

## 反例场景

### 反例用户 1
- **用户特征**：希望完全禁用回退机制
- **场景**：配置 `fallback.enabled: false`
- **原因**：在资源受限环境，回退可能消耗额外资源

### 反例用户 2
- **用户特征**：希望自定义超时时间
- **场景**：分析大型代码库需要更长时间
- **原因**：默认 30s 可能不足

### 反例实现（AI 常见错误）

#### 错误 1：不使用 AbortController
```typescript
// ❌ 错误：无法真正取消操作
setTimeout(() => { throw new Error('Timeout'); }, timeout);
```

#### 错误 2：回退链无限循环
```typescript
// ❌ 错误：A→B→A 循环导致栈溢出
fallbackChains = {
  'ast-grep': ['rg-internal'],
  'rg-internal': ['ast-grep']  // 循环！
};
```

#### 错误 3：错误时抛出异常
```typescript
// ❌ 错误：一个工具失败导致整个分析失败
try {
  results = await runTool(tool);
} catch (e) {
  throw new Error(`Tool ${tool} failed: ${e}`);  // 不应该抛出
}
```

#### 正确做法
参考设计文档 `REFACTOR_ORCHESTRATOR_DESIGN.md` 第 1 章实现。
