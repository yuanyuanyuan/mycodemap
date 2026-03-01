# 多工具结果融合详细设计

> 版本: 2.5
> 所属模块: 编排层 - 结果融合
> 更新日期: 2026-02-28

---

## 1. 设计目标

所有工具的结果都转换为统一的中间格式，然后按统一规则处理（加权合并、去重、排序）。

---

## 2. 数据结构设计

### 2.1 统一结果格式

```typescript
// src/orchestrator/types.ts

interface UnifiedResult {
  // 唯一标识
  id: string;

  // 来源信息
  source: 'codemap' | 'ast-grep' | 'rg-internal' | 'ai-feed';
  toolScore: number;        // 工具返回的原始分数

  // 内容信息
  type: 'file' | 'symbol' | 'code' | 'documentation' | 'risk-assessment';
  file: string;
  line?: number;
  content: string;           // 截断后的内容
  preview?: string;          // 上下文预览

  // 语义信息
  relevance: number;          // 0-1 归一化相关度
  keywords: string[];         // 匹配的关键词

  // 元数据
  metadata?: {
    symbolType?: 'class' | 'function' | 'interface' | 'variable';
    dependencies?: string[];
    testFile?: string;
    commitCount?: number;
    // v2.4 新增: AI 饲料维度
    gravity?: number;         // 依赖复杂度
    heatScore?: HeatScore;    // 热度评分
    impactCount?: number;     // 影响文件数
    stability?: boolean;      // 是否稳定
    riskLevel?: 'high' | 'medium' | 'low';
  };
}

// v2.4 新增: 热度评分结构
interface HeatScore {
  freq30d: number;          // 30天修改次数
  lastType: string;         // 最后提交标签
  lastDate: string;         // 最后修改日期
}
```
```

---

## 3. 接口设计

### 3.1 结果融合类

```typescript
// src/orchestrator/result-fusion.ts

class ResultFusion {
  /**
   * 多工具结果融合
   * 策略：加权合并 → 去重 → 排序
   */
  fuse(
    resultsByTool: Map<string, UnifiedResult[]>,
    options: { topK: number; keywordWeights: Record<string, number> }
  ): UnifiedResult[] {
    // 1. 加权合并
    let allResults: UnifiedResult[] = [];
    for (const [tool, results] of resultsByTool) {
      const toolWeight = this.getToolWeight(tool);
      const weighted = results.map(r => ({
        ...r,
        relevance: r.relevance * toolWeight
      }));
      allResults = allResults.concat(weighted);
    }

    // 2. 去重（基于文件+行号）
    const seen = new Map<string, UnifiedResult>();
    for (const result of allResults) {
      const key = `${result.file}:${result.line || ''}`;
      if (!seen.has(key)) {
        seen.set(key, result);
      } else {
        // 保留分数更高的
        const existing = seen.get(key)!;
        if (result.relevance > existing.relevance) {
          seen.set(key, result);
        }
      }
    }

    // 3. 按相关度排序
    const sorted = Array.from(seen.values())
      .sort((a, b) => b.relevance - a.relevance);

    // 4. 风险加权（v2.4）
    const riskBoosted = this.applyRiskBoost(sorted);

    // 5. 关键词加权
    const keywordBoosted = this.applyKeywordBoost(riskBoosted, options.keywordWeights);

    return keywordBoosted.slice(0, options.topK);
  }

  private getToolWeight(tool: string): number {
    const weights: Record<string, number> = {
      'ast-grep': 1.0,      // AST 分析最准确
      'codemap': 0.9,       // 结构分析次之
      'ai-feed': 0.85,      // AI 饲料数据 (v2.4 新增)
      'rg-internal': 0.7    // 文本搜索兜底（仅内部调试用）
    };
    return weights[tool] || 0.5;
  }

  // v2.4 新增: 基于 AI 饲料的风险加权
  private applyRiskBoost(results: UnifiedResult[]): UnifiedResult[] {
    return results.map(r => {
      if (!r.metadata?.riskLevel) return r;
      
      // 高风险文件略微降权（提示用户谨慎）
      // 低风险文件略微加权（推荐优先修改）
      const riskBoost = {
        'high': -0.1,
        'medium': 0,
        'low': 0.05
      }[r.metadata.riskLevel] || 0;
      
      return {
        ...r,
        relevance: Math.max(0, Math.min(1, r.relevance + riskBoost))
      };
    });
  }

