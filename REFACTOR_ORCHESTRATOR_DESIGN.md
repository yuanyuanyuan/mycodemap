# CLI 命令与编排层详细设计

> 版本: 2.3
> 所属模块: 编排层 - CLI 命令与工具编排器

---

## 1. 工具编排器设计

### 1.1 核心类

```typescript
// src/orchestrator/tool-orchestrator.ts

class ToolOrchestrator {
  // 超时配置（毫秒）
  private readonly DEFAULT_TIMEOUT = 30000;

  // 日志记录器
  private logger = console;

  // 预定义回退链（仅内部调试用，默认关闭）
  // 用户可见输出必须走 CodeMap 语义链路
  private fallbackChains: Record<string, string[]> = {
    'ast-grep': ['rg-internal'],   // AST搜索 → 文本搜索（内部）
    'codemap': ['rg-internal'],    // 结构分析 → 文本搜索（内部）
  };
}
```

### 1.2 超时控制

```typescript
/**
 * 带超时控制的工具执行
 */
async runToolWithTimeout(
  tool: string,
  intent: CodemapIntent,
  timeout: number = this.DEFAULT_TIMEOUT
): Promise<UnifiedResult[]> {
  try {
    this.logger.debug(`执行工具: ${tool}, 超时: ${timeout}ms`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const results = await this.runTool(tool, intent, { signal: controller.signal });
    clearTimeout(timeoutId);

    this.logger.debug(`工具 ${tool} 执行成功，返回 ${results.length} 条结果`);
    return results;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      this.logger.warn(`工具 ${tool} 执行超时 (${timeout}ms)`);
    } else {
      this.logger.error(`工具 ${tool} 执行失败: ${error}`);
    }
    // 超时或错误时返回空结果，触发回退
    return [];
  }
}
```

### 1.3 错误隔离

```typescript
/**
 * 错误隔离的工具执行
 */
async runToolSafely(
  tool: string,
  intent: CodemapIntent
): Promise<{ results: UnifiedResult[]; error?: Error }> {
  try {
    const results = await this.runToolWithTimeout(tool, intent);
    return { results };
  } catch (error) {
    this.logger.error(`工具 ${tool} 执行异常:`, error);
    return { results: [], error: error as Error };
  }
}
```

### 1.4 回退执行

```typescript
async executeWithFallback(
  intent: CodemapIntent,
  primaryTool: string
): Promise<{ results: UnifiedResult[]; tool: string; confidence: ConfidenceResult }> {
  // 1. 执行主工具
  let results = await this.runTool(primaryTool, intent);
  let confidence = calculateConfidence(results, intent.intent);

  // 2. 检查是否需要回退（低于当前 intent 的中等阈值）
  const threshold = getThreshold(intent.intent, 'medium');
  if (confidence.score < threshold) {
    const fallbackTools = this.fallbackChains[primaryTool] || [];

    for (const fallbackTool of fallbackTools) {
      console.warn(`[LOW CONFIDENCE] ${primaryTool} confidence: ${confidence.score.toFixed(2)}, trying ${fallbackTool}...`);

      const fallbackResults = await this.runTool(fallbackTool, intent);
      const fallbackConfidence = calculateConfidence(fallbackResults, intent.intent);

      // 3. 合并结果（去重 + 排序）
      results = this.mergeResults(results, fallbackResults);

      // 更新置信度（取最大值）
      confidence = {
        score: Math.max(confidence.score, fallbackConfidence.score),
        level: confidence.score > fallbackConfidence.score ? confidence.level : fallbackConfidence.level,
        reasons: [...confidence.reasons, ...fallbackConfidence.reasons]
      };

      // 4. 达到阈值则停止回退
      if (confidence.score >= threshold) {
        confidence.reasons.push(`回退到 ${fallbackTool} 后达到阈值`);
        break;
      }
    }
  }

  return { results, tool: primaryTool, confidence };
}
```

---

## 2. 工具适配器设计

