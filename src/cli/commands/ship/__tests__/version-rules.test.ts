/**
 * [META] Ship Version Rules Test
 * [WHY] Test version calculation based on conventional commits
 */

import { describe, it, expect } from 'vitest';
import { calculateVersionType, shouldBumpVersion, VersionType, CommitAnalysis } from '../rules/version-rules.js';

describe('version-rules', () => {
  describe('calculateVersionType', () => {
    it('should return major for breaking changes', () => {
      const commits: CommitAnalysis[] = [
        { type: 'feat', message: 'some feature', hash: 'abc123', isBreaking: true }
      ];
      expect(calculateVersionType(commits)).toBe('major');
    });

    it('should return minor for feat commits', () => {
      const commits: CommitAnalysis[] = [
        { type: 'feat', message: 'add new feature', hash: 'abc123', isBreaking: false }
      ];
      expect(calculateVersionType(commits)).toBe('minor');
    });

    it('should return patch for fix commits', () => {
      const commits: CommitAnalysis[] = [
        { type: 'fix', message: 'fix bug', hash: 'abc123', isBreaking: false }
      ];
      expect(calculateVersionType(commits)).toBe('patch');
    });

    it('should return none for docs-only commits', () => {
      const commits: CommitAnalysis[] = [
        { type: 'docs', message: 'update readme', hash: 'abc123', isBreaking: false }
      ];
      expect(calculateVersionType(commits)).toBe('none');
    });

    it('should return patch when fix comes before feat', () => {
      // Implementation processes in order, so first match wins
      const commits: CommitAnalysis[] = [
        { type: 'fix', message: 'fix bug', hash: 'abc123', isBreaking: false },
        { type: 'feat', message: 'add feature', hash: 'def456', isBreaking: false }
      ];
      expect(calculateVersionType(commits)).toBe('patch');
    });
  });

  describe('shouldBumpVersion', () => {
    it('should return true when version type is not none', () => {
      const commits: CommitAnalysis[] = [
        { type: 'feat', message: 'add feature', hash: 'abc123', isBreaking: false }
      ];
      const files = ['src/cli/index.ts'];
      expect(shouldBumpVersion(commits, files)).toBe(true);
    });

    it('should return false when no functional commits and no code files changed', () => {
      const commits: CommitAnalysis[] = [
        { type: 'docs', message: 'update readme', hash: 'abc123', isBreaking: false }
      ];
      const files = ['README.md'];
      expect(shouldBumpVersion(commits, files)).toBe(false);
    });
  });
});
