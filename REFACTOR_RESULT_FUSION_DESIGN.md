# 多工具结果融合详细设计

> 版本: 2.3
> 所属模块: 编排层 - 结果融合

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
  source: 'codemap' | 'ast-grep' | 'rg';
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
      'ast-grep': 1.0,   // AST 分析最准确
      'codemap': 0.9,    // 结构分析次之
      'rg': 0.7          // 文本搜索兜底
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

## 5. 模块依赖

```
结果融合模块 (result-fusion.ts)
    │
    ├── 依赖类型: UnifiedResult (输入/输出)
    │
    └── 被以下模块使用:
        └── ToolOrchestrator (tool-orchestrator.ts)
        └── AnalyzeCommand (analyze.ts)
```

---

## 6. 融合策略总结

| 阶段 | 策略 | 说明 |
|------|------|------|
| 1 | 加权合并 | 按工具权重调整 relevance |
| 2 | 去重 | 基于 file:line 作为 key |
| 3 | 排序 | 按 relevance 降序 |
| 4 | 关键词加权 | 提升匹配关键词的结果 |
| 5 | 截断 | Top-K + Token 限制 |
