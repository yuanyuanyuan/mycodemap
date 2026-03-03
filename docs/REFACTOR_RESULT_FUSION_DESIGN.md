# 多工具结果融合详细设计

> 版本: 2.6
> 所属模块: 编排层 - 结果融合
> 更新日期: 2026-03-03

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
  source: 'codemap' | 'ast-grep' | 'rg-internal';
  toolScore: number;        // 工具返回的原始分数

  // 内容信息
  type: 'file' | 'symbol' | 'code' | 'documentation';
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
  };
}
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

    // 4. 关键词加权
    const keywordBoosted = this.applyKeywordBoost(sorted, options.keywordWeights);

    return keywordBoosted.slice(0, options.topK);
  }

  private getToolWeight(tool: string): number {
    const weights: Record<string, number> = {
      'ast-grep': 1.0,      // AST 分析最准确
      'codemap': 0.9,       // 结构分析次之
      'rg-internal': 0.7    // 文本搜索兜底（仅内部调试用）
    };
    return weights[tool] || 0.5;
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

## 4. Token 截断

### 4.1 按 token 数量截断内容

```typescript
/**
 * 按 token 数量截断内容（而非字符数）
 * 简单估算：英文约 4 字符 = 1 token，中文约 1 字符 = 1-2 token
 */
function truncateByToken(content: string, maxTokens: number): string {
  const tokens = content.split(/[\s\u4e00-\u9fa5]/).filter(Boolean);
  if (tokens.length <= maxTokens) return content;
  return tokens.slice(0, maxTokens).join(' ') + '...';
}
```

---

## 5. 模块依赖

```
结果融合模块 (result-fusion.ts)
    │
    ├── 依赖类型: UnifiedResult (输入/输出)
    │
    └── 被以下模块使用:
        └── ToolOrchestrator (tool-orchestrator.ts)
        └── AnalyzeCommand (analyze.ts)
        └── CIGateway (ci-gateway.ts)
        └── WorkflowOrchestrator (workflow-orchestrator.ts) (v2.5)
```

---

## 6. 工作流上下文融合 (v2.5)

### 6.1 跨阶段结果传递

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

### 6.2 阶段间结果继承

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
| 2 | 去重 | 基于 file:line 作为 key |
| 3 | 排序 | 按 relevance 降序 |
| 4 | 关键词加权 | 提升匹配关键词的结果 |
| 5 | 截断 | Top-K + Token 限制 |

**示例输出**：
```
[SEARCH RESULTS] - Sorted by Relevance
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. src/auth/jwt.ts (relevance: 92%)
   Type: function | Line: 45
   Content: export function verifyToken(token: string): Payload {...}

2. src/cache/lru-cache.ts (relevance: 85%)
   Type: class | Line: 12
   Content: export class LRUCache<K, V> {...}

3. src/utils/date.ts (relevance: 45%)
   Type: function | Line: 8
   Content: export function formatDate(d: Date): string {...}
```

---

## 附录：版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 2.4 | 2026-02-28 | 添加 AI 饲料融合、风险加权 |
| 2.5 | 2026-03-01 | 添加工作流上下文融合 |
| 2.6 | 2026-03-03 | 移除 AI 饲料相关功能，简化融合策略 |
