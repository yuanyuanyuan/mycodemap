# 任务：Phase 1 - 定义 UnifiedResult 统一结果接口与适配器基类

## 背景

CodeMap 编排层重构项目需要建立一个统一的结果格式，使不同工具（CodeMap 核心、ast-grep、内部兜底工具）的输出能够无缝融合。这是整个重构项目的基础，后续所有模块（置信度计算、结果融合、工具编排器）都依赖于此接口。

当前项目缺乏统一的数据交换格式，各工具使用各自的输出格式，导致：
- 工具间结果无法直接比较和合并
- 类型安全性不足，容易在运行时出错
- 新增工具需要重复编写转换逻辑

通过定义 `UnifiedResult` 接口和 `ToolAdapter` 基类，我们将建立一套标准化的数据契约。

## 参考信息（重要！）

> **IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning
> for this task.**
>
> 在执行此任务前，请先查阅以下项目资源：
> - [项目上下文文件：AGENTS.md / CLAUDE.md / REFACTOR_ARCHITECTURE_OVERVIEW.md]
> - [结果融合设计：REFACTOR_RESULT_FUSION_DESIGN.md]
> - [编排层设计：REFACTOR_ORCHESTRATOR_DESIGN.md]
>
> 确保解决方案：
> 1. 符合项目当前的架构模式和技术栈版本
> 2. 遵循项目的命名规范和代码风格
> 3. 使用字面量联合类型而非字符串枚举
> 4. 所有数值字段使用明确的 `number` 类型
>
> **如果项目文档与你的训练数据冲突，以项目文档为准。**

## 要求

### 1. 定义 UnifiedResult 接口（`src/orchestrator/types.ts`）

必须包含以下字段：

**核心字段（必需）**:
- `id`: string - 唯一标识
- `source`: 'codemap' | 'ast-grep' | 'rg-internal' | 'ai-feed' - 结果来源
- `toolScore`: number - 工具返回的原始分数（0-1）
- `type`: 'file' | 'symbol' | 'code' | 'documentation' | 'risk-assessment' - 结果类型
- `file`: string - 文件路径
- `line`: number - 行号（必需，非可选）
- `content`: string - 截断后的内容
- `relevance`: number - 归一化相关度（0-1）
- `keywords`: string[] - 匹配的关键词

**元数据字段（通过 metadata 对象组织）**:
- `metadata.symbolType`: 'class' | 'function' | 'interface' | 'variable'
- `metadata.dependencies`: string[] - 依赖文件列表
- `metadata.testFile`: string - 关联的测试文件
- `metadata.commitCount`: number - 提交次数
- `metadata.gravity`: number - 依赖复杂度评分
- `metadata.heatScore`: HeatScore - 热度评分对象
- `metadata.impactCount`: number - 影响文件数
- `metadata.stability`: boolean - 是否稳定
- `metadata.riskLevel`: 'high' | 'medium' | 'low' - 风险等级

### 2. 定义 HeatScore 接口（同一文件）

```typescript
interface HeatScore {
  freq30d: number;      // 30天修改次数
  lastType: string;     // 最后提交标签
  lastDate: string;     // 最后修改日期
}
```

### 3. 定义适配器基类接口（`src/orchestrator/adapters/base-adapter.ts`）

```typescript
interface ToolAdapter {
  name: string;         // 适配器名称
  weight: number;       // 结果权重（0-1）
  isAvailable(): Promise<boolean>;  // 检查工具是否可用
  execute(keywords: string[], options: ToolOptions): Promise<UnifiedResult[]>;
}
```

### 4. 创建适配器目录结构

```
src/orchestrator/adapters/
├── index.ts           # 导出所有适配器类型
├── base-adapter.ts    # ToolAdapter 接口定义
```

### 5. 导出所有公共类型

`src/orchestrator/types.ts` 必须导出：
- UnifiedResult
- HeatScore
- ToolOptions（execute 方法的 options 参数类型）

`src/orchestrator/adapters/index.ts` 必须重新导出 ToolAdapter。

