# CLI 命令与编排层详细设计

> 版本: 2.5
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
   * 如果不可用，后续调用会自动回退到内部文本兜底链路
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
    const outputMode = args.outputMode || 'human';

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
        // machine/json 模式禁止额外前缀日志，保证纯 JSON 输出契约
        if (outputMode === 'human' && !args.json) {
          console.log(`Tool: ${tool}, Confidence: ${confidence.level} (${confidence.score.toFixed(2)})`);
        }
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
  │              ├─────▶ RgInternalAdapter (rg-adapter.ts, 内部兜底)
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
      "rg-internal": { "enabled": false, "command": "rg", "required": false }
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

---

## 8. 工作流编排器设计 (v2.5 规划)

### 8.1 设计目标

串联所有模块的"粘合剂"，解决阶段割裂问题：

| 问题 | 解决方案 |
|------|----------|
| 阶段连接不紧密 | 状态机 + 检查点机制 |
| 容易迷失阶段 | 交互式工作流引导 |
| 中断后无法恢复 | 上下文持久化 |
| 交付物不明确 | 阶段契约定义 |

### 8.2 核心概念

#### 工作流阶段定义

```typescript
// src/orchestrator/workflow/types.ts

type WorkflowPhase =
  | 'reference'    // 参考搜索
  | 'impact'       // 影响分析
  | 'risk'         // 风险评估
  | 'implementation' // 代码实现
  | 'commit'       // 提交验证
  | 'ci';          // CI 流水线

interface PhaseDefinition {
  name: WorkflowPhase;
  action: 'analyze' | 'ci' | 'manual'; // 阶段执行方式
  analyzeIntent?: IntentType;        // 仅 action=analyze 时需要
  ciCommand?: string;                // 仅 action=ci 时需要
  entryCondition: PhaseCondition;   // 入口条件
  deliverables: Deliverable[];       // 交付物
  nextPhase?: WorkflowPhase;         // 下一阶段
  commands: string[];               // 可执行的命令
}

interface PhaseCondition {
  minConfidence?: number;            // 最低置信度
  requiredArtifacts?: string[];       // 必需的产物
}

interface Deliverable {
  name: string;
  path: string;
  validator: (path: string) => boolean;
}
```

#### 工作流上下文

```typescript
// src/orchestrator/workflow/workflow-context.ts

interface WorkflowContext {
  id: string;                        // 工作流实例 ID
  task: string;                      // 用户任务描述
  currentPhase: WorkflowPhase;
  phaseStatus: PhaseStatus;

  // 阶段产物（自动传递）
  artifacts: Map<WorkflowPhase, PhaseArtifacts>;

  // 分析结果缓存
  cachedResults: {
    reference?: UnifiedResult[];
    impact?: UnifiedResult[];
    risk?: RiskScore;
  };

  // 用户确认状态
  userConfirmed: Set<WorkflowPhase>;

  // 时间戳
  startedAt: Date;
  updatedAt: Date;
}

interface PhaseArtifacts {
  phase: WorkflowPhase;
  results?: UnifiedResult[];
  confidence?: ConfidenceResult;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

type PhaseStatus = 'pending' | 'running' | 'completed' | 'verified' | 'skipped';
```

### 8.3 工作流编排器类

