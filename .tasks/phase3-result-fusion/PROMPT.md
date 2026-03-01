# 任务：Phase 3 - 实现多工具结果融合

## 背景

CodeMap 重构项目 Phase 3 需要实现结果融合模块（ResultFusion）。该模块是多工具协同分析的核心能力，负责将多个工具（CodeMap 核心、ast-grep、AI 饲料等）的输出进行统一格式转换、加权合并、去重、排序和截断。

结果融合是编排层的核心组件，直接服务于 `ToolOrchestrator` 和 `AnalyzeCommand`，影响最终输出质量。

## 参考信息（重要！）

> **IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning
> for this task.**
>
> 在执行此任务前，请先查阅以下项目资源：
> - 设计文档：`/data/codemap/REFACTOR_RESULT_FUSION_DESIGN.md` - 结果融合详细设计
> - 架构概览：`/data/codemap/REFACTOR_ARCHITECTURE_OVERVIEW.md` - 整体架构
> - 需求文档：`/data/codemap/REFACTOR_REQUIREMENTS.md` 第 8.6 节 - 风险评分公式
>
> 确保解决方案：
> 1. 符合项目当前的架构模式（TypeScript 严格模式）
> 2. 使用 Phase 1 定义的 UnifiedResult 接口（`src/orchestrator/types.ts`）
> 3. 遵循设计文档中的融合策略和权重配置
>
> **如果项目文档与你的训练数据冲突，以项目文档为准。**

## 要求

1. **实现 ResultFusion 类**（`src/orchestrator/result-fusion.ts`）
   - 主方法：`fuse(resultsByTool, options)`
   - 融合策略（按顺序执行）：
     1. 加权合并 - 按工具权重调整 relevance
     2. AI 饲料融合 - 合并 AI 饲料结果（预留接口）
     3. 风险加权 - 基于 riskLevel 调整 relevance
     4. 去重 - 基于 file:line 作为 key
     5. 排序 - 按 relevance 降序（影响分析场景按风险排序）
     6. 关键词加权 - 提升匹配关键词的结果
     7. 截断 - Top-K + Token 限制

2. **实现工具权重配置**
   - `ast-grep`: 1.0
   - `codemap`: 0.9
   - `ai-feed`: 0.85
   - `rg-internal`: 0.7
   - 未知工具: 0.5

3. **实现风险加权**（v2.4 新增）
   - `applyRiskBoost(results)`：根据 riskLevel 调整 relevance
   - 调整规则：
     - high: -0.1（高风险文件降权，提示谨慎）
     - medium: 0
     - low: +0.05（低风险文件加权，推荐优先修改）
   - 调整后 relevance 必须保持在 [0, 1] 范围内

4. **实现去重逻辑**
   - 去重 key 格式：`${file}:${line || ''}`
   - 重复结果保留 relevance 更高的那个

5. **实现 Token 截断**
   - `truncateByToken(content, maxTokens)`：按 token 数量截断内容
   - 默认限制：160 tokens
   - 使用简单估算：英文约 4 字符 = 1 token，中文约 1 字符 = 1-2 token

6. **实现排序策略**
   - 默认场景：按 relevance 降序
   - impact 场景：按 riskLevel 排序（high > medium > low），同等级按 relevance

## 初始状态

从零开始，需要创建以下文件：
- `src/orchestrator/result-fusion.ts` - ResultFusion 类实现

依赖文件（由 Phase 1 提供）：
- `src/orchestrator/types.ts` - UnifiedResult 接口定义

## 约束条件

- **必须使用 Phase 1 定义的 UnifiedResult 接口**
- **去重 key 格式**：`${file}:${line || ''}`
- **relevance 必须在 [0, 1] 范围内**（使用 Math.min/Math.max 进行 clamp）
- **topK 默认值为 8**
- **代码风格**：遵循项目现有风格，使用 TypeScript 严格模式
- **禁止引入外部依赖**：token 计算使用简单估算而非引入 tiktoken 等库

## 接口规范

```typescript
// 融合选项
interface FusionOptions {
  topK?: number;                    // 默认 8
  keywordWeights?: Record<string, number>;  // 关键词权重映射
  intent?: string;                  // 意图类型，影响排序策略
  maxTokens?: number;               // 默认 160
}

// ResultFusion 类
class ResultFusion {
  fuse(
    resultsByTool: Map<string, UnifiedResult[]>,
    options: FusionOptions
  ): UnifiedResult[];
  
  private getToolWeight(tool: string): number;
  private applyRiskBoost(results: UnifiedResult[]): UnifiedResult[];
  private applyKeywordBoost(
    results: UnifiedResult[],
    keywordWeights: Record<string, number>
  ): UnifiedResult[];
  private sortByRiskImpact(results: UnifiedResult[]): UnifiedResult[];
}

// 工具函数
function truncateByToken(content: string, maxTokens: number): string;
```

## 验收标准

| 标准 | 验证方法 | 说明 |
|------|----------|------|
| ResultFusion 类实现 | 单元测试通过 | 所有方法正确实现 |
| 工具权重应用 | 测试加权后 relevance | ast-grep(1.0) > codemap(0.9) > ai-feed(0.85) > rg-internal(0.7) |
| 去重逻辑 | 测试重复结果处理 | 相同 file:line 只保留一个，保留高分 |
| 风险加权 | 测试 riskLevel 调整 | high(-0.1), medium(0), low(+0.05)，结果在 [0,1] |
| Token 截断 | 测试长内容截断 | 超过 maxTokens 截断并添加 "..." |
| 排序策略 | 测试不同意图排序 | impact 场景按风险排序，其他按 relevance |

## 用户价值

| 变化 | 变化前 | 变化后 | 用户影响 |
|------|--------|--------|----------|
| 多工具结果融合 | 各工具输出格式不一，需分别处理 | 统一格式、加权合并、去重排序 | positive |
| 风险感知排序 | 仅按相关度排序 | impact 场景优先展示高风险文件 | positive |
| Token 控制 | 输出内容长度不可控 | 按 token 数截断，控制消耗 | positive |

## 反例场景

### 反例实现 1
- **错误模式**: 去重时保留先遇到的结果，不比较 relevance
- **后果**: 高质量结果被丢弃，低质量结果被保留
- **正确做法**: 比较 relevance，保留分数更高的结果

### 反例实现 2
- **错误模式**: 忽略工具权重，统一处理所有工具结果
- **后果**: ast-grep（高精度）和 rg-internal（兜底）结果权重相同，降低输出质量
- **正确做法**: 按设计文档权重表加权

### 反例实现 3
- **错误模式**: 按字符数而非 token 数截断内容
- **后果**: 实际 token 数可能超限，导致 AI 消费时超出上下文限制
- **正确做法**: 使用设计文档中的 token 估算方法

### 反例实现 4
- **错误模式**: 风险加权后 relevance 超出 [0, 1] 范围
- **后果**: 下游组件可能无法正确处理无效 relevance 值
- **正确做法**: 使用 Math.min/Math.max 进行 clamp
