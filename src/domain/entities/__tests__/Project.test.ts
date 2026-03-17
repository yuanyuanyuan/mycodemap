// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Project entity unit tests
// ============================================

import { describe, it, expect } from 'vitest';
import { Project } from '../Project.js';

describe('Project', () => {
  describe('constructor', () => {
    it('should create a project with valid data', () => {
      const project = new Project('proj-1', 'Test Project', '/path/to/project');
      
      expect(project.id).toBe('proj-1');
      expect(project.name).toBe('Test Project');
      expect(project.rootPath).toBe('/path/to/project');
      expect(project.createdAt).toBeInstanceOf(Date);
      expect(project.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error for empty id', () => {
      expect(() => new Project('', 'Test', '/path')).toThrow('Project ID cannot be empty');
    });

    it('should throw error for empty name', () => {
      expect(() => new Project('id', '', '/path')).toThrow('Project name cannot be empty');
    });

    it('should throw error for empty rootPath', () => {
      expect(() => new Project('id', 'Test', '')).toThrow('Root path cannot be empty');
    });
  });

  describe('rename', () => {
    it('should update project name', () => {
      const project = new Project('proj-1', 'Old Name', '/path');
      const originalUpdatedAt = project.updatedAt;
      
      project.rename('New Name');
      
      expect(project.name).toBe('New Name');
      expect(project.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should throw error for empty name', () => {
      const project = new Project('proj-1', 'Test', '/path');
      expect(() => project.rename('')).toThrow('Project name cannot be empty');
    });

    it('should trim whitespace from name', () => {
      const project = new Project('proj-1', 'Test', '/path');
      project.rename('  New Name  ');
      expect(project.name).toBe('New Name');
    });
  });

  describe('equals', () => {
    it('should return true for same id', () => {
      const project1 = new Project('proj-1', 'Test 1', '/path1');
      const project2 = new Project('proj-1', 'Test 2', '/path2');
      expect(project1.equals(project2)).toBe(true);
    });

    it('should return false for different id', () => {
      const project1 = new Project('proj-1', 'Test', '/path');
      const project2 = new Project('proj-2', 'Test', '/path');
      expect(project1.equals(project2)).toBe(false);
    });
  });
});
