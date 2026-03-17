// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Module entity unit tests
// ============================================

import { describe, it, expect } from 'vitest';
import { Module } from '../Module.js';

describe('Module', () => {
  describe('constructor', () => {
    it('should create a module with valid data', () => {
      const module = new Module('mod-1', 'proj-1', '/src/test.ts', 'typescript');
      
      expect(module.id).toBe('mod-1');
      expect(module.projectId).toBe('proj-1');
      expect(module.path).toBe('/src/test.ts');
      expect(module.language).toBe('typescript');
    });

    it('should initialize with default stats', () => {
      const module = new Module('mod-1', 'proj-1', '/src/test.ts', 'typescript');
      
      expect(module.stats.lines).toBe(0);
      expect(module.stats.codeLines).toBe(0);
      expect(module.stats.commentLines).toBe(0);
      expect(module.stats.blankLines).toBe(0);
    });

    it('should throw error for empty id', () => {
      expect(() => new Module('', 'proj-1', '/src/test.ts', 'typescript'))
        .toThrow('Module ID cannot be empty');
    });
  });

  describe('updateStats', () => {
    it('should update stats', () => {
      const module = new Module('mod-1', 'proj-1', '/src/test.ts', 'typescript');
      module.updateStats({ lines: 100, codeLines: 80 });
      
      expect(module.stats.lines).toBe(100);
      expect(module.stats.codeLines).toBe(80);
      expect(module.stats.commentLines).toBe(0); // unchanged
    });
  });

  describe('isTestFile', () => {
    it('should identify test files', () => {
      expect(new Module('1', 'p', 'test.spec.ts', 'ts').isTestFile()).toBe(true);
      expect(new Module('1', 'p', 'test.test.ts', 'ts').isTestFile()).toBe(true);
      expect(new Module('1', 'p', '__tests__/foo.ts', 'ts').isTestFile()).toBe(true);
      expect(new Module('1', 'p', 'src/main.ts', 'ts').isTestFile()).toBe(false);
    });
  });

  describe('getCodeDensity', () => {
    it('should calculate code density', () => {
      const module = new Module('1', 'p', '/test.ts', 'typescript', {
        lines: 100,
        codeLines: 80,
        commentLines: 10,
        blankLines: 10,
      });
      
      expect(module.getCodeDensity()).toBe(0.8);
    });

    it('should return 0 for empty file', () => {
      const module = new Module('1', 'p', '/test.ts', 'typescript');
      expect(module.getCodeDensity()).toBe(0);
    });
  });
});