### 2.1 适配器基类

```typescript
interface ToolAdapter {
  name: string;
  weight: number;
  isAvailable(): Promise<boolean>;
  execute(keywords: string[], options: ToolOptions): Promise<UnifiedResult[]>;
}
```

### 2.2 ast-grep 适配器

```typescript
// src/orchestrator/adapters/ast-grep-adapter.ts

class AstGrepAdapter implements ToolAdapter {
  readonly name = 'ast-grep';
  readonly weight = 1.0;
  private available: boolean | null = null;

  /**
   * 检测 ast-grep 是否可用
   * 如果不可用，后续调用会自动回退到 rg
   */
  async isAvailable(): Promise<boolean> {
    if (this.available !== null) return this.available;

    try {
      // 使用 execFile 避免命令注入风险
      await execFile('sg', ['--version']);
      this.available = true;
    } catch {
      this.available = false;
    }
    return this.available;
  }

  async execute(keywords: string[], options: ToolOptions): Promise<UnifiedResult[]> {
    // 先检查是否可用
    if (!(await this.isAvailable())) {
      throw new Error('ast-grep 不可用');
    }

    // 使用 spawn/execFile 避免命令注入风险
    const args = ['-p', '.', '--json', ...keywords];
    const { stdout } = await execFile('sg', args);

    // ast-grep JSON 输出是匹配对象流，每行一个 JSON 对象
    const results: UnifiedResult[] = [];
    const lines = stdout.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const r = JSON.parse(line);
        // 兼容两种输出格式：直接对象或 { results: [...] } 包装
        const matches = r.results || [r];
        for (const match of matches) {
          results.push({
            id: `ast-grep-${match.file}-${match.line}`,
            source: 'ast-grep',
            toolScore: match.score || 0.9,
            type: 'code',
            file: match.file,
            line: match.line,
            content: this.truncateByToken(match.content, 160),
            relevance: match.score || 0.9,
            keywords
          });
        }
      } catch {
        // 跳过无法解析的行
      }
    }

    return results;
  }

  /**
   * 按 token 数量截断内容
   */
  private truncateByToken(content: string, maxTokens: number): string {
    const tokens = content.split(/[\s\u4e00-\u9fa5]/).filter(Boolean);
    if (tokens.length <= maxTokens) return content;
    return tokens.slice(0, maxTokens).join(' ') + '...';
  }
}
```

---

## 3. 意图路由设计

### 3.1 路由接口

```typescript
interface CodemapIntent {
  intent: IntentType;
  targets: string[];
  keywords: string[];
  scope: 'direct' | 'transitive';
  tool: string;
}

class IntentRouter {
  route(args: AnalyzeArgs): CodemapIntent {
    // 根据参数确定 intent 类型
    // ...
  }
}
```

### 3.2 命令映射

| analyze 参数 | 底层复用 | 增强点 |
|--------------|----------|--------|
| `--intent impact` | `ImpactCommand` | + ast-grep 搜索 + Git 分析 + 置信度 |
| `--intent dependency` | `DepsCommand` | + Token 裁剪 |
| `--intent complexity` | `ComplexityCommand` | + Token 裁剪 |
| `--intent search` | 新实现 | 使用 ast-grep + 置信度 |
| `--intent overview` | 新实现 | 使用 Codemap 核心 |
| `--intent documentation` | 新实现 | 使用 codemap 搜索 Markdown 文件 |
| `--intent refactor` | 新实现 | 使用 ast-grep |

---

## 4. AnalyzeCommand 实现

### 4.1 命令类

