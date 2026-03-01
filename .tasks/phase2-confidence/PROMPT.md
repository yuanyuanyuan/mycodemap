# 任务：Phase 2 - 实现置信度计算机制

## 背景

CodeMap 编排层需要一套置信度机制来评估搜索结果的质量，并决定是否触发回退策略。置信度机制是智能工具调度的核心组件，它基于搜索结果的数量、质量和场景匹配度三个维度计算综合置信度分数。

置信度计算结果被用于：
- 判断是否继续当前工具链或触发回退
- 为用户提供结果可信度的透明度
- 决定工作流是否可以自动推进到下一阶段

**IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for this task.**

在执行此任务前，请先查阅以下项目资源：
- 置信度机制设计：`/data/codemap/REFACTOR_CONFIDENCE_DESIGN.md`
- 架构概览：`/data/codemap/REFACTOR_ARCHITECTURE_OVERVIEW.md`
- Phase 1 接口定义：`/data/codemap/src/orchestrator/types.ts`
- 现有项目结构：`/data/codemap/src/`

## 要求

1. **实现置信度计算函数**（`src/orchestrator/confidence.ts`）
   - 函数名：`calculateConfidence`
   - 输入：`SearchResult[]` 和 `IntentType`
   - 输出：`ConfidenceResult`（包含 score, level, reasons）
   - 计算维度：
     - 结果数量评分（40%）：基于结果数量计算，最高 5 个结果得满分
     - 结果质量评分（40%）：基于结果平均相关度计算
     - 场景匹配评分（20%）：基于 intent 类型的特定规则

2. **定义置信度阈值配置**
   - `IntentType` 联合类型：`'impact' | 'dependency' | 'search' | 'documentation' | 'complexity' | 'overview' | 'refactor' | 'reference'`
   - `CONFIDENCE_THRESHOLDS`：每种 intent 的 high/medium 阈值配置
   - `getThreshold` 辅助函数：获取指定 intent 和 level 的阈值

3. **实现辅助函数**
   - `getRelevance(result)`：获取结果相关度分数，兼容 SearchResult 和 UnifiedResult 格式（优先使用 `relevance`，其次 `toolScore`，最后 `score`）
   - `getMatchCount(result)`：获取结果匹配次数
   - `clamp(value, min, max)`：限制数值在指定范围内

4. **编写单元测试**
   - 测试各种 intent 类型的置信度计算
   - 测试边界条件（空结果、单个结果、多个结果）
   - 测试阈值判断（high/medium/low 三级）
   - 测试辅助函数的兼容性

## 初始状态

假设 Phase 1 已完成，`src/orchestrator/types.ts` 中已定义 UnifiedResult 接口。需要创建以下文件：
- `src/orchestrator/confidence.ts`（置信度计算核心）

## 约束条件

- **必须使用 Phase 1 定义的 UnifiedResult 接口中的字段结构**
- 置信度分数范围必须在 [0, 1] 之间，使用 clamp 函数限制
- 所有阈值必须可配置（使用常量定义，禁止硬编码魔法数字）
- 必须提供详细的 reasons 数组说明置信度来源
- 代码风格与现有 src/ 目录保持一致
- 使用 TypeScript 严格模式

## 验收标准

| 标准 | 验证方法 | 说明 |
|------|----------|------|
| calculateConfidence 函数实现 | 检查 confidence.ts | 函数签名正确，返回 ConfidenceResult |
| IntentType 定义完整 | 检查 confidence.ts | 包含全部 8 种 intent 类型 |
| 阈值配置正确 | 检查 CONFIDENCE_THRESHOLDS | 每种 intent 有 high/medium 阈值 |
| 辅助函数完整 | 检查代码 | getRelevance, getMatchCount, clamp 均实现 |
| 置信度计算逻辑正确 | 运行测试 | 数量/质量/场景三维度权重正确 |
| TypeScript 编译通过 | `npx tsc --noEmit` | 无类型错误 |
| 单元测试通过 | `npm test` | 测试覆盖率 > 80% |

## 用户价值

| 变化 | 变化前 | 变化后 | 用户影响 |
|------|--------|--------|----------|
| 置信度透明度 | 无法判断结果可信度 | 明确的 high/medium/low 分级 | positive - 用户知道何时需要进一步分析 |
| 智能回退 | 固定回退策略 | 基于置信度的动态回退 | positive - 减少不必要的工具调用 |
| 场景适配 | 所有场景使用相同阈值 | 按 intent 区分阈值 | positive - 更精准的置信度判断 |

## 反例场景

### 反例实现 1
- **错误模式**: 置信度分数超出 [0, 1] 范围
- **后果**: 阈值判断失效，可能永远回退或从不回退
- **正确做法**: 使用 clamp 函数限制分数范围

### 反例实现 2
- **错误模式**: 所有 intent 使用相同的置信度阈值
- **后果**: search 场景过度回退，impact 场景回退不足
- **正确做法**: 使用 CONFIDENCE_THRESHOLDS 按 intent 配置不同阈值

### 反例实现 3
- **错误模式**: reasons 数组为空或不提供详细说明
- **后果**: 用户无法理解置信度来源，无法调试
- **正确做法**: 根据计算逻辑填充详细的 reasons，如"找到 3 个相关结果"、"最高相关度 85%"

### 反例实现 4
- **错误模式**: 硬编码阈值魔法数字（如 `if (score > 0.6)`）
- **后果**: 难以维护和调整，与设计理念冲突
- **正确做法**: 使用 getThreshold 函数获取配置的阈值

## 参考实现

```typescript
// src/orchestrator/confidence.ts 参考结构

// 类型定义
type IntentType = 'impact' | 'dependency' | 'search' | 'documentation' | 
                  'complexity' | 'overview' | 'refactor' | 'reference';

interface ConfidenceResult {
  score: number;
  level: 'high' | 'medium' | 'low';
  reasons: string[];
}

// 阈值配置
const CONFIDENCE_THRESHOLDS = {
  impact: { high: 0.7, medium: 0.4 },
  dependency: { high: 0.7, medium: 0.4 },
  search: { high: 0.5, medium: 0.25 },
  // ... 其他 intent
};

// 核心函数
function calculateConfidence(results: SearchResult[], intent: IntentType): ConfidenceResult {
  // 1. 结果数量评分 (40%)
  // 2. 结果质量评分 (40%)
  // 3. 场景匹配评分 (20%)
  // 返回 { score, level, reasons }
}
```
