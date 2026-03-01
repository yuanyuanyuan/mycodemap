/**
 * [META] 工作流编排器
 * [WHY] 串联所有模块的"粘合剂"，解决阶段割裂问题
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { AnalyzeArgs, UnifiedResult, ConfidenceResult, CodemapIntent } from '../types.js';
import { calculateConfidence } from '../confidence.js';
import { ToolOrchestrator } from '../tool-orchestrator.js';
import { IntentRouter } from '../intent-router.js';
import { ResultFusion } from '../result-fusion.js';
import { createCodemapAdapter } from '../adapters/codemap-adapter.js';
import { createAstGrepAdapter } from '../adapters/ast-grep-adapter.js';
import { WorkflowPersistence } from './workflow-persistence.js';
import { PhaseCheckpoint } from './phase-checkpoint.js';
import {
  type WorkflowContext,
  type WorkflowPhase,
  type PhaseDefinition,
  type PhaseStatus,
  type WorkflowStatus,
  type PhaseResult,
  type PhaseAction,
  type Guidance
} from './types.js';
import { WorkflowContextFactory, WorkflowContextValidator } from './workflow-context.js';

const execAsync = promisify(exec);

/**
 * 工作流编排器类
 */
export class WorkflowOrchestrator {
  private context: WorkflowContext | null = null;
  private phaseDefinitions: Map<WorkflowPhase, PhaseDefinition>;
  private persistence: WorkflowPersistence;
  private phaseCheckpoint: PhaseCheckpoint;
  private toolOrchestrator: ToolOrchestrator;
  private intentRouter: IntentRouter;
  private resultFusion: ResultFusion;

  constructor() {
    this.phaseDefinitions = this.initializePhaseDefinitions();
    this.persistence = new WorkflowPersistence();
    this.phaseCheckpoint = new PhaseCheckpoint();
    this.toolOrchestrator = new ToolOrchestrator();
    this.intentRouter = new IntentRouter();
    this.resultFusion = new ResultFusion();

    // 注册工具适配器
    this.registerAdapters();
  }

  /**
   * 注册工具适配器
   */
  private registerAdapters(): void {
    // 注册 CodeMap 适配器
    this.toolOrchestrator.registerAdapter(createCodemapAdapter());
    // 注册 ast-grep 适配器（权重 1.0）
    this.toolOrchestrator.registerAdapter(createAstGrepAdapter());
  }

  /**
   * 启动新的工作流
   */
  async start(task: string): Promise<WorkflowContext> {
    this.context = WorkflowContextFactory.create(task);

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
    this.context.updatedAt = new Date();
    await this.persistence.save(this.context);

    // 按阶段执行方式运行
    const results = await this.runPhase(definition, analyzeArgs);

    // 计算置信度（仅 analyze 阶段）
    const confidence = this.calculatePhaseConfidence(results, definition);

    // 保存产物
    const artifacts = {
      phase,
      results,
      confidence,
      metadata: {},
      createdAt: new Date()
    };
    this.context.artifacts.set(phase, artifacts);
    (this.context.cachedResults as Record<string, UnifiedResult[]>)[phase] = results;

    // 更新状态为 completed
    this.context.phaseStatus = 'completed';
    this.context.updatedAt = new Date();
    await this.persistence.save(this.context);

    const canProceed = this.checkProceedCondition(confidence, definition);

    return { artifacts, confidence, canProceed };
  }

  /**
   * 计算阶段置信度
   */
  private calculatePhaseConfidence(
    results: UnifiedResult[],
    definition: PhaseDefinition
  ): ConfidenceResult {
    if (definition.action === 'analyze' && definition.analyzeIntent) {
      return calculateConfidence(results, definition.analyzeIntent as Parameters<typeof calculateConfidence>[1]);
    }
    return { score: 1, level: 'high', reasons: ['non-analyze phase'] };
  }

