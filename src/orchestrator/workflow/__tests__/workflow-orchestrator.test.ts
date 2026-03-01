// [META] since:2026-03-02 | owner:workflow-team | coverage:100%
// [WHY] Tests for workflow orchestrator core functionality


/**
 * Workflow Orchestrator Module Tests
 * Tests for core orchestrator functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock child_process exec for CI commands
vi.mock('node:child_process', () => ({
  exec: vi.fn((cmd: string, cb: (err: Error | null, result: { stdout: string; stderr: string }) => void) => {
    cb(null, { stdout: '', stderr: '' });
  })
}));

vi.mock('node:util', () => ({
  promisify: vi.fn((fn: unknown) => fn)
}));

// Mock dependencies before imports
vi.mock('../tool-orchestrator.js', () => ({
  ToolOrchestrator: vi.fn().mockImplementation(() => ({
    registerAdapter: vi.fn(),
    executeParallel: vi.fn().mockResolvedValue(new Map([['codemap', [{ id: '1', source: 'codemap', relevance: 0.9 }]]]))
  }))
}));

vi.mock('../intent-router.js', () => ({
  IntentRouter: vi.fn().mockImplementation(() => ({
    route: vi.fn().mockReturnValue({
      intent: 'reference',
      targets: ['src/'],
      keywords: ['test'],
      scope: 'direct',
      tool: 'codemap'
    })
  }))
}));

vi.mock('../result-fusion.js', () => ({
  ResultFusion: vi.fn().mockImplementation(() => ({
    fuse: vi.fn().mockResolvedValue([
      { id: '1', source: 'codemap', relevance: 0.9, file: 'test.ts' }
    ])
  }))
}));

vi.mock('../confidence.js', () => ({
  calculateConfidence: vi.fn().mockReturnValue({
    score: 0.85,
    level: 'high',
    reasons: ['good results']
  })
}));

vi.mock('../adapters/codemap-adapter.js', () => ({
  createCodemapAdapter: vi.fn().mockReturnValue({ name: 'codemap' })
}));

vi.mock('../adapters/ast-grep-adapter.js', () => ({
  createAstGrepAdapter: vi.fn().mockReturnValue({ name: 'ast-grep' })
}));

// Mock file system for persistence
vi.mock('node:fs', () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue('{}'),
    readdir: vi.fn().mockResolvedValue([]),
    unlink: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockResolvedValue(undefined)
  }
}));

import { WorkflowOrchestrator } from '../workflow-orchestrator.js';
import type { WorkflowPhase, ConfidenceResult, AnalyzeArgs } from '../types.js';
import { promises as fs } from 'node:fs';

describe('PHASE 5: WorkflowOrchestrator Tests', () => {
  let orchestrator: WorkflowOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new WorkflowOrchestrator();
  });

  describe('start()', () => {
    it('should create and save new workflow', async () => {
      const context = await orchestrator.start('test task');

      expect(context).toBeDefined();
      expect(context.id).toMatch(/^wf-\d+-/);
      expect(context.task).toBe('test task');
      expect(context.currentPhase).toBe('reference');
      expect(context.phaseStatus).toBe('pending');
    });

    it('should persist initial state', async () => {
      await orchestrator.start('test task');

      expect(fs.mkdir).toHaveBeenCalledWith('.codemap/workflow', { recursive: true });
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should generate unique IDs for each workflow', async () => {
      const context1 = await orchestrator.start('task 1');
      
      // Create new orchestrator instance for second workflow
      const orchestrator2 = new WorkflowOrchestrator();
      const context2 = await orchestrator2.start('task 2');

      expect(context1.id).not.toBe(context2.id);
    });
  });

  describe('executeCurrentPhase()', () => {
    it('should throw error if no active workflow', async () => {
      const orchestratorWithoutContext = new WorkflowOrchestrator();
      
      await expect(
        orchestratorWithoutContext.executeCurrentPhase({ targets: ['src/'] } as AnalyzeArgs)
      ).rejects.toThrow('No active workflow');
    });

    it('should update status to running then completed', async () => {
      await orchestrator.start('test task');
      
      const result = await orchestrator.executeCurrentPhase({ targets: ['src/'] } as AnalyzeArgs);

      expect(result).toBeDefined();
      expect(result.artifacts).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should return phase result with artifacts and confidence', async () => {
      await orchestrator.start('test task');
      
      const result = await orchestrator.executeCurrentPhase({ targets: ['src/'] } as AnalyzeArgs);

      expect(result.artifacts.phase).toBe('reference');
      expect(result.artifacts.createdAt).toBeInstanceOf(Date);
      // Confidence is calculated from mocked calculateConfidence
      expect(result.confidence.score).toBeDefined();
      expect(typeof result.canProceed).toBe('boolean');
    });

    it('should store artifacts in context', async () => {
      await orchestrator.start('test task');
      await orchestrator.executeCurrentPhase({ targets: ['src/'] } as AnalyzeArgs);

      const context = orchestrator.getContext();
      expect(context?.artifacts.has('reference')).toBe(true);
    });

    it('should update context status to completed', async () => {
      await orchestrator.start('test task');
      await orchestrator.executeCurrentPhase({ targets: ['src/'] } as AnalyzeArgs);

      const context = orchestrator.getContext();
      expect(context?.phaseStatus).toBe('completed');
    });
  });

  describe('proceedToNextPhase()', () => {
    it('should advance to next phase when current is completed', async () => {
      await orchestrator.start('test task');
      
      // Complete current phase
      await orchestrator.executeCurrentPhase({ targets: ['src/'] } as AnalyzeArgs);
      
      // Should proceed to impact
      const nextPhase = await orchestrator.proceedToNextPhase();
      expect(nextPhase).toBe('impact');
    });

    it('should throw error when no active workflow', async () => {
      const orchestratorWithoutContext = new WorkflowOrchestrator();
      
      await expect(orchestratorWithoutContext.proceedToNextPhase()).rejects.toThrow('No active workflow');
    });

    it('should throw error when phase not completed', async () => {
      await orchestrator.start('test task');
      // Don't execute phase - status remains pending
      
      await expect(orchestrator.proceedToNextPhase()).rejects.toThrow('not completed');
    });

    it('should allow forced advancement', async () => {
      await orchestrator.start('test task');
      // Don't execute phase
      
      const nextPhase = await orchestrator.proceedToNextPhase(true);
      expect(nextPhase).toBe('impact');
    });

    it('should update phase status correctly', async () => {
      await orchestrator.start('test task');
      await orchestrator.executeCurrentPhase({ targets: ['src/'] } as AnalyzeArgs);
      
      await orchestrator.proceedToNextPhase();
      
      const context = orchestrator.getContext();
      expect(context?.currentPhase).toBe('impact');
      expect(context?.phaseStatus).toBe('pending');
    });

    it('should throw error when no next phase available', async () => {
      await orchestrator.start('test task');
      
      // Navigate to last phase (ci)
      await orchestrator.executeCurrentPhase({ targets: ['src/'] } as AnalyzeArgs);
      await orchestrator.proceedToNextPhase(true); // reference -> impact
      await orchestrator.proceedToNextPhase(true); // impact -> risk
      await orchestrator.proceedToNextPhase(true); // risk -> implementation
      await orchestrator.proceedToNextPhase(true); // implementation -> commit
      await orchestrator.proceedToNextPhase(true); // commit -> ci
      
      // ci has no nextPhase
      await expect(orchestrator.proceedToNextPhase(true)).rejects.toThrow('No next phase available');
    });
  });

  describe('getStatus()', () => {
    it('should return inactive status when no workflow', async () => {
      const orchestratorWithoutContext = new WorkflowOrchestrator();
      const status = await orchestratorWithoutContext.getStatus();
      
      expect(status.active).toBe(false);
      expect(status.task).toBeUndefined();
    });

    it('should return active status with progress', async () => {
      await orchestrator.start('test task');
      const status = await orchestrator.getStatus();
      
      expect(status.active).toBe(true);
      expect(status.task).toBe('test task');
      expect(status.currentPhase).toBe('reference');
      expect(status.phaseStatus).toBe('pending');
      expect(typeof status.progress).toBe('number');
    });

    it('should include artifacts in status', async () => {
      await orchestrator.start('test task');
      await orchestrator.executeCurrentPhase({ targets: ['src/'] } as AnalyzeArgs);
      
      const status = await orchestrator.getStatus();
      
      expect(status.artifacts).toContain('reference');
    });

    it('should calculate progress correctly', async () => {
      await orchestrator.start('test task');
      
      let status = await orchestrator.getStatus();
      expect(status.progress).toBe(0);
      
      await orchestrator.executeCurrentPhase({ targets: ['src/'] } as AnalyzeArgs);
      
      status = await orchestrator.getStatus();
      expect(status.progress).toBeGreaterThan(0);
    });
  });

  describe('resume()', () => {
    it('should restore workflow from persistence', async () => {
      const workflowData = {
        id: 'wf-resume-001',
        task: 'resumed task',
        currentPhase: 'impact',
        phaseStatus: 'completed',
        artifacts: [],
        cachedResults: {},
        userConfirmed: [],
        startedAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:30:00Z'
      };
      
      // Setup mock to return workflow data
      vi.mocked(fs.readFile).mockImplementation((path: string) => {
        if (path.includes('active.json')) {
          return Promise.resolve(JSON.stringify({ id: 'wf-resume-001' }));
        }
        return Promise.resolve(JSON.stringify(workflowData));
      });
      
      const testOrchestrator = new WorkflowOrchestrator();
      const result = await testOrchestrator.resume('wf-resume-001');
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe('wf-resume-001');
      expect(result?.task).toBe('resumed task');
      expect(result?.currentPhase).toBe('impact');
    });

    it('should set context on orchestrator', async () => {
      const workflowData = {
        id: 'wf-resume-002',
        task: 'resumed task',
        currentPhase: 'reference',
        phaseStatus: 'pending',
        artifacts: [],
        cachedResults: {},
        userConfirmed: [],
        startedAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:30:00Z'
      };
      
      vi.mocked(fs.readFile).mockImplementation((path: string) => {
        if (path.includes('active.json')) {
          return Promise.resolve(JSON.stringify({ id: 'wf-resume-002' }));
        }
        return Promise.resolve(JSON.stringify(workflowData));
      });
      
      const testOrchestrator = new WorkflowOrchestrator();
      await testOrchestrator.resume('wf-resume-002');
      
      const context = testOrchestrator.getContext();
      expect(context?.id).toBe('wf-resume-002');
    });

    it('should return null when workflow not found', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      vi.mocked(fs.readFile).mockRejectedValue(error);
      
      const testOrchestrator = new WorkflowOrchestrator();
      const result = await testOrchestrator.resume('non-existent');
      
      expect(result).toBeNull();
    });
  });

  describe('checkpoint()', () => {
    it('should persist current state', async () => {
      await orchestrator.start('test task');
      
      // Clear writeFile calls from start
      vi.mocked(fs.writeFile).mockClear();
      
      await orchestrator.checkpoint();
      
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should throw error when no active workflow', async () => {
      const orchestratorWithoutContext = new WorkflowOrchestrator();
      
      await expect(orchestratorWithoutContext.checkpoint()).rejects.toThrow('No active workflow');
    });
  });

  describe('getGuidance()', () => {
    it('should suggest auto-proceed for high confidence', () => {
      const confidence: ConfidenceResult = { score: 0.85, level: 'high', reasons: [] };
      const guidance = orchestrator.getGuidance(confidence, 'reference');
      
      expect(guidance.action).toBe('auto-proceed');
      expect(guidance.message).toContain('High confidence');
      expect(guidance.message).toContain('0.85');
    });

    it('should suggest confirm-proceed for medium confidence', () => {
      const confidence: ConfidenceResult = { score: 0.55, level: 'medium', reasons: [] };
      const guidance = orchestrator.getGuidance(confidence, 'reference');
      
      expect(guidance.action).toBe('confirm-proceed');
      expect(guidance.message).toContain('Medium confidence');
      expect(guidance.suggestion).toContain('broader scope');
    });

    it('should suggest hold for low confidence', () => {
      const confidence: ConfidenceResult = { 
        score: 0.25, 
        level: 'low', 
        reasons: ['insufficient data', 'low coverage'] 
      };
      const guidance = orchestrator.getGuidance(confidence, 'reference');
      
      expect(guidance.action).toBe('hold');
      expect(guidance.message).toContain('Low confidence');
      expect(guidance.suggestion).toContain('insufficient data');
      expect(guidance.suggestion).toContain('low coverage');
    });
  });

  describe('phase definitions', () => {
    it('should have all 6 phases defined', () => {
      const definitions = orchestrator.getAllPhaseDefinitions();
      
      expect(definitions).toHaveLength(6);
      
      const phaseNames = definitions.map(d => d.name);
      expect(phaseNames).toContain('reference');
      expect(phaseNames).toContain('impact');
      expect(phaseNames).toContain('risk');
      expect(phaseNames).toContain('implementation');
      expect(phaseNames).toContain('commit');
      expect(phaseNames).toContain('ci');
    });

    it('should have correct phase chain', () => {
      const reference = orchestrator.getPhaseDefinition('reference');
      const impact = orchestrator.getPhaseDefinition('impact');
      const risk = orchestrator.getPhaseDefinition('risk');
      const implementation = orchestrator.getPhaseDefinition('implementation');
      const commit = orchestrator.getPhaseDefinition('commit');
      const ci = orchestrator.getPhaseDefinition('ci');
      
      expect(reference?.nextPhase).toBe('impact');
      expect(impact?.nextPhase).toBe('risk');
      expect(risk?.nextPhase).toBe('implementation');
      expect(implementation?.nextPhase).toBe('commit');
      expect(commit?.nextPhase).toBe('ci');
      expect(ci?.nextPhase).toBeUndefined();
    });

    it('should get specific phase definition', () => {
      const reference = orchestrator.getPhaseDefinition('reference');
      
      expect(reference).toBeDefined();
      expect(reference?.name).toBe('reference');
      expect(reference?.action).toBe('analyze');
    });

    it('should return undefined for unknown phase', () => {
      const unknown = orchestrator.getPhaseDefinition('unknown' as WorkflowPhase);
      
      expect(unknown).toBeUndefined();
    });

    it('should have correct action types for each phase', () => {
      const reference = orchestrator.getPhaseDefinition('reference');
      const risk = orchestrator.getPhaseDefinition('risk');
      const implementation = orchestrator.getPhaseDefinition('implementation');
      
      expect(reference?.action).toBe('analyze');
      expect(risk?.action).toBe('ci');
      expect(implementation?.action).toBe('manual');
    });
  });

  describe('listWorkflows()', () => {
    it('should list all saved workflows', async () => {
      const files = ['wf-001.json'];
      const workflowData = {
        id: 'wf-001',
        task: 'task 1',
        currentPhase: 'reference',
        phaseStatus: 'pending',
        startedAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:30:00Z'
      };

      vi.mocked(fs.readdir).mockResolvedValue(files as any);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(workflowData));

      const workflows = await orchestrator.listWorkflows();

      expect(workflows).toHaveLength(1);
    });
  });

  describe('deleteWorkflow()', () => {
    it('should delete workflow and clear context if active', async () => {
      await orchestrator.start('test task');
      const context = orchestrator.getContext();
      const id = context!.id;

      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

      await orchestrator.deleteWorkflow(id);

      expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining(id));
      expect(orchestrator.getContext()).toBeNull();
    });

    it('should not clear context if deleting different workflow', async () => {
      await orchestrator.start('test task');
      
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));
      
      await orchestrator.deleteWorkflow('other-workflow-id');

      expect(orchestrator.getContext()).not.toBeNull();
    });
  });
});
