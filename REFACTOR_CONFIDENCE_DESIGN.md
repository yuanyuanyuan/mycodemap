# 置信度机制详细设计

> 版本: 2.3
> 所属模块: 编排层 - 置信度计算

---

## 1. 设计原则

**核心思路**：不预测置信度，而是基于结果质量反推置信度。

借鉴搜索引擎的 Quality Score 模式，用结果数量、质量、场景匹配度三个维度计算置信度。

---

## 2. 数据结构设计

### 2.1 统一结果接口

```typescript
// src/orchestrator/confidence.ts

interface SearchResult {
  file: string;
  line?: number;
  content: string;
  score?: number;        // SearchResult 原始分数
  toolScore?: number;    // UnifiedResult 原始分数
  relevance?: number;    // UnifiedResult 归一化分数
  matches?: number;      // 匹配次数（仅 SearchResult）
}
```

### 2.2 置信度结果

```typescript
interface ConfidenceResult {
  score: number;         // 综合置信度 0-1
  level: 'high' | 'medium' | 'low';
  reasons: string[];    // 置信度判断的原因
}
```

---

## 3. 接口设计

### 3.1 辅助函数

```typescript
/**
 * 获取结果的相关度分数
 * 兼容 SearchResult 和 UnifiedResult 格式
 */
function getRelevance(result: SearchResult): number {
  // 优先使用 UnifiedResult 字段
  if (result.relevance !== undefined) return result.relevance;
  if (result.toolScore !== undefined) return result.toolScore;
  // 回退到 SearchResult 字段
  return result.score || 0;
}

/**
 * 获取结果的匹配次数
 */
function getMatchCount(result: SearchResult): number {
  return result.matches || 0;
}
```

### 3.2 置信度计算函数

```typescript
/**
 * 基于搜索结果质量计算置信度
 * - 结果数量评分 (40%): 有结果比少好，结果多比少好
 * - 结果质量评分 (40%): 高相关度结果占比
 * - 场景匹配评分 (20%): 特定场景的额外验证
 */
function calculateConfidence(
  results: SearchResult[],
  intent: IntentType
): ConfidenceResult {
  const reasons: string[] = [];

  // 1. 结果数量评分 (40%)
  const countScore = Math.min(results.length / 5, 1) * 0.4;
  if (results.length === 0) {
    reasons.push('无搜索结果');
  } else if (results.length >= 3) {
    reasons.push(`找到 ${results.length} 个相关结果`);
  }

  // 2. 结果质量评分 (40%)
  const qualityScore = results.length > 0
    ? (results.reduce((sum, r) => sum + getRelevance(r), 0) / results.length) * 0.4
    : 0;
  const topRelevance = results.length > 0 ? getRelevance(results[0]) : 0;
  if (results.length > 0 && topRelevance > 0.8) {
    reasons.push(`最高相关度 ${(topRelevance * 100).toFixed(0)}%`);
  }

  // 3. 场景特定评分 (20%)
  let scenarioScore = 0;
  switch (intent) {
    case 'impact':
      // 影响分析：需要找到依赖关系
      scenarioScore = results.some(r => getMatchCount(r) > 1) ? 0.2 : 0;
      if (scenarioScore > 0) reasons.push('发现多处引用');
      break;
    case 'search':
      // 搜索：高质量结果给予额外加分
      scenarioScore = topRelevance > 0.9 ? 0.2 : 0;
      break;
    case 'dependency':
      // 依赖：需要结构化依赖数据
      scenarioScore = results.length > 0 ? 0.2 : 0;
      break;
  }

  const totalScore = countScore + qualityScore + scenarioScore;

  return {
    score: totalScore,
    level: totalScore >= 0.6 ? 'high' : totalScore >= 0.3 ? 'medium' : 'low',
    reasons
  };
}
```

---

## 4. 阈值配置

### 4.1 意图类型定义

```typescript
type IntentType = 'impact' | 'dependency' | 'search' | 'documentation' |
                  'complexity' | 'overview' | 'refactor' | 'reference';
```

### 4.2 置信度阈值

```typescript
// 置信度阈值（按 intent 区分）
const CONFIDENCE_THRESHOLDS: Record<IntentType, { high: number; medium: number }> = {
  impact: { high: 0.7, medium: 0.4 },       // 结构化数据，要求高
  dependency: { high: 0.7, medium: 0.4 },   // 结构化数据，要求高
  search: { high: 0.5, medium: 0.25 },      // 文本搜索，容忍度较高
  documentation: { high: 0.5, medium: 0.25 }, // 文档搜索，容忍度较高
  complexity: { high: 0.6, medium: 0.3 },
  overview: { high: 0.6, medium: 0.3 },
  refactor: { high: 0.6, medium: 0.3 },
  reference: { high: 0.5, medium: 0.25 }    // 参考实现，容忍度较高
};

/**
 * 获取指定 intent 的阈值
 */
function getThreshold(intent: IntentType, level: 'high' | 'medium'): number {
  return CONFIDENCE_THRESHOLDS[intent]?.[level] ?? 0.5;
}
```

---

## 5. 模块依赖

```
置信度模块 (confidence.ts)
    │
    ├── 依赖类型: SearchResult (输入)
    ├── 依赖类型: IntentType (配置)
    ├── 输出类型: ConfidenceResult
    │
    └── 被以下模块使用:
        └── ToolOrchestrator (tool-orchestrator.ts)
```

---

## 6. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 置信度计算不准确 | 过度回退或回退不足 | 基于实际结果迭代调参 |
| 场景评分权重不合理 | 某些场景效果差 | 支持配置化权重 |