  /**
   * 应用关键词加权
   */
  private applyKeywordBoost(
    results: UnifiedResult[],
    keywordWeights: Record<string, number>
  ): UnifiedResult[] {
    if (Object.keys(keywordWeights).length === 0) {
      return results;
    }

    return results.map(r => {
      let boost = 0;
      for (const keyword of r.keywords) {
        boost += keywordWeights[keyword] || 0;
      }
      return {
        ...r,
        relevance: r.relevance + boost
      };
    }).sort((a, b) => b.relevance - a.relevance);
  }
}
```

---

## 4. AI 饲料结果融合 (v2.4 新增)

### 4.1 AI 饲料数据源

```typescript
// 将 AI 饲料转换为 UnifiedResult
function convertAIFeedToResults(feed: AIFeed[]): UnifiedResult[] {
  return feed.map(f => ({
    id: `ai-feed-${f.file}`,
    source: 'ai-feed',
    toolScore: f.gravity / 20,  // 归一化
    type: 'risk-assessment',
    file: f.file,
    content: formatAIFeedContent(f),
    relevance: calculateAIFeedRelevance(f),
    keywords: [f.heat.lastType, f.meta.why || ''].filter(Boolean),
    metadata: {
      gravity: f.gravity,
      heatScore: f.heat,
      impactCount: f.dependents.length,
      stability: f.meta.stable,
      riskLevel: calculateRiskLevel(f)
    }
  }));
}

function formatAIFeedContent(f: AIFeed): string {
  // 使用纯文本标记代替 emoji，确保机器可读性
  const riskFlag = f.meta.stable ? '[STABLE]' : f.heat.freq30d > 5 ? '[HIGH RISK]' : '[MEDIUM RISK]';
  return `${riskFlag} ${f.file}\n` +
         `   GRAVITY: ${f.gravity} | HEAT: ${f.heat.freq30d}/${f.heat.lastType}\n` +
         `   WHY: ${f.meta.why || 'N/A'}\n` +
         `   IMPACT: ${f.dependents.length} files depend on this`;
}

function calculateRiskLevel(f: AIFeed): 'high' | 'medium' | 'low' {
  // 风险评分公式以 REFACTOR_REQUIREMENTS.md 为单一真源
  // 此处实现应与需求文档保持一致
  const tagWeights: Record<string, number> = {
    BUGFIX: 0.9,
    FEATURE: 0.7,
    REFACTOR: 0.8,
    CONFIG: 0.5,
    DOCS: 0.2,
    DELETE: 0.1,
    UNKNOWN: 0.5
  };
  const gravityNorm = Math.min(f.gravity / 20, 1);
  const freqNorm = Math.min(f.heat.freq30d / 10, 1);
  const tagWeight = tagWeights[f.heat.lastType] ?? tagWeights.UNKNOWN;
  const stableBoost = f.meta.stable ? 0 : 0.15;
  const impactNorm = Math.min(f.dependents.length / 50, 1);
  const score = Math.min(
    Math.max(
      gravityNorm * 0.30 +
      freqNorm * 0.15 +
      tagWeight * 0.10 +
      stableBoost +
      impactNorm * 0.10,
      0
    ),
    1
  );

  if (score > 0.7) return 'high';
  if (score > 0.4) return 'medium';
  return 'low';
}
```

### 4.2 风险感知排序

在影响分析场景中，结合 AI 饲料数据优化结果排序：

```typescript
class ResultFusion {
  fuseWithAIFeed(
    resultsByTool: Map<string, UnifiedResult[]>,
    aiFeed: AIFeed[],
    options: { intent: string; topK: number }
  ): UnifiedResult[] {
    // 1. 转换 AI 饲料为 UnifiedResult
    const aiFeedResults = convertAIFeedToResults(aiFeed);
    
    // 2. 合并所有结果
    const allResults = [
      ...(resultsByTool.get('codemap') || []),
      ...(resultsByTool.get('ast-grep') || []),
      ...aiFeedResults
    ];
    
    // 3. 根据意图调整排序策略
    if (options.intent === 'impact') {
      // 影响分析场景：优先显示高风险文件
      return this.sortByRiskImpact(allResults).slice(0, options.topK);
    }
    
    // 4. 默认按相关度排序
    return allResults
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, options.topK);
  }
  
  private sortByRiskImpact(results: UnifiedResult[]): UnifiedResult[] {
    return results.sort((a, b) => {
      // 高风险优先
      const riskOrder = { 'high': 0, 'medium': 1, 'low': 2 };
      const riskDiff = riskOrder[a.metadata?.riskLevel || 'low'] - 
                       riskOrder[b.metadata?.riskLevel || 'low'];
      if (riskDiff !== 0) return riskDiff;
      
      // 同风险等级按相关度排序
      return b.relevance - a.relevance;
    });
  }
}
```

---

## 5. Token 截断

### 5.1 按 token 数量截断内容

```typescript
/**
 * 按 token 数量截断内容（而非字符数）
 * 使用 cl100k_base tokenizer 计量
 */
function truncateByToken(content: string, maxTokens: number): string {
  // 简单估算：英文约 4 字符 = 1 token，中文约 1 字符 = 1-2 token
  // 精确实现应使用 @anthropic-ai/tokenizer 或 tiktoken
  const tokens = content.split(/[\s\u4e00-\u9fa5]/).filter(Boolean);
  if (tokens.length <= maxTokens) return content;
  return tokens.slice(0, maxTokens).join(' ') + '...';
}
```

---

## 6. 模块依赖

```
结果融合模块 (result-fusion.ts)
    │
    ├── 依赖类型: UnifiedResult (输入/输出)
    ├── 依赖: AIFeed (v2.4 新增)
    │   └── 来源: AIFeedGenerator (ai-feed-generator.ts)
    │
    └── 被以下模块使用:
        └── ToolOrchestrator (tool-orchestrator.ts)
        └── AnalyzeCommand (analyze.ts)
        └── CIGateway (ci-gateway.ts) (v2.4 新增)
        └── WorkflowOrchestrator (workflow-orchestrator.ts) (v2.5 新增)
