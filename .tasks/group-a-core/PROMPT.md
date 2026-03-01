# 任务：为核心模块生成测试套件

> **任务ID**: group-a-core-001  
> **优先级**: P0 - 核心基础设施  
> **预估工时**: 8小时  

---

## 1. 背景 (Background)

CodeMap 编排层重构需要为置信度计算模块 (`confidence.ts`) 和统一类型定义模块 (`types.ts`) 生成高质量的测试套件。这两个模块是整个编排层的基础，其可靠性直接影响上层工具编排和结果融合的准确性。

**Prefer retrieval-led reasoning over pre-training-led reasoning**: 生成测试时必须基于实际源码结构和设计文档，而非仅依赖预训练知识。

---

## 2. 目标文件 (Target Files)

| 文件路径 | 行数 | 职责 |
|----------|------|------|
| `/data/codemap/src/orchestrator/confidence.ts` | 173 | 置信度计算机制，8种意图类型的置信度评估 |
| `/data/codemap/src/orchestrator/types.ts` | 200 | 统一类型定义，包含类型守卫和辅助函数 |

---

## 3. 初始状态 (Initial State)

### 3.1 confidence.ts 结构

```typescript
// 核心导出
export function calculateConfidence(results: SearchResult[], intent: IntentType): ConfidenceResult
export type { IntentType, SearchResult, ConfidenceResult }
export { CONFIDENCE_THRESHOLDS, getThreshold, getRelevance, getMatchCount, clamp }

// 8种意图类型
type IntentType = 'impact' | 'dependency' | 'search' | 'documentation' | 
                  'complexity' | 'overview' | 'refactor' | 'reference'

// 置信度阈值配置（每个意图不同）
const CONFIDENCE_THRESHOLDS: Record<IntentType, { high: number; medium: number }>
```

### 3.2 types.ts 结构

```typescript
// 核心接口
export interface UnifiedResult { ... }
export interface CodemapOutput { ... }
export interface Confidence { ... }
export interface ConfidenceResult { ... }

// 类型守卫
export function isCodemapOutput(obj: unknown): obj is CodemapOutput

// 辅助函数
export function calculateConfidenceLevel(score: number): 'high' | 'medium' | 'low'
```

---

## 4. 约束条件 (Constraints)

### 4.1 测试框架要求
- **必须使用**: Vitest (项目已配置)
- **必须达到**: 100% 代码覆盖率 (行覆盖、分支覆盖、函数覆盖)
- **必须包含**: 类型安全测试 (使用 TypeScript 类型断言)

### 4.2 测试输出位置
```
src/orchestrator/__tests__/
├── confidence.test.ts    # confidence.ts 的测试
└── types.test.ts         # types.ts 的测试
```

### 4.3 代码规范
- 测试文件名格式: `{module}.test.ts`
- 使用 `describe` 分组，`it` 或 `test` 定义测试用例
- 必须包含 `expect` 断言
- 所有魔法数字必须解释其含义

### 4.4 禁止事项
- ❌ 禁止使用 `any` 类型绕过类型检查
- ❌ 禁止测试私有函数（除非通过模块导出）
- ❌ 禁止使用外部依赖进行测试数据生成（如 faker）

---

## 5. 详细要求 (Requirements)

### 5.1 confidence.ts 测试要求

#### R1: calculateConfidence 函数测试
- **R1.1** 测试空结果数组 (results.length === 0)
- **R1.2** 测试 1-5 个结果的最优数量范围
- **R1.3** 测试超过 5 个结果的情况（countScore 应该被限制在 1.0）
- **R1.4** 测试所有 8 种 intent 类型的场景评分逻辑
- **R1.5** 测试高/中/低置信度级别判定边界
- **R1.6** 测试 reasons 数组内容格式正确性

#### R2: 辅助函数测试
- **R2.1** `clamp()` 函数 - 测试值在范围内、小于最小值、大于最大值
- **R2.2** `getRelevance()` 函数 - 测试 relevance/toolScore/score 字段优先级
- **R2.3** `getMatchCount()` 函数 - 测试 keywords 数组存在和不存在的情况
- **R2.4** `getThreshold()` 函数 - 测试所有 intent 类型的高/中阈值

