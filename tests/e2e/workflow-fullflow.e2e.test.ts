/**
 * [META] since:2026-04 | owner:codemap-team | stable:false
 * [WHY] Full-flow E2E tests driven by user pain points, not internal API surface
 */

import { describe, it, expect } from 'vitest';

import { WorkflowOrchestrator } from '../../src/orchestrator/workflow/workflow-orchestrator.js';
import { WorkflowTemplateManager, recommendTemplate, BUILTIN_TEMPLATES } from '../../src/orchestrator/workflow/templates.js';
import { WorkflowResultFusion } from '../../src/orchestrator/workflow/result-fusion.js';
import { PhaseInheritance } from '../../src/orchestrator/workflow/phase-inheritance.js';
import { WorkflowContextFactory, WorkflowContextValidator } from '../../src/orchestrator/workflow/workflow-context.js';
import type { UnifiedResult } from '../../src/orchestrator/types.js';
import type { WorkflowPhase } from '../../src/orchestrator/workflow/types.js';

// ============================================
// Test Helpers
// ============================================

function createMockResult(
  file: string,
  source: string,
  relevance: number,
  overrides: Partial<UnifiedResult> = {}
): UnifiedResult {
  return {
    id: `test-${file}-${source}`,
    source: source as UnifiedResult['source'],
    toolScore: relevance,
    type: 'code',
    file,
    line: 1,
    content: `Content for ${file}`,
    relevance,
    keywords: ['test'],
    ...overrides,
  };
}

// ============================================
// E2E-001: Refactoring Pre-Flight Check
// ============================================

describe('E2E-001: Refactoring Pre-Flight Check', () => {
  it('should complete full 4-phase workflow for refactoring task', async () => {
    const orchestrator = new WorkflowOrchestrator();

    const context = await orchestrator.start('重构 auth 模块');

    // Phase 1: find
    expect(context.currentPhase).toBe('find');
    const findResult = await orchestrator.executeCurrentPhase({
      query: 'auth',
      topK: 8,
    });
    expect(findResult.artifacts.phase).toBe('find');
    expect(typeof findResult.canProceed).toBe('boolean');

    // Phase 2: read
    await orchestrator.proceedToNextPhase(true);
    expect(context.currentPhase).toBe('read');
    const readResult = await orchestrator.executeCurrentPhase({
      query: 'auth',
      topK: 8,
    });
    expect(readResult.artifacts.phase).toBe('read');

    // Phase 3: link
    await orchestrator.proceedToNextPhase(true);
    expect(context.currentPhase).toBe('link');
    const linkResult = await orchestrator.executeCurrentPhase({
      query: 'auth',
      topK: 8,
    });
    expect(linkResult.artifacts.phase).toBe('link');

    // Phase 4: show
    await orchestrator.proceedToNextPhase(true);
    expect(context.currentPhase).toBe('show');
    const showResult = await orchestrator.executeCurrentPhase({
      query: 'auth',
      topK: 8,
    });
    expect(showResult.artifacts.phase).toBe('show');

    // All phases have artifacts
    expect(context.artifacts.has('find')).toBe(true);
    expect(context.artifacts.has('read')).toBe(true);
    expect(context.artifacts.has('link')).toBe(true);
    expect(context.artifacts.has('show')).toBe(true);
  });

  it('should pass results between phases via fusion and inheritance', () => {
    const fusion = new WorkflowResultFusion();
    const inheritance = new PhaseInheritance();
    const fusionContext = WorkflowResultFusion.createEmptyContext();

    // find phase results
    const findResults: UnifiedResult[] = [
      createMockResult('src/auth.ts', 'ast-grep', 0.95),
      createMockResult('src/middleware/auth.ts', 'ast-grep', 0.85),
    ];
    fusion.mergeWithContext(findResults, fusionContext, 'find');

    // read phase inherits from find
    const readInherited = inheritance.getInheritedResults('read', fusionContext);
    expect(readInherited.length).toBe(2);
    // read only inherits code-analysis sources
    readInherited.forEach(r => {
      expect(['ast-grep', 'codemap']).toContain(r.source);
    });

    // read phase adds its own results
    const readResults: UnifiedResult[] = [
      createMockResult('src/auth.ts', 'codemap', 0.9),
    ];
    fusion.mergeWithContext(readResults, fusionContext, 'read');

    // link phase inherits ALL previous results
    const linkInherited = inheritance.getInheritedResults('link', fusionContext);
    expect(linkInherited.length).toBeGreaterThan(0);

    // show phase inherits all with minRelevance filter
    const showInherited = inheritance.getInheritedResults('show', fusionContext);
    showInherited.forEach(r => {
      expect(r.relevance).toBeGreaterThanOrEqual(0.4);
    });
  });
});

