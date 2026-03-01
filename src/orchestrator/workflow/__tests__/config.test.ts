// [META] since:2026-03-02 | owner:workflow-team | coverage:100%
// [WHY] Tests for workflow configuration constants


/**
 * Configuration Module Tests
 * Tests for workflow configuration constants
 */

import { describe, it, expect } from 'vitest';
import {
  PHASE_CI_CONFIG,
  PHASE_GIT_CONFIG,
  PHASE_TEST_STRATEGY,
  CONFIDENCE_REQUIREMENTS,
  WORKFLOW_CONFIG
} from '../config.js';

describe('PHASE 1: Configuration Constants', () => {
  describe('PHASE_CI_CONFIG', () => {
    it('should export PHASE_CI_CONFIG with correct timeouts and thresholds', () => {
      expect(PHASE_CI_CONFIG).toBeDefined();
      expect(PHASE_CI_CONFIG.ciTimeout).toBe(300000);
      expect(PHASE_CI_CONFIG.riskThreshold).toBe(0.7);
      expect(PHASE_CI_CONFIG.checks).toEqual([
        'check-commits',
        'check-headers',
        'assess-risk',
        'check-output-contract'
      ]);
    });

    it('should have correct check array length', () => {
      expect(PHASE_CI_CONFIG.checks).toHaveLength(4);
    });
  });

  describe('PHASE_GIT_CONFIG', () => {
    it('should export PHASE_GIT_CONFIG with heat weights summing to 1.0', () => {
      expect(PHASE_GIT_CONFIG).toBeDefined();
      expect(PHASE_GIT_CONFIG.historyDays).toBe(90);
      expect(PHASE_GIT_CONFIG.heatWeights).toEqual({
        freq30d: 0.4,
        commitCount: 0.3,
        impactCount: 0.3
      });
    });

    it('should have heatWeights that sum to 1.0', () => {
      const { heatWeights } = PHASE_GIT_CONFIG;
      const sum = heatWeights.freq30d + heatWeights.commitCount + heatWeights.impactCount;
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('should have risk factors array', () => {
      expect(PHASE_GIT_CONFIG.riskFactors).toEqual([
        'fileHeat',
        'dependencyComplexity',
        'testCoverage',
        'changeFrequency'
      ]);
    });
  });

  describe('PHASE_TEST_STRATEGY', () => {
    it('should export PHASE_TEST_STRATEGY with test patterns', () => {
      expect(PHASE_TEST_STRATEGY).toBeDefined();
      expect(PHASE_TEST_STRATEGY.testPatterns).toContain('*.test.ts');
      expect(PHASE_TEST_STRATEGY.testPatterns).toContain('*.spec.ts');
      expect(PHASE_TEST_STRATEGY.testPatterns).toContain('**/*.test.ts');
      expect(PHASE_TEST_STRATEGY.testPatterns).toContain('**/*.spec.ts');
    });

    it('should have minimum coverage threshold of 0.7', () => {
      expect(PHASE_TEST_STRATEGY.minCoverageThreshold).toBe(0.7);
    });

    it('should have strategies object with all boolean values', () => {
      expect(PHASE_TEST_STRATEGY.strategies).toEqual({
        exact: true,
        fuzzy: true,
        structural: true
      });
    });
  });

  describe('CONFIDENCE_REQUIREMENTS', () => {
    it('should export CONFIDENCE_REQUIREMENTS with phase thresholds', () => {
      expect(CONFIDENCE_REQUIREMENTS).toBeDefined();
      expect(CONFIDENCE_REQUIREMENTS.phaseThresholds).toBeDefined();
    });

    it('should have phase thresholds for all 6 phases', () => {
      const { phaseThresholds } = CONFIDENCE_REQUIREMENTS;
      expect(phaseThresholds.reference).toEqual({ min: 0.3, high: 0.6 });
      expect(phaseThresholds.impact).toEqual({ min: 0.4, high: 0.7 });
      expect(phaseThresholds.risk).toEqual({ min: 0, high: 0 });
      expect(phaseThresholds.implementation).toEqual({ min: 0, high: 0 });
      expect(phaseThresholds.commit).toEqual({ min: 0, high: 0 });
      expect(phaseThresholds.ci).toEqual({ min: 0, high: 0 });
    });

    it('should have autoProceedThreshold of 0.7', () => {
      expect(CONFIDENCE_REQUIREMENTS.autoProceedThreshold).toBe(0.7);
    });

    it('should have fallbackThreshold of 0.25', () => {
      expect(CONFIDENCE_REQUIREMENTS.fallbackThreshold).toBe(0.25);
    });
  });

  describe('WORKFLOW_CONFIG', () => {
    it('should export WORKFLOW_CONFIG with persistence settings', () => {
      expect(WORKFLOW_CONFIG).toBeDefined();
      expect(WORKFLOW_CONFIG.enabled).toBe(true);
      expect(WORKFLOW_CONFIG.persistencePath).toBe('.codemap/workflow');
      expect(WORKFLOW_CONFIG.maxConcurrentPhases).toBe(1);
      expect(WORKFLOW_CONFIG.autoCheckpoint).toBe(true);
      expect(WORKFLOW_CONFIG.checkpointInterval).toBe(300);
    });

    it('should have positive checkpoint interval', () => {
      expect(WORKFLOW_CONFIG.checkpointInterval).toBeGreaterThan(0);
    });
  });
});