```typescript
// src/orchestrator/workflow/workflow-orchestrator.ts

class WorkflowOrchestrator {
  private context: WorkflowContext | null = null;
  private phaseDefinitions: Map<WorkflowPhase, PhaseDefinition>;
  private persistence: WorkflowPersistence;

  constructor() {
    this.phaseDefinitions = this.initializePhaseDefinitions();
    this.persistence = new WorkflowPersistence();
  }

  /**
   * 启动新的工作流
   */
  async start(task: string): Promise<WorkflowContext> {
    this.context = {
      id: this.generateId(),
      task,
      currentPhase: 'reference',
      phaseStatus: 'pending',
      artifacts: new Map(),
      cachedResults: {},
      userConfirmed: new Set(),
      startedAt: new Date(),
      updatedAt: new Date()
    };

    // 保存初始状态
    await this.persistence.save(this.context);

    return this.context;
  }

  /**
   * 执行当前阶段
   */
  async executeCurrentPhase(analyzeArgs: AnalyzeArgs): Promise<PhaseResult> {
    if (!this.context) {
      throw new Error('No active workflow. Call start() first.');
    }

    const phase = this.context.currentPhase;
    const definition = this.phaseDefinitions.get(phase);

    if (!definition) {
      throw new Error(`Unknown phase: ${phase}`);
    }

    // 更新状态为 running
    this.context.phaseStatus = 'running';
    await this.persistence.save(this.context);

    // 按阶段执行方式运行（避免将非 analyze 阶段误当作 intent）
    const results = await this.runPhase(definition, analyzeArgs);

    // 仅 analyze 阶段计算置信度
    const confidence = definition.action === 'analyze' && definition.analyzeIntent
      ? calculateConfidence(results, definition.analyzeIntent)
      : { score: 1, level: 'high', reasons: ['non-analyze phase'] };

    // 保存产物
    const artifacts: PhaseArtifacts = {
      phase,
      results,
      confidence,
      createdAt: new Date()
    };
    this.context.artifacts.set(phase, artifacts);
    this.context.cachedResults[phase] = results;

    // 更新状态为 completed
    this.context.phaseStatus = 'completed';
    this.context.updatedAt = new Date();
    await this.persistence.save(this.context);

    return { artifacts, confidence, canProceed: this.checkProceedCondition(confidence) };
  }

  private async runPhase(
    definition: PhaseDefinition,
    analyzeArgs: AnalyzeArgs
  ): Promise<UnifiedResult[]> {
    if (definition.action === 'analyze' && definition.analyzeIntent) {
      return this.runAnalysis(definition.analyzeIntent, analyzeArgs);
    }
    if (definition.action === 'ci' && definition.ciCommand) {
      await this.runCICommand(definition.ciCommand);
      return [];
    }
    return [];
  }

  /**
   * 验证是否可以进入下一阶段
   */
  private checkProceedCondition(confidence: ConfidenceResult): boolean {
    const phase = this.context!.currentPhase;
    const definition = this.phaseDefinitions.get(phase);

    if (!definition) return false;

    const { entryCondition } = definition;

    // 检查置信度
    if (entryCondition.minConfidence && confidence.score < entryCondition.minConfidence) {
      return false;
    }

    return true;
  }

  /**
   * 推进到下一阶段
   */
  async proceedToNextPhase(): Promise<WorkflowPhase> {
    if (!this.context) {
      throw new Error('No active workflow');
    }

    const current = this.context.currentPhase;
    const definition = this.phaseDefinitions.get(current);

    if (!definition?.nextPhase) {
      throw new Error('No next phase available');
    }

    // 验证当前阶段已完成
    if (this.context.phaseStatus !== 'completed') {
      throw new Error(`Current phase ${current} is not completed`);
    }

    // 标记当前阶段为 verified
    this.context.phaseStatus = 'verified';

    // 推进到下一阶段
    this.context.currentPhase = definition.nextPhase;
    this.context.phaseStatus = 'pending';
    this.context.updatedAt = new Date();

    await this.persistence.save(this.context);

    return definition.nextPhase;
  }

  /**
   * 获取工作流状态
   */
  async getStatus(): Promise<WorkflowStatus> {
    if (!this.context) {
      this.context = await this.persistence.loadActive();
    }
    if (!this.context) return { active: false };

    return {
      active: true,
      task: this.context.task,
      currentPhase: this.context.currentPhase,
      phaseStatus: this.context.phaseStatus,
      progress: this.calculateProgress(),
      artifacts: Array.from(this.context.artifacts.keys())
    };
  }

  private calculateProgress(): number {
    const totalPhases = this.phaseDefinitions.size;
    const completedPhases = Array.from(this.context!.artifacts.keys()).length;
    return (completedPhases / totalPhases) * 100;
  }

  private initializePhaseDefinitions(): Map<WorkflowPhase, PhaseDefinition> {
    return new Map([
      ['reference', {
        name: 'reference',
        action: 'analyze',
        analyzeIntent: 'reference',
        entryCondition: { minConfidence: 0.3 },
        deliverables: [
          { name: 'reference-results', path: '.codemap/workflow/reference.json', validator: () => true }
        ],
        nextPhase: 'impact',
        commands: ['codemap analyze --intent reference']
      }],
      ['impact', {
        name: 'impact',
        action: 'analyze',
        analyzeIntent: 'impact',
        entryCondition: { minConfidence: 0.4 },
        deliverables: [
          { name: 'impact-report', path: '.codemap/workflow/impact.json', validator: () => true }
        ],
        nextPhase: 'risk',
        commands: ['codemap analyze --intent impact']
      }],
      ['risk', {
        name: 'risk',
        action: 'ci',
        ciCommand: 'codemap ci assess-risk --threshold 0.7',
        entryCondition: {},
        deliverables: [
          { name: 'risk-assessment', path: '.codemap/workflow/risk.json', validator: () => true }
        ],
        nextPhase: 'implementation',
        commands: ['codemap ci assess-risk']
      }],
      ['implementation', {
        name: 'implementation',
        action: 'manual',
        entryCondition: {},
        deliverables: [
          { name: 'implementation', path: 'src/', validator: () => true }
        ],
        nextPhase: 'commit',
        commands: []
      }],
      ['commit', {
        name: 'commit',
        action: 'manual',
        entryCondition: {},
        deliverables: [
          { name: 'commit', path: '.git/COMMIT_EDITMSG', validator: () => true }
        ],
        nextPhase: 'ci',
        commands: ['git commit']
      }],
      ['ci', {
        name: 'ci',
        action: 'ci',
        ciCommand: 'npm test && codemap ci check-commits && codemap ci check-headers && codemap ci check-output-contract',
        entryCondition: {},
        deliverables: [],
        commands: []
      }]
    ]);
  }
}
```

