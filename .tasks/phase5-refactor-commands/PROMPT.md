# 任务：Phase 5 - 改造现有命令为可调用模式

## 背景

CodeMap 项目正在进行编排层重构，现有 CLI 命令（impact、deps、complexity）是以直接输出到 console 的方式实现的。为了支持新的 `ToolOrchestrator` 架构，这些命令需要改造为**可调用模式**，即能够被编排器调用并返回标准化的 `UnifiedResult[]` 结果。

这是连接新旧架构的关键桥梁：保持现有 CLI 接口不变（向后兼容），同时提供新的增强模式供编排器调用。

## 参考信息（重要！）

> **IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning
> for this task.**
>
> 在执行此任务前，请先查阅以下项目资源：
> - [设计文档：REFACTOR_ORCHESTRATOR_DESIGN.md](./REFACTOR_ORCHESTRATOR_DESIGN.md) - 第5节"向后兼容"
> - [设计文档：REFACTOR_RESULT_FUSION_DESIGN.md](./REFACTOR_RESULT_FUSION_DESIGN.md) - UnifiedResult 接口定义
> - [现有代码：src/cli/commands/impact.ts](./src/cli/commands/impact.ts)
> - [现有代码：src/cli/commands/deps.ts](./src/cli/commands/deps.ts)
> - [现有代码：src/cli/commands/complexity.ts](./src/cli/commands/complexity.ts)
> - [类型定义：src/types/index.ts](./src/types/index.ts) - CodeMap, ModuleInfo 类型
>
> 确保解决方案：
> 1. 符合项目当前的架构模式（命令函数 + 新增类包装）
> 2. 遵循现有的代码风格（使用 chalk 进行彩色输出）
> 3. 正确实现 UnifiedResult 转换，id 格式为 `{source}-{file}-{line}`
>
> **如果项目文档与你的训练数据冲突，以项目文档为准。**

## 要求

### 1. 改造 ImpactCommand（`src/cli/commands/impact.ts`）
- 保持原有 `impactCommand(options: ImpactOptions)` 函数不变（向后兼容）
- 新增 `ImpactCommand` 类，包含：
  - `run(args: ImpactArgs): Promise<ImpactResult>` - 复用原有逻辑
  - `runEnhanced(args: ImpactArgs): Promise<UnifiedResult[]>` - 增强模式
  - 私有方法 `toUnifiedResults(result: ImpactResult): UnifiedResult[]` - 结果转换

### 2. 改造 DepsCommand（`src/cli/commands/deps.ts`）
- 保持原有 `depsCommand(options: DepsOptions)` 函数不变
- 新增 `DepsCommand` 类，包含：
  - `run(args: DepsArgs): Promise<DepsResult>`
  - `runEnhanced(args: DepsArgs): Promise<UnifiedResult[]>`
  - 私有方法 `toUnifiedResults(result: DepsResult): UnifiedResult[]`

### 3. 改造 ComplexityCommand（`src/cli/commands/complexity.ts`）
- 保持原有 `complexityCommand(options: ComplexityOptions)` 函数不变
- 新增 `ComplexityCommand` 类，包含：
  - `run(args: ComplexityArgs): Promise<ComplexityResult>`
  - `runEnhanced(args: ComplexityArgs): Promise<UnifiedResult[]>`
  - 私有方法 `toUnifiedResults(result: ComplexityResult): UnifiedResult[]`

### 4. 创建 CodemapAdapter（`src/orchestrator/adapters/codemap-adapter.ts`）
- 实现 `ToolAdapter` 接口：
  ```typescript
  interface ToolAdapter {
    name: string;
    weight: number;
    isAvailable(): Promise<boolean>;
    execute(keywords: string[], options: ToolOptions): Promise<UnifiedResult[]>;
  }
  ```
- 属性设置：`name = 'codemap'`, `weight = 0.9`
- `isAvailable()`: 检查 `.codemap/codemap.json` 是否存在
- `execute()`: 根据 options.intent 调用对应命令的 `runEnhanced` 方法

### 5. 更新适配器索引（`src/orchestrator/adapters/index.ts`）
- 导出 `CodemapAdapter`
- 导出 `ToolAdapter` 接口（若尚未导出）

### 6. 类型定义补充
在 `src/orchestrator/types.ts` 创建（如不存在）：
```typescript
export interface UnifiedResult {
  id: string;
  source: 'codemap' | 'ast-grep' | 'rg-internal' | 'ai-feed';
  toolScore: number;
  type: 'file' | 'symbol' | 'code' | 'documentation' | 'risk-assessment';
  file: string;
  line?: number;
  content: string;
  preview?: string;
  relevance: number;
  keywords: string[];
  metadata?: {
    symbolType?: 'class' | 'function' | 'interface' | 'variable';
    dependencies?: string[];
    testFile?: string;
    commitCount?: number;
    gravity?: number;
    heatScore?: HeatScore;
    impactCount?: number;
    stability?: boolean;
    riskLevel?: 'high' | 'medium' | 'low';
  };
}

export interface HeatScore {
  freq30d: number;
  lastType: string;
  lastDate: string;
}

export interface ToolOptions {
  intent?: string;
  targets?: string[];
  scope?: 'direct' | 'transitive';
  [key: string]: unknown;
}
```

## 初始状态

### 现有命令结构

