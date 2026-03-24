// [META] since:2026-03-02 | owner:workflow-team | coverage:100%
// [WHY] Tests for workflow type definitions


/**
 * Types Module Tests
 * Tests for type definitions and interfaces
 */

import { describe, it, expect } from 'vitest';
import type {
  WorkflowPhase,
  PhaseAction,
  PhaseStatus,
  PhaseCondition,
  Deliverable,
  PhaseDefinition,
  PhaseArtifacts,
  CachedResults,
  RiskScore,
  WorkflowContext,
  WorkflowStatus,
  PhaseResult,
  WorkflowSummary,
  CheckItem,
  CheckpointResult,
  GuidanceAction,
  Guidance
} from '../types.js';

describe('PHASE 1: Type Definitions', () => {
  describe('WorkflowPhase union type', () => {
    it('should have WorkflowPhase with 4 analysis phases', () => {
      const validPhases: WorkflowPhase[] = [
        'find',
        'read',
        'link',
        'show'
      ];
      expect(validPhases).toHaveLength(4);
    });

    it('should accept all valid phase values', () => {
      const phase1: WorkflowPhase = 'find';
      const phase2: WorkflowPhase = 'read';
      const phase3: WorkflowPhase = 'link';
      const phase4: WorkflowPhase = 'show';
      expect([phase1, phase2, phase3, phase4]).toHaveLength(4);
    });
  });

  describe('PhaseAction union type', () => {
    it('should have correct action types', () => {
      const actions: PhaseAction[] = ['analyze', 'ci', 'manual'];
      expect(actions).toHaveLength(3);
    });
  });

  describe('PhaseStatus union type', () => {
    it('should have PhaseStatus with correct states', () => {
      const statuses: PhaseStatus[] = [
        'pending',
        'running',
        'completed',
        'verified',
        'skipped'
      ];
      expect(statuses).toHaveLength(5);
    });
  });

  describe('PhaseCondition interface', () => {
    it('should define PhaseCondition interface with all required fields', () => {
      const condition: PhaseCondition = {
        minConfidence: 0.7,
        requiredArtifacts: ['test.json']
      };
      expect(condition.minConfidence).toBe(0.7);
      expect(condition.requiredArtifacts).toContain('test.json');
    });

    it('should allow partial PhaseCondition', () => {
      const condition1: PhaseCondition = { minConfidence: 0.5 };
      const condition2: PhaseCondition = { requiredArtifacts: ['a.json'] };
      const condition3: PhaseCondition = {};
      expect(condition1).toBeDefined();
      expect(condition2).toBeDefined();
      expect(condition3).toBeDefined();
    });
  });

  describe('Deliverable interface', () => {
    it('should define Deliverable interface with validator function', () => {
      const deliverable: Deliverable = {
        name: 'test-deliverable',
        path: '/path/to/file.json',
        validator: (path: string) => path.endsWith('.json')
      };
      expect(deliverable.name).toBe('test-deliverable');
      expect(deliverable.path).toBe('/path/to/file.json');
      expect(deliverable.validator('/path/to/file.json')).toBe(true);
      expect(deliverable.validator('/path/to/file.txt')).toBe(false);
    });
  });

  describe('PhaseDefinition interface', () => {
    it('should define PhaseDefinition interface with all required fields', () => {
      const definition: PhaseDefinition = {
        name: 'find',
        action: 'analyze',
        analyzeIntent: 'find',
        entryCondition: { minConfidence: 0.3 },
        deliverables: [],
        nextPhase: 'read',
        commands: ['codemap analyze --intent find']
      };
      expect(definition.name).toBe('find');
      expect(definition.action).toBe('analyze');
      expect(definition.entryCondition).toBeDefined();
      expect(definition.deliverables).toEqual([]);
      expect(definition.commands).toContain('codemap analyze --intent find');
    });
  });

  describe('PhaseArtifacts interface', () => {
    it('should define PhaseArtifacts interface with createdAt Date', () => {
      const artifacts: PhaseArtifacts = {
        phase: 'find',
        results: [],
        confidence: { score: 0.8, level: 'high', reasons: [] },
        metadata: { key: 'value' },
        createdAt: new Date()
      };
      expect(artifacts.phase).toBe('find');
      expect(artifacts.createdAt).toBeInstanceOf(Date);
      expect(artifacts.metadata).toEqual({ key: 'value' });
    });
  });

  describe('CachedResults interface', () => {
    it('should define CachedResults interface with optional fields', () => {
      const cached: CachedResults = {
        find: [],
        read: []
      };
      expect(cached.find).toEqual([]);
      expect(cached.read).toEqual([]);
    });
  });

  describe('RiskScore interface', () => {
    it('should define RiskScore interface with correct structure', () => {
      const risk: RiskScore = {
        score: 0.5,
        level: 'medium',
        factors: ['complexity', 'coverage']
      };
      expect(risk.score).toBe(0.5);
      expect(risk.level).toBe('medium');
      expect(risk.factors).toHaveLength(2);
    });
  });

  describe('WorkflowContext interface', () => {
    it('should define WorkflowContext interface with artifacts Map', () => {
      const context: WorkflowContext = {
        id: 'wf-test-001',
        task: 'test task',
        currentPhase: 'find',
        phaseStatus: 'pending',
        artifacts: new Map(),
        cachedResults: {},
        userConfirmed: new Set(),
        startedAt: new Date(),
        updatedAt: new Date()
      };
      expect(context.id).toBe('wf-test-001');
      expect(context.task).toBe('test task');
      expect(context.artifacts).toBeInstanceOf(Map);
      expect(context.userConfirmed).toBeInstanceOf(Set);
    });
  });

  describe('WorkflowStatus interface', () => {
    it('should define WorkflowStatus interface with active field', () => {
      const status: WorkflowStatus = {
        active: true,
        task: 'test',
        currentPhase: 'find',
        phaseStatus: 'running',
        progress: 50,
        artifacts: ['find']
      };
      expect(status.active).toBe(true);
      expect(status.progress).toBe(50);
    });

    it('should allow inactive status', () => {
      const status: WorkflowStatus = { active: false };
      expect(status.active).toBe(false);
    });
  });

  describe('PhaseResult interface', () => {
    it('should define PhaseResult interface with required fields', () => {
      const result: PhaseResult = {
        artifacts: {
          phase: 'find',
          createdAt: new Date()
        },
        confidence: { score: 0.8, level: 'high', reasons: [] },
        canProceed: true
      };
      expect(result.canProceed).toBe(true);
      expect(result.artifacts.phase).toBe('find');
    });
  });

  describe('WorkflowSummary interface', () => {
    it('should define WorkflowSummary interface with string updatedAt', () => {
      const summary: WorkflowSummary = {
        id: 'wf-001',
        task: 'test',
        currentPhase: 'find',
        phaseStatus: 'pending',
        updatedAt: new Date().toISOString()
      };
      expect(summary.id).toBe('wf-001');
      expect(typeof summary.updatedAt).toBe('string');
    });
  });

  describe('CheckItem interface', () => {
    it('should define CheckItem interface with exists and valid flags', () => {
      const item: CheckItem = {
        name: 'test-item',
        path: '/path/to/file',
        exists: true,
        valid: false
      };
      expect(item.exists).toBe(true);
      expect(item.valid).toBe(false);
    });
  });

  describe('CheckpointResult interface', () => {
    it('should define CheckpointResult interface with items array', () => {
      const result: CheckpointResult = {
        passed: true,
        items: []
      };
      expect(result.passed).toBe(true);
      expect(result.items).toEqual([]);
    });
  });

  describe('GuidanceAction union type', () => {
    it('should have correct guidance action types', () => {
      const actions: GuidanceAction[] = ['auto-proceed', 'confirm-proceed', 'hold'];
      expect(actions).toHaveLength(3);
    });
  });

  describe('Guidance interface', () => {
    it('should define Guidance interface with optional suggestion', () => {
      const guidance1: Guidance = {
        action: 'auto-proceed',
        message: 'Proceeding...'
      };
      const guidance2: Guidance = {
        action: 'hold',
        message: 'Needs work',
        suggestion: 'Add more tests'
      };
      expect(guidance1.action).toBe('auto-proceed');
      expect(guidance1.suggestion).toBeUndefined();
      expect(guidance2.suggestion).toBe('Add more tests');
    });
  });
});
