// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Tests for doctor command alignment with shared output infrastructure

import { describe, it, expect } from 'vitest';
import { formatDoctorJsonData, formatDoctorJson, formatDoctorReport } from '../formatter.js';
import type { DiagnosticResult } from '../types.js';

const okResult: DiagnosticResult = {
  category: 'install',
  severity: 'ok',
  id: 'node-installed',
  message: 'Node.js is installed',
  remediation: 'No action needed',
};

const errorResult: DiagnosticResult = {
  category: 'config',
  severity: 'error',
  id: 'missing-config',
  message: 'Config file not found',
  remediation: 'Run codemap init',
  nextCommand: 'codemap init',
};

const warnResult: DiagnosticResult = {
  category: 'runtime',
  severity: 'warn',
  id: 'outdated-dep',
  message: 'Dependency is outdated',
  remediation: 'Run npm update',
};

describe('doctor output alignment', () => {
  describe('formatDoctorJsonData', () => {
    it('returns serializable array of objects', () => {
      const results = [okResult, errorResult];
      const data = formatDoctorJsonData(results);

      expect(data).toHaveLength(2);
      expect(data[0]).toEqual({
        category: 'install',
        severity: 'ok',
        id: 'node-installed',
        message: 'Node.js is installed',
        remediation: 'No action needed',
      });
      // nextCommand is included only when defined
      expect(data[1]).toEqual({
        category: 'config',
        severity: 'error',
        id: 'missing-config',
        message: 'Config file not found',
        remediation: 'Run codemap init',
        nextCommand: 'codemap init',
      });
    });

    it('omits nextCommand when not defined', () => {
      const data = formatDoctorJsonData([okResult]);
      expect(data[0]).not.toHaveProperty('nextCommand');
    });

    it('result is JSON-serializable (no undefined fields)', () => {
      const data = formatDoctorJsonData([okResult, warnResult]);
      const serialized = JSON.stringify(data);
      const parsed = JSON.parse(serialized);
      expect(parsed).toEqual(data);
    });
  });

  describe('formatDoctorJson (unchanged behavior)', () => {
    it('still produces the same JSON string output', () => {
      const results = [okResult];
      const output = formatDoctorJson(results);
      const parsed = JSON.parse(output);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('node-installed');
    });
  });

  describe('formatDoctorReport (unchanged behavior)', () => {
    it('still produces human-readable table output', () => {
      const results = [okResult, errorResult];
      const report = formatDoctorReport(results);
      expect(report).toContain('CATEGORY');
      expect(report).toContain('node-installed');
      expect(report).toContain('missing-config');
      // Should contain summary line
      expect(report).toContain('diagnostics');
    });
  });

  describe('resolveOutputMode for doctor', () => {
    // Import dynamically to test the shared infrastructure
    it('non-TTY defaults to JSON', async () => {
      const { resolveOutputMode } = await import('../../output/mode.js');
      expect(resolveOutputMode({}, false)).toBe('json');
    });

    it('TTY defaults to human', async () => {
      const { resolveOutputMode } = await import('../../output/mode.js');
      expect(resolveOutputMode({}, true)).toBe('human');
    });

    it('--human forces human in non-TTY', async () => {
      const { resolveOutputMode } = await import('../../output/mode.js');
      expect(resolveOutputMode({ human: true }, false)).toBe('human');
    });

    it('--json forces JSON in TTY', async () => {
      const { resolveOutputMode } = await import('../../output/mode.js');
      expect(resolveOutputMode({ json: true }, true)).toBe('json');
    });
  });

  describe('formatDoctorJsonData output is jq-friendly', () => {
    it('can be parsed as JSON array with filterable fields', () => {
      const results = [okResult, errorResult, warnResult];
      const data = formatDoctorJsonData(results);
      const jsonStr = JSON.stringify(data);

      // Simulate jq '.[] | select(.severity=="error")'
      const parsed = JSON.parse(jsonStr);
      const errors = parsed.filter((r: { severity: string }) => r.severity === 'error');
      expect(errors).toHaveLength(1);
      expect(errors[0].id).toBe('missing-config');
    });
  });
});
