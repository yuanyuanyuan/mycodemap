// [META] since:2026-03-02 | owner:workflow-team | coverage:100%
// [WHY] Tests for workflow context with state machine transitions


/**
 * Workflow Context Module Tests
 * Tests for WorkflowContextFactory and WorkflowContextValidator
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowContextFactory, WorkflowContextValidator } from '../workflow-context.js';
import type { WorkflowContext, WorkflowPhase, PhaseStatus } from '../types.js';

describe('PHASE 2: WorkflowContext Tests', () => {
  describe('WorkflowContextFactory', () => {
    describe('create()', () => {
      it('should create context with generated ID matching wf-{timestamp}-{random} pattern', () => {
        const context = WorkflowContextFactory.create('test task');
        
        expect(context.id).toMatch(/^wf-\d+-[a-z0-9]+$/);
        expect(context.task).toBe('test task');
        expect(context.currentPhase).toBe('find');
        expect(context.phaseStatus).toBe('pending');
      });

      it('should generate unique IDs for multiple contexts', () => {
        const context1 = WorkflowContextFactory.create('task 1');
        const context2 = WorkflowContextFactory.create('task 2');
        
        expect(context1.id).not.toBe(context2.id);
      });

      it('should initialize with empty artifacts Map', () => {
        const context = WorkflowContextFactory.create('test');
        
        expect(context.artifacts).toBeInstanceOf(Map);
        expect(context.artifacts.size).toBe(0);
      });

      it('should initialize with empty userConfirmed Set', () => {
        const context = WorkflowContextFactory.create('test');
        
        expect(context.userConfirmed).toBeInstanceOf(Set);
        expect(context.userConfirmed.size).toBe(0);
      });

      it('should set startedAt and updatedAt as Date objects', () => {
        const before = new Date();
        const context = WorkflowContextFactory.create('test');
        const after = new Date();
        
        expect(context.startedAt).toBeInstanceOf(Date);
        expect(context.updatedAt).toBeInstanceOf(Date);
        expect(context.startedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(context.startedAt.getTime()).toBeLessThanOrEqual(after.getTime());
      });
    });

    describe('validate()', () => {
      it('should validate context and report missing fields', () => {
        const invalidContext = {
          id: '',
          task: '',
          currentPhase: '' as WorkflowPhase,
          phaseStatus: '' as PhaseStatus,
          artifacts: new Map(),
          cachedResults: {},
          userConfirmed: new Set(),
          startedAt: new Date(),
          updatedAt: new Date()
        };
        
        const result = WorkflowContextFactory.validate(invalidContext);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing workflow ID');
        expect(result.errors).toContain('Missing task description');
        expect(result.errors).toContain('Missing current phase');
        expect(result.errors).toContain('Missing phase status');
      });

      it('should validate valid context without errors', () => {
        const context = WorkflowContextFactory.create('valid task');
        
        const result = WorkflowContextFactory.validate(context);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should detect missing id', () => {
        const context = WorkflowContextFactory.create('test');
        context.id = '';
        
        const result = WorkflowContextFactory.validate(context);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing workflow ID');
      });

      it('should detect missing task', () => {
        const context = WorkflowContextFactory.create('test');
        context.task = '';
        
        const result = WorkflowContextFactory.validate(context);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing task description');
      });

      it('should detect missing currentPhase', () => {
        const context = WorkflowContextFactory.create('test');
        context.currentPhase = '' as WorkflowPhase;
        
        const result = WorkflowContextFactory.validate(context);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing current phase');
      });

      it('should detect missing phaseStatus', () => {
        const context = WorkflowContextFactory.create('test');
        context.phaseStatus = '' as PhaseStatus;
        
        const result = WorkflowContextFactory.validate(context);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing phase status');
      });
    });

    describe('createPhaseArtifacts()', () => {
      it('should create phase artifacts with createdAt timestamp', () => {
        const before = new Date();
        const artifacts = WorkflowContextFactory.createPhaseArtifacts('find');
        const after = new Date();
        
        expect(artifacts.phase).toBe('find');
        expect(artifacts.createdAt).toBeInstanceOf(Date);
        expect(artifacts.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(artifacts.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      });

      it('should create artifacts with optional results', () => {
        const results = [{ id: '1', source: 'test' }];
        const artifacts = WorkflowContextFactory.createPhaseArtifacts('find', results);
        
        expect(artifacts.results).toEqual(results);
      });

      it('should create artifacts with optional confidence', () => {
        const confidence = { score: 0.8, level: 'high', reasons: ['good'] };
        const artifacts = WorkflowContextFactory.createPhaseArtifacts('find', [], confidence);
        
        expect(artifacts.confidence).toEqual(confidence);
      });

      it('should create artifacts with optional metadata', () => {
        const metadata = { key: 'value', count: 42 };
        const artifacts = WorkflowContextFactory.createPhaseArtifacts('find', [], undefined, metadata);
        
        expect(artifacts.metadata).toEqual(metadata);
      });

      it('should create artifacts with all optional parameters', () => {
        const results = [{ id: '1' }];
        const confidence = { score: 0.9, level: 'high', reasons: [] };
        const metadata = { extra: 'data' };
        
        const artifacts = WorkflowContextFactory.createPhaseArtifacts('read', results, confidence, metadata);
        
        expect(artifacts.phase).toBe('read');
        expect(artifacts.results).toEqual(results);
        expect(artifacts.confidence).toEqual(confidence);
        expect(artifacts.metadata).toEqual(metadata);
      });
    });
  });

  describe('WorkflowContextValidator', () => {
    let baseContext: WorkflowContext;

    beforeEach(() => {
      baseContext = WorkflowContextFactory.create('test task');
    });

    describe('canProceed()', () => {
      it('should allow proceeding when phase is completed and has artifacts', () => {
        baseContext.phaseStatus = 'completed';
        baseContext.artifacts.set('find', {
          phase: 'find',
          createdAt: new Date()
        });
        
        const result = WorkflowContextValidator.canProceed(baseContext);
        
        expect(result.valid).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it('should allow proceeding when phase is verified', () => {
        baseContext.phaseStatus = 'verified';
        baseContext.artifacts.set('find', {
          phase: 'find',
          createdAt: new Date()
        });
        
        const result = WorkflowContextValidator.canProceed(baseContext);
        
        expect(result.valid).toBe(true);
      });

      it('should deny proceeding when phase is not completed', () => {
        baseContext.phaseStatus = 'running';
        
        const result = WorkflowContextValidator.canProceed(baseContext);
        
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('not completed');
        expect(result.reason).toContain('running');
      });

      it('should deny proceeding when no artifacts exist', () => {
        baseContext.phaseStatus = 'completed';
        // No artifacts set
        
        const result = WorkflowContextValidator.canProceed(baseContext);
        
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('No artifacts');
      });

      it('should deny proceeding when pending status', () => {
        baseContext.phaseStatus = 'pending';
        
        const result = WorkflowContextValidator.canProceed(baseContext);
        
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('pending');
      });

      it('should deny proceeding when skipped status', () => {
        baseContext.phaseStatus = 'skipped';
        
        const result = WorkflowContextValidator.canProceed(baseContext);
        
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('skipped');
      });
    });

    describe('isValidStatusTransition()', () => {
      const testCases = [
        { from: 'pending', to: 'running', valid: true },
        { from: 'running', to: 'completed', valid: true },
        { from: 'running', to: 'pending', valid: true },
        { from: 'completed', to: 'verified', valid: true },
        { from: 'completed', to: 'skipped', valid: true },
        { from: 'verified', to: 'pending', valid: true },
        { from: 'skipped', to: 'pending', valid: false },
        { from: 'skipped', to: 'running', valid: false },
        { from: 'pending', to: 'completed', valid: false },
        { from: 'pending', to: 'verified', valid: false },
        { from: 'running', to: 'verified', valid: false },
        { from: 'running', to: 'skipped', valid: false }
      ];

      testCases.forEach(({ from, to, valid }) => {
        it(`should ${valid ? 'allow' : 'deny'} transition: ${from} → ${to}`, () => {
          const result = WorkflowContextValidator.isValidStatusTransition(
            from as PhaseStatus,
            to as PhaseStatus
          );
          expect(result).toBe(valid);
        });
      });

      it('should deny transition from skipped to any state', () => {
        const targets: PhaseStatus[] = ['pending', 'running', 'completed', 'verified', 'skipped'];
        
        for (const target of targets) {
          const result = WorkflowContextValidator.isValidStatusTransition('skipped', target);
          expect(result).toBe(false);
        }
      });

      it('should handle invalid status gracefully', () => {
        const result = WorkflowContextValidator.isValidStatusTransition(
          'invalid' as PhaseStatus,
          'pending'
        );
        expect(result).toBe(false);
      });
    });
  });
});
