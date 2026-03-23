/**
 * [META] Ship Confidence Rules Test
 * [WHY] Test confidence score calculation
 */

import { describe, it, expect } from 'vitest';
import { calculateConfidence } from '../rules/confidence-rules.js';
import { CommitAnalysis } from '../rules/version-rules.js';

describe('confidence-rules', () => {
  describe('calculateConfidence', () => {
    it('should return high confidence for perfect commits', () => {
      const commits: CommitAnalysis[] = [
        { type: 'feat', scope: 'cli', message: 'add new command', hash: 'abc123', isBreaking: false }
      ];

      const result = calculateConfidence({
        commits,
        changedFiles: ['src/cli/commands/new.ts'],
        allCommitsConventional: true,
        coverageAbove80: true,
        changelogUpdated: true,
        hasBreaking: false
      });

      expect(result.score).toBeGreaterThanOrEqual(75);
      expect(result.decision).toBe('auto');
    });

    it('should return low confidence for breaking changes', () => {
      const commits: CommitAnalysis[] = [
        { type: 'feat', message: 'breaking change', hash: 'abc123', isBreaking: true }
      ];

      // Breaking + non-conventional + risky modules = low score
      const result = calculateConfidence({
        commits,
        changedFiles: ['src/core/analyzer.ts'], // risky module
        allCommitsConventional: false,
        coverageAbove80: false,
        changelogUpdated: false,
        hasBreaking: true
      });

      // Base 50 - 15 (breaking) - 10 (risky) - 5 (non-conventional) - 5 (coverage) = 15
      expect(result.score).toBeLessThan(60);
      expect(result.decision).toBe('block');
    });

    it('should penalize touching risky modules', () => {
      const commits: CommitAnalysis[] = [
        { type: 'feat', message: 'add feature', hash: 'abc123', isBreaking: false }
      ];

      const result = calculateConfidence({
        commits,
        changedFiles: ['src/core/analyzer.ts'], // risky module
        allCommitsConventional: true,
        coverageAbove80: true,
        changelogUpdated: true,
        hasBreaking: false
      });

      // Should have penalty for touching risky modules
      expect(result.breakdown.penalties.some(p => p.condition === 'touchesRiskyModules')).toBe(true);
    });

    it('should return confirm for medium confidence', () => {
      const commits: CommitAnalysis[] = [
        { type: 'feat', message: 'add feature', hash: 'abc123', isBreaking: false }
      ];

      // Conventional but many files and touching risky modules
      const result = calculateConfidence({
        commits,
        changedFiles: ['src/core/analyzer.ts', 'src/parser/index.ts'], // risky modules + many files
        allCommitsConventional: true,
        coverageAbove80: false,
        changelogUpdated: false,
        hasBreaking: false
      });

      // Score falls in confirm range (60-75)
      expect(result.decision).toBe('confirm');
    });
  });
});