### 8.4 工作流持久化

```typescript
// src/orchestrator/workflow/workflow-persistence.ts

class WorkflowPersistence {
  private storagePath = '.codemap/workflow';
  private activePath = '.codemap/workflow/active.json';

  async save(context: WorkflowContext): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');

    // 确保目录存在
    await fs.mkdir(this.storagePath, { recursive: true });

    const filePath = path.join(this.storagePath, `${context.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(this.serialize(context), null, 2));
    await fs.writeFile(this.activePath, JSON.stringify({ id: context.id }, null, 2));
  }

  async load(id: string): Promise<WorkflowContext | null> {
    const fs = require('fs').promises;
    const path = require('path');

    const filePath = path.join(this.storagePath, `${id}.json`);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.deserialize(JSON.parse(content));
    } catch {
      return null;
    }
  }

  async loadActive(): Promise<WorkflowContext | null> {
    const fs = require('fs').promises;
    try {
      const content = await fs.readFile(this.activePath, 'utf-8');
      const { id } = JSON.parse(content);
      return id ? this.load(id) : null;
    } catch {
      return null;
    }
  }

  async list(): Promise<WorkflowSummary[]> {
    const fs = require('fs').promises;
    const path = require('path');

    const dir = path.join(process.cwd(), this.storagePath);

    try {
      const files = await fs.readdir(dir);
      const summaries: WorkflowSummary[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const content = await fs.readFile(path.join(dir, file), 'utf-8');
        const ctx = JSON.parse(content);

        summaries.push({
          id: ctx.id,
          task: ctx.task,
          currentPhase: ctx.currentPhase,
          phaseStatus: ctx.phaseStatus,
          updatedAt: ctx.updatedAt
        });
      }

      return summaries;
    } catch {
      return [];
    }
  }

  async delete(id: string): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');

    const filePath = path.join(this.storagePath, `${id}.json`);
    await fs.unlink(filePath);
  }

  private serialize(context: WorkflowContext) {
    return {
      ...context,
      artifacts: Array.from(context.artifacts.entries()),
      userConfirmed: Array.from(context.userConfirmed.values())
    };
  }

  private deserialize(raw: any): WorkflowContext {
    return {
      ...raw,
      artifacts: new Map(raw.artifacts || []),
      userConfirmed: new Set(raw.userConfirmed || []),
      startedAt: new Date(raw.startedAt),
      updatedAt: new Date(raw.updatedAt)
    };
  }
}
```

### 8.5 工作流 CLI 交互

```typescript
// src/cli/commands/workflow.ts

import { WorkflowOrchestrator } from '../../orchestrator/workflow/workflow-orchestrator';
import { Command } from 'commander';

const workflow = new Command('workflow').description('Workflow management');

workflow.command('start')
  .description('Start a new development workflow')
  .argument('<task>', 'Task description')
  .action(async (task: string) => {
    const orchestrator = new WorkflowOrchestrator();
    const context = await orchestrator.start(task);

    console.log(`
[WORKFLOW STARTED]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Task: ${task}
ID: ${context.id}
Phase: ${context.currentPhase}

Next steps:
  1. codemap workflow status    # 查看当前状态
  2. codemap analyze --intent reference --keywords ...
  3. codemap workflow proceed    # 进入下一阶段
`);
  });