  /**
   * 运行阶段
   */
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
    // manual 阶段不执行任何操作
    return [];
  }

  /**
   * 运行分析
   *
   * 集成 ToolOrchestrator 和 ResultFusion 执行真实的分析
   */
  private async runAnalysis(
    intent: string,
    analyzeArgs: AnalyzeArgs
  ): Promise<UnifiedResult[]> {
    try {
      // 1. 使用 IntentRouter 将参数转换为 CodemapIntent
      const mergedArgs: AnalyzeArgs = {
        ...analyzeArgs,
        intent: intent
      };
      const codemapIntent = this.intentRouter.route(mergedArgs);

      console.log(`Running analysis with intent: ${intent}, targets: ${codemapIntent.targets.join(', ')}`);

      // 2. 并行执行多个工具
      const tools = this.selectTools(codemapIntent);
      const resultsByTool = await this.toolOrchestrator.executeParallel(codemapIntent, tools);

      // 3. 使用 ResultFusion 融合结果
      const fusedResults = await this.resultFusion.fuse(resultsByTool, {
        topK: analyzeArgs.topK ?? 8,
        intent: intent,
        keywordWeights: this.buildKeywordWeights(codemapIntent.keywords)
      });

      console.log(`Analysis completed: ${fusedResults.length} results`);
      return fusedResults;
    } catch (error) {
      // 错误处理：工具失败时返回空数组而非抛出异常
      console.error(`Analysis failed for intent ${intent}:`, error);
      return [];
    }
  }

  /**
   * 根据意图选择要执行的工具列表
   */
  private selectTools(intent: CodemapIntent): string[] {
    // 根据意图类型选择工具
    switch (intent.intent) {
      case 'search':
      case 'refactor':
      case 'reference':
        // 需要 AST 分析的工具
        return ['codemap'];
      case 'impact':
      case 'dependency':
      case 'complexity':
      case 'overview':
      case 'documentation':
      default:
        // 默认使用 codemap
        return ['codemap'];
    }
  }

  /**
   * 构建关键词权重映射
   */
  private buildKeywordWeights(keywords: string[]): Record<string, number> {
    const weights: Record<string, number> = {};
    if (keywords.length > 0) {
      // 为每个关键词分配基础权重
      const baseWeight = 0.1 / keywords.length;
      for (const keyword of keywords) {
        weights[keyword] = baseWeight;
      }
    }
    return weights;
  }

  /**
   * 运行 CI 命令
   */
  private async runCICommand(ciCommand: string): Promise<void> {
    try {
      await execAsync(ciCommand);
    } catch (error) {
      console.warn(`CI command failed: ${ciCommand}`, error);
    }
  }

  /**
   * 验证是否可以进入下一阶段
   */
  private checkProceedCondition(
    confidence: ConfidenceResult,
    definition: PhaseDefinition
  ): boolean {
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
  async proceedToNextPhase(force: boolean = false): Promise<WorkflowPhase> {
    if (!this.context) {
      throw new Error('No active workflow');
    }

    const current = this.context.currentPhase;
    const definition = this.phaseDefinitions.get(current);

    if (!definition?.nextPhase) {
      throw new Error('No next phase available');
    }

    // 验证当前阶段已完成（除非强制）
    if (!force) {
      const validation = WorkflowContextValidator.canProceed(this.context);
      if (!validation.valid) {
        throw new Error(validation.reason);
      }
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
      // 尝试加载活动工作流
      this.context = await this.persistence.loadActive();
    }
    if (!this.context) {
      return { active: false };
    }

    return {
      active: true,
      task: this.context.task,
      currentPhase: this.context.currentPhase,
      phaseStatus: this.context.phaseStatus,
      progress: this.calculateProgress(),
      artifacts: Array.from(this.context.artifacts.keys())
    };
  }

  /**
   * 恢复指定的工作流
   */
  async resume(id: string): Promise<WorkflowContext | null> {
    const context = await this.persistence.load(id);
    if (context) {
      this.context = context;
    }
    return context;
  }

  /**
   * 创建检查点
   */
  async checkpoint(): Promise<void> {
    if (!this.context) {
      throw new Error('No active workflow');
    }
    await this.persistence.save(this.context);
  }

  /**
   * 获取置信度引导
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

  /**
   * 计算进度
   */
  private calculateProgress(): number {
    const totalPhases = this.phaseDefinitions.size;
    const completedPhases = this.context!.artifacts.size;
    return (completedPhases / totalPhases) * 100;
  }

  /**
   * 初始化阶段定义
   */
  private initializePhaseDefinitions(): Map<WorkflowPhase, PhaseDefinition> {
    return new Map<WorkflowPhase, PhaseDefinition>([
      ['reference', {
        name: 'reference',
        action: 'analyze' as PhaseAction,
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
        action: 'analyze' as PhaseAction,
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
        action: 'ci' as PhaseAction,
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
        action: 'manual' as PhaseAction,
        entryCondition: {},
        deliverables: [
          { name: 'implementation', path: 'src/', validator: () => true }
        ],
        nextPhase: 'commit',
        commands: []
      }],
      ['commit', {
        name: 'commit',
        action: 'manual' as PhaseAction,
        entryCondition: {},
        deliverables: [
          { name: 'commit', path: '.git/COMMIT_EDITMSG', validator: () => true }
        ],
        nextPhase: 'ci',
        commands: ['git commit']
      }],
      ['ci', {
        name: 'ci',
        action: 'ci' as PhaseAction,
        ciCommand: 'npm test && codemap ci check-commits && codemap ci check-headers && codemap ci assess-risk --threshold 0.7 && codemap ci check-output-contract',
        entryCondition: {},
        deliverables: [],
        commands: []
      }]
    ]);
  }

  /**
   * 获取阶段定义
   */
  getPhaseDefinition(phase: WorkflowPhase): PhaseDefinition | undefined {
    return this.phaseDefinitions.get(phase);
  }

  /**
   * 获取所有阶段定义
   */
  getAllPhaseDefinitions(): PhaseDefinition[] {
    return Array.from(this.phaseDefinitions.values());
  }

  /**
   * 获取当前上下文
   */
  getContext(): WorkflowContext | null {
    return this.context;
  }

  /**
   * 列出所有工作流
   */
  async listWorkflows(): Promise<unknown[]> {
    return this.persistence.list();
  }

  /**
   * 删除工作流
   */
  async deleteWorkflow(id: string): Promise<void> {
    await this.persistence.delete(id);
    if (this.context?.id === id) {
      this.context = null;
    }
  }
}