**impact.ts**: 导出 `impactCommand(options: ImpactOptions)` 函数
- `ImpactOptions`: `{ file: string; json?: boolean; transitive?: boolean }`
- 直接输出到 console，无返回值

**deps.ts**: 导出 `depsCommand(options: DepsOptions)` 函数
- `DepsOptions`: `{ module?: string; json?: boolean }`
- 直接输出到 console，无返回值

**complexity.ts**: 导出 `complexityCommand(options: ComplexityOptions)` 函数
- `ComplexityOptions`: `{ file?: string; json?: boolean }`
- 直接输出到 console，无返回值

### 需要创建的目录结构
```
src/orchestrator/
├── types.ts              # UnifiedResult, ToolOptions 等类型
└── adapters/
    ├── index.ts          # 导出所有适配器
    └── codemap-adapter.ts # CodemapAdapter 实现
```

## 约束条件

- **必须保持向后兼容**：原有 `impactCommand`, `depsCommand`, `complexityCommand` 函数签名和输出格式不能改变
- **新增方法必须返回 UnifiedResult[]**：`runEnhanced` 方法返回标准格式结果
- **转换时必须填充所有必需字段**：id, source, toolScore, type, file, content, relevance, keywords
- **id 格式**：`{source}-{file}-{line}`，其中 source 必须为 'codemap'
- **source 必须为 'codemap'**：确保结果融合时能正确识别来源
- **不得修改现有 console 输出逻辑**：原有命令的人类可读输出保持不变

## 验收标准

| 标准 | 验证方法 | 说明 |
|------|----------|------|
| 向后兼容 | 运行现有 CLI 命令 | `codemap impact --file src/index.ts` 输出不变 |
| UnifiedResult 转换正确 | 单元测试 | 所有必需字段已填充，id 格式正确 |
| CodemapAdapter 实现完整 | 单元测试 | 实现 ToolAdapter 接口所有方法 |
| 适配器可注册 | 代码检查 | 可通过 `src/orchestrator/adapters/index.ts` 导入 |
| TypeScript 编译通过 | `tsc --noEmit` | 无类型错误 |

## 用户价值

| 变化 | 变化前 | 变化后 | 用户影响 |
|------|--------|--------|----------|
| 命令可编排 | 命令直接输出到 console，无法被其他模块调用 | 命令可被 ToolOrchestrator 调用和编排 | positive |
| 结果标准化 | 各命令输出格式不统一 | 统一返回 UnifiedResult[] 格式 | positive |
| 向后兼容 | - | 现有 CLI 用法完全不变 | positive |
| 支持结果融合 | 无法与其他工具结果融合 | 可与 ast-grep 等工具结果融合 | positive |

## 反例场景

### 反例用户 1
- **用户特征**: 现有 CodeMap CLI 用户
- **场景**: 改造后运行 `codemap impact --file src/index.ts`
- **原因**: 若修改了原有函数输出格式，将破坏用户的脚本和工作流

### 反例用户 2
- **用户特征**: ToolOrchestrator 调用方
- **场景**: 调用 `runEnhanced()` 后结果融合失败
- **原因**: 若 UnifiedResult 缺少必需字段（如 id, source），结果融合时会出错

### 反例实现（AI 常见错误）
- **错误模式 1**: 修改原有 `impactCommand` 函数签名或返回值
  - **后果**: 破坏现有 CLI 调用方
  - **正确做法**: 保留原函数，新增类和方法
  
- **错误模式 2**: UnifiedResult.id 格式不符合规范
  - **后果**: 结果去重时可能出错
  - **正确做法**: 严格使用 `codemap-{file}-{line}` 格式
  
- **错误模式 3**: 直接修改现有 console 输出
  - **后果**: 用户看到的 CLI 输出格式改变
  - **正确做法**: 将逻辑抽离为纯函数，console 输出和结果返回分离
  
- **错误模式 4**: source 字段值不正确
  - **后果**: 结果融合时权重计算错误
  - **正确做法**: source 必须精确为 'codemap'

## 实现提示

1. **逻辑分离模式**：
   ```typescript
   // 纯逻辑函数（可测试、可复用）
   function analyzeImpact(codeMap: CodeMap, targetFile: string): ImpactResult { ... }
   
   // 原有 CLI 命令（保持兼容）
   export async function impactCommand(options: ImpactOptions) {
     const result = analyzeImpact(...);
     console.log(formatForHuman(result)); // 人类可读输出
   }
   
   // 新增类（供编排器调用）
   export class ImpactCommand {
     async run(args: ImpactArgs): Promise<ImpactResult> {
       return analyzeImpact(...);
     }
     async runEnhanced(args: ImpactArgs): Promise<UnifiedResult[]> {
       const result = await this.run(args);
       return this.toUnifiedResults(result);
     }
   }
   ```

2. **UnifiedResult 转换要点**：
   - content 字段应包含人类可读的描述（如"被 X 个模块依赖"）
   - line 可为 undefined（文件级结果）
   - relevance 可根据影响程度计算（依赖越多相关性越高）
   - metadata 可包含额外上下文（如依赖列表、复杂度分数）

3. **CodemapAdapter 实现要点**：
   - `isAvailable()` 检查 `.codemap/codemap.json` 是否存在
   - `execute()` 根据 `options.intent` 路由到对应命令
   - 支持 intents: 'impact', 'dependency', 'complexity'