```typescript
// src/cli/commands/analyze.ts

export class AnalyzeCommand {
  private orchestrator = new ToolOrchestrator();
  private router = new IntentRouter();
  private fusion = new ResultFusion();

  // 复用现有命令
  private impactCmd = new ImpactCommand();
  private depsCmd = new DepsCommand();
  private complexityCmd = new ComplexityCommand();

  async run(args: AnalyzeArgs): Promise<void> {
    const intent = this.router.route(args);

    switch (intent.intent) {
      case 'impact':
        // 复用现有 impact + 增强
        const impactResult = await this.impactCmd.run({
          targets: intent.targets,
          scope: intent.scope
        });
        // 额外调用 ast-grep 增强搜索
        const searchResult = await this.orchestrator.runTool('ast-grep', intent.keywords);
        // 融合结果：展平为单一数组
        return this.output(this.fuseResults(...impactResult, ...searchResult));

      case 'dependency':
        const depsResult = await this.depsCmd.run({ targets: intent.targets });
        return this.output(this.formatOutput(depsResult, args));

      case 'complexity':
        const complexityResult = await this.complexityCmd.run({ targets: intent.targets });
        return this.output(this.formatOutput(complexityResult, args));

      case 'search':
      case 'overview':
      case 'documentation':
      case 'refactor':
        // 新功能，走编排器（带置信度和回退）
        const { results, tool, confidence } = await this.orchestrator.executeWithFallback(
          intent,
          intent.tool
        );
        console.log(`Tool: ${tool}, Confidence: ${confidence.level} (${confidence.score.toFixed(2)})`);
        return this.output(results);
    }
  }

  private fuseResults(...results: UnifiedResult[]): UnifiedResult[] {
    // 展平所有结果
    const allResults = results.flat();
    const byTool = new Map<string, UnifiedResult[]>();
    allResults.forEach(r => {
      const existing = byTool.get(r.source) || [];
      existing.push(r);
      byTool.set(r.source, existing);
    });
    return this.fusion.fuse(byTool, { topK: 8, keywordWeights: {} });
  }
}
```

---

## 5. 向后兼容

### 5.1 ImpactCommand 增强模式

```typescript
// src/cli/commands/impact.ts

export class ImpactCommand {
  // 保持原有接口不变
  async run(args: ImpactArgs): Promise<UnifiedResult[]> {
    // 原有逻辑...
  }

  // 新增：增强模式（供 analyze 调用）
  async runEnhanced(args: ImpactArgs): Promise<UnifiedResult[]> {
    const basic = await this.run(args);
    return this.toUnifiedResults(basic);
  }

  private toUnifiedResults(basic: ImpactResult): UnifiedResult[] {
    // 转换为统一格式
    return basic.dependencies.map(d => ({
      id: `impact-${d.file}`,
      source: 'codemap',
      toolScore: d.score || 0.9,
      type: 'file',
      file: d.file,
      relevance: d.score || 0.9,
      keywords: [],
      metadata: { dependencies: d.dependents }
    }));
  }
}
```

---

## 6. 模块依赖图

```
CLI 入口
  │
  ▼
AnalyzeCommand (analyze.ts)
  │
  ├──────▶ IntentRouter (intent-router.ts)
  │
  ├──────▶ ToolOrchestrator (tool-orchestrator.ts)
  │              │
  │              ├─────▶ AstGrepAdapter (ast-grep-adapter.ts)
  │              ├─────▶ CodemapAdapter (codemap-adapter.ts)
  │              ├─────▶ RgAdapter (rg-adapter.ts)
  │              │
  │              └─────▶ ResultFusion (result-fusion.ts)
  │                           │
  │                           └─────▶ Confidence (confidence.ts)
  │
  └──────▶ 现有命令 (impact.ts, deps.ts, complexity.ts)
```

---

## 7. 配置设计

```json
{
  "orchestrator": {
    "enabled": true,
    "tools": {
      "ast-grep": { "enabled": true, "command": "sg", "required": false },
      "rg": { "enabled": true, "command": "rg", "required": true }
    },
    "output": {
      "topK": 8,
      "maxTokenPerItem": 160
    },
    "confidence": {
      "thresholds": {
        "high": 0.6,
        "medium": 0.3
      }
    },
    "fallback": {
      "enabled": true
    }
  }
}
```
