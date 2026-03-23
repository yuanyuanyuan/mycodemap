// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] CodeGraphRepositoryImpl unit tests
// ============================================

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorage } from '../../storage/adapters/MemoryStorage.js';
import { CodeGraphRepositoryImpl } from '../CodeGraphRepositoryImpl.js';
import { Project } from '../../../domain/entities/Project.js';
import { CodeGraph } from '../../../domain/entities/CodeGraph.js';
import { EntityNotFoundError } from '../../../domain/repositories/CodeGraphRepository.js';

describe('CodeGraphRepositoryImpl', () => {
  let storage: MemoryStorage;
  let repository: CodeGraphRepositoryImpl;

  beforeEach(async () => {
    storage = new MemoryStorage();
    await storage.initialize('/test');
    repository = new CodeGraphRepositoryImpl(storage);
  });

  describe('save and findByProjectId', () => {
    it('should save and retrieve a code graph', async () => {
      const project = new Project('proj-1', 'Test Project', '/test');
      const graph = new CodeGraph(project);
      
      await repository.save(graph);
      const found = await repository.findByProjectId('proj-1');
      
      expect(found).toBeDefined();
      expect(found?.project.id).toBe('proj-1');
    });

    it('should return null for non-existent project', async () => {
      const found = await repository.findByProjectId('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('exists', () => {
    it('should return true for existing project', async () => {
      const project = new Project('proj-1', 'Test', '/test');
      const graph = new CodeGraph(project);
      await repository.save(graph);
      
      const exists = await repository.exists('proj-1');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent project', async () => {
      const exists = await repository.exists('non-existent');
      expect(exists).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete a project', async () => {
      const project = new Project('proj-1', 'Test', '/test');
      const graph = new CodeGraph(project);
      await repository.save(graph);
      
      await repository.delete('proj-1');
      
      const exists = await repository.exists('proj-1');
      expect(exists).toBe(false);
    });

    it('should throw EntityNotFoundError for non-existent project', async () => {
      await expect(repository.delete('non-existent'))
        .rejects.toThrow(EntityNotFoundError);
    });
  });

  describe('getAllProjectIds', () => {
    it('should return project ids', async () => {
      const project = new Project('proj-1', 'Test', '/test');
      const graph = new CodeGraph(project);
      await repository.save(graph);
      
      const ids = await repository.getAllProjectIds();
      expect(ids).toContain('proj-1');
    });

    it('should return empty array when no projects', async () => {
      const ids = await repository.getAllProjectIds();
      expect(ids).toEqual([]);
    });
  });
});
