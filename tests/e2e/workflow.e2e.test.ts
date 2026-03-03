/**
 * [META] since:2026-03 | owner:codemap-team | stable:false
 * [WHY] @version 2.5
 */

/**
 * 工作流 E2E 集成测试
 *
 * @module WorkflowE2ETest
 * @version 2.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import {
  WorkflowOrchestrator,
  WorkflowContext,
  WorkflowPhase,
  WorkflowFusionContext,
  WorkflowResultFusion,
  PhaseInheritance,
  createResultFusion,
  createPhaseInheritance,
  PHASE_DEFINITIONS,
} from '../../src/orchestrator/workflow/index.js';
import type { UnifiedResult } from '../../src/orchestrator/types.js';

// ============================================
// 测试工具函数
// ============================================

/**
 * 创建测试用的 UnifiedResult
 */
function createMockResult(
  file: string,
  source: string,
  relevance: number,
  overrides: Partial<UnifiedResult> = {}
): UnifiedResult {
  return {
    id: `test-${file}-${source}`,
    source: source as any,
    toolScore: relevance,
    type: 'code',
    file,
    line: 1,
    content: `Test content for ${file}`,
    relevance,
    keywords: ['test'],
    ...overrides,
  };
}

/**
 * 创建临时测试目录
 */
function createTempDir(): string {
  const tempDir = join(tmpdir(), `codemap-test-${Date.now()}`);
  mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

// ============================================
// E2E 测试套件
// ============================================

describe('Workflow E2E Tests', () => {
  let tempDir: string;
  let orchestrator: WorkflowOrchestrator;

  beforeEach(() => {
    tempDir = createTempDir();
    orchestrator = new WorkflowOrchestrator(tempDir);
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ==========================================
  // T003: WorkflowResultFusion 测试
  // ==========================================

  describe('T003: WorkflowResultFusion', () => {
    it('should create empty fusion context', () => {
      const context = WorkflowResultFusion.createEmptyContext();

      expect(context.phaseResults).toBeInstanceOf(Map);
      expect(context.accumulatedContext).toBeInstanceOf(Map);
      expect(context.phaseResults.size).toBe(0);
      expect(context.accumulatedContext.size).toBe(0);
    });

    it('should merge results with context', () => {
      const fusion = createResultFusion();
      const context = WorkflowResultFusion.createEmptyContext();

      const newResults: UnifiedResult[] = [
        createMockResult('src/auth.ts', 'codemap', 0.9),
        createMockResult('src/cache.ts', 'ast-grep', 0.8),
      ];

      const merged = fusion.mergeWithContext(
        newResults,
        context,
        'reference',
        { topK: 10 }
      );

      expect(merged).toHaveLength(2);
      expect(context.phaseResults.get('reference')).toHaveLength(2);
      expect(context.accumulatedContext.size).toBe(2);
    });

    it('should apply phase weights correctly', () => {
      const fusion = createResultFusion();
      const context = WorkflowResultFusion.createEmptyContext();

      // 添加 reference 阶段结果
      const referenceResults: UnifiedResult[] = [
        createMockResult('src/auth.ts', 'codemap', 0.9),
      ];
      fusion.mergeWithContext(referenceResults, context, 'reference');

      // 添加 risk 阶段结果（权重更高）
      const riskResults: UnifiedResult[] = [
        createMockResult('src/risk.ts', 'ai-feed', 0.8),
      ];
      const merged = fusion.mergeWithContext(riskResults, context, 'risk');

      // Risk 阶段权重 1.0，reference 权重 0.8
      // 结果应该按权重调整后的相关度排序
      expect(merged.length).toBeGreaterThan(0);
    });

    it('should deduplicate results based on file:line', () => {
      const fusion = createResultFusion();
      const context = WorkflowResultFusion.createEmptyContext();

      const results: UnifiedResult[] = [
        createMockResult('src/auth.ts', 'codemap', 0.9, { line: 10 }),
        createMockResult('src/auth.ts', 'ast-grep', 0.7, { line: 10 }), // 同文件同行
        createMockResult('src/auth.ts', 'codemap', 0.8, { line: 20 }), // 不同行
      ];

      const merged = fusion.mergeWithContext(results, context, 'reference');

      // 应该去重为 2 个结果（同文件同行的保留高分）
      expect(merged).toHaveLength(2);
      expect(merged[0].relevance).toBeGreaterThanOrEqual(0.9);
    });

    it('should limit results to topK', () => {
      const fusion = createResultFusion();
      const context = WorkflowResultFusion.createEmptyContext();

      const results: UnifiedResult[] = Array.from({ length: 20 }, (_, i) =>
        createMockResult(`src/file${i}.ts`, 'codemap', 0.5 + i * 0.025)
      );

      const merged = fusion.mergeWithContext(results, context, 'reference', {
        topK: 5,
      });

      expect(merged).toHaveLength(5);
    });

    it('should build context from artifacts', () => {
      const artifacts = new Map();
      artifacts.set('reference', {
        phase: 'reference' as WorkflowPhase,
        results: [createMockResult('src/auth.ts', 'codemap', 0.9)],
        createdAt: new Date(),
      });

      const context = WorkflowResultFusion.buildContextFromArtifacts(artifacts);

      expect(context.phaseResults.get('reference')).toHaveLength(1);
      expect(context.accumulatedContext.size).toBe(1);
    });
  });

  // ==========================================
  // T004: PhaseInheritance 测试
  // ==========================================

  describe('T004: PhaseInheritance', () => {
    it('should get inherited results for impact phase', () => {
      const inheritance = createPhaseInheritance();
      const context = WorkflowResultFusion.createEmptyContext();

      // 设置 reference 阶段结果
      context.phaseResults.set('reference', [
        createMockResult('src/auth.ts', 'ast-grep', 0.9),
        createMockResult('src/cache.ts', 'codemap', 0.8),
      ]);

      // impact 阶段应该继承 code-analysis 结果
      const inherited = inheritance.getInheritedResults('impact', context);

      expect(inherited.length).toBeGreaterThan(0);
      // 应该只继承 ast-grep 和 codemap 来源的结果
      inherited.forEach((result) => {
        expect(['ast-grep', 'codemap']).toContain(result.source);
      });
    });

    it('should get inherited results for risk phase', () => {
      const inheritance = createPhaseInheritance();
      const context = WorkflowResultFusion.createEmptyContext();

      // 设置多个阶段结果
      context.phaseResults.set('reference', [
        createMockResult('src/auth.ts', 'codemap', 0.9),
      ]);
      context.phaseResults.set('impact', [
        createMockResult('src/cache.ts', 'ast-grep', 0.8),
      ]);

      // risk 阶段应该继承所有结果
      const inherited = inheritance.getInheritedResults('risk', context);

      expect(inherited.length).toBe(2);
    });

    it('should return empty for reference phase (no inheritance)', () => {
      const inheritance = createPhaseInheritance();
      const context = WorkflowResultFusion.createEmptyContext();

      const inherited = inheritance.getInheritedResults('reference', context);

      expect(inherited).toHaveLength(0);
    });

    it('should filter by min relevance', () => {
      const inheritance = createPhaseInheritance();
      const context = WorkflowResultFusion.createEmptyContext();

      // implementation 阶段配置了 minRelevance: 0.5
      context.phaseResults.set('reference', [
        createMockResult('src/high.ts', 'codemap', 0.9),
        createMockResult('src/low.ts', 'codemap', 0.3),
      ]);

      const inherited = inheritance.getInheritedResults('implementation', context);

      // 应该只返回相关度 >= 0.5 的结果
      inherited.forEach((result) => {
        expect(result.relevance).toBeGreaterThanOrEqual(0.5);
      });
    });

    it('should provide inheritance statistics', () => {
      const inheritance = createPhaseInheritance();
      const context = WorkflowResultFusion.createEmptyContext();

      context.phaseResults.set('reference', [
        createMockResult('src/auth.ts', 'codemap', 0.9),
        createMockResult('src/cache.ts', 'ast-grep', 0.8),
      ]);

      const stats = inheritance.getInheritanceStats('impact', context);

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.bySource).toBeDefined();
      expect(stats.avgRelevance).toBeGreaterThan(0);
    });

    it('should allow custom inheritance config', () => {
      const customConfig = {
        impact: {
          strategy: 'all' as const,
          minRelevance: 0.7,
        },
      };

      const inheritance = createPhaseInheritance(customConfig);
      const context = WorkflowResultFusion.createEmptyContext();

      context.phaseResults.set('reference', [
        createMockResult('src/high.ts', 'codemap', 0.9),
        createMockResult('src/low.ts', 'codemap', 0.5),
      ]);

      const inherited = inheritance.getInheritedResults('impact', context);

      // 应该应用自定义配置（all 策略 + 0.7 阈值）
      expect(inherited.length).toBe(1);
      expect(inherited[0].relevance).toBeGreaterThanOrEqual(0.7);
    });
  });

  // ==========================================
  // 工作流生命周期测试
  // ==========================================

  describe('Workflow Lifecycle', () => {
    it('should complete full workflow lifecycle', async () => {
      // 启动工作流
      const context = await orchestrator.startWorkflow('实现测试功能');

      expect(context.task).toBe('实现测试功能');
      expect(context.currentPhase).toBe('reference');

      // 推进到 impact 阶段
      const impactResult = await orchestrator.proceedToNextPhase(context);
      expect(impactResult.success).toBe(true);
      expect(context.currentPhase).toBe('impact');

      // 推进到 risk 阶段
      const riskResult = await orchestrator.proceedToNextPhase(context);
      expect(riskResult.success).toBe(true);
      expect(context.currentPhase).toBe('risk');

      // 继续推进到后续阶段
      await orchestrator.proceedToNextPhase(context);
      expect(context.currentPhase).toBe('implementation');

      await orchestrator.proceedToNextPhase(context);
      expect(context.currentPhase).toBe('commit');

      await orchestrator.proceedToNextPhase(context);
      expect(context.currentPhase).toBe('ci');
    });

    it('should persist and resume workflow', async () => {
      // 启动并推进工作流
      const context = await orchestrator.startWorkflow('测试持久化');
      await orchestrator.proceedToNextPhase(context);

      // 保存工作流
      await orchestrator.saveWorkflow(context);

      // 恢复工作流
      const resumed = await orchestrator.resumeWorkflow(context.id);

      expect(resumed).toBeDefined();
      expect(resumed?.task).toBe('测试持久化');
      expect(resumed?.currentPhase).toBe('impact');
    });

    it('should create and restore checkpoint', async () => {
      const context = await orchestrator.startWorkflow('测试检查点');

      // 创建检查点
      const checkpoint = await orchestrator.createCheckpoint(context);
      expect(checkpoint.success).toBe(true);

      // 推进到下一阶段
      await orchestrator.proceedToNextPhase(context);
      expect(context.currentPhase).toBe('impact');

      // 恢复到检查点
      const restored = await orchestrator.restoreCheckpoint(context.id, 'reference');
      expect(restored?.currentPhase).toBe('reference');
    });
  });

  // ==========================================
  // 跨阶段结果传递测试
  // ==========================================

  describe('Cross-Phase Result Passing', () => {
    it('should pass results between phases with fusion', async () => {
      const fusion = createResultFusion();
      const inheritance = createPhaseInheritance();

      // 模拟 reference 阶段结果
      const fusionContext = WorkflowResultFusion.createEmptyContext();
      const referenceResults: UnifiedResult[] = [
        createMockResult('src/auth.ts', 'ast-grep', 0.95),
        createMockResult('src/cache.ts', 'codemap', 0.85),
      ];

      // reference 阶段融合
      fusion.mergeWithContext(referenceResults, fusionContext, 'reference');

      // impact 阶段继承 reference 结果
      const impactInherited = inheritance.getInheritedResults('impact', fusionContext);
      expect(impactInherited.length).toBe(2);

      // impact 阶段添加新结果
      const impactResults: UnifiedResult[] = [
        createMockResult('src/impact.ts', 'codemap', 0.9),
      ];
      fusion.mergeWithContext(impactResults, fusionContext, 'impact');

      // risk 阶段应该继承所有历史结果
      const riskInherited = inheritance.getInheritedResults('risk', fusionContext);
      expect(riskInherited.length).toBe(3); // 2 from reference + 1 from impact
    });

    it('should maintain result relevance through phases', () => {
      const fusion = createResultFusion();
      const context = WorkflowResultFusion.createEmptyContext();

      // 添加 reference 阶段结果（权重 0.8）
      const referenceResults: UnifiedResult[] = [
        createMockResult('src/auth.ts', 'codemap', 1.0),
      ];
      const merged1 = fusion.mergeWithContext(
        referenceResults,
        context,
        'reference',
        { applyPhaseWeights: true }
      );
      const weightedRelevance1 = merged1[0].relevance;

      // 添加 risk 阶段结果（权重 1.0）
      const riskResults: UnifiedResult[] = [
        createMockResult('src/risk.ts', 'ai-feed', 1.0),
      ];
      const merged2 = fusion.mergeWithContext(
        riskResults,
        context,
        'risk',
        { applyPhaseWeights: true }
      );

      // risk 阶段结果应该排在前面（权重更高）
      expect(merged2[0].file).toBe('src/risk.ts');

      // reference 阶段结果应该被加权（1.0 * 0.8 = 0.8）
      const authResult = merged2.find((r) => r.file === 'src/auth.ts');
      expect(authResult?.relevance).toBe(weightedRelevance1);
    });
  });

  // ==========================================
  // 阶段定义验证
  // ==========================================

  describe('Phase Definitions', () => {
    it('should have all 6 phase definitions', () => {
      const phases: WorkflowPhase[] = [
        'reference',
        'impact',
        'risk',
        'implementation',
        'commit',
        'ci',
      ];

      phases.forEach((phase) => {
        const definition = PHASE_DEFINITIONS[phase];
        expect(definition).toBeDefined();
        expect(definition.name).toBe(phase);
        expect(definition.commands).toBeInstanceOf(Array);
      });
    });

    it('should have correct phase order', () => {
      const expectedOrder: WorkflowPhase[] = [
        'reference',
        'impact',
        'risk',
        'implementation',
        'commit',
        'ci',
      ];

      expectedOrder.forEach((phase, index) => {
        if (index < expectedOrder.length - 1) {
          const nextPhase = expectedOrder[index + 1];
          expect(PHASE_DEFINITIONS[phase].nextPhase).toBe(nextPhase);
        }
      });
    });
  });
});

// ============================================
// 性能测试
// ============================================

describe('Workflow Performance', () => {
  it('should handle large result sets efficiently', () => {
    const fusion = createResultFusion();
    const context = WorkflowResultFusion.createEmptyContext();

    // 创建大量结果
    const largeResults: UnifiedResult[] = Array.from({ length: 1000 }, (_, i) =>
      createMockResult(`src/file${i}.ts`, 'codemap', Math.random())
    );

    const start = Date.now();
    const merged = fusion.mergeWithContext(largeResults, context, 'reference', {
      topK: 50,
    });
    const duration = Date.now() - start;

    expect(merged).toHaveLength(50);
    expect(duration).toBeLessThan(1000); // 应该在 1 秒内完成
  });

  it('should handle multiple phases with accumulated results', () => {
    const fusion = createResultFusion();
    const context = WorkflowResultFusion.createEmptyContext();

    const phases: WorkflowPhase[] = ['reference', 'impact', 'risk'];

    phases.forEach((phase, index) => {
      const results: UnifiedResult[] = Array.from({ length: 100 }, (_, i) =>
        createMockResult(`src/${phase}${i}.ts`, 'codemap', 0.5 + Math.random() * 0.5)
      );
      fusion.mergeWithContext(results, context, phase, { topK: 20 });
    });

    // 累积上下文应该包含所有阶段的结果（去重后）
    expect(context.accumulatedContext.size).toBeGreaterThan(0);
    expect(context.phaseResults.size).toBe(3);
  });
});
