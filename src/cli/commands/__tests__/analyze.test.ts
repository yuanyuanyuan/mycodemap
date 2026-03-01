import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyzeErrorCode, VALID_INTENTS } from '../analyze.js';

// Test module exports without instantiating
describe('AnalyzeCommand exports', () => {
  describe('VALID_INTENTS', () => {
    it('should contain all required intents', () => {
      const requiredIntents = [
        'impact',
        'dependency',
        'search',
        'documentation',
        'complexity',
        'overview',
        'refactor',
        'reference',
      ];

      for (const intent of requiredIntents) {
        expect(VALID_INTENTS).toContain(intent);
      }
    });
  });

  describe('AnalyzeErrorCode', () => {
    it('should have all required error codes', () => {
      expect(AnalyzeErrorCode.E0001_INVALID_INTENT).toBe('E0001');
      expect(AnalyzeErrorCode.E0002_MISSING_REQUIRED_PARAM).toBe('E0002');
      expect(AnalyzeErrorCode.E0003_TARGET_NOT_FOUND).toBe('E0003');
      expect(AnalyzeErrorCode.E0004_EXECUTION_TIMEOUT).toBe('E0004');
      expect(AnalyzeErrorCode.E0005_EXECUTION_FAILED).toBe('E0005');
      expect(AnalyzeErrorCode.E0006_LOW_CONFIDENCE).toBe('E0006');
    });
  });
});