```

---

## 8. 工作流上下文融合 (v2.5 规划)

### 8.1 跨阶段结果传递

在工作流中，每个阶段的分析结果需要传递给下一阶段：

```typescript
// 工作流上下文中的结果缓存

interface WorkflowFusionContext {
  phaseResults: Map<WorkflowPhase, UnifiedResult[]>;
  accumulatedContext: Map<string, UnifiedResult>;
}

// 跨阶段结果合并策略
class WorkflowResultFusion {
  /**
   * 将新阶段结果与已有上下文合并
   */
  mergeWithContext(
    newResults: UnifiedResult[],
    context: WorkflowFusionContext
  ): UnifiedResult[] {
    // 1. 合并所有历史结果
    const allResults = [
      ...Array.from(context.phaseResults.values()).flat(),
      ...newResults
    ];

    // 2. 应用工作流特定的加权
    const workflowWeighted = this.applyWorkflowWeights(allResults, context);

    // 3. 按工作流阶段优先级排序
    return this.sortByWorkflowPriority(workflowWeighted);
  }

  /**
   * 工作流阶段权重
   * 越近期的阶段权重越高
   */
  private applyWorkflowWeights(
    results: UnifiedResult[],
    context: WorkflowFusionContext
  ): UnifiedResult[] {
    const phaseWeights: Record<WorkflowPhase, number> = {
      'reference': 0.8,
      'impact': 0.9,
      'risk': 1.0,
      'implementation': 0.7,
      'commit': 0.6,
      'ci': 0.5
    };

    return results.map(r => {
      // 根据结果来源确定阶段权重
      const sourcePhase = this.inferPhase(r.source);
      const weight = phaseWeights[sourcePhase] || 0.5;

      return {
        ...r,
        relevance: r.relevance * weight
      };
    });
  }
}
```

### 8.2 阶段间结果继承

```typescript
// 阶段间的结果继承逻辑

class PhaseInheritance {
  /**
   * 获取下一阶段应该继承的结果
   */
  getInheritedResults(
    currentPhase: WorkflowPhase,
    allResults: UnifiedResult[]
  ): UnifiedResult[] {
    switch (currentPhase) {
      case 'reference':
        // 影响分析继承参考搜索的结果
        return allResults.filter(r =>
          r.source === 'ast-grep' || r.source === 'codemap'
        );

      case 'impact':
        // 风险评估继承影响分析 + 参考搜索
        return allResults;

      case 'risk':
        // 代码实现继承所有分析结果
        return allResults;

      default:
        return allResults;
    }
  }
}
```

---

## 7. 融合策略总结

| 阶段 | 策略 | 说明 |
|------|------|------|
| 1 | 加权合并 | 按工具权重调整 relevance |
| 2 | AI 饲料融合 | 转换并合并 AI 饲料数据 (v2.4 新增) |
| 3 | 风险加权 | 基于 GRAVITY/HEAT/IMPACT 调整 (v2.4 新增) |
| 4 | 去重 | 基于 file:line 作为 key |
| 5 | 排序 | 按 relevance 降序（影响分析场景按风险排序）|
| 6 | 关键词加权 | 提升匹配关键词的结果 |
| 7 | 截断 | Top-K + Token 限制 |

### v2.4 新增: 风险感知融合

在影响分析场景中，结果融合会：
1. **优先展示高风险文件**（火山灰文件）
2. **标注稳定文件**（沉积岩文件，可安全修改）
3. **提供 WHY 上下文**（回答苏格拉底问题）

**示例输出**（影响分析）：
```
[IMPACT ANALYSIS] - Sorted by Risk Level
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[HIGH RISK] (caution when modifying):
   * src/auth/jwt.ts (relevance: 85%)
     GRAVITY: 15 | HEAT: 8/BUGFIX/2026-02-19
     WHY: 处理JWT验证，因第三方Token刷新策略变更频繁不稳定
     IMPACT: 15 files depend on this

[MEDIUM RISK]:
   * src/cache/lru-cache.ts (relevance: 92%)
     GRAVITY: 8 | HEAT: 3/FEATURE/2026-02-15
     WHY: LRU缓存实现，核心性能组件
     IMPACT: 6 files depend on this

[LOW RISK] (safe to modify):
   * src/utils/date.ts (relevance: 45%)
     GRAVITY: 0 | HEAT: 0/NEW/never
     WHY: 日期工具函数，项目早期沉淀
     IMPACT: 0 files depend on this
```
