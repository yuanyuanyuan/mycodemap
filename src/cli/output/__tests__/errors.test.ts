// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Tests for formatError — verifies structured JSON in json mode, chalk text in human mode

import { describe, it, expect } from 'vitest';
import { formatError } from '../errors.js';

describe('formatError', () => {
  describe('json mode', () => {
    it('returns structured JSON with type, code, message', () => {
      const error = new Error('something failed') as Error & { code: string };
      error.code = 'E001';

      const result = formatError(error, 'json');
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({
        type: 'error',
        code: 'E001',
        message: 'something failed',
      });
    });

    it('includes remediation when available', () => {
      const error = new Error('missing config') as Error & { code: string; remediation: string };
      error.code = 'CONFIG_MISSING';
      error.remediation = 'Run codemap init first';

      const result = formatError(error, 'json');
      const parsed = JSON.parse(result);

      expect(parsed.remediation).toBe('Run codemap init first');
    });

    it('handles Error without code as UNKNOWN', () => {
      const error = new Error('generic error');
      const result = formatError(error, 'json');
      const parsed = JSON.parse(result);

      expect(parsed.code).toBe('UNKNOWN');
      expect(parsed.message).toBe('generic error');
    });

    it('handles non-Error thrown values', () => {
      const result = formatError('string error', 'json');
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({
        type: 'error',
        code: 'UNKNOWN',
        message: 'string error',
      });
    });

    it('handles null thrown value', () => {
      const result = formatError(null, 'json');
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({
        type: 'error',
        code: 'UNKNOWN',
        message: 'null',
      });
    });

    it('handles number thrown value', () => {
      const result = formatError(42, 'json');
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({
        type: 'error',
        code: 'UNKNOWN',
        message: '42',
      });
    });
  });

  describe('human mode', () => {
    it('returns chalk-colored error string', () => {
      const error = new Error('something failed') as Error & { code: string };
      error.code = 'E001';

      const result = formatError(error, 'human');

      // Should contain the error message
      expect(result).toContain('something failed');
      // Should contain the code
      expect(result).toContain('E001');
    });

    it('includes suggestion when remediation is available', () => {
      const error = new Error('missing config') as Error & { code: string; remediation: string };
      error.code = 'CONFIG_MISSING';
      error.remediation = 'Run codemap init first';

      const result = formatError(error, 'human');

      expect(result).toContain('Run codemap init first');
      expect(result).toContain('Suggestion');
    });

    it('handles Error without code', () => {
      const error = new Error('generic error');
      const result = formatError(error, 'human');

      expect(result).toContain('generic error');
    });

    it('handles non-Error thrown values in human mode', () => {
      const result = formatError('string error', 'human');

      expect(result).toContain('string error');
    });
  });
});