#### R3: 阈值配置测试
- **R3.1** 验证 CONFIDENCE_THRESHOLDS 包含全部 8 种 intent
- **R3.2** 验证每个 intent 的高阈值 > 中阈值
- **R3.3** 验证阈值范围在 [0, 1] 之间

### 5.2 types.ts 测试要求

#### R4: 类型守卫测试 (isCodemapOutput)
- **R4.1** 测试有效对象返回 true
- **R4.2** 测试 null/undefined 返回 false
- **R4.3** 测试缺少必需字段返回 false
- **R4.4** 测试错误类型字段返回 false（如 confidence.level 不是 'high'|'medium'|'low'）
- **R4.5** 测试可选字段缺失仍返回 true

#### R5: 辅助函数测试 (calculateConfidenceLevel)
- **R5.1** 测试边界值: score = 0.7 → 'high'
- **R5.2** 测试边界值: score = 0.4 → 'medium'
- **R5.3** 测试边界值: score = 0.399... → 'low'
- **R5.4** 测试极端值: score = 0, score = 1

#### R6: 类型兼容性测试
- **R6.1** 测试 UnifiedResult 接口的所有必需字段
- **R6.2** 测试 CodemapOutput 接口的结构正确性
- **R6.3** 测试 HeatScore 接口的字段类型

---

## 6. 验收标准 (Acceptance Criteria)

### 6.1 覆盖率标准
- [ ] 语句覆盖率 (Statements): 100%
- [ ] 分支覆盖率 (Branches): 100%
- [ ] 函数覆盖率 (Functions): 100%
- [ ] 行覆盖率 (Lines): 100%

### 6.2 测试数量标准
- [ ] confidence.test.ts 至少 25 个测试用例
- [ ] types.test.ts 至少 15 个测试用例
- [ ] 所有边界条件都有对应的测试

### 6.3 质量检查标准
- [ ] 测试代码通过 TypeScript 编译
- [ ] 测试代码通过 ESLint 检查
- [ ] 所有测试用例在 CI 环境中通过
- [ ] 测试文件包含适当的注释说明测试目的

---

## 7. 用户价值 (User Value)

1. **提升代码可靠性**: 100% 覆盖率确保核心逻辑经过充分验证
2. **支持后续重构**: 测试套件为未来的代码重构提供安全保障
3. **文档化行为**: 测试用例作为活文档，描述模块的预期行为
4. **加速问题定位**: 细粒度测试帮助快速定位回归问题

---

## 8. 反例场景 (Anti-patterns)

### ❌ 反例 1: 仅测试正常路径
```typescript
// 不好的测试 - 只测试正常情况
it('should calculate confidence', () => {
  const result = calculateConfidence([mockResult], 'search')
  expect(result.score).toBeGreaterThan(0)
})
```

### ❌ 反例 2: 硬编码预期值而无解释
```typescript
// 不好的测试 - 魔法数字无解释
it('should return correct threshold', () => {
  expect(getThreshold('search', 'high')).toBe(0.5) // 为什么是0.5？
})
```

### ❌ 反例 3: 测试相互依赖
```typescript
// 不好的测试 - 测试间共享可变状态
let sharedResults: SearchResult[] = []
beforeEach(() => { sharedResults = [...] })
```

### ✅ 正确做法
```typescript
// 好的测试 - 独立、有描述、覆盖边界
it('should return low confidence when results array is empty', () => {
  const result = calculateConfidence([], 'search')
  expect(result.level).toBe('low')
  expect(result.reasons).toContain('未找到任何结果')
})
```

---

## 9. 参考文档

- **设计文档**: `/data/codemap/docs/REFACTOR_CONFIDENCE_DESIGN.md`
- **架构概览**: `/data/codemap/docs/REFACTOR_ARCHITECTURE_OVERVIEW.md`
- **源文件**: 
  - `/data/codemap/src/orchestrator/confidence.ts`
  - `/data/codemap/src/orchestrator/types.ts`

---

## 10. 交付物清单

| 文件名 | 位置 | 说明 |
|--------|------|------|
| confidence.test.ts | src/orchestrator/__tests__/ | 置信度模块测试 |
| types.test.ts | src/orchestrator/__tests__/ | 类型模块测试 |
| coverage/ | 项目根目录/ | 覆盖率报告 |