// ============================================
// E2E-002: Hotfix Fast-Track
// ============================================

describe('E2E-002: Hotfix Fast-Track', () => {
  it('should recommend hotfix template for urgent tasks', () => {
    const template = recommendTemplate('urgent fix token undefined error');
    expect(template.name).toBe('hotfix');
  });

  it('should have lower confidence thresholds for hotfix', () => {
    const template = recommendTemplate('urgent critical hotfix security');
    const findPhase = template.phases.find(p => p.name === 'find');
    const readPhase = template.phases.find(p => p.name === 'read');

    expect(findPhase?.entryCondition.minConfidence).toBe(0.1);
    expect(readPhase?.entryCondition.minConfidence).toBe(0.2);
  });

  it('should complete workflow with hotfix template', async () => {
    const orchestrator = new WorkflowOrchestrator();
    const context = await orchestrator.start('urgent fix token undefined', {
      template: 'hotfix',
    });

    expect(context.templateName).toBe('hotfix');

    // Verify hotfix thresholds are applied
    const phaseDefs = orchestrator.getAllPhaseDefinitions();
    const findDef = phaseDefs.find(p => p.name === 'find');
    expect(findDef?.entryCondition.minConfidence).toBe(0.1);

    // Run through all phases
    await orchestrator.executeCurrentPhase({ query: 'token', topK: 8 });
    await orchestrator.proceedToNextPhase(true);
    await orchestrator.executeCurrentPhase({ query: 'token', topK: 8 });
    await orchestrator.proceedToNextPhase(true);
    await orchestrator.executeCurrentPhase({ query: 'token', topK: 8 });
    await orchestrator.proceedToNextPhase(true);
    await orchestrator.executeCurrentPhase({ query: 'token', topK: 8 });

    expect(context.currentPhase).toBe('show');
  });
});

// ============================================
// E2E-003: Checkpoint & Resume
// ============================================

describe('E2E-003: Checkpoint & Resume', () => {
  it('should resume workflow from checkpoint after simulated restart', async () => {
    const orchestrator1 = new WorkflowOrchestrator();

    // Start and run find + read
    const context1 = await orchestrator1.start('测试断点续跑');
    await orchestrator1.executeCurrentPhase({ query: 'test', topK: 8 });
    await orchestrator1.proceedToNextPhase(true);
    await orchestrator1.executeCurrentPhase({ query: 'test', topK: 8 });

    // Save checkpoint
    await orchestrator1.checkpoint();
    const workflowId = context1.id;

    // Simulate restart: new orchestrator instance
    const orchestrator2 = new WorkflowOrchestrator();
    const resumed = await orchestrator2.resume(workflowId);

    // Verify context preserved
    expect(resumed).toBeDefined();
    expect(resumed!.task).toBe('测试断点续跑');
    expect(resumed!.currentPhase).toBe('read');
    expect(resumed!.artifacts.has('find')).toBe(true);
    expect(resumed!.artifacts.has('read')).toBe(true);
    expect(resumed!.artifacts.has('link')).toBe(false);

    // Continue from link
    await orchestrator2.proceedToNextPhase(true);
    expect(orchestrator2.getContext()?.currentPhase).toBe('link');
    await orchestrator2.executeCurrentPhase({ query: 'test', topK: 8 });
    await orchestrator2.proceedToNextPhase(true);
    await orchestrator2.executeCurrentPhase({ query: 'test', topK: 8 });
    const finalContext = orchestrator2.getContext();
    expect(finalContext?.currentPhase).toBe('show');
    expect(finalContext?.artifacts.has('link')).toBe(true);
  });
});