workflow.command('status')
  .description('Show current workflow status')
  .action(async () => {
    const orchestrator = new WorkflowOrchestrator();
    const status = await orchestrator.getStatus();

    if (!status.active) {
      console.log('No active workflow. Run "codemap workflow start" first.');
      return;
    }

    console.log(`
[WORKFLOW STATUS]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Task: ${status.task}
Phase: ${status.currentPhase}
Status: ${status.phaseStatus}
Progress: ${status.progress.toFixed(0)}%

Completed phases: ${status.artifacts?.join(', ') || 'none'}
`);
  });

workflow.command('visualize')
  .description('Visualize current workflow status')
  .action(async () => {
    // 读取活动工作流并渲染 ASCII 视图
  });

workflow.command('template')
  .description('Workflow template management')
  .command('apply <name>')
  .action(async (name: string) => {
    // 对活动工作流应用模板并持久化
  });

workflow.command('proceed')
  .description('Proceed to next phase')
  .option('-f, --force', 'Skip verification')
  .action(async (options) => {
    const orchestrator = new WorkflowOrchestrator();
    const status = await orchestrator.getStatus();

    if (!status.active) {
      console.log('No active workflow.');
      return;
    }

    if (status.phaseStatus !== 'completed' && !options.force) {
      console.log(`Current phase ${status.currentPhase} is not completed. Use --force to override.`);
      return;
    }

    const next = await orchestrator.proceedToNextPhase();

    console.log(`
[PHASE COMPLETED]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current phase: ${status.currentPhase}
Status: ${status.phaseStatus}
Next phase: ${next}

Type "codemap workflow proceed" to continue to next phase.
`);
  });

export default workflow;
```

### 8.6 阶段连接机制

#### 检查点验证

```typescript
// 每个阶段结束时验证交付物

class PhaseCheckpoint {
  /**
   * 验证阶段交付物
   */
  async validate(phase: WorkflowPhase, artifacts: PhaseArtifacts): Promise<CheckpointResult> {
    const definition = this.getPhaseDefinition(phase);
    const results: CheckItem[] = [];

    for (const deliverable of definition.deliverables) {
      const exists = await this.checkFileExists(deliverable.path);
      const valid = deliverable.validator(deliverable.path);

      results.push({
        name: deliverable.name,
        path: deliverable.path,
        exists,
        valid
      });
    }

    return {
      passed: results.every(r => r.exists && r.valid),
      items: results
    };
  }
}
```

#### 置信度引导

```typescript
// 根据置信度决定是否自动推进或等待用户确认

class ConfidenceGuide {
  /**
   * 获取置信度指导建议
   */
  getGuidance(confidence: ConfidenceResult, phase: WorkflowPhase): Guidance {
    if (confidence.level === 'high') {
      return {
        action: 'auto-proceed',
        message: `High confidence (${confidence.score.toFixed(2)}), proceeding to next phase...`
      };
    }

    if (confidence.level === 'medium') {
      return {
        action: 'confirm-proceed',
        message: `Medium confidence (${confidence.score.toFixed(2)}), review results before proceeding?`,
        suggestion: 'Run additional analysis with broader scope'
      };
    }

    return {
      action: 'hold',
      message: `Low confidence (${confidence.score.toFixed(2)}), current phase needs more work`,
      suggestion: confidence.reasons.join('; ')
    };
  }
}
```

### 8.7 模块依赖图

```
工作流编排器 (workflow-orchestrator.ts)
    │
    ├── 依赖: IntentRouter (intent-router.ts)
    ├── 依赖: ToolOrchestrator (tool-orchestrator.ts)
    ├── 依赖: ConfidenceCalculator (confidence.ts)
    ├── 依赖: ResultFusion (result-fusion.ts)
    ├── 依赖: GitAnalyzer (git-analyzer.ts)
    ├── 依赖: AIFeedGenerator (ai-feed-generator.ts)
    ├── 依赖: TestLinker (test-linker.ts)
    │
    └── 被以下模块使用:
        └── CLI Commands (workflow.ts)
```

### 8.8 配置扩展

```json
{
  "workflow": {
    "enabled": true,
    "autoProceedThreshold": 0.7,
    "persistencePath": ".codemap/workflow",
    "phases": {
      "reference": { "minConfidence": 0.3 },
      "impact": { "minConfidence": 0.4 },
      "risk": { "minConfidence": 0 }
    }
  }
}
```
