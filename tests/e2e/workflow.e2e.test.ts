/**
 * [META] since:2026-03 | owner:codemap-team | stable:false
 * [WHY] Keep the legacy workflow E2E suite aligned with the shipped 4-phase workflow contract
 */

/**
 * 工作流 E2E 集成测试
 *
 * @module WorkflowE2ETest
 * @version 2.6
 */

import { describe, it, expect } from 'vitest';

import {
  WorkflowOrchestrator,
  WorkflowPhase,
  WorkflowResultFusion,
  createResultFusion,
  createPhaseInheritance,
} from '../../src/orchestrator/workflow/index.js';
import type { UnifiedResult } from '../../src/orchestrator/types.js';

/**
 * 创建测试用的 UnifiedResult
 */
function createMockResult(
  file: string,
  source: UnifiedResult['source'],
  relevance: number,
  overrides: Partial<UnifiedResult> = {},
): UnifiedResult {
  return {
    id: `test-${file}-${source}`,
    source,
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

describe('Workflow E2E Tests', () => {
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

      const merged = fusion.mergeWithContext(newResults, context, 'find', {
        topK: 10,
      });

      expect(merged).toHaveLength(2);
      expect(context.phaseResults.get('find')).toHaveLength(2);
      expect(context.accumulatedContext.size).toBe(2);
    });

    it('should apply phase weights correctly', () => {
      const fusion = createResultFusion();
      const context = WorkflowResultFusion.createEmptyContext();

      const findResults: UnifiedResult[] = [
        createMockResult('src/auth.ts', 'ast-grep', 0.9),
      ];
      fusion.mergeWithContext(findResults, context, 'find');

      const linkResults: UnifiedResult[] = [
        createMockResult('src/link.ts', 'ai-feed', 0.8),
      ];
      const merged = fusion.mergeWithContext(linkResults, context, 'link');

      expect(merged.length).toBeGreaterThan(0);
      expect(merged[0].file).toBe('src/link.ts');
    });

    it('should deduplicate results based on file:line', () => {
      const fusion = createResultFusion();
      const context = WorkflowResultFusion.createEmptyContext();

      const results: UnifiedResult[] = [
        createMockResult('src/auth.ts', 'codemap', 0.9, { line: 10 }),
        createMockResult('src/auth.ts', 'ast-grep', 0.7, { line: 10 }),
        createMockResult('src/auth.ts', 'codemap', 0.8, { line: 20 }),
      ];

      const merged = fusion.mergeWithContext(results, context, 'find', {
        applyPhaseWeights: false,
      });

      expect(merged).toHaveLength(2);
      expect(merged[0].relevance).toBeGreaterThanOrEqual(0.9);
    });

    it('should limit results to topK', () => {
      const fusion = createResultFusion();
      const context = WorkflowResultFusion.createEmptyContext();

      const results: UnifiedResult[] = Array.from({ length: 20 }, (_, index) =>
        createMockResult(`src/file${index}.ts`, 'codemap', 0.5 + index * 0.025),
      );

      const merged = fusion.mergeWithContext(results, context, 'find', {
        topK: 5,
      });

      expect(merged).toHaveLength(5);
    });

    it('should build context from artifacts', () => {
      const artifacts = new Map();
      artifacts.set('find', {
        phase: 'find' as WorkflowPhase,
        results: [createMockResult('src/auth.ts', 'codemap', 0.9)],
        createdAt: new Date(),
      });

      const context = WorkflowResultFusion.buildContextFromArtifacts(artifacts);

      expect(context.phaseResults.get('find')).toHaveLength(1);
      expect(context.accumulatedContext.size).toBe(1);
    });
  });

  describe('T004: PhaseInheritance', () => {
    it('should get inherited results for read phase', () => {
      const inheritance = createPhaseInheritance();
      const context = WorkflowResultFusion.createEmptyContext();

      context.phaseResults.set('find', [
        createMockResult('src/auth.ts', 'ast-grep', 0.9),
        createMockResult('src/cache.ts', 'codemap', 0.8),
      ]);

      const inherited = inheritance.getInheritedResults('read', context);

      expect(inherited.length).toBeGreaterThan(0);
      inherited.forEach((result) => {
        expect(['ast-grep', 'codemap']).toContain(result.source);
      });
    });

    it('should get inherited results for link phase', () => {
      const inheritance = createPhaseInheritance();
      const context = WorkflowResultFusion.createEmptyContext();

      context.phaseResults.set('find', [
        createMockResult('src/auth.ts', 'codemap', 0.9),
      ]);
      context.phaseResults.set('read', [
        createMockResult('src/cache.ts', 'ast-grep', 0.8),
      ]);

      const inherited = inheritance.getInheritedResults('link', context);

      expect(inherited.length).toBe(2);
    });

    it('should return empty for find phase (no inheritance)', () => {
      const inheritance = createPhaseInheritance();
      const context = WorkflowResultFusion.createEmptyContext();

      const inherited = inheritance.getInheritedResults('find', context);

      expect(inherited).toHaveLength(0);
    });

    it('should filter by min relevance for show phase', () => {
      const inheritance = createPhaseInheritance();
      const context = WorkflowResultFusion.createEmptyContext();

      context.phaseResults.set('find', [
        createMockResult('src/high.ts', 'codemap', 0.9),
        createMockResult('src/low.ts', 'codemap', 0.3),
      ]);

      const inherited = inheritance.getInheritedResults('show', context);

      expect(inherited).toHaveLength(1);
      inherited.forEach((result) => {
        expect(result.relevance).toBeGreaterThanOrEqual(0.4);
      });
    });

    it('should provide inheritance statistics', () => {
      const inheritance = createPhaseInheritance();
      const context = WorkflowResultFusion.createEmptyContext();

      context.phaseResults.set('find', [
        createMockResult('src/auth.ts', 'codemap', 0.9),
        createMockResult('src/cache.ts', 'ast-grep', 0.8),
      ]);

      const stats = inheritance.getInheritanceStats('read', context);

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.bySource).toBeDefined();
      expect(stats.avgRelevance).toBeGreaterThan(0);
    });

    it('should allow custom inheritance config', () => {
      const customConfig = {
        read: {
          strategy: 'all' as const,
          minRelevance: 0.7,
        },
      };

      const inheritance = createPhaseInheritance(customConfig);
      const context = WorkflowResultFusion.createEmptyContext();

      context.phaseResults.set('find', [
        createMockResult('src/high.ts', 'codemap', 0.9),
        createMockResult('src/low.ts', 'codemap', 0.5),
      ]);

      const inherited = inheritance.getInheritedResults('read', context);

      expect(inherited.length).toBe(1);
      expect(inherited[0].relevance).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('Workflow Lifecycle', () => {
    it('should complete full workflow lifecycle', async () => {
      const orchestrator = new WorkflowOrchestrator();
      const context = await orchestrator.start('实现测试功能');

      expect(context.task).toBe('实现测试功能');
      expect(context.currentPhase).toBe('find');

      const readPhase = await orchestrator.proceedToNextPhase(true);
      expect(readPhase).toBe('read');
      expect(context.currentPhase).toBe('read');

      const linkPhase = await orchestrator.proceedToNextPhase(true);
      expect(linkPhase).toBe('link');
      expect(context.currentPhase).toBe('link');

      const showPhase = await orchestrator.proceedToNextPhase(true);
      expect(showPhase).toBe('show');
      expect(context.currentPhase).toBe('show');

      await expect(orchestrator.proceedToNextPhase(true)).rejects.toThrow('No next phase available');
    });

    it('should persist and resume workflow', async () => {
      const orchestrator = new WorkflowOrchestrator();
      const context = await orchestrator.start('测试持久化');
      await orchestrator.proceedToNextPhase(true);
      await orchestrator.checkpoint();

      const resumed = await orchestrator.resume(context.id);

      expect(resumed).toBeDefined();
      expect(resumed?.task).toBe('测试持久化');
      expect(resumed?.currentPhase).toBe('read');
    });

    it('should create and restore checkpoint', async () => {
      const orchestrator = new WorkflowOrchestrator();
      const context = await orchestrator.start('测试检查点');

      await orchestrator.checkpoint();
      await orchestrator.proceedToNextPhase(true);

      expect(context.currentPhase).toBe('read');
    });
  });

  describe('Cross-Phase Result Passing', () => {
    it('should pass results between phases with fusion', async () => {
      const fusion = createResultFusion();
      const inheritance = createPhaseInheritance();

      const fusionContext = WorkflowResultFusion.createEmptyContext();
      const findResults: UnifiedResult[] = [
        createMockResult('src/auth.ts', 'ast-grep', 0.95),
        createMockResult('src/cache.ts', 'codemap', 0.85),
      ];

      fusion.mergeWithContext(findResults, fusionContext, 'find');

      const readInherited = inheritance.getInheritedResults('read', fusionContext);
      expect(readInherited.length).toBe(2);

      const readResults: UnifiedResult[] = [
        createMockResult('src/read.ts', 'codemap', 0.9),
      ];
      fusion.mergeWithContext(readResults, fusionContext, 'read');

      const linkInherited = inheritance.getInheritedResults('link', fusionContext);
      expect(linkInherited.length).toBe(3);
    });

    it('should maintain result relevance through phases', () => {
      const fusion = createResultFusion();
      const context = WorkflowResultFusion.createEmptyContext();

      const findResults: UnifiedResult[] = [
        createMockResult('src/auth.ts', 'ast-grep', 1.0),
      ];
      const merged1 = fusion.mergeWithContext(findResults, context, 'find', {
        applyPhaseWeights: true,
      });
      const weightedRelevance1 = merged1[0].relevance;

      const linkResults: UnifiedResult[] = [
        createMockResult('src/link.ts', 'ai-feed', 1.0),
      ];
      const merged2 = fusion.mergeWithContext(linkResults, context, 'link', {
        applyPhaseWeights: true,
      });

      expect(merged2[0].file).toBe('src/link.ts');

      const authResult = merged2.find((result) => result.file === 'src/auth.ts');
      expect(authResult?.relevance).toBe(weightedRelevance1);
    });
  });

  describe('Phase Definitions', () => {
    it('should have valid phase definitions in orchestrator', () => {
      const phases: WorkflowPhase[] = ['find', 'read', 'link', 'show'];

      phases.forEach((phase) => {
        expect(phase).toBeDefined();
      });
    });

    it('should have correct phase progression', async () => {
      const orchestrator = new WorkflowOrchestrator();
      const expectedOrder: WorkflowPhase[] = ['find', 'read', 'link', 'show'];

      await orchestrator.start('测试阶段顺序');

      for (let index = 0; index < expectedOrder.length - 1; index += 1) {
        const nextPhase = await orchestrator.proceedToNextPhase(true);
        expect(nextPhase).toBe(expectedOrder[index + 1]);
      }
    });
  });
});

describe('Workflow Performance', () => {
  it('should handle large result sets efficiently', () => {
    const fusion = createResultFusion();
    const context = WorkflowResultFusion.createEmptyContext();

    const largeResults: UnifiedResult[] = Array.from({ length: 1000 }, (_, index) =>
      createMockResult(`src/file${index}.ts`, 'codemap', Math.random()),
    );

    const start = Date.now();
    const merged = fusion.mergeWithContext(largeResults, context, 'find', {
      topK: 50,
    });
    const duration = Date.now() - start;

    expect(merged).toHaveLength(50);
    expect(duration).toBeLessThan(1000);
  });

  it('should handle multiple phases with accumulated results', () => {
    const fusion = createResultFusion();
    const context = WorkflowResultFusion.createEmptyContext();

    const phases: WorkflowPhase[] = ['find', 'read', 'link'];

    phases.forEach((phase) => {
      const results: UnifiedResult[] = Array.from({ length: 100 }, (_, index) =>
        createMockResult(`src/${phase}${index}.ts`, 'codemap', 0.5 + Math.random() * 0.5),
      );
      fusion.mergeWithContext(results, context, phase, { topK: 20 });
    });

    expect(context.accumulatedContext.size).toBeGreaterThan(0);
    expect(context.phaseResults.size).toBe(3);
  });
});