// ============================================
// E2E-004: Template Recommendation
// ============================================

describe('E2E-004: Template Recommendation', () => {
  const cases: Array<{ input: string; expected: string; findThreshold: number }> = [
    { input: 'fix login bug', expected: 'bugfix', findThreshold: 0.2 },
    { input: 'add user profile feature', expected: 'feature', findThreshold: 0.4 },
    { input: 'refactor payment module', expected: 'refactoring', findThreshold: 0.3 },
    { input: 'urgent critical hotfix security', expected: 'hotfix', findThreshold: 0.1 },
    { input: '随便看看', expected: 'refactoring', findThreshold: 0.3 },
  ];

  it.each(cases)('should recommend $expected for "$input"', ({ input, expected, findThreshold }) => {
    const template = recommendTemplate(input);
    expect(template.name).toBe(expected);

    const findPhase = template.phases.find(p => p.name === 'find');
    expect(findPhase?.entryCondition.minConfidence).toBe(findThreshold);
  });

  it('should have different thresholds across templates', () => {
    const templates = Object.values(BUILTIN_TEMPLATES);
    const findThresholds = templates.map(t => {
      const findPhase = t.phases.find(p => p.name === 'find');
      return findPhase?.entryCondition.minConfidence;
    });

    // All thresholds should be different (each template has unique strictness)
    const uniqueThresholds = new Set(findThresholds);
    expect(uniqueThresholds.size).toBe(templates.length);
  });
});

// ============================================
// E2E-005: Large Repo Performance
// ============================================

describe('E2E-005: Large Repo Performance', () => {
  it('should handle 1000 results with topK truncation', () => {
    const fusion = new WorkflowResultFusion();
    const context = WorkflowResultFusion.createEmptyContext();

    const largeResults: UnifiedResult[] = Array.from({ length: 1000 }, (_, i) =>
      createMockResult(`src/file${i}.ts`, 'codemap', 0.3 + Math.random() * 0.7)
    );

    const start = Date.now();
    const merged = fusion.mergeWithContext(largeResults, context, 'find', { topK: 8 });
    const duration = Date.now() - start;

    expect(merged).toHaveLength(8);
    expect(duration).toBeLessThan(1000);
    // Results should be sorted by relevance (highest first)
    for (let i = 1; i < merged.length; i++) {
      expect(merged[i - 1].relevance).toBeGreaterThanOrEqual(merged[i].relevance);
    }
  });

  it('should bound accumulated context across 4 phases', () => {
    const fusion = new WorkflowResultFusion();
    const context = WorkflowResultFusion.createEmptyContext();
    const phases: WorkflowPhase[] = ['find', 'read', 'link', 'show'];

    phases.forEach(phase => {
      const results: UnifiedResult[] = Array.from({ length: 100 }, (_, i) =>
        createMockResult(`src/${phase}${i}.ts`, 'codemap', 0.5 + Math.random() * 0.5)
      );
      fusion.mergeWithContext(results, context, phase, { topK: 8 });
    });

    // accumulatedContext 保留所有去重后的历史结果，而不是只保留 topK
    expect(context.accumulatedContext.size).toBe(100 * 4);
    expect(context.phaseResults.size).toBe(4);
  });
});

// ============================================
// E2E-006: Low Confidence Blocks Progression
// ============================================