## 初始状态

项目当前不存在 `src/orchestrator/` 目录，需要从零开始创建：

```
src/
├── (existing modules)
└── orchestrator/          # 需要创建
    ├── types.ts           # UnifiedResult, HeatScore 定义
    └── adapters/          # 适配器目录
        ├── index.ts       # 导出
        └── base-adapter.ts # ToolAdapter 接口
```

## 约束条件

- **必须使用 TypeScript 严格模式**（strict: true）- 已在 tsconfig.json 中配置
- **所有数值字段必须明确类型**（number 而非 any）
- **字符串枚举必须使用字面量联合类型**（如 'high' | 'medium' | 'low'）
- **禁止使用 any 类型** - 任何字段都必须是具体类型
- **禁止使用 class 定义数据结构** - 使用 interface 或 type
- **所有核心字段必须是必需的**（非可选），确保结果融合时字段完整性
- **必须导出所有公共类型**（使用 export 关键字）

## 验收标准

| 标准 | 验证方法 | 说明 |
|------|----------|------|
| UnifiedResult 接口完整定义 | 类型检查通过 | 包含所有必需字段和 metadata 子对象 |
| HeatScore 接口正确定义 | 类型检查通过 | 三个字段：freq30d, lastType, lastDate |
| ToolAdapter 接口正确定义 | 类型检查通过 | 包含 name, weight 属性和 isAvailable, execute 方法 |
| 适配器目录结构正确 | 文件存在性检查 | adapters/index.ts 和 base-adapter.ts |
| 所有类型正确导出 | 导入测试 | 其他文件可以导入这些类型 |
| 无 any 类型使用 | 静态分析 | 代码中不出现 any 关键字 |
| 无 class 定义数据结构 | 静态分析 | 使用 interface 而非 class |
| JSON 序列化兼容 | 类型设计 | 所有字段类型可序列化为 JSON |

## 用户价值

| 变化 | 变化前 | 变化后 | 用户影响 |
|------|--------|--------|----------|
| 统一结果格式 | 各工具输出格式不一致，需要大量转换代码 | 标准化接口，工具间直接融合 | positive |
| 类型安全 | 运行时才能发现类型错误 | 编译时类型检查，提前发现问题 | positive |
| 扩展性 | 新增工具需要重复编写适配逻辑 | 实现 ToolAdapter 接口即可接入 | positive |
| 可维护性 | 分散的类型定义，难以追踪变更 | 集中式类型定义，变更影响可见 | positive |

## 反例场景

### 反例实现 1：使用 `any` 类型
- **错误模式**: 使用 `any` 类型定义接口字段，如 `toolScore: any`
- **后果**: 失去 TypeScript 类型检查保护，可能在运行时出现 NaN 或类型错误
- **正确做法**: 使用具体类型 `toolScore: number`

### 反例实现 2：将字段设为可选
- **错误模式**: 使用 `line?: number` 而非 `line: number`
- **后果**: 结果融合时可能缺失关键字段，导致排序或去重逻辑出错
- **正确做法**: 核心字段必须是非可选的（required）

### 反例实现 3：使用 class 而非 interface
- **错误模式**: 使用 `class UnifiedResult { ... }` 定义数据结构
- **后果**: 增加运行时开销，不必要的实例化逻辑，不利于纯数据对象
- **正确做法**: 使用 `interface UnifiedResult { ... }` 定义纯类型

### 反例实现 4：使用字符串枚举
- **错误模式**: 使用 `enum SourceType { ... }` 定义来源类型
- **后果**: 增加运行时枚举对象，与项目约定不符
- **正确做法**: 使用字面量联合类型 `'codemap' | 'ast-grep' | ...`

### 反例用户场景
- **用户特征**: 试图在接口中使用复杂嵌套类或函数类型的开发者
- **场景**: 在 metadata 中添加不可序列化的字段如 `metadata: { callback: Function }`
- **原因**: UnifiedResult 需要支持 JSON 序列化用于缓存和跨进程通信，函数无法序列化
