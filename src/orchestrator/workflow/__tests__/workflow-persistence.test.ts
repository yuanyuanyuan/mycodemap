// [META] since:2026-03-02 | owner:workflow-team | coverage:100%
// [WHY] Tests for workflow persistence with Map/Set/Date serialization


/**
 * Workflow Persistence Module Tests
 * Tests for serialization/deserialization and file operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowPersistence } from '../workflow-persistence.js';
import type { WorkflowContext, WorkflowPhase, PhaseArtifacts } from '../types.js';

// Mock file system
vi.mock('node:fs', () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
    readdir: vi.fn(),
    unlink: vi.fn()
  }
}));

import { promises as fs } from 'node:fs';

describe('PHASE 4: WorkflowPersistence Tests', () => {
  let persistence: WorkflowPersistence;

  beforeEach(() => {
    persistence = new WorkflowPersistence();
    vi.resetAllMocks();
  });

  function createTestContext(): WorkflowContext {
    return {
      id: 'wf-test-001',
      task: 'test task',
      currentPhase: 'reference' as WorkflowPhase,
      phaseStatus: 'pending',
      artifacts: new Map<WorkflowPhase, PhaseArtifacts>([
        ['reference', {
          phase: 'reference',
          results: [{ id: '1', source: 'test' }],
          confidence: { score: 0.8, level: 'high', reasons: ['good'] },
          metadata: { key: 'value' },
          createdAt: new Date('2025-01-20T10:00:00Z')
        }]
      ]),
      cachedResults: { reference: [] },
      userConfirmed: new Set<WorkflowPhase>(['reference']),
      startedAt: new Date('2025-01-20T10:00:00Z'),
      updatedAt: new Date('2025-01-20T10:30:00Z')
    };
  }

  describe('save()', () => {
    it('should serialize Map artifacts to array entries', async () => {
      const context = createTestContext();
      
      await persistence.save(context);

      expect(fs.mkdir).toHaveBeenCalledWith('.codemap/workflow', { recursive: true });
      expect(fs.writeFile).toHaveBeenCalled();
      
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const savedData = JSON.parse(writeCall[1] as string);
      
      // Map should be serialized to array of entries
      expect(Array.isArray(savedData.artifacts)).toBe(true);
      expect(savedData.artifacts).toHaveLength(1);
      expect(savedData.artifacts[0][0]).toBe('reference');
    });

    it('should serialize Set userConfirmed to array', async () => {
      const context = createTestContext();
      
      await persistence.save(context);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const savedData = JSON.parse(writeCall[1] as string);
      
      // Set should be serialized to array
      expect(Array.isArray(savedData.userConfirmed)).toBe(true);
      expect(savedData.userConfirmed).toContain('reference');
    });

    it('should serialize Date objects to ISO strings', async () => {
      const context = createTestContext();
      
      await persistence.save(context);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const savedData = JSON.parse(writeCall[1] as string);
      
      // Dates should be serialized to ISO strings
      expect(typeof savedData.startedAt).toBe('string');
      expect(typeof savedData.updatedAt).toBe('string');
      expect(savedData.startedAt).toBe('2025-01-20T10:00:00.000Z');
      expect(savedData.updatedAt).toBe('2025-01-20T10:30:00.000Z');
    });

    it('should create directory recursively before saving', async () => {
      const context = createTestContext();
      
      await persistence.save(context);

      expect(fs.mkdir).toHaveBeenCalledWith('.codemap/workflow', { recursive: true });
    });

    it('should write active marker file', async () => {
      const context = createTestContext();
      
      await persistence.save(context);

      expect(fs.writeFile).toHaveBeenCalledTimes(2);
      expect(fs.writeFile).toHaveBeenLastCalledWith(
        '.codemap/workflow/active.json',
        JSON.stringify({ id: 'wf-test-001' }, null, 2)
      );
    });

    it('should handle empty artifacts Map', async () => {
      const context = createTestContext();
      context.artifacts = new Map();
      
      await persistence.save(context);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const savedData = JSON.parse(writeCall[1] as string);
      
      expect(savedData.artifacts).toEqual([]);
    });

    it('should handle empty userConfirmed Set', async () => {
      const context = createTestContext();
      context.userConfirmed = new Set();
      
      await persistence.save(context);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const savedData = JSON.parse(writeCall[1] as string);
      
      expect(savedData.userConfirmed).toEqual([]);
    });
  });

  describe('load()', () => {
    it('should deserialize and restore Map artifacts', async () => {
      const serializedData = {
        id: 'wf-test-001',
        task: 'test task',
        currentPhase: 'reference',
        phaseStatus: 'pending',
        artifacts: [['reference', {
          phase: 'reference',
          createdAt: '2025-01-20T10:00:00Z'
        }]],
        cachedResults: {},
        userConfirmed: [],
        startedAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:30:00Z'
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(serializedData));

      const result = await persistence.load('wf-test-001');

      expect(result).not.toBeNull();
      expect(result!.artifacts).toBeInstanceOf(Map);
      expect(result!.artifacts.has('reference')).toBe(true);
    });

    it('should deserialize and restore Set userConfirmed', async () => {
      const serializedData = {
        id: 'wf-test-001',
        task: 'test task',
        currentPhase: 'reference',
        phaseStatus: 'pending',
        artifacts: [],
        cachedResults: {},
        userConfirmed: ['reference', 'impact'],
        startedAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:30:00Z'
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(serializedData));

      const result = await persistence.load('wf-test-001');

      expect(result).not.toBeNull();
      expect(result!.userConfirmed).toBeInstanceOf(Set);
      expect(result!.userConfirmed.has('reference')).toBe(true);
      expect(result!.userConfirmed.has('impact')).toBe(true);
    });

    it('should deserialize and restore Date objects', async () => {
      const serializedData = {
        id: 'wf-test-001',
        task: 'test task',
        currentPhase: 'reference',
        phaseStatus: 'pending',
        artifacts: [],
        cachedResults: {},
        userConfirmed: [],
        startedAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:30:00Z'
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(serializedData));

      const result = await persistence.load('wf-test-001');

      expect(result).not.toBeNull();
      expect(result!.startedAt).toBeInstanceOf(Date);
      expect(result!.updatedAt).toBeInstanceOf(Date);
      expect(result!.startedAt.toISOString()).toBe('2025-01-20T10:00:00.000Z');
    });

    it('should restore Date objects inside artifacts', async () => {
      const serializedData = {
        id: 'wf-test-001',
        task: 'test task',
        currentPhase: 'reference',
        phaseStatus: 'pending',
        artifacts: [['reference', {
          phase: 'reference',
          createdAt: '2025-01-20T10:00:00Z'
        }]],
        cachedResults: {},
        userConfirmed: [],
        startedAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:30:00Z'
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(serializedData));

      const result = await persistence.load('wf-test-001');

      const artifact = result!.artifacts.get('reference');
      expect(artifact!.createdAt).toBeInstanceOf(Date);
    });

    it('should return null when file does not exist', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      vi.mocked(fs.readFile).mockRejectedValue(error);

      const result = await persistence.load('non-existent');

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('invalid json');

      const result = await persistence.load('wf-test-001');

      expect(result).toBeNull();
    });
  });

  describe('loadActive()', () => {
    it('should load active workflow from marker file', async () => {
      const activeData = { id: 'wf-active-001' };
      const workflowData = {
        id: 'wf-active-001',
        task: 'active task',
        currentPhase: 'reference',
        phaseStatus: 'running',
        artifacts: [],
        cachedResults: {},
        userConfirmed: [],
        startedAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:30:00Z'
      };

      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(activeData))
        .mockResolvedValueOnce(JSON.stringify(workflowData));

      const result = await persistence.loadActive();

      expect(result).not.toBeNull();
      expect(result!.id).toBe('wf-active-001');
    });

    it('should return null when no active workflow', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      vi.mocked(fs.readFile).mockRejectedValue(error);

      const result = await persistence.loadActive();

      expect(result).toBeNull();
    });

    it('should return null when active.json has null id', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ id: null }));

      const result = await persistence.loadActive();

      expect(result).toBeNull();
    });
  });

  describe('list()', () => {
    it('should return array of workflow summaries', async () => {
      const files = ['wf-001.json', 'wf-002.json', 'active.json'];
      const workflow1 = {
        id: 'wf-001',
        task: 'task 1',
        currentPhase: 'reference',
        phaseStatus: 'pending',
        startedAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:30:00Z'
      };
      const workflow2 = {
        id: 'wf-002',
        task: 'task 2',
        currentPhase: 'impact',
        phaseStatus: 'completed',
        startedAt: '2025-01-20T11:00:00Z',
        updatedAt: '2025-01-20T11:30:00Z'
      };

      vi.mocked(fs.readdir).mockResolvedValue(files as any);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(workflow1))
        .mockResolvedValueOnce(JSON.stringify(workflow2));

      const result = await persistence.list();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('wf-001');
      expect(result[1].id).toBe('wf-002');
      expect(result[0].task).toBe('task 1');
      expect(result[1].phaseStatus).toBe('completed');
    });

    it('should skip unreadable files', async () => {
      const files = ['wf-001.json', 'corrupt.json'];
      const workflow1 = {
        id: 'wf-001',
        task: 'task 1',
        currentPhase: 'reference',
        phaseStatus: 'pending',
        startedAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:30:00Z'
      };

      vi.mocked(fs.readdir).mockResolvedValue(files as any);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(workflow1))
        .mockResolvedValueOnce('invalid json');

      const result = await persistence.list();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('wf-001');
    });

    it('should return empty array when directory does not exist', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      vi.mocked(fs.readdir).mockRejectedValue(error);

      const result = await persistence.list();

      expect(result).toEqual([]);
    });

    it('should skip active.json file', async () => {
      const files = ['active.json'];

      vi.mocked(fs.readdir).mockResolvedValue(files as any);

      const result = await persistence.list();

      expect(result).toHaveLength(0);
    });

    it('should skip non-json files', async () => {
      const files = ['readme.txt', 'data.csv', 'wf-001.json'];
      const workflow = {
        id: 'wf-001',
        task: 'task',
        currentPhase: 'reference',
        phaseStatus: 'pending',
        startedAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-20T10:30:00Z'
      };

      vi.mocked(fs.readdir).mockResolvedValue(files as any);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(workflow));

      const result = await persistence.list();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('wf-001');
    });
  });

  describe('delete()', () => {
    it('should delete workflow file', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

      await persistence.delete('wf-test-001');

      expect(fs.unlink).toHaveBeenCalledWith('.codemap/workflow/wf-test-001.json');
    });

    it('should clear active marker if deleting active workflow', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ id: 'wf-test-001' }));

      await persistence.delete('wf-test-001');

      expect(fs.unlink).toHaveBeenCalledWith('.codemap/workflow/wf-test-001.json');
      expect(fs.writeFile).toHaveBeenCalledWith(
        '.codemap/workflow/active.json',
        JSON.stringify({ id: null }, null, 2)
      );
    });

    it('should not clear marker if deleting non-active workflow', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ id: 'wf-other-001' }));

      await persistence.delete('wf-test-001');

      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle file not found error gracefully', async () => {
      vi.mocked(fs.unlink).mockRejectedValue(new Error('ENOENT'));

      await expect(persistence.delete('non-existent')).resolves.not.toThrow();
    });
  });
});