describe('E2E-006: Low Confidence Blocks Progression', () => {
  it('should block progression when phase is not completed', () => {
    const context = WorkflowContextFactory.create('模糊任务');

    // Phase status is 'pending', not 'completed'
    const validation = WorkflowContextValidator.canProceed(context);
    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain('not completed');
  });

  it('should return hold guidance for low confidence', () => {
    const orchestrator = new WorkflowOrchestrator();

    const lowConfidence = { score: 0.15, level: 'low' as const, reasons: ['insufficient results'] };
    const guidance = orchestrator.getGuidance(lowConfidence, 'find');

    expect(guidance.action).toBe('hold');
    expect(guidance.message).toContain('0.15');
  });

  it('should return auto-proceed guidance for high confidence', () => {
    const orchestrator = new WorkflowOrchestrator();

    const highConfidence = { score: 0.9, level: 'high' as const, reasons: ['good coverage'] };
    const guidance = orchestrator.getGuidance(highConfidence, 'find');

    expect(guidance.action).toBe('auto-proceed');
  });

  it('should allow force proceed even when validation fails', async () => {
    const orchestrator = new WorkflowOrchestrator();
    await orchestrator.start('模糊任务');

    // Without force, proceedToNextPhase should throw (phase not completed)
    await expect(orchestrator.proceedToNextPhase(false)).rejects.toThrow();

    // With force, should succeed
    const nextPhase = await orchestrator.proceedToNextPhase(true);
    expect(nextPhase).toBe('read');
  });
});

// ============================================
// E2E-007: Custom Template
// ============================================

describe('E2E-007: Custom Template', () => {
  it('should apply custom template with higher thresholds', async () => {
    const templateManager = new WorkflowTemplateManager();

    const customTemplate = {
      name: 'team-security-audit',
      type: 'custom' as const,
      description: 'Security audit with strict thresholds',
      useCases: ['Security auditing'],
      phases: [
        {
          name: 'find' as WorkflowPhase,
          action: 'analyze' as const,
          analyzeIntent: 'find',
          entryCondition: { minConfidence: 0.5 },
          deliverables: [{ name: 'find-results', path: '.mycodemap/workflow/find.json', validator: () => true }],
          nextPhase: 'read' as WorkflowPhase,
          commands: ['codemap analyze --intent find'],
        },
        {
          name: 'read' as WorkflowPhase,
          action: 'analyze' as const,
          analyzeIntent: 'read',
          entryCondition: { minConfidence: 0.6 },
          deliverables: [{ name: 'read-results', path: '.mycodemap/workflow/read.json', validator: () => true }],
          nextPhase: 'link' as WorkflowPhase,
          commands: ['codemap analyze --intent read'],
        },
        {
          name: 'link' as WorkflowPhase,
          action: 'analyze' as const,
          analyzeIntent: 'link',
          entryCondition: { minConfidence: 0.5 },
          deliverables: [{ name: 'link-results', path: '.mycodemap/workflow/link.json', validator: () => true }],
          nextPhase: 'show' as WorkflowPhase,
          commands: ['codemap analyze --intent link'],
        },
        {
          name: 'show' as WorkflowPhase,
          action: 'analyze' as const,
          analyzeIntent: 'show',
          entryCondition: { minConfidence: 0.3 },
          deliverables: [{ name: 'show-results', path: '.mycodemap/workflow/show.json', validator: () => true }],
          commands: ['codemap analyze --intent show'],
        },
      ],
      version: '1.0.0',
      createdAt: new Date().toISOString(),
    };

    await templateManager.saveTemplate(customTemplate, { overwrite: true });

    const orchestrator = new WorkflowOrchestrator();
    const context = await orchestrator.start('security audit', {
      template: 'team-security-audit',
    });

    expect(context.templateName).toBe('team-security-audit');

    const phaseDefs = orchestrator.getAllPhaseDefinitions();
    const findDef = phaseDefs.find(p => p.name === 'find');
    const readDef = phaseDefs.find(p => p.name === 'read');

    expect(findDef?.entryCondition.minConfidence).toBe(0.5);
    expect(readDef?.entryCondition.minConfidence).toBe(0.6);
  });

  it('should not overwrite builtin templates without explicit flag', async () => {
    const templateManager = new WorkflowTemplateManager();

    await expect(
      templateManager.saveTemplate({
        ...BUILTIN_TEMPLATES.refactoring,
        description: 'hacked',
      })
    ).rejects.toThrow('Cannot overwrite builtin template');
  });
});
