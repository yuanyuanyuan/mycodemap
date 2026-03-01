// [META] since:2026-03-02 | owner:workflow-team | coverage:100%
// [WHY] Tests for phase checkpoint validation logic


/**
 * Phase Checkpoint Module Tests
 * Tests for PhaseCheckpoint validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PhaseCheckpoint } from '../phase-checkpoint.js';
import type { WorkflowPhase, PhaseArtifacts, PhaseDefinition } from '../types.js';

// Mock file system
vi.mock('node:fs', () => ({
  promises: {
    access: vi.fn()
  }
}));

import { promises as fs } from 'node:fs';

describe('PHASE 3: PhaseCheckpoint Tests', () => {
  let checkpoint: PhaseCheckpoint;

  beforeEach(() => {
    checkpoint = new PhaseCheckpoint();
    vi.clearAllMocks();
  });

  describe('validate()', () => {
    it('should pass when all deliverables exist and are valid', async () => {
      // Mock fs.access to succeed
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const definition: PhaseDefinition = {
        name: 'reference',
        action: 'analyze',
        entryCondition: {},
        deliverables: [
          { name: 'test-file', path: '/path/to/file.json', validator: () => true }
        ],
        commands: []
      };

      const artifacts: PhaseArtifacts = {
        phase: 'reference',
        createdAt: new Date()
      };

      const result = await checkpoint.validate('reference', artifacts, definition);

      expect(result.passed).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].exists).toBe(true);
      expect(result.items[0].valid).toBe(true);
    });

    it('should fail when deliverable does not exist', async () => {
      // Mock fs.access to fail with ENOENT
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      vi.mocked(fs.access).mockRejectedValue(error);

      const definition: PhaseDefinition = {
        name: 'reference',
        action: 'analyze',
        entryCondition: {},
        deliverables: [
          { name: 'missing-file', path: '/path/to/missing.json', validator: () => true }
        ],
        commands: []
      };

      const artifacts: PhaseArtifacts = {
        phase: 'reference',
        createdAt: new Date()
      };

      const result = await checkpoint.validate('reference', artifacts, definition);

      expect(result.passed).toBe(false);
      expect(result.items[0].exists).toBe(false);
      expect(result.items[0].valid).toBe(false);
    });

    it('should fail when validator returns false', async () => {
      // Mock fs.access to succeed
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const definition: PhaseDefinition = {
        name: 'reference',
        action: 'analyze',
        entryCondition: {},
        deliverables: [
          { name: 'invalid-file', path: '/path/to/invalid.json', validator: () => false }
        ],
        commands: []
      };

      const artifacts: PhaseArtifacts = {
        phase: 'reference',
        createdAt: new Date()
      };

      const result = await checkpoint.validate('reference', artifacts, definition);

      expect(result.passed).toBe(false);
      expect(result.items[0].exists).toBe(true);
      expect(result.items[0].valid).toBe(false);
    });

    it('should handle multiple deliverables with mixed results', async () => {
      // First call succeeds, second fails
      vi.mocked(fs.access)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('ENOENT'));

      const definition: PhaseDefinition = {
        name: 'reference',
        action: 'analyze',
        entryCondition: {},
        deliverables: [
          { name: 'valid-file', path: '/path/to/valid.json', validator: () => true },
          { name: 'missing-file', path: '/path/to/missing.json', validator: () => true }
        ],
        commands: []
      };

      const artifacts: PhaseArtifacts = {
        phase: 'reference',
        createdAt: new Date()
      };

      const result = await checkpoint.validate('reference', artifacts, definition);

      expect(result.passed).toBe(false);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].exists).toBe(true);
      expect(result.items[1].exists).toBe(false);
    });

    it('should pass with empty deliverables array', async () => {
      const definition: PhaseDefinition = {
        name: 'reference',
        action: 'analyze',
        entryCondition: {},
        deliverables: [],
        commands: []
      };

      const artifacts: PhaseArtifacts = {
        phase: 'reference',
        createdAt: new Date()
      };

      const result = await checkpoint.validate('reference', artifacts, definition);

      expect(result.passed).toBe(true);
      expect(result.items).toHaveLength(0);
    });
  });

  describe('validateAll()', () => {
    it('should validate multiple phases and return results', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const phases = new Map<WorkflowPhase, PhaseArtifacts>([
        ['reference', { phase: 'reference', createdAt: new Date() }],
        ['impact', { phase: 'impact', createdAt: new Date() }]
      ]);

      const definitions = new Map<WorkflowPhase, PhaseDefinition>([
        ['reference', {
          name: 'reference',
          action: 'analyze',
          entryCondition: {},
          deliverables: [{ name: 'ref', path: '/ref.json', validator: () => true }],
          commands: []
        }],
        ['impact', {
          name: 'impact',
          action: 'analyze',
          entryCondition: {},
          deliverables: [{ name: 'imp', path: '/imp.json', validator: () => true }],
          commands: []
        }]
      ]);

      const results = await checkpoint.validateAll(phases, definitions);

      expect(results).toHaveLength(2);
      expect(results[0].phase).toBe('reference');
      expect(results[1].phase).toBe('impact');
      expect(results[0].result.passed).toBe(true);
      expect(results[1].result.passed).toBe(true);
    });

    it('should skip phases without definitions', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const phases = new Map<WorkflowPhase, PhaseArtifacts>([
        ['reference', { phase: 'reference', createdAt: new Date() }],
        ['unknown', { phase: 'unknown' as WorkflowPhase, createdAt: new Date() }]
      ]);

      const definitions = new Map<WorkflowPhase, PhaseDefinition>([
        ['reference', {
          name: 'reference',
          action: 'analyze',
          entryCondition: {},
          deliverables: [],
          commands: []
        }]
      ]);

      const results = await checkpoint.validateAll(phases, definitions);

      expect(results).toHaveLength(1);
      expect(results[0].phase).toBe('reference');
    });

    it('should handle empty phases map', async () => {
      const phases = new Map<WorkflowPhase, PhaseArtifacts>();
      const definitions = new Map<WorkflowPhase, PhaseDefinition>();

      const results = await checkpoint.validateAll(phases, definitions);

      expect(results).toHaveLength(0);
    });
  });

  describe('getSummary()', () => {
    it('should calculate correct summary statistics', () => {
      const results = [
        { phase: 'reference' as WorkflowPhase, result: { passed: true, items: [] } },
        { phase: 'impact' as WorkflowPhase, result: { passed: true, items: [] } },
        { phase: 'risk' as WorkflowPhase, result: { passed: false, items: [] } }
      ];

      const summary = checkpoint.getSummary(results);

      expect(summary.total).toBe(3);
      expect(summary.passed).toBe(2);
      expect(summary.failed).toBe(1);
    });

    it('should record phases with boolean values', () => {
      const results = [
        { phase: 'reference' as WorkflowPhase, result: { passed: true, items: [] } },
        { phase: 'impact' as WorkflowPhase, result: { passed: false, items: [] } }
      ];

      const summary = checkpoint.getSummary(results);

      expect(summary.phases.reference).toBe(true);
      expect(summary.phases.impact).toBe(false);
    });

    it('should handle empty results array', () => {
      const summary = checkpoint.getSummary([]);

      expect(summary.total).toBe(0);
      expect(summary.passed).toBe(0);
      expect(summary.failed).toBe(0);
      expect(summary.phases).toEqual({});
    });

    it('should handle all passed results', () => {
      const results = [
        { phase: 'reference' as WorkflowPhase, result: { passed: true, items: [] } },
        { phase: 'impact' as WorkflowPhase, result: { passed: true, items: [] } }
      ];

      const summary = checkpoint.getSummary(results);

      expect(summary.total).toBe(2);
      expect(summary.passed).toBe(2);
      expect(summary.failed).toBe(0);
    });

    it('should handle all failed results', () => {
      const results = [
        { phase: 'reference' as WorkflowPhase, result: { passed: false, items: [] } },
        { phase: 'impact' as WorkflowPhase, result: { passed: false, items: [] } }
      ];

      const summary = checkpoint.getSummary(results);

      expect(summary.total).toBe(2);
      expect(summary.passed).toBe(0);
      expect(summary.failed).toBe(2);
    });
  });
});
